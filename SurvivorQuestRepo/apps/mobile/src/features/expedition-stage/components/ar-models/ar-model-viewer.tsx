// Pełnoekranowy widok AR stanowisk z modelem 3D: drużyna stawia model na
// stole (stuknięcie w wykrytą płaszczyznę albo "Postaw przede mną") i bawi się
// nim palcami. Nakładka 2D niżej pokazuje stan i przyciski.
import { useEffect, useMemo } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";

import { loadViro } from "../forensic-evidence/forensic-ar-layer";
import {
  BOMB_DEFAULT_WIRES,
  BOMB_WIRES,
  PUZZLE_SYMBOLS,
  SAFE_DEFAULT_DIGITS,
  buildDigitAnswer,
  buildTokenAnswer,
  countDigits,
  parseTokens,
  type ArModelKind,
} from "./ar-model-answer";
import { ArtifactModel, BombModel, PuzzleBoxModel, SafeModel } from "./ar-model-shapes";
import { getArModelState, setArModelState, useArModelState, type ArModelState } from "./ar-model-store";
import { setUpArModelViro } from "./ar-model-viro";

export const AR_MODEL_COLORS = {
  accent: "#c084fc",
  text: "#f5f3ff",
  muted: "rgba(245, 243, 255, 0.75)",
  panel: "rgba(12, 6, 26, 0.82)",
  border: "rgba(192, 132, 252, 0.55)",
  danger: "#f87171",
  success: "#4ade80",
};

export const AR_MODEL_TITLES: Record<ArModelKind, string> = {
  "ar-safe": "Sejf 3D",
  "ar-bomb": "Bomba 3D",
  "ar-artifact": "Dowód 3D",
  "ar-puzzle-box": "Szkatułka 3D",
};

type ViroScene = {
  getCameraOrientationAsync: () => Promise<{ position: number[]; forward: number[] }>;
};

// Scena Viro rejestruje się tu, żeby przycisk "Postaw przede mną" mógł zapytać
// o pozycję kamery.
let activeScene: ViroScene | null = null;

function ModelForKind({ viro, state }: { viro: NonNullable<ReturnType<typeof loadViro>>; state: ArModelState }) {
  switch (state.kind) {
    case "ar-safe":
      return <SafeModel viro={viro} state={state} />;
    case "ar-bomb":
      return <BombModel viro={viro} state={state} />;
    case "ar-artifact":
      return <ArtifactModel viro={viro} state={state} />;
    case "ar-puzzle-box":
      return <PuzzleBoxModel viro={viro} state={state} />;
  }
}

function ArModelScene() {
  const viro = loadViro();
  const state = useArModelState();
  if (!viro) {
    return null;
  }
  const { ViroARScene, ViroARPlaneSelector, ViroNode, ViroAmbientLight, ViroDirectionalLight } = viro;
  // billboardY: model zawsze stoi przodem do tabletu — pokrętło, kable i
  // kostki są wtedy zawsze pod ręką.
  const model = (
    <ViroNode transformBehaviors={["billboardY"]} scale={[0.01, 0.01, 0.01]} animation={{ name: "arPopIn", run: true, loop: false }}>
      <ModelForKind viro={viro} state={state} />
    </ViroNode>
  );

  return (
    <ViroARScene
      ref={(scene: unknown) => {
        activeScene = (scene as ViroScene | null) ?? null;
      }}
      anchorDetectionTypes={["PlanesHorizontal"]}
    >
      <ViroAmbientLight color="#ffffff" intensity={700} />
      <ViroDirectionalLight color="#ffffff" direction={[0.3, -1, -0.5]} intensity={900} />
      {state.placement === "front" ? (
        <ViroNode position={state.frontPosition}>{model}</ViroNode>
      ) : (
        <ViroARPlaneSelector
          alignment="Horizontal"
          minWidth={0.1}
          minHeight={0.1}
          onPlaneSelected={() => setArModelState({ placement: "plane" })}
        >
          {model}
        </ViroARPlaneSelector>
      )}
    </ViroARScene>
  );
}

