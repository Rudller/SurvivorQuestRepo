// Test matrycy 16x16 WS2812 (256 diod) na XIAO ESP32-C6, FastLED.
// Dane na pinie D6. Sekwencja w pętli, opis bieżącego kroku na Serial (115200).
#include <FastLED.h>

#define LED_PIN     D6
#define WIDTH       16
#define HEIGHT      16
#define NUM_LEDS    (WIDTH * HEIGHT)
#define BRIGHTNESS  40     // 0-255; 256 diod na białym przy 255 to ~15 A, trzymaj nisko
#define MAX_MA      2000   // limit prądu liczony przez FastLED (zasilanie z USB/powerbanku)
#define SERPENTINE  true   // większość matryc 16x16 ma co drugi wiersz odwrócony

CRGB leds[NUM_LEDS];

uint16_t XY(uint8_t x, uint8_t y) {
  if (SERPENTINE && (y & 1)) return y * WIDTH + (WIDTH - 1 - x);
  return y * WIDTH + x;
}

void step(const char *name) {
  Serial.printf("[%lu ms] %s\n", millis(), name);
}

void solid(CRGB c, const char *name) {
  step(name);
  fill_solid(leds, NUM_LEDS, c);
  FastLED.show();
  delay(1000);
}

// Jedna dioda po kolei: sprawdza, czy każda z 256 działa i czy nie ma przerwy w łańcuchu.
void chase() {
  step("chase: kolejne diody 0..255");
  for (int i = 0; i < NUM_LEDS; i++) {
    FastLED.clear();
    leds[i] = CRGB::White;
    FastLED.show();
    delay(8);
  }
}

// Wiersz po wierszu przez XY(): jeśli linia skacze zygzakiem, zmień SERPENTINE.
void rows() {
  step("rows: wiersze przez XY() (test ukladu serpentine)");
  for (uint8_t y = 0; y < HEIGHT; y++) {
    FastLED.clear();
    for (uint8_t x = 0; x < WIDTH; x++) leds[XY(x, y)] = CRGB::Green;
    FastLED.show();
    delay(120);
  }
}

// Narożniki: (0,0) czerwony, (15,0) zielony, (0,15) niebieski, (15,15) biały.
void corners() {
  step("corners: (0,0)=R (15,0)=G (0,15)=B (15,15)=W");
  FastLED.clear();
  leds[XY(0, 0)] = CRGB::Red;
  leds[XY(WIDTH - 1, 0)] = CRGB::Green;
  leds[XY(0, HEIGHT - 1)] = CRGB::Blue;
  leds[XY(WIDTH - 1, HEIGHT - 1)] = CRGB::White;
  FastLED.show();
  delay(2500);
}

void rainbow() {
  step("rainbow: tecza po przekatnej, 5 s (pomiar FPS)");
  uint32_t start = millis(), frames = 0;
  uint8_t hue = 0;
  while (millis() - start < 5000) {
    for (uint8_t y = 0; y < HEIGHT; y++)
      for (uint8_t x = 0; x < WIDTH; x++)
        leds[XY(x, y)] = CHSV(hue + (x + y) * 8, 255, 255);
    FastLED.show();
    hue += 2;
    frames++;
  }
  Serial.printf("  FPS: %.1f\n", frames / 5.0f);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, MAX_MA);
  FastLED.clear(true);
  Serial.println("LED test 256 (16x16) start");
}

void loop() {
  solid(CRGB::Red, "solid: czerwony");
  solid(CRGB::Green, "solid: zielony");
  solid(CRGB::Blue, "solid: niebieski");
  solid(CRGB::White, "solid: bialy");
  chase();
  rows();
  corners();
  rainbow();
  solid(CRGB::Black, "off");
}
