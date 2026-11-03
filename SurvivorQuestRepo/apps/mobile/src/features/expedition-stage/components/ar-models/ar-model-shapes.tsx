// Modele 3D stanowisk AR, złożone z prostych brył Viro. Jednostki: metry,
// środek podstawy modelu w (0, 0, 0), przód modelu patrzy w +Z.
import { useEffect, useRef, useState } from "react";

import type { loadViro } from "../forensic-evidence/forensic-ar-layer";
import { BOMB_WIRES, PUZZLE_SYMBOLS, parseTokens } from "./ar-model-answer";
import { setArModelState, type ArModelState } from "./ar-model-store";
import { wireMaterialName } from "./ar-model-viro";

// ViroText rysuje fontSize 1 pt ≈ 1 cm, więc napisy na małych modelach
// skalujemy w dół, a pole tekstu (width/height) w górę o tyle samo.
const TEXT_SCALE = 0.1;

type ViroModule = NonNullable<ReturnType<typeof loadViro>>;
type ShapeProps = { viro: ViroModule; state: ArModelState };

// ---------- Sejf ----------

const SAFE_W = 0.26;
const SAFE_H = 0.3;
const SAFE_D = 0.24;
const WALL = 0.015;

export function SafeModel({ viro, state }: ShapeProps) {
  const { ViroNode, ViroBox, ViroQuad } = viro;
  const isOpen = state.status === "success";
  const doorW = SAFE_W - 0.02;
  const doorH = SAFE_H - 0.02;
  const rotateBase = useRef(0);

  return (
    <ViroNode>
      {/* Ścianki skrzyni (bez przodu), żeby po otwarciu było widać wnętrze. */}
      <ViroBox position={[0, SAFE_H / 2, -SAFE_D / 2 + WALL / 2]} width={SAFE_W} height={SAFE_H} length={WALL} materials={["arSteel"]} />
      <ViroBox position={[-SAFE_W / 2 + WALL / 2, SAFE_H / 2, 0]} width={WALL} height={SAFE_H} length={SAFE_D} materials={["arSteel"]} />
      <ViroBox position={[SAFE_W / 2 - WALL / 2, SAFE_H / 2, 0]} width={WALL} height={SAFE_H} length={SAFE_D} materials={["arSteel"]} />
      <ViroBox position={[0, SAFE_H - WALL / 2, 0]} width={SAFE_W} height={WALL} length={SAFE_D} materials={["arSteel"]} />
      <ViroBox position={[0, WALL / 2, 0]} width={SAFE_W} height={WALL} length={SAFE_D} materials={["arSteel"]} />
      <ViroBox position={[0, SAFE_H / 2, -SAFE_D / 2 + WALL + 0.002]} width={SAFE_W - 2 * WALL} height={SAFE_H - 2 * WALL} length={0.002} materials={["arSafeInside"]} />
      {/* Skarb w środku. */}
      <ViroBox position={[-0.04, WALL + 0.02, -0.02]} width={0.08} height={0.035} length={0.05} materials={["arGold"]} />
      <ViroBox position={[0.045, WALL + 0.02, -0.03]} width={0.08} height={0.035} length={0.05} materials={["arGold"]} />
      <ViroBox position={[0, WALL + 0.055, -0.025]} width={0.08} height={0.035} length={0.05} materials={["arGold"]} />

      {/* Drzwi na zawiasie po lewej stronie. */}
      <ViroNode
        position={[-SAFE_W / 2 + 0.01, SAFE_H / 2, SAFE_D / 2]}
        animation={{ name: "arSafeDoorOpen", run: isOpen, loop: false }}
      >
        <ViroNode
          position={[doorW / 2, 0, 0.008]}
          animation={{ name: "arShake", run: state.status === "wrong", loop: false }}
        >
          <ViroBox width={doorW} height={doorH} length={0.016} materials={["arSafeFront"]} />
          {/* Pokrętło: tap = następna cyfra, obrót dwoma palcami = kręcenie. */}
          <ViroNode
            position={[0, 0.02, 0.012]}
            onClick={() => {
              if (state.status === "idle") {
                setArModelState((current) => ({ safeDial: (current.safeDial + 1) % 10 }));
              }
            }}
            onRotate={(rotateState: number, rotationFactor: number) => {
              if (rotateState === 1) {
                rotateBase.current = state.safeDial;
              } else if (rotateState === 2) {
                const steps = Math.round(-rotationFactor / 36);
                setArModelState({ safeDial: (((rotateBase.current + steps) % 10) + 10) % 10 });
              }
            }}
          >
            <ViroQuad width={0.12} height={0.12} rotation={[0, 0, state.safeDial * 36]} materials={["arDial"]} />
          </ViroNode>
          <ViroBox position={[0, 0.02 + 0.068, 0.014]} width={0.012} height={0.016} length={0.006} materials={["arPointer"]} />
          {/* Klamka. */}
          <ViroBox position={[doorW / 2 - 0.035, -0.06, 0.02]} width={0.018} height={0.07} length={0.02} materials={["arSteelDark"]} />
        </ViroNode>
      </ViroNode>
    </ViroNode>
  );
}

