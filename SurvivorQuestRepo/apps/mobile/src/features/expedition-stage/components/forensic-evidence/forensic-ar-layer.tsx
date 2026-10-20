// Warstwa AR (ViroReact + ARCore): rozpoznaje wydrukowane karty dowodowe po
// samym obrazie i kładzie na odcisku fioletową poświatę "lampy UV".
//
// Viro to kod natywny — w Expo Go go nie ma. loadViro() zwraca wtedy null,
// a skaner przechodzi na wariant z kodem QR (forensic-qr-layer.tsx).
import { useEffect, useState } from "react";
import { NativeModules, View } from "react-native";

import { FORENSIC_SAMPLE_CASE } from "./forensic-case";

type ViroModule = typeof import("@reactvision/react-viro");

let cachedViro: ViroModule | null | undefined;

export function loadViro(): ViroModule | null {
  if (cachedViro !== undefined) {
    return cachedViro;
  }
  if (!NativeModules.VRTARTrackingTargetsModule) {
    cachedViro = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedViro = require("@reactvision/react-viro") as ViroModule;
  } catch {
    cachedViro = null;
  }
  return cachedViro;
}

// Karta ma 90 x 120 mm (patrz generate-ar-evidence-cards.cjs).
const CARD_WIDTH_M = 0.09;
const CARD_HEIGHT_M = 0.12;
// Poświata wycięta z karty: x 110..490, y 120..540 z 600 x 800 px, czyli jej
// środek leży 70 px nad środkiem karty. Oś -Z kotwicy ARCore wskazuje górę obrazu.
const GLOW_WIDTH_M = (380 / 600) * CARD_WIDTH_M;
const GLOW_HEIGHT_M = (420 / 800) * CARD_HEIGHT_M;
const GLOW_OFFSET_Z_M = -(70 / 800) * CARD_HEIGHT_M;
// Hologram po analizie: odcisk unosi się nad kartą i obraca, a nad nim wisi
// tablica z wynikiem (holo-N.png, 640 x 360 px) zwrócona zawsze do kamery.
const LIFTED_PRINT_Y_M = 0.05;
const HOLO_WIDTH_M = 0.13;
const HOLO_HEIGHT_M = HOLO_WIDTH_M * (360 / 640);
const HOLO_Y_M = 0.12;

const CARD_IMAGES: Record<string, number> = {
  "SQ-SLAD-1": require("../../../../../assets/ar/dowod-1.png"),
  "SQ-SLAD-2": require("../../../../../assets/ar/dowod-2.png"),
  "SQ-SLAD-3": require("../../../../../assets/ar/dowod-3.png"),
  "SQ-SLAD-4": require("../../../../../assets/ar/dowod-4.png"),
};

const GLOW_IMAGES: Record<string, number> = {
  "SQ-SLAD-1": require("../../../../../assets/ar/slad-uv-1.png"),
  "SQ-SLAD-2": require("../../../../../assets/ar/slad-uv-2.png"),
  "SQ-SLAD-3": require("../../../../../assets/ar/slad-uv-3.png"),
  "SQ-SLAD-4": require("../../../../../assets/ar/slad-uv-4.png"),
};

const HOLO_IMAGES: Record<string, number> = {
  "SQ-SLAD-1": require("../../../../../assets/ar/holo-1.png"),
  "SQ-SLAD-2": require("../../../../../assets/ar/holo-2.png"),
  "SQ-SLAD-3": require("../../../../../assets/ar/holo-3.png"),
  "SQ-SLAD-4": require("../../../../../assets/ar/holo-4.png"),
};

function targetName(code: string) {
  return `forensic_${code.replace(/[^A-Za-z0-9]/g, "_")}`;
}

let isSetUp = false;

function setUpViro(viro: ViroModule) {
  if (isSetUp) {
    return;
  }
  isSetUp = true;
  viro.ViroARTrackingTargets.createTargets(
    Object.fromEntries(
      FORENSIC_SAMPLE_CASE.evidence.map((item) => [
        targetName(item.code),
        { source: CARD_IMAGES[item.code], orientation: "Up", physicalWidth: CARD_WIDTH_M, type: "Image" },
      ]),
    ),
  );
  viro.ViroMaterials.createMaterials({
    forensicBeam: { diffuseColor: "#c4a2ff", lightingModel: "Constant", blendMode: "Add", bloomThreshold: 0 },
  });
  viro.ViroAnimations.registerAnimations({
    forensicGlowDim: { properties: { opacity: 0.55 }, duration: 650, easing: "EaseInEaseOut" },
    forensicGlowBright: { properties: { opacity: 1 }, duration: 650, easing: "EaseInEaseOut" },
    forensicBeamDown: { properties: { positionZ: CARD_HEIGHT_M / 2 }, duration: 800, easing: "EaseInEaseOut" },
    forensicBeamUp: { properties: { positionZ: -CARD_HEIGHT_M / 2 }, duration: 800, easing: "EaseInEaseOut" },
    forensicLift: { properties: { positionY: LIFTED_PRINT_Y_M, opacity: 1 }, duration: 900, easing: "EaseOut" },
    forensicHoloIn: { properties: { positionY: HOLO_Y_M, opacity: 1 }, duration: 700, delay: 500, easing: "EaseOut" },
    forensicSpin: { properties: { rotateY: "+=90" }, duration: 900, easing: "Linear" },
    // Łańcuchy animacji — Viro je obsługuje, ale typy ich nie przewidują.
    forensicGlowPulse: [["forensicGlowDim", "forensicGlowBright"]] as never,
    forensicBeamSweep: [["forensicBeamDown", "forensicBeamUp"]] as never,
  });
}

