import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  API_BASE_URL_OVERRIDE_STORAGE_KEY,
  API_LAST_SUCCESSFUL_BASE_URL_STORAGE_KEY,
  normalizeApiBaseUrl,
  resolveSessionApiBaseUrl,
} from "./api-base-url";

// AsyncStorage has no global mock in this project's jest setup, and the real
// module needs the native side. A Map is all these tests exercise.
jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});

describe("normalizeApiBaseUrl", () => {
  it("assumes http for loopback and private ranges, https elsewhere", () => {
    expect(normalizeApiBaseUrl("localhost:3001")).toBe("http://localhost:3001");
    expect(normalizeApiBaseUrl("192.168.0.14:3001")).toBe("http://192.168.0.14:3001");
    expect(normalizeApiBaseUrl("api.survivorquest.pl")).toBe("https://api.survivorquest.pl");
  });

  it("keeps an explicit protocol and trims trailing slashes", () => {
    expect(normalizeApiBaseUrl("https://api.example.com/")).toBe("https://api.example.com");
    expect(normalizeApiBaseUrl("http://localhost:3001//")).toBe("http://localhost:3001");
  });

  // The cases that matter for a restored session: these are exactly what used
  // to become an empty base URL.
  it("answers null for an empty address", () => {
    expect(normalizeApiBaseUrl("")).toBeNull();
    expect(normalizeApiBaseUrl("   ")).toBeNull();
    expect(normalizeApiBaseUrl(null)).toBeNull();
    expect(normalizeApiBaseUrl(undefined)).toBeNull();
  });
});

describe("resolveSessionApiBaseUrl", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("keeps the address the session was created with", async () => {
    await AsyncStorage.setItem(API_BASE_URL_OVERRIDE_STORAGE_KEY, "http://192.168.0.9:3001");

    await expect(resolveSessionApiBaseUrl("http://localhost:3001")).resolves.toBe(
      "http://localhost:3001",
    );
  });

  // The reason this function exists: a session restored after a reload used to
  // fall back to an empty base and quietly request the API from its own origin.
  it("falls back to the stored override when the session has no address", async () => {
    await AsyncStorage.setItem(API_BASE_URL_OVERRIDE_STORAGE_KEY, "192.168.0.9:3001");

    await expect(resolveSessionApiBaseUrl(null)).resolves.toBe("http://192.168.0.9:3001");
  });

  it("falls back to the last address that answered when there is no override", async () => {
    await AsyncStorage.setItem(
      API_LAST_SUCCESSFUL_BASE_URL_STORAGE_KEY,
      "http://192.168.0.21:3001",
    );

    await expect(resolveSessionApiBaseUrl("   ")).resolves.toBe("http://192.168.0.21:3001");
  });

  it("answers null when nothing usable is stored anywhere", async () => {
    await expect(resolveSessionApiBaseUrl(undefined)).resolves.toBeNull();
  });
});