// ---------- Bomba ----------

const BOMB_COUNTDOWN_S = 59;

function useBombCountdown(isRunning: boolean) {
  const [seconds, setSeconds] = useState(BOMB_COUNTDOWN_S);
  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const id = setInterval(() => setSeconds((value) => (value <= 0 ? BOMB_COUNTDOWN_S : value - 1)), 1000);
    return () => clearInterval(id);
  }, [isRunning]);
  return seconds;
}

export function BombModel({ viro, state }: ShapeProps) {
  const { ViroNode, ViroBox, ViroSphere, ViroText } = viro;
  const isExploded = state.status === "wrong";
  const isDefused = state.status === "success";
  const seconds = useBombCountdown(!isExploded && !isDefused);
  const wiresNeeded = Math.max(1, parseTokens(state.expected, BOMB_WIRES.map((wire) => wire.key)).length || 3);
  const timerText = isDefused ? "ROZBROJONA" : `00:${String(seconds).padStart(2, "0")}`;

  return (
    <ViroNode>
      {!isExploded ? (
        <ViroNode>
          <ViroBox position={[0, 0.01, 0]} width={0.34} height={0.02} length={0.22} materials={["arWoodDark"]} />
          {/* Laski dynamitu. */}
          {[-0.045, 0, 0.045].map((z, index) => (
            <ViroBox key={z} position={[0, 0.04 + (index === 1 ? 0.035 : 0), z - 0.03]} width={0.26} height={0.042} length={0.042} materials={["arTnt"]} />
          ))}
          {/* Zapalnik z wyświetlaczem. */}
          <ViroBox position={[0, 0.05, 0.05]} width={0.13} height={0.06} length={0.05} materials={["arTimer"]} />
          <ViroText
            text={timerText}
            position={[0, 0.05, 0.0755]}
            scale={[TEXT_SCALE, TEXT_SCALE, TEXT_SCALE]}
            width={0.12 / TEXT_SCALE}
            height={0.05 / TEXT_SCALE}
            style={{ fontFamily: "monospace", fontSize: isDefused ? 13 : 24, color: isDefused ? "#4ade80" : "#ef4444", textAlign: "center", textAlignVertical: "center" }}
          />
          {/* Kable: tap przecina. */}
          {BOMB_WIRES.map((wire, index) => {
            const x = -0.12 + index * 0.06;
            const isCut = state.bombCut.includes(wire.key);
            const material = wireMaterialName(wire.key);
            return (
              <ViroNode
                key={wire.key}
                position={[x, 0.032, 0.09]}
                onClick={() => {
                  if (isCut || state.status !== "idle" || state.bombCut.length >= wiresNeeded) {
                    return;
                  }
                  setArModelState((current) => ({ bombCut: [...current.bombCut, wire.key] }));
                }}
              >
                {isCut ? (
                  <>
                    <ViroBox position={[0, 0, -0.03]} width={0.018} height={0.018} length={0.04} materials={[material]} />
                    <ViroBox position={[0, 0, -0.008]} width={0.008} height={0.008} length={0.006} materials={["arCopper"]} />
                    <ViroBox position={[0, 0, 0.03]} width={0.018} height={0.018} length={0.04} materials={[material]} />
                    <ViroBox position={[0, 0, 0.008]} width={0.008} height={0.008} length={0.006} materials={["arCopper"]} />
                  </>
                ) : (
                  <ViroBox width={0.018} height={0.018} length={0.1} materials={[material]} />
                )}
              </ViroNode>
            );
          })}
        </ViroNode>
      ) : (
        <ViroNode position={[0, 0.08, 0]}>
          <ViroSphere radius={0.05} materials={["arFire"]} animation={{ name: "arBoomGrow", run: true, loop: false }} />
          <ViroSphere radius={0.03} materials={["arFireCore"]} animation={{ name: "arBoomGrow", run: true, loop: false }} />
          <ViroSphere radius={0.05} position={[0, 0.05, 0]} materials={["arSmoke"]} animation={{ name: "arSmokeRise", run: true, loop: false }} />
        </ViroNode>
      )}
    </ViroNode>
  );
}

// ---------- Dowód (skrzyneczka do obejrzenia) ----------

