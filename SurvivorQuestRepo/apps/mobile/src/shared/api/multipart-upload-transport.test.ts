/**
 * Zdjęcia (selfie drużyny i zadania fotograficzne) lecą jako multipart z częścią
 * w reactnative'owym kształcie `{ uri, name, type }`. Expo SDK 57 podmienia
 * globalny `fetch` na własny, a jego serializer FormData tego kształtu nie zna i
 * rzuca "Unsupported FormDataPart implementation" — upload pada, zanim request
 * wyjdzie z telefonu.
 *
 * `EXPO_PUBLIC_USE_RN_FETCH=1` zostawia globalny `fetch` w wersji React Native,
 * czyli tak jak było do SDK 54. Jest to jedyna rzecz, która trzyma upload przy
 * życiu, a że to zwykła zmienna środowiskowa, to bardzo łatwo ją zgubić przy
 * kolejnej zmianie konfiguracji — stąd ten test.
 */

// `types` w tsconfig jest zawężone do react/react-native/jest, żeby globalne
// typy Node nie wyciekały do kodu apki. Ten test czyta pliki konfiguracyjne, więc
// deklaruje sobie tylko to, czego naprawdę używa.
declare const __dirname: string;
declare function require(id: string): unknown;

const { readFileSync } = require("fs") as { readFileSync(path: string, encoding: "utf8"): string };
const { join } = require("path") as { join(...parts: string[]): string };

const MOBILE_ROOT = join(__dirname, "..", "..", "..");
const RN_FETCH_FLAG = "EXPO_PUBLIC_USE_RN_FETCH";

function readMobileFile(relativePath: string) {
  return readFileSync(join(MOBILE_ROOT, relativePath), "utf8");
}

describe("transport uploadu zdjęć", () => {
  it("każdy profil builda EAS wymusza fetch Reacta Native", () => {
    const easConfig = JSON.parse(readMobileFile("eas.json")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };

    const profiles = Object.entries(easConfig.build);
    expect(profiles.length).toBeGreaterThan(0);

    for (const [profileName, profile] of profiles) {
      expect(`${profileName}: ${profile.env?.[RN_FETCH_FLAG]}`).toBe(`${profileName}: 1`);
    }
  });

  it("przykładowy plik env dokumentuje flagę, żeby dev też jej nie zgubił", () => {
    expect(readMobileFile(".env.example")).toContain(`${RN_FETCH_FLAG}=1`);
  });
});
