// 9 efektów na WS2812 (XIAO ESP32-C6, FastLED, dane na D6).
// Działa na matrycy 16x16 i na pasku nawiniętym spiralnie na walec:
// efekty rysują na siatce WIDTH x HEIGHT, a XY() tłumaczy ją na numer diody.
//
// Sterowanie w Serial Monitor (115200, "New Line"):
//   1..9  - wybór efektu          a - auto zmiana co 15 s (wł./wył.)
//   + / - - jasność
// Przycisk BOOT na płytce - następny efekt.
#include <FastLED.h>

// ---- KONFIGURACJA ----
#define LED_PIN     D6
#define NUM_LEDS    256    // ile diod na pasku (z liczenia)
#define WIDTH       16     // walec: diod na jeden obwód; matryca: 16
#define SERPENTINE  false  // true dla matrycy 16x16 (co drugi wiersz odwrócony), false dla walca
#define FLIP_Y      false  // true, jeśli ogień leci w dół zamiast w górę
#define BRIGHTNESS  60
#define MAX_MA      2000
#define BUTTON_PIN  9      // BOOT na XIAO C6
// ----------------------

#define HEIGHT ((NUM_LEDS + WIDTH - 1) / WIDTH)
#define GRID   (WIDTH * HEIGHT)

CRGB leds[NUM_LEDS];
CRGB grid[GRID];       // logiczna siatka, y = 0 to dół
uint8_t heat[GRID];    // dla ognia

uint8_t effect = 1;
bool autoCycle = true;
uint8_t brightness = BRIGHTNESS;

inline CRGB &cell(uint8_t x, uint8_t y) { return grid[y * WIDTH + x]; }

uint16_t XY(uint8_t x, uint8_t y) {
  uint8_t row = FLIP_Y ? (HEIGHT - 1 - y) : y;
  if (SERPENTINE && (row & 1)) return row * WIDTH + (WIDTH - 1 - x);
  return row * WIDTH + x;
}

void render() {
  for (uint8_t y = 0; y < HEIGHT; y++)
    for (uint8_t x = 0; x < WIDTH; x++) {
      uint16_t i = XY(x, y);
      if (i < NUM_LEDS) leds[i] = cell(x, y);
    }
  FastLED.show();
}

// 1. Płynąca tęcza
void rainbowWave() {
  uint8_t t = millis() / 10;
  for (uint8_t y = 0; y < HEIGHT; y++)
    for (uint8_t x = 0; x < WIDTH; x++)
      cell(x, y) = CHSV(t + x * 255 / WIDTH + y * 6, 255, 255);
}

// 2-5. Ogień (Fire2012 w każdej kolumnie), kolor z palety
const CRGBPalette16 greenFire(CRGB::Black, CRGB(0, 90, 0), CRGB(40, 255, 0), CRGB(200, 255, 120));
const CRGBPalette16 yellowFire(CRGB::Black, CRGB(140, 50, 0), CRGB(255, 170, 0), CRGB(255, 255, 140));
const CRGBPalette16 redFire(CRGB::Black, CRGB(120, 0, 0), CRGB(255, 0, 0), CRGB(255, 90, 0));
const CRGBPalette16 pinkFire(CRGB::Black, CRGB(90, 0, 60), CRGB(255, 20, 140), CRGB(255, 170, 220));

void fire(const CRGBPalette16 &pal, uint8_t cooling, uint8_t sparking, bool flicker) {
  for (uint8_t x = 0; x < WIDTH; x++) {
    uint8_t *col = &heat[x];  // kolumna x: heat[y * WIDTH + x]
    for (uint8_t y = 0; y < HEIGHT; y++)
      col[y * WIDTH] = qsub8(col[y * WIDTH], random8(0, ((cooling * 10) / HEIGHT) + 2));
    for (int y = HEIGHT - 1; y >= 2; y--)
      col[y * WIDTH] = (col[(y - 1) * WIDTH] + col[(y - 2) * WIDTH] * 2) / 3;
    if (random8() < sparking) {
      uint8_t y = random8(min(3, HEIGHT));
      col[y * WIDTH] = qadd8(col[y * WIDTH], random8(160, 255));
    }
    for (uint8_t y = 0; y < HEIGHT; y++) {
      CRGB c = ColorFromPalette(pal, scale8(col[y * WIDTH], 240));
      if (flicker) c.nscale8(random8(150, 255));
      cell(x, y) = c;
    }
  }
}

