# Mobile MVP - Live testing

## 1) Configure API base URL

Create `.env.local` in this folder with:

```
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_LAN_IP:3000
```

Example:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000
```

## 2) Start admin (mock API host)

In `apps/admin`:

- `pnpm dev` (or your current dev command)

## 3) Start mobile

From repo root:

- `pnpm --filter mobile start`

or directly in `apps/mobile`:

- `pnpm start`
- open Expo Go or emulator

## 4) Test flow in mobile app

1. Wpisz kod realizacji i aktywuj (`/api/mobile/bootstrap` + `/api/mobile/session/join`)
2. App wykonuje auto-przydział pierwszej dostępnej drużyny
3. W etapie 2 zobaczysz komunikat o przydziale i możesz zmienić drużynę z popup listy
4. W etapie 3 użytkownik uzupełnia nazwę/kolor/ikonę i zapisuje ustawienia (`/api/mobile/team/claim`)

## 5) Verify in admin

Open `Aktualna realizacja` in admin and watch team/event updates.

## Notes

- `localhost` from a real phone points to the phone, not your PC.
- Use PC LAN IP and keep both devices on the same Wi-Fi network.
- Kod `TEST` odświeża izolowany snapshot mobilnego backendu na podstawie aktualnych mocków realizacji z panelu admina.
