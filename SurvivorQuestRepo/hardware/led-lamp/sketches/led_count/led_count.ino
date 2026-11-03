// Liczenie diod na pasku WS2812 (XIAO ESP32-C6, FastLED, dane na D6).
// MAX_LEDS celowo większe niż pasek: nadmiarowe dane po prostu przepadają.
//
// Na start: "linijka" - każda dioda słabo zielona, co 10. czerwona,
// co 50. niebieska, co 100. biała. Ostatnia świecąca = liczba diod.
//
// Komendy w Serial Monitor (115200, "New Line"):
//   liczba, np. 87  - zapala diody 1..87, dioda nr 87 świeci na czerwono
//   r               - wraca do linijki
//   c               - biegnąca dioda, numer każdej leci na Serial
#include <FastLED.h>

#define LED_PIN     D6
#define MAX_LEDS    600
#define BRIGHTNESS  60

CRGB leds[MAX_LEDS];

void ruler() {
  for (int i = 0; i < MAX_LEDS; i++) {
    int n = i + 1;  // numeracja od 1, tak jak się liczy na pasku
    if (n % 100 == 0)     leds[i] = CRGB::White;
    else if (n % 50 == 0) leds[i] = CRGB::Blue;
    else if (n % 10 == 0) leds[i] = CRGB::Red;
    else                  leds[i] = CRGB(0, 25, 0);
  }
  FastLED.show();
  Serial.println("Linijka: co 10 czerwona, co 50 niebieska, co 100 biala");
}

void upTo(int n) {
  n = constrain(n, 1, MAX_LEDS);
  FastLED.clear();
  for (int i = 0; i < n - 1; i++) leds[i] = CRGB(0, 25, 0);
  leds[n - 1] = CRGB::Red;
  FastLED.show();
  Serial.printf("Swieci 1..%d, nr %d na czerwono\n", n, n);
}

void chase() {
  Serial.println("Biegnaca dioda (wyslij cokolwiek, zeby przerwac)");
  for (int i = 0; i < MAX_LEDS; i++) {
    FastLED.clear();
    leds[i] = CRGB::White;
    FastLED.show();
    Serial.println(i + 1);
    delay(150);
    if (Serial.available()) break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, MAX_LEDS);
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 2000);
  ruler();
}

void loop() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  if (cmd == "r")      ruler();
  else if (cmd == "c") chase();
  else if (cmd.toInt() > 0) upTo(cmd.toInt());
}
