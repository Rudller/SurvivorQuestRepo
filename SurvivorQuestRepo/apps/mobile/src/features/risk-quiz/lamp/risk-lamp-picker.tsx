// Parowanie tabletu z lampką drużyny — na kroku wyboru drużyny, gdy wiadomo
// już, że realizacja to Ryzykanci. Wybór zostaje zapamiętany na tablecie.
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import {
  LAMP_COMMANDS,
  connectLamp,
  forgetLamp,
  getLampState,
  reconnectSavedLamp,
  scanLamps,
  sendLampCommand,
  useLampState,
  type LampDevice,
} from "./risk-lamp";

const STATUS_TEXT = {
  unavailable: "Ta wersja aplikacji nie obsługuje lampy.",
  disconnected: "Nie połączono",
  connecting: "Łączenie…",
  connected: "Połączono",
} as const;

export function RiskLampPicker() {
  const lamp = useLampState();
  const [isScanning, setIsScanning] = useState(false);
  const [found, setFound] = useState<LampDevice[]>([]);
  const stopScan = useRef<(() => void) | null>(null);

  // Tablet bez zapamiętanej lampy od razu jej szuka — organizator tylko
  // stuka w nazwę na liście.
  useEffect(() => {
    void (async () => {
      await reconnectSavedLamp();
      if (getLampState().status !== "connected") {
        await startScan();
      }
    })();
    return () => stopScan.current?.();
  }, []);

  // Po połączeniu lampa od razu pokazuje stan "czekamy na kartę" — drużyna
  // widzi, że to ta lampa.
  useEffect(() => {
    if (lamp.status === "connected") {
      sendLampCommand(LAMP_COMMANDS.idle);
    }
  }, [lamp.status]);

  const startScan = async () => {
    setFound([]);
    setIsScanning(true);
    stopScan.current = await scanLamps(
      (device) => setFound((current) => (current.some((item) => item.id === device.id) ? current : [...current, device])),
      () => setIsScanning(false),
    );
  };

  if (lamp.status === "unavailable") {
    return null;
  }

  const statusColor =
    lamp.status === "connected" ? "#4ade80" : lamp.status === "connecting" ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.textMuted;

  return (
    <View
      className="mt-4 rounded-2xl border px-4 py-4"
      style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted, rowGap: 10 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
          Lampa drużyny
        </Text>
        <Text className="text-sm font-semibold" style={{ color: statusColor }}>
          {STATUS_TEXT[lamp.status]}
          {lamp.device ? ` · ${lamp.device.name}` : ""}
        </Text>
      </View>

      {found.length > 0 ? (
        <View style={{ rowGap: 8 }}>
          {found.map((device) => {
            const isCurrent = lamp.device?.id === device.id;
            return (
              <Pressable
                key={device.id}
                className="rounded-xl border px-3 py-3 active:opacity-85"
                style={{
                  borderColor: isCurrent ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelStrong,
                }}
                onPress={() => void connectLamp(device)}
              >
                <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {device.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", columnGap: 8 }}>
        <Pressable
          className="flex-1 rounded-xl border px-3 py-3 active:opacity-85"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong, opacity: isScanning ? 0.6 : 1 }}
          onPress={() => void startScan()}
          disabled={isScanning}
        >
          <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {isScanning ? "Szukam lamp…" : lamp.device ? "Szukaj innej lampy" : "Szukaj lampy"}
          </Text>
        </Pressable>
        {lamp.device ? (
          <Pressable
            className="rounded-xl border px-4 py-3 active:opacity-85"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
            onPress={() => {
              setFound([]);
              void forgetLamp();
            }}
          >
            <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textMuted }}>
              Odłącz
            </Text>
          </Pressable>
        ) : null}
      </View>
      {found.length > 0 && lamp.status !== "connected" ? (
        <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          Stuknij lampę z listy, żeby ją połączyć. Połączona lampa zaświeci się na kolorowo.
        </Text>
      ) : null}
      {!isScanning && found.length === 0 && lamp.status !== "connected" ? (
        <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          Nie znaleziono żadnej lampy. Włącz lampę, połóż ją przy tablecie i stuknij „Szukaj lampy”.
        </Text>
      ) : null}
    </View>
  );
}