async function placeInFront() {
  if (!activeScene) {
    return;
  }
  try {
    const { position, forward } = await activeScene.getCameraOrientationAsync();
    const length = Math.hypot(forward[0] ?? 0, forward[2] ?? 0) || 1;
    const distance = 0.6;
    setArModelState({
      placement: "front",
      frontPosition: [
        (position[0] ?? 0) + ((forward[0] ?? 0) / length) * distance,
        (position[1] ?? 0) - 0.3,
        (position[2] ?? 0) + ((forward[2] ?? 0) / length) * distance,
      ],
    });
  } catch {
    // Kamera jeszcze nie śledzi — drużyna spróbuje ponownie.
  }
}

type ArModelViewerProps = {
  kind: ArModelKind;
  attemptsLeft: number;
  maxAttempts: number;
  onSubmitAnswer: (answer: string) => void;
  onClose: () => void;
};

function HudButton({ label, onPress, disabled, wide }: { label: string; onPress: () => void; disabled?: boolean; wide?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        minWidth: wide ? 180 : 64,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: disabled ? "rgba(255,255,255,0.12)" : AR_MODEL_COLORS.accent,
      }}
    >
      <Text style={{ color: disabled ? AR_MODEL_COLORS.muted : "#1a0b2e", fontSize: 18, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function statusMessage(state: ArModelState) {
  if (state.status === "checking") {
    return { text: "Sprawdzam…", color: AR_MODEL_COLORS.text };
  }
  if (state.status === "wrong") {
    const text =
      state.kind === "ar-bomb"
        ? "BUM! Zła kolejność kabli."
        : state.kind === "ar-safe"
          ? "Zły szyfr — sejf ani drgnie."
          : "Szkatułka się nie otwiera.";
    return { text, color: AR_MODEL_COLORS.danger };
  }
  if (state.status === "success") {
    const text =
      state.kind === "ar-bomb" ? "Bomba rozbrojona!" : state.kind === "ar-safe" ? "Sejf otwarty!" : "Szkatułka otwarta!";
    return { text, color: AR_MODEL_COLORS.success };
  }
  return null;
}

function SafeControls({ state, onSubmitAnswer }: { state: ArModelState; onSubmitAnswer: (answer: string) => void }) {
  const needed = countDigits(state.expected) || SAFE_DEFAULT_DIGITS;
  const isBusy = state.status !== "idle";
  const pick = () => {
    const entered = [...state.safeEntered, state.safeDial];
    setArModelState({ safeEntered: entered });
    if (entered.length >= needed) {
      onSubmitAnswer(buildDigitAnswer(state.expected, entered));
    }
  };
  return (
    <View style={{ alignItems: "center", rowGap: 12 }}>
      <View style={{ flexDirection: "row", columnGap: 10 }}>
        {Array.from({ length: needed }, (_, index) => {
          const value = state.safeEntered[index];
          const isCurrent = index === state.safeEntered.length;
          return (
            <View
              key={index}
              style={{
                width: 52,
                height: 62,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isCurrent ? AR_MODEL_COLORS.accent : AR_MODEL_COLORS.border,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.45)",
              }}
            >
              <Text style={{ color: AR_MODEL_COLORS.text, fontSize: 30, fontWeight: "800" }}>
                {value ?? (isCurrent ? state.safeDial : "·")}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", columnGap: 12 }}>
        <HudButton label="◀" disabled={isBusy} onPress={() => setArModelState({ safeDial: (state.safeDial + 9) % 10 })} />
        <HudButton label="Ustaw cyfrę" wide disabled={isBusy} onPress={pick} />
        <HudButton label="▶" disabled={isBusy} onPress={() => setArModelState({ safeDial: (state.safeDial + 1) % 10 })} />
      </View>
      <Text style={{ color: AR_MODEL_COLORS.muted, fontSize: 14 }}>
        Kręć pokrętłem dwoma palcami albo strzałkami. Stuknięcie w pokrętło = następna cyfra.
      </Text>
    </View>
  );
}

const WIRE_KEYS = BOMB_WIRES.map((wire) => wire.key);

function bombWiresNeeded(expected: string) {
  return parseTokens(expected, WIRE_KEYS).length || BOMB_DEFAULT_WIRES;
}

// Po przecięciu ostatniego kabla odpowiedź idzie do sprawdzenia od razu.
function useBombAutoSubmit(state: ArModelState, onSubmitAnswer: (answer: string) => void) {
  const { kind, status, bombCut, expected } = state;
  useEffect(() => {
    if (kind === "ar-bomb" && status === "idle" && bombCut.length > 0 && bombCut.length >= bombWiresNeeded(expected)) {
      onSubmitAnswer(buildTokenAnswer(expected, WIRE_KEYS, bombCut));
    }
    // Tylko nowe cięcie ma wysyłać odpowiedź, nie zmiana statusu po wyniku.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bombCut]);
}

function BombControls({ state }: { state: ArModelState }) {
  const needed = bombWiresNeeded(state.expected);
  return (
    <View style={{ alignItems: "center", rowGap: 8 }}>
      <Text style={{ color: AR_MODEL_COLORS.text, fontSize: 18, fontWeight: "700" }}>
        Przecięte {state.bombCut.length}/{needed}: {state.bombCut.length > 0 ? state.bombCut.join(" → ") : "—"}
      </Text>
      <Text style={{ color: AR_MODEL_COLORS.muted, fontSize: 14 }}>Stuknij kabel na bombie, żeby go przeciąć. Liczy się kolejność.</Text>
    </View>
  );
}

function PuzzleControls({ state, onSubmitAnswer }: { state: ArModelState; onSubmitAnswer: (answer: string) => void }) {
  const chosen = state.puzzleFaces.map((face) => PUZZLE_SYMBOLS[face] ?? "");
  return (
    <View style={{ alignItems: "center", rowGap: 10 }}>
      <Text style={{ color: AR_MODEL_COLORS.text, fontSize: 18, fontWeight: "700" }}>{chosen.join(" · ")}</Text>
      <HudButton
        label="Otwórz szkatułkę"
        wide
        disabled={state.status !== "idle"}
        onPress={() => onSubmitAnswer(buildTokenAnswer(state.expected, PUZZLE_SYMBOLS, chosen))}
      />
      <Text style={{ color: AR_MODEL_COLORS.muted, fontSize: 14 }}>Stuknij kostkę, żeby ją obrócić. Liczy się symbol od przodu, od lewej.</Text>
    </View>
  );
}

// Obracanie i przybliżanie dowodu palcami: jeden palec obraca, dwa skalują.
function useArtifactGestures() {
  return useMemo(() => {
    let start = { rotation: [0, 0] as [number, number], scale: 1, distance: 0 };
    const distanceOf = (touches: { pageX: number; pageY: number }[]) =>
      touches.length >= 2 ? Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY) : 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const current = getArModelState();
        start = { rotation: current.artifactRotation, scale: current.artifactScale, distance: distanceOf(event.nativeEvent.touches) };
      },
      onPanResponderMove: (event, gesture) => {
        const touches = event.nativeEvent.touches;
        if (touches.length >= 2) {
          const distance = distanceOf(touches);
          if (start.distance === 0) {
            start = { ...start, distance, scale: getArModelState().artifactScale };
            return;
          }
          const scale = Math.min(3, Math.max(0.6, start.scale * (distance / start.distance)));
          setArModelState({ artifactScale: scale });
          return;
        }
        setArModelState({
          artifactRotation: [
            Math.max(-180, Math.min(180, start.rotation[0] + gesture.dy * 0.5)),
            start.rotation[1] + gesture.dx * 0.5,
          ],
        });
      },
    });
  }, []);
}

export function ArModelViewer({ kind, attemptsLeft, maxAttempts, onSubmitAnswer, onClose }: ArModelViewerProps) {
  const viro = loadViro();
  const state = useArModelState();
  const gestures = useArtifactGestures();
  useBombAutoSubmit(state, onSubmitAnswer);
  if (!viro) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }
  setUpArModelViro(viro);
  const { ViroARSceneNavigator } = viro;
  const message = statusMessage(state);
  const isPlaced = state.placement !== "none";

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ViroARSceneNavigator autofocus initialScene={{ scene: ArModelScene as never }} style={{ flex: 1 }} />

      {kind === "ar-artifact" && isPlaced ? (
        <View {...gestures.panHandlers} style={{ position: "absolute", top: 90, left: 0, right: 0, bottom: 150 }} />
      ) : null}

      <View pointerEvents="box-none" style={{ position: "absolute", top: 18, left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ borderWidth: 1, borderColor: AR_MODEL_COLORS.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: AR_MODEL_COLORS.panel }}>
          <Text style={{ color: AR_MODEL_COLORS.text, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>{AR_MODEL_TITLES[kind]}</Text>
        </View>
        <View style={{ flexDirection: "row", columnGap: 10, alignItems: "center" }}>
          {kind !== "ar-artifact" ? (
            <View style={{ borderWidth: 1, borderColor: AR_MODEL_COLORS.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: AR_MODEL_COLORS.panel }}>
              <Text style={{ color: AR_MODEL_COLORS.text, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>
                Próby {attemptsLeft}/{maxAttempts}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: AR_MODEL_COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: AR_MODEL_COLORS.panel }}
          >
            <Text style={{ color: AR_MODEL_COLORS.text, fontSize: 16, fontWeight: "700" }}>✕</Text>
          </Pressable>
        </View>
      </View>

      <View pointerEvents="box-none" style={{ position: "absolute", left: 18, right: 18, bottom: 24, alignItems: "center", rowGap: 12 }}>
        {message ? (
          <View style={{ borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: AR_MODEL_COLORS.panel }}>
            <Text style={{ color: message.color, fontSize: 22, fontWeight: "800" }}>{message.text}</Text>
          </View>
        ) : null}
        <View style={{ width: "100%", maxWidth: 640, borderRadius: 16, padding: 16, backgroundColor: AR_MODEL_COLORS.panel, borderWidth: 1, borderColor: AR_MODEL_COLORS.border }}>
          {!isPlaced ? (
            <View style={{ alignItems: "center", rowGap: 12 }}>
              <Text style={{ color: AR_MODEL_COLORS.text, fontSize: 16, textAlign: "center" }}>
                Powoli przesuwaj tablet nad stołem lub podłogą. Gdy pojawi się niebieska płaszczyzna, stuknij ją — tam stanie model.
              </Text>
              <HudButton label="Postaw przede mną" wide onPress={() => void placeInFront()} />
            </View>
          ) : kind === "ar-safe" ? (
            <SafeControls state={state} onSubmitAnswer={onSubmitAnswer} />
          ) : kind === "ar-bomb" ? (
            <BombControls state={state} />
          ) : kind === "ar-puzzle-box" ? (
            <PuzzleControls state={state} onSubmitAnswer={onSubmitAnswer} />
          ) : (
            <View style={{ alignItems: "center", rowGap: 10 }}>
              <Text style={{ color: AR_MODEL_COLORS.text, fontSize: 16, textAlign: "center" }}>
                Przeciągnij palcem, żeby obrócić skrzyneczkę. Dwoma palcami przybliżysz. Kod gdzieś na niej jest.
              </Text>
              <HudButton label="Mam kod" wide onPress={onClose} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
