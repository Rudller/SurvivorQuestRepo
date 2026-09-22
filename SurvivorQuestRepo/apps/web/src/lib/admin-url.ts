/**
 * Adres panelu administracyjnego pokazywany w stopce landingu.
 *
 * Na produkcji admin stoi za tą samą domeną — `apps/admin` ma
 * `basePath: "/admin"`, a ekran logowania to trasa `(auth)/login`, czyli
 * `/admin/login`. Względna ścieżka wystarcza i przeżywa zmianę domeny.
 *
 * W dev to osobny serwer na porcie 3100 (patrz skrypt `dev` w `apps/admin`),
 * więc względny link trafiłby w pustkę pod `localhost:3000`.
 *
 * `NEXT_PUBLIC_ADMIN_URL` nadpisuje jedno i drugie — dla stagingu albo gdyby
 * panel wyprowadzić na własną subdomenę.
 */

const DEV_ADMIN_URL = "http://localhost:3100/admin/login";
const PROD_ADMIN_PATH = "/admin/login";

export function getAdminHref() {
  const candidate = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  if (candidate) {
    return candidate.replace(/\/+$/, "");
  }

  return process.env.NODE_ENV === "production" ? PROD_ADMIN_PATH : DEV_ADMIN_URL;
}