export function ArtifactModel({ viro, state }: ShapeProps) {
  const { ViroNode, ViroBox, ViroText } = viro;
  const [rotX, rotY] = state.artifactRotation;
  const scale = state.artifactScale;
  const code = state.expected.trim() || "?";

  return (
    <ViroNode position={[0, 0.14, 0]} rotation={[rotX, rotY, 0]} scale={[scale, scale, scale]}>
      <ViroBox width={0.2} height={0.1} length={0.13} materials={["arWood"]} />
      <ViroBox position={[0, 0.065, 0]} width={0.205} height={0.03} length={0.135} materials={["arWoodDark"]} />
      {[-0.07, 0.07].map((x) => (
        <ViroBox key={x} position={[x, 0.01, 0]} width={0.018} height={0.142} length={0.142} materials={["arBrass"]} />
      ))}
      <ViroBox position={[0, 0.035, 0.068]} width={0.03} height={0.035} length={0.008} materials={["arBrass"]} />
      {/* Fałszywy trop z tyłu. */}
      <ViroText
        text="ANNO 1897"
        position={[0, 0, -0.0665]}
        rotation={[0, 180, 0]}
        scale={[TEXT_SCALE, TEXT_SCALE, TEXT_SCALE]}
        width={0.16 / TEXT_SCALE}
        height={0.04 / TEXT_SCALE}
        style={{ fontFamily: "serif", fontSize: 18, color: "#f5deb3", textAlign: "center", textAlignVertical: "center" }}
      />
      {/* Właściwy kod — wygrawerowany na spodzie. */}
      <ViroText
        text={code}
        position={[0, -0.0515, 0]}
        rotation={[90, 0, 0]}
        scale={[TEXT_SCALE, TEXT_SCALE, TEXT_SCALE]}
        width={0.18 / TEXT_SCALE}
        height={0.06 / TEXT_SCALE}
        style={{ fontFamily: "monospace", fontSize: 26, color: "#fde68a", textAlign: "center", textAlignVertical: "center" }}
      />
    </ViroNode>
  );
}

// ---------- Szkatułka z kostkami ----------

const CUBE = 0.05;

function PuzzleCube({ viro, face, x, onPress }: { viro: ViroModule; face: number; x: number; onPress: () => void }) {
  const { ViroNode, ViroBox, ViroQuad } = viro;
  const half = CUBE / 2 + 0.0005;
  // Ściana k leży pod kątem k * 90° od góry w stronę przodu; obrót kostki o
  // 90° - face * 90° wokół X wystawia ścianę `face` do przodu, w stronę
  // drużyny (model zawsze stoi przodem do tabletu).
  return (
    <ViroNode position={[x, 0.11 + CUBE / 2, 0]} rotation={[90 - face * 90, 0, 0]} onClick={onPress}>
      <ViroBox width={CUBE * 0.98} height={CUBE * 0.98} length={CUBE * 0.98} materials={["arWoodDark"]} />
      {PUZZLE_SYMBOLS.map((symbol, k) => {
        const angle = (k * Math.PI) / 2;
        return (
          <ViroQuad
            key={symbol}
            width={CUBE * 0.94}
            height={CUBE * 0.94}
            position={[0, Math.cos(angle) * half, Math.sin(angle) * half]}
            rotation={[-90 + k * 90, 0, 0]}
            materials={[`arSymbol_${k}`]}
          />
        );
      })}
    </ViroNode>
  );
}

export function PuzzleBoxModel({ viro, state }: ShapeProps) {
  const { ViroNode, ViroBox, ViroSphere } = viro;
  const isOpen = state.status === "success";
  return (
    <ViroNode animation={{ name: "arShake", run: state.status === "wrong", loop: false }}>
      <ViroBox position={[0, 0.045, 0]} width={0.3} height={0.09} length={0.17} materials={["arWood"]} />
      {isOpen ? (
        <ViroSphere position={[0, 0.125, 0]} radius={0.03} materials={["arTreasure"]} />
      ) : null}
      {/* Wieko na zawiasie z tyłu, z kostkami na wierzchu. */}
      <ViroNode position={[0, 0.09, -0.085]} animation={{ name: "arLidOpen", run: isOpen, loop: false }}>
        <ViroNode position={[0, -0.09, 0.085]}>
          <ViroBox position={[0, 0.1, 0]} width={0.305} height={0.02} length={0.175} materials={["arWoodDark"]} />
          {state.puzzleFaces.map((face, index) => (
            <PuzzleCube
              key={index}
              viro={viro}
              face={face}
              x={-0.105 + index * 0.07}
              onPress={() => {
                if (state.status !== "idle") {
                  return;
                }
                setArModelState((current) => ({
                  puzzleFaces: current.puzzleFaces.map((value, i) => (i === index ? (value + 1) % 4 : value)),
                }));
              }}
            />
          ))}
        </ViroNode>
      </ViroNode>
    </ViroNode>
  );
}
