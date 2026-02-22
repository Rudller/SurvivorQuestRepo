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

1. Tap `Load bootstrap`
2. Keep default join code (`BL2026`) or use one from bootstrap
3. Tap `Join session`
4. Tap `Randomize team`
5. Tap `Refresh state`

## 5) Verify in admin

Open `Aktualna realizacja` in admin and watch team/event updates.

## Notes

- `localhost` from a real phone points to the phone, not your PC.
- Use PC LAN IP and keep both devices on the same Wi-Fi network.
