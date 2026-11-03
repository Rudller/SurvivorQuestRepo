# Lampka LED Ryzykantów

Lampka na stół drużyny: Seeed XIAO ESP32-C6 + matryca WS2812B 10x16 (dane na D6 = GPIO16).
Tablet drużyny steruje nią po BLE (Nordic UART Service), kod po stronie aplikacji:
`apps/mobile/src/features/risk-quiz/lamp/`.

## Szkice (`sketches/`)

| Szkic | Do czego |
|---|---|
| `led_matrix_ble` | **Firmware lampki** — efekty + sterowanie z tabletu po BLE |
| `led_test_256` | Test matrycy 16x16 |
| `led_count` | Liczenie diod na pasku („linijka”, numer diody z Serial) |
| `led_effects` | 9 efektów bez BLE, sterowane z Serial i przyciskiem BOOT |

## Wgrywanie

Podłącz lampkę kablem USB (z danymi) i:

- dwuklik `flash.cmd` — wgrywa `led_matrix_ble`, port wykrywa sam,
- albo w terminalu:

```powershell
.\flash.ps1                  # firmware lampki
.\flash.ps1 led_test_256     # inny szkic
.\flash.ps1 -Port COM7       # konkretny port
.\flash.ps1 -CompileOnly     # tylko kompilacja
.\flash.ps1 -Monitor         # po wgraniu podgląd Serial (115200)
.\flash.ps1 -List            # lista szkiców
```

Wymaga Arduino IDE (skrypt używa dołączonego `arduino-cli`), core `esp32` i biblioteki FastLED.
Jeśli wgrywanie nie przechodzi: zamknij Serial Monitor w IDE (trzyma port) albo podłącz płytkę z wciśniętym BOOT.

FastLED 3.10.7 nie kompiluje się na C6 z core esp32 3.3.12 bez flagi `-DFL_NO_EXCEPT=` —
skrypt sam dopisuje ją do `platform.local.txt` core'a, jeśli jej brakuje (np. po aktualizacji core).

## Stany gry (komendy z tabletu)

| Komenda | Stan |
|---|---|
| `idle` | tęcza — drużyna nie wybrała jeszcze koloru (też stan po włączeniu) |
| `cRRGGBB` | fala w kolorze drużyny (np. `cf59e0b`) — customizacja i czekanie na kartę |
| `team` | fala w zapamiętanym kolorze (tęcza, jeśli koloru jeszcze nie było) |
| `easy` / `medium` / `hard` | ogień zielony / żółty / czerwony — karta wg trudności |
| `hard 45/60` | j.w. z czasem: zostało 45 z 60 s. Lampa odlicza sama, ogień opada, ostatnie 10 s pulsuje coraz szybciej |
| `ok` / `bad` | 3 mignięcia na zielono / czerwono, potem sama wraca do fali |
| `timeout` | pomarańczowe gaśnięcie od góry, potem 3 czerwone mignięcia (jak `bad`) i fala |
| `lost` | niebieski oddech — włącza się sam po zerwaniu połączenia z tabletem |

Mapowanie zdarzeń gry na te komendy: `apps/mobile/src/features/risk-quiz/lamp/risk-lamp.ts`.

## Komendy testowe (Serial)

| Komenda | Efekt |
|---|---|
| `1`–`9` | efekt po numerze |
| `0` | tryb auto, zmiana efektu co 15 s |
| `b0`–`b255` | jasność |
| `off` | zgaś |
| `?` | menu |

Lampa ogłasza się jako `SQ-Lampa-XXXX` (końcówka MAC).
