import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_UPDATED_EVENT,
  type CookieConsentState,
  promoteCookieConsentToStorage,
  resolveCookieConsentState,
} from "./cookie-consent";

/**
 * `undefined` means "not read yet" — on the server, and during hydration.
 * `null` means "read, and the visitor has not answered".
 *
 * The two have to stay distinct. Collapsing them into `null` would make the
 * server render the consent banner for everyone, including visitors who
 * accepted months ago, and they would watch it disappear a moment after the page
 * became interactive.
 */
export type CookieConsentSnapshot = CookieConsentState | null | undefined;

let snapshot: CookieConsentSnapshot;

function isSameState(a: CookieConsentState | null, b: CookieConsentState | null) {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return a.version === b.version && a.analytics === b.analytics && a.updatedAt === b.updatedAt;
}

/**
 * Replaces the cached snapshot only when the value actually changed.
 *
 * This is the whole reason the cache exists: `resolveCookieConsentState` builds
 * a fresh object every call, and `useSyncExternalStore` compares snapshots by
 * identity. Handing it a new object each time would re-render forever.
 */
function refresh() {
  const next = resolveCookieConsentState();

  // The first read always commits. Coalescing `undefined` to `null` here would
  // make "not read yet" compare equal to "read, no answer", and the snapshot
  // would never leave `undefined` for a visitor who has not chosen — the banner
  // would never open.
  if (snapshot === undefined || !isSameState(snapshot, next)) {
    snapshot = next;
  }
}

export function getCookieConsentSnapshot(): CookieConsentSnapshot {
  if (snapshot === undefined) {
    refresh();
  }

  return snapshot;
}

export function getServerCookieConsentSnapshot(): CookieConsentSnapshot {
  return undefined;
}

export function subscribeToCookieConsent(onStoreChange: () => void) {
  // Runs in the effect phase, so this is the right place for the one write.
  promoteCookieConsentToStorage();
  refresh();

  const handleUpdate = () => {
    refresh();
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === COOKIE_CONSENT_KEY) {
      handleUpdate();
    }
  };

  window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, handleUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, handleUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}
