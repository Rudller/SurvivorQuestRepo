// Lampka LED drużyny Ryzykantów (XIAO ESP32-C6 + matryca WS2812), sterowana
// z tabletu przez BLE (Nordic UART Service). Tablet wysyła krótkie komendy,
// animacje żyją w firmware (hardware/led-lamp/sketches/led_matrix_ble).
//
// Zasada: gra nigdy nie czeka na lampę. Każda wysyłka jest "wyślij i zapomnij",
// a brak lampy, Bluetooth czy modułu natywnego (Expo Go) to cichy no-op.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { NativeModules, PermissionsAndroid, Platform, TurboModuleRegistry } from "react-native";

import { resolveRiskTaskStartSeconds } from "../model/risk-task-timer";

type BleManagerModule = typeof import("react-native-ble-manager").default;

const NUS_SERVICE = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const NUS_RX = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
export const LAMP_NAME_PREFIX = "SQ-Lampa-";
const STORAGE_KEY = "sq.mobile.risk-lamp.v1";
const SCAN_SECONDS = 6;
const RECONNECT_DELAY_MS = 2000;

// Komendy firmware led_matrix_ble. Jedno miejsce mapowania zdarzeń gry na
// stany lampy — wygląd każdego stanu żyje w firmware.
export const LAMP_COMMANDS = {
  idle: "idle", // tęcza — drużyna nie wybrała jeszcze koloru
  team: "team", // fala w kolorze drużyny (kolor z ostatniego cRRGGBB)
  ok: "ok", // 3 zielone mignięcia, potem lampa sama wraca do fali
  bad: "bad", // 3 czerwone mignięcia, potem fala
  timeout: "timeout", // pomarańczowe przygasanie, potem fala
} as const;

export type LampResult = "ok" | "bad" | "timeout";

const DIFFICULTY_COMMANDS = {
  EASY: "easy", // zielony ogień
  MEDIUM: "medium", // żółty ogień
  HARD: "hard", // czerwony ogień
} as const;

type LampDraw = {
  difficulty: keyof typeof DIFFICULTY_COMMANDS;
  remainingSeconds?: number | null;
  station: { timeLimitSeconds?: number | null };
};

// Ogień karty z czasem: "hard 45/60" = zostało 45 z 60 s. Lampa odlicza
// dalej sama, więc tablet wysyła to raz. Zwraca funkcję, bo po ponownym
// połączeniu lampy pozostały czas trzeba policzyć od nowa.
export function lampDrawCommand(draw: LampDraw): () => string {
  const name = DIFFICULTY_COMMANDS[draw.difficulty];
  const remaining = resolveRiskTaskStartSeconds(draw);
  if (remaining === null) {
    return () => name;
  }
  const total = Math.max(remaining, draw.station.timeLimitSeconds ?? 0);
  const sentAt = Date.now();
  return () => {
    const left = Math.max(0, Math.round(remaining - (Date.now() - sentAt) / 1000));
    return `${name} ${left}/${total}`;
  };
}

