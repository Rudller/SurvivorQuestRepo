// Materiały i animacje modeli 3D, rejestrowane w Viro raz na proces.
import type { loadViro } from "../forensic-evidence/forensic-ar-layer";
import { BOMB_WIRES } from "./ar-model-answer";

type ViroModule = NonNullable<ReturnType<typeof loadViro>>;

export const AR_MODEL_TEXTURES = {
  dial: require("../../../../../assets/ar/models/dial.png"),
  safeFront: require("../../../../../assets/ar/models/safe-front.png"),
  wood: require("../../../../../assets/ar/models/wood.png"),
  woodDark: require("../../../../../assets/ar/models/wood-dark.png"),
  tnt: require("../../../../../assets/ar/models/tnt.png"),
  symbols: [
    require("../../../../../assets/ar/models/symbol-0.png"),
    require("../../../../../assets/ar/models/symbol-1.png"),
    require("../../../../../assets/ar/models/symbol-2.png"),
    require("../../../../../assets/ar/models/symbol-3.png"),
  ],
};

export function wireMaterialName(key: string) {
  return `arWire_${BOMB_WIRES.findIndex((wire) => wire.key === key)}`;
}

let isSetUp = false;

export function setUpArModelViro(viro: ViroModule) {
  if (isSetUp) {
    return;
  }
  isSetUp = true;
  const lambert = (diffuseColor: string) => ({ diffuseColor, lightingModel: "Lambert" as const });
  viro.ViroMaterials.createMaterials({
    arSteel: lambert("#475569"),
    arSteelDark: lambert("#1e293b"),
    arSafeInside: lambert("#111827"),
    arSafeFront: { diffuseTexture: AR_MODEL_TEXTURES.safeFront, lightingModel: "Lambert" },
    arDial: { diffuseTexture: AR_MODEL_TEXTURES.dial, lightingModel: "Constant" },
    arPointer: { diffuseColor: "#ef4444", lightingModel: "Constant" },
    arGold: { diffuseColor: "#eab308", lightingModel: "Blinn", shininess: 2 },
    arWood: { diffuseTexture: AR_MODEL_TEXTURES.wood, lightingModel: "Lambert" },
    arWoodDark: { diffuseTexture: AR_MODEL_TEXTURES.woodDark, lightingModel: "Lambert" },
    arBrass: lambert("#b8860b"),
    arTnt: { diffuseTexture: AR_MODEL_TEXTURES.tnt, lightingModel: "Lambert" },
    arTimer: lambert("#0b0f19"),
    arCopper: { diffuseColor: "#d97706", lightingModel: "Constant" },
    arFire: { diffuseColor: "#f97316", lightingModel: "Constant", blendMode: "Add" },
    arFireCore: { diffuseColor: "#fde68a", lightingModel: "Constant", blendMode: "Add" },
    arSmoke: { diffuseColor: "#334155", lightingModel: "Constant" },
    arTreasure: { diffuseColor: "#fbbf24", lightingModel: "Constant", bloomThreshold: 0 },
    ...Object.fromEntries(BOMB_WIRES.map((wire, index) => [`arWire_${index}`, lambert(wire.color)])),
    ...Object.fromEntries(
      AR_MODEL_TEXTURES.symbols.map((source, index) => [
        `arSymbol_${index}`,
        { diffuseTexture: source, lightingModel: "Constant" },
      ]),
    ),
  });
  viro.ViroAnimations.registerAnimations({
    arPopIn: { properties: { scaleX: 1, scaleY: 1, scaleZ: 1 }, duration: 450, easing: "Bounce" },
    arSafeDoorOpen: { properties: { rotateY: -110 }, duration: 1400, easing: "EaseOut" },
    arLidOpen: { properties: { rotateX: -105 }, duration: 1200, easing: "EaseOut" },
    arShakeLeft: { properties: { positionX: "-=0.012" }, duration: 60, easing: "Linear" },
    arShakeRight: { properties: { positionX: "+=0.024" }, duration: 60, easing: "Linear" },
    arShakeBack: { properties: { positionX: "-=0.012" }, duration: 60, easing: "Linear" },
    arBoomGrow: {
      properties: { scaleX: 9, scaleY: 9, scaleZ: 9, opacity: 0 },
      duration: 900,
      easing: "EaseOut",
    },
    arSmokeRise: {
      properties: { positionY: "+=0.25", scaleX: 6, scaleY: 6, scaleZ: 6, opacity: 0 },
      duration: 1600,
      easing: "EaseOut",
    },
    arTreasureSpin: { properties: { rotateY: "+=90" }, duration: 800, easing: "Linear" },
    // Łańcuch animacji — Viro go obsługuje, ale typy go nie przewidują.
    arShake: [["arShakeLeft", "arShakeRight", "arShakeBack", "arShakeLeft", "arShakeRight", "arShakeBack"]] as never,
  });
}
