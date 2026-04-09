# Mobile MVP - Live testing

## 1) Configure API base URL

Create `.env.local` in this folder with:

```
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_LAN_IP:3001
```

Example:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.18.2:3001
EXPO_PUBLIC_MAP_WEBVIEW_BASE_URL=https://survivorquest.app
EXPO_PUBLIC_MAP_WEBVIEW_USER_AGENT=SurvivorQuestMobile/1.0 (+https://survivorquest.app; contact: maps@survivorquest.app)
EXPO_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

## 2) Start backend API

From repo root:

- `pnpm dev:backend`

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
5. Po zapisie aplikacja przechodzi do etapu docelowego: mapa (`react-native-maps`), status sesji (`/api/mobile/session/state`),
   synchronizacja pozycji (`/api/mobile/team/location`) i akcje stacji (`/api/mobile/task/complete`)

## 5) Verify in admin

Open `Aktualna realizacja` in admin and watch team/event updates.

## Notes

- `localhost` from a real phone points to the phone, not your PC.
- Use PC LAN IP and keep both devices on the same Wi-Fi network.