// Kolor drużyny: "c" + RRGGBB, np. "#f59e0b" -> "cf59e0b" (lampa "oddycha" nim).
export function lampColorCommand(hex: string) {
  let value = hex.trim().replace(/^#/, "").toLowerCase();
  if (value.length === 3) {
    value = value
      .split("")
      .map((character) => character + character)
      .join("");
  }
  return /^[0-9a-f]{6}$/.test(value) ? `c${value}` : LAMP_COMMANDS.idle;
}

export type LampDevice = { id: string; name: string };
export type LampStatus = "unavailable" | "disconnected" | "connecting" | "connected";

type LampState = {
  status: LampStatus;
  device: LampDevice | null;
};

let cachedBle: BleManagerModule | null | undefined;

function loadBle(): BleManagerModule | null {
  if (cachedBle !== undefined) {
    return cachedBle;
  }
  // Expo Go i stare APK nie mają modułu natywnego — wtedy lampy po prostu nie ma.
  const hasNative = Boolean(TurboModuleRegistry.get("BleManager") ?? NativeModules.BleManager);
  if (!hasNative) {
    cachedBle = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedBle = (require("react-native-ble-manager") as { default: BleManagerModule }).default;
  } catch {
    cachedBle = null;
  }
  return cachedBle;
}

export function isLampSupported() {
  return loadBle() !== null;
}

// ---------- stan ----------

let state: LampState = { status: isLampSupported() ? "disconnected" : "unavailable", device: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<LampState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLampState() {
  return state;
}

export function useLampState() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

// ---------- BLE ----------

let started: Promise<void> | null = null;
let disconnectSubscription: { remove: () => void } | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let keepConnected = false;
// Stan do odtworzenia po ponownym połączeniu (funkcja — patrz lampDrawCommand)
let lastCommand: (() => string) | null = null;
let lastSentText: string | null = null;

async function requestPermissions() {
  if (Platform.OS !== "android") {
    return true;
  }
  if (Number(Platform.Version) >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensureStarted(ble: BleManagerModule) {
  if (!started) {
    started = ble.start({ showAlert: false }).then(() => {
      disconnectSubscription?.remove();
      disconnectSubscription = ble.onDisconnectPeripheral((event) => {
        if (state.device && event.peripheral === state.device.id) {
          setState({ status: "disconnected" });
          scheduleReconnect();
        }
      });
    });
    started.catch(() => {
      started = null;
    });
  }
  return started;
}

function scheduleReconnect() {
  if (!keepConnected || reconnectTimer) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (keepConnected && state.device && state.status === "disconnected") {
      void connectLamp(state.device);
    }
  }, RECONNECT_DELAY_MS);
}

function toBytes(text: string) {
  return Array.from(text).map((character) => character.charCodeAt(0) & 0xff);
}

// Skanuje lampy w pobliżu przez kilka sekund. Zwraca funkcję przerywającą.
export async function scanLamps(onFound: (device: LampDevice) => void, onDone: () => void) {
  const ble = loadBle();
  if (!ble || !(await requestPermissions())) {
    onDone();
    return () => undefined;
  }
  await ensureStarted(ble);
  try {
    await ble.enableBluetooth();
  } catch {
    // Użytkownik odmówił włączenia Bluetooth — skan nic nie znajdzie.
  }
  const seen = new Set<string>();
  const found = ble.onDiscoverPeripheral((peripheral) => {
    const name = peripheral.name ?? peripheral.advertising?.localName ?? "";
    if (!name.startsWith(LAMP_NAME_PREFIX) || seen.has(peripheral.id)) {
      return;
    }
    seen.add(peripheral.id);
    onFound({ id: peripheral.id, name });
  });
  const stopped = ble.onStopScan(() => {
    found.remove();
    stopped.remove();
    onDone();
  });
  try {
    await ble.scan({ serviceUUIDs: [], seconds: SCAN_SECONDS });
  } catch {
    found.remove();
    stopped.remove();
    onDone();
  }
  return () => {
    void ble.stopScan().catch(() => undefined);
  };
}

export async function connectLamp(device: LampDevice) {
  const ble = loadBle();
  if (!ble) {
    return false;
  }
  keepConnected = true;
  setState({ device, status: "connecting" });
  try {
    if (!(await requestPermissions())) {
      throw new Error("permissions");
    }
    await ensureStarted(ble);
    // Android wstrzymuje łączenie do końca trwającego skanu (do 6 s), więc
    // skan przerywamy, zanim zaczniemy się łączyć.
    await ble.stopScan().catch(() => undefined);
    await ble.connect(device.id);
    await ble.retrieveServices(device.id);
    setState({ status: "connected" });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(device));
    // Po (ponownym) połączeniu lampa od razu pokazuje aktualny stan gry.
    if (lastCommand) {
      lastSentText = lastCommand();
      void writeCommand(lastSentText);
    }
    return true;
  } catch {
    setState({ status: "disconnected" });
    scheduleReconnect();
    return false;
  }
}

export async function forgetLamp() {
  keepConnected = false;
  const ble = loadBle();
  const device = state.device;
  setState({ device: null, status: isLampSupported() ? "disconnected" : "unavailable" });
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  if (ble && device) {
    await ble.disconnect(device.id).catch(() => undefined);
  }
}

// Wywoływane na ekranie gry: łączy z lampą zapamiętaną na tym tablecie.
export async function reconnectSavedLamp() {
  if (!isLampSupported() || state.status === "connected" || state.status === "connecting") {
    return;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const device = raw ? (JSON.parse(raw) as LampDevice) : null;
    if (device?.id) {
      await connectLamp(device);
    }
  } catch {
    // Brak zapisanej lampy albo uszkodzony wpis — gra działa bez lampy.
  }
}

async function writeCommand(command: string) {
  const ble = loadBle();
  const device = state.device;
  if (!ble || !device || state.status !== "connected") {
    return;
  }
  try {
    await ble.writeWithoutResponse(device.id, NUS_SERVICE, NUS_RX, toBytes(command));
  } catch {
    // Wysyłka się nie udała — następna zmiana stanu gry spróbuje ponownie.
  }
}

// oneShot: efekt jednorazowy (mignięcia, koniec czasu). Wysyłany zawsze, także
// dwa razy z rzędu. Po efekcie lampa sama wraca do fali, więc po ponownym
// połączeniu odtwarzamy "then" — pełny kolor drużyny, bo lampa po restarcie
// go nie pamięta i samo "team" dałoby tęczę.
export function sendLampCommand(
  command: string | (() => string),
  options?: { oneShot?: boolean; then?: string },
) {
  const build = typeof command === "string" ? () => command : command;
  const text = build();
  if (!options?.oneShot && text === lastSentText) {
    return;
  }
  const restCommand = options?.then ?? LAMP_COMMANDS.team;
  lastCommand = options?.oneShot ? () => restCommand : build;
  lastSentText = text;
  void writeCommand(text);
}