// 6. Różowy puls całości
void pinkPulse() {
  fill_solid(grid, GRID, CHSV(235, 210, beatsin8(20, 20, 255)));
}

// 7. Plazma / lawa
void plasma() {
  uint32_t t = millis() / 4;
  for (uint8_t y = 0; y < HEIGHT; y++)
    for (uint8_t x = 0; x < WIDTH; x++) {
      uint8_t n = inoise8(x * 40, y * 40, t);
      cell(x, y) = ColorFromPalette(RainbowColors_p, n * 2 + t / 8);
    }
}

// 8. Matrix: krople spadają w dół, za nimi gasnący zielony ślad
void matrixRain() {
  static uint32_t last = 0;
  if (millis() - last < 70) return;
  last = millis();
  for (uint8_t x = 0; x < WIDTH; x++) {
    CRGB top = cell(x, HEIGHT - 1);
    for (uint8_t y = 0; y < HEIGHT - 1; y++) cell(x, y) = cell(x, y + 1);
    if (random8() < 18) cell(x, HEIGHT - 1) = CRGB(170, 255, 170);  // głowa kropli
    else cell(x, HEIGHT - 1) = CRGB(0, scale8(top.g, 175), 0);       // ślad
  }
}

// 9. Losowe iskry
void sparkles() {
  fadeToBlackBy(grid, GRID, 35);
  for (uint8_t k = 0; k < 1 + GRID / 64; k++)
    if (random8() < 120) grid[random16(GRID)] = CHSV(random8(), 190, 255);
}

const char *NAMES[] = {"", "Rainbow Wave", "Green Fire", "Yellow Fire", "Red Fire",
                       "Pink Fire", "Pink Pulse", "Plasma", "Matrix Rain", "Sparkles"};

void setEffect(uint8_t e) {
  effect = e;
  fill_solid(grid, GRID, CRGB::Black);
  memset(heat, 0, sizeof(heat));
  Serial.printf("Efekt %d: %s\n", effect, NAMES[effect]);
}

void drawEffect() {
  switch (effect) {
    case 1: rainbowWave(); break;
    case 2: fire(greenFire, 55, 120, false); break;
    case 3: fire(yellowFire, 55, 120, false); break;
    case 4: fire(redFire, 50, 140, false); break;
    case 5: fire(pinkFire, 60, 110, true); break;
    case 6: pinkPulse(); break;
    case 7: plasma(); break;
    case 8: matrixRain(); break;
    case 9: sparkles(); break;
  }
}

void handleInput() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c >= '1' && c <= '9') setEffect(c - '0');
    else if (c == 'a') { autoCycle = !autoCycle; Serial.printf("Auto: %s\n", autoCycle ? "wl" : "wyl"); }
    else if (c == '+') { brightness = qadd8(brightness, 20); FastLED.setBrightness(brightness); Serial.printf("Jasnosc %d\n", brightness); }
    else if (c == '-') { brightness = qsub8(brightness, 20); FastLED.setBrightness(brightness); Serial.printf("Jasnosc %d\n", brightness); }
  }
  static bool wasPressed = false;
  static uint32_t pressedAt = 0;
  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  if (pressed && !wasPressed && millis() - pressedAt > 250) {
    pressedAt = millis();
    setEffect(effect % 9 + 1);
  }
  wasPressed = pressed;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(brightness);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, MAX_MA);
  Serial.printf("Siatka %d x %d\n", WIDTH, HEIGHT);
  setEffect(1);
}

void loop() {
  handleInput();
  EVERY_N_SECONDS(15) { if (autoCycle) setEffect(effect % 9 + 1); }
  EVERY_N_MILLISECONDS(20) {  // ~50 FPS
    drawEffect();
    render();
  }
}
