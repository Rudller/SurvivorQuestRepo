import Constants from "expo-constants";

export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

export function compareSemver(a: string, b: string): number {
  const partsA = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const partsB = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let index = 0; index < length; index += 1) {
    const valueA = partsA[index] ?? 0;
    const valueB = partsB[index] ?? 0;

    if (valueA !== valueB) {
      return valueA < valueB ? -1 : 1;
    }
  }

  return 0;
}