// Scena Viro dostaje propsy tylko raz (viroAppProps), więc zebrane ślady
// dochodzą do niej przez prostą subskrypcję.
type CollectedListener = (codes: string[]) => void;
const collectedListeners = new Set<CollectedListener>();
let currentCollected: string[] = [];

function publishCollected(codes: string[]) {
  currentCollected = codes;
  collectedListeners.forEach((listener) => listener(codes));
}

type SceneAppProps = {
  onSeen: (code: string) => void;
  onLost: (code: string) => void;
};

function ForensicArScene(props: { sceneNavigator: { viroAppProps: SceneAppProps } }) {
  const viro = loadViro();
  const [collected, setCollected] = useState<string[]>(currentCollected);
  const [visible, setVisible] = useState<string[]>([]);
  const { onSeen, onLost } = props.sceneNavigator.viroAppProps;

  useEffect(() => {
    collectedListeners.add(setCollected);
    return () => {
      collectedListeners.delete(setCollected);
    };
  }, []);

  if (!viro) {
    return null;
  }

  const { ViroARScene, ViroARImageMarker, ViroImage, ViroNode, ViroQuad, ViroAmbientLight } = viro;

  const markSeen = (code: string) => {
    setVisible((current) => (current.includes(code) ? current : [...current, code]));
    onSeen(code);
  };
  const markLost = (code: string) => {
    setVisible((current) => current.filter((item) => item !== code));
    onLost(code);
  };

  return (
    <ViroARScene>
      <ViroAmbientLight color="#ffffff" />
      {FORENSIC_SAMPLE_CASE.evidence.map((item) => {
        const isCollected = collected.includes(item.code);
        const isVisible = visible.includes(item.code);
        return (
          <ViroARImageMarker
            key={item.code}
            target={targetName(item.code)}
            onAnchorFound={() => markSeen(item.code)}
            onAnchorUpdated={(anchor: { trackingMethod?: string }) => {
              if (anchor?.trackingMethod === "tracking") {
                if (!isVisible) {
                  markSeen(item.code);
                }
              } else if (isVisible) {
                markLost(item.code);
              }
            }}
            onAnchorRemoved={() => markLost(item.code)}
          >
            {isVisible ? (
              <ViroImage
                source={GLOW_IMAGES[item.code]}
                width={GLOW_WIDTH_M}
                height={GLOW_HEIGHT_M}
                position={[0, 0.002, GLOW_OFFSET_Z_M]}
                rotation={[-90, 0, 0]}
                animation={{ name: "forensicGlowPulse", run: !isCollected, loop: true }}
              />
            ) : null}
            {isVisible && !isCollected ? (
              // Wiązka skanera przesuwa się po karcie w trakcie analizy.
              <ViroQuad
                width={CARD_WIDTH_M * 1.1}
                height={0.004}
                position={[0, 0.004, -CARD_HEIGHT_M / 2]}
                rotation={[-90, 0, 0]}
                materials={["forensicBeam"]}
                animation={{ name: "forensicBeamSweep", run: true, loop: true }}
              />
            ) : null}
            {isVisible && isCollected ? (
              <>
                <ViroNode
                  position={[0, 0.004, GLOW_OFFSET_Z_M]}
                  opacity={0}
                  animation={{ name: "forensicLift", run: true, loop: false }}
                >
                  <ViroImage
                    source={GLOW_IMAGES[item.code]}
                    width={GLOW_WIDTH_M * 0.7}
                    height={GLOW_HEIGHT_M * 0.7}
                    animation={{ name: "forensicSpin", run: true, loop: true }}
                  />
                </ViroNode>
                <ViroNode
                  position={[0, LIFTED_PRINT_Y_M, GLOW_OFFSET_Z_M]}
                  opacity={0}
                  transformBehaviors={["billboardY"]}
                  animation={{ name: "forensicHoloIn", run: true, loop: false }}
                >
                  <ViroImage source={HOLO_IMAGES[item.code]} width={HOLO_WIDTH_M} height={HOLO_HEIGHT_M} />
                </ViroNode>
              </>
            ) : null}
          </ViroARImageMarker>
        );
      })}
    </ViroARScene>
  );
}

type ForensicArLayerProps = {
  collectedCodes: string[];
  onSeen: (code: string) => void;
  onLost: (code: string) => void;
};

export function ForensicArLayer({ collectedCodes, onSeen, onLost }: ForensicArLayerProps) {
  const viro = loadViro();

  useEffect(() => {
    publishCollected(collectedCodes);
  }, [collectedCodes]);

  if (!viro) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }
  setUpViro(viro);
  const { ViroARSceneNavigator } = viro;

  return (
    <ViroARSceneNavigator
      autofocus
      initialScene={{ scene: ForensicArScene as never }}
      viroAppProps={{ onSeen, onLost }}
      style={{ flex: 1 }}
    />
  );
}
