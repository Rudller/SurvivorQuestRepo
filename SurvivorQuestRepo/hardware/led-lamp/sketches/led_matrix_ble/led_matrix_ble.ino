
#include <FastLED.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>

// ========== KONFIGURACJA ==========

#define DATA_PIN 16       // XIAO ESP32-C6: D6
#define WIDTH 10
#define HEIGHT 16
#define NUM_LEDS (WIDTH * HEIGHT)

#define LED_TYPE WS2812B
#define COLOR_ORDER GRB

#define BRIGHTNESS 40
#define POWER_LIMIT_MA 2000
#define FRAME_MS 33

// Czas rozjasniania nowej animacji (fade in)
#define FADE_IN_MS 350

// ========== BLE ==========

// Nordic UART Service - rozumie go np. aplikacja "nRF Connect"
// albo "Serial Bluetooth Terminal" na telefonie
#define SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define RX_UUID      "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"  // telefon -> plytka
#define TX_UUID      "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"  // plytka -> telefon

// Nazwa widoczna przy skanowaniu: "SQ-Lampa-XXXX",
// XXXX = koncowka adresu MAC, zeby odroznic lampy
#define BLE_NAME_PREFIX "SQ-Lampa-"

#define BLE_CMD_MAX 20

// ========== UKLAD MATRYCY ==========

// true = LED-y ulozone wezykiem
const bool SERPENTINE = true;

// false = poziome rzedy
// true = pionowe kolumny
const bool COLUMN_MAJOR = false;

// Pozycja pierwszej diody
const bool FIRST_LED_BOTTOM = true;
const bool FIRST_LED_RIGHT = false;

// ========== ZMIENNE ==========

CRGB leds[NUM_LEDS];

uint8_t heat[HEIGHT][WIDTH] = {};
int8_t rainY[WIDTH] = {};
uint8_t rainStep = 0;

uint8_t currentEffect = 1;

// Kolor druzyny wybrany na tablecie (komenda "cRRGGBB")
CRGB teamColor = CRGB(245, 158, 11);
// Dopoki tablet nie poda koloru, stan spoczynku to teczowa fala
bool hasTeamColor = false;
bool autoMode = false;

// Czas na karte: tablet podaje go raz ("easy 45/60"), dalej lampa
// odlicza sama. Ogien opada razem z uplywem czasu.
bool timerActive = false;
uint32_t timerEndMs = 0;
uint32_t timerTotalMs = 0;
// Ostatnie sekundy - lampa zaczyna pulsowac
const uint32_t URGENT_MS = 10000;

// Efekty jednorazowe (mrugniecia, koniec czasu) po zakonczeniu
// same wracaja do stanu spoczynku - tablet nie musi nic dosylac.
uint32_t oneShotStartMs = 0;
CRGB flashColor = CRGB::Green;
const uint8_t FLASH_COUNT = 3;
const uint32_t FLASH_ON_MS = 220;
const uint32_t FLASH_OFF_MS = 180;
const uint32_t TIMEOUT_FADE_MS = 1600;

// Rozlaczenie przychodzi z watku BLE - obslugujemy je w loop()
volatile bool bleLostPending = false;
uint8_t brightness = BRIGHTNESS;

uint32_t lastFrameMs = 0;
uint32_t lastAutoMs = 0;

// Fade in: od zmiany efektu jasnosc rosnie od 0 do "brightness"
uint32_t fadeStartMs = 0;
bool lampOff = false;

const uint32_t AUTO_INTERVAL_MS = 15000;
const uint8_t EFFECT_COUNT = 9;

BLECharacteristic *txChar = nullptr;
bool bleConnected = false;

// Komendy z BLE przychodza w osobnym watku,
// wiec trafiaja do kolejki i sa wykonywane w loop()
struct BleCommand {
  char text[BLE_CMD_MAX + 1];
};

QueueHandle_t bleQueue;

// ========== PALETY OGNIA ==========

const CRGBPalette16 GREEN_FIRE(
  CRGB::Black,
  CRGB(0, 35, 3),
  CRGB(0, 200, 32),
  CRGB(170, 255, 180)
);

const CRGBPalette16 YELLOW_FIRE(
  CRGB::Black,
  CRGB(65, 18, 0),
  CRGB(245, 130, 0),
  CRGB(255, 245, 110)
);

const CRGBPalette16 RED_FIRE(
  CRGB::Black,
  CRGB(55, 0, 0),
  CRGB(235, 4, 0),
  CRGB(255, 95, 23)
);

const CRGBPalette16 PINK_FIRE(
  CRGB::Black,
  CRGB(60, 0, 25),
  CRGB(235, 0, 110),
  CRGB(255, 155, 220)
);

// ========== MAPOWANIE MATRYCY ==========

// Wspolrzedne logiczne:
// X = kolumna
// Y = wiersz
// (0,0) = lewy gorny rog

uint16_t XY(uint8_t x, uint8_t y) {

  if (FIRST_LED_RIGHT)
    x = WIDTH - 1 - x;

  if (FIRST_LED_BOTTOM)
    y = HEIGHT - 1 - y;

  if (COLUMN_MAJOR) {

    if (SERPENTINE && (x & 1))
      y = HEIGHT - 1 - y;

    return (uint16_t)x * HEIGHT + y;

  } else {

    if (SERPENTINE && (y & 1))
      x = WIDTH - 1 - x;

    return (uint16_t)y * WIDTH + x;
  }
}

// ========== 1. RAINBOW WAVE ==========

void drawRainbowWave() {

  uint8_t shift = millis() / 22;
  uint8_t bend = millis() / 16;

  for (uint8_t y = 0; y < HEIGHT; y++) {
    for (uint8_t x = 0; x < WIDTH; x++) {

      uint8_t ripple =
        sin8(x * 19 + y * 13 + bend) / 5;

      uint8_t hue =
        x * 13 + y * 7 + shift + ripple;

      leds[XY(x, y)] = CHSV(hue, 255, 255);
    }
  }
}

// ========== 2-5. FIRE ==========

// Symulacja ognia 2D.
// Plomienie unosza sie od dolu do gory.

void drawFire(const CRGBPalette16 &palette) {

  // Chlodzenie
  for (uint8_t y = 0; y < HEIGHT; y++) {
    for (uint8_t x = 0; x < WIDTH; x++) {

      heat[y][x] = qsub8(
        heat[y][x],
        random8(0, 24)
      );
    }
  }

  // Unoszenie ciepla
  for (uint8_t y = 0; y < HEIGHT - 1; y++) {
    for (uint8_t x = 0; x < WIDTH; x++) {

      uint8_t left =
        (x == 0) ? 0 : x - 1;

      uint8_t right =
        (x == WIDTH - 1) ? WIDTH - 1 : x + 1;

      uint16_t value =
          (uint16_t)heat[y + 1][x] * 2
        + heat[y + 1][left]
        + heat[y + 1][right];

      heat[y][x] = value / 4;
    }
  }

  // Generowanie plomieni na dole
  for (uint8_t x = 0; x < WIDTH; x++) {

    if (random8() < 185) {

      heat[HEIGHT - 1][x] = qadd8(
        heat[HEIGHT - 1][x],
        random8(90, 190)
      );
    }
  }

  // Temperatura na kolor
  for (uint8_t y = 0; y < HEIGHT; y++) {
    for (uint8_t x = 0; x < WIDTH; x++) {

      uint8_t colorIndex =
        scale8(heat[y][x], 240);

      leds[XY(x, y)] = ColorFromPalette(
        palette,
        colorIndex,
        255,
        LINEARBLEND
      );
    }
  }
}

// ========== 6. PINK PULSE ==========

void drawPinkPulse() {

  uint8_t pulse = sin8(millis() / 13);

  uint8_t light = map8(
    pulse,
    35,
    255
  );

  fill_solid(
    leds,
    NUM_LEDS,
    CHSV(226, 220, light)
  );
}

// ========== 7. PLASMA ==========

void drawPlasma() {

  uint16_t t = millis() / 9;

  for (uint8_t y = 0; y < HEIGHT; y++) {
    for (uint8_t x = 0; x < WIDTH; x++) {

      uint8_t n = inoise8(
        (uint16_t)x * 45,
        (uint16_t)y * 45,
        t
      );

      uint8_t hue = n + (t / 5);
      uint8_t value = 180 + scale8(n, 75);

      leds[XY(x, y)] = CHSV(
        hue,
        235,
        value
      );
    }
  }
}

// ========== 8. MATRIX RAIN ==========

void drawMatrixRain() {

  fadeToBlackBy(
    leds,
    NUM_LEDS,
    35
  );

  rainStep++;

  if (rainStep & 1)
    return;

  for (uint8_t x = 0; x < WIDTH; x++) {

    if (rainY[x] >= 0 && rainY[x] < HEIGHT) {

      leds[XY(x, (uint8_t)rainY[x])] =
        CRGB(40, 255, 75);
    }

    rainY[x]++;

    if (rainY[x] >= HEIGHT) {

      rainY[x] = -(int8_t)random8(
        2,
        HEIGHT + 1
      );
    }
  }
}

// ========== 9. SPARKLES ==========

void drawSparkles() {

  fadeToBlackBy(
    leds,
    NUM_LEDS,
    45
  );

  for (uint8_t i = 0; i < 3; i++) {

    uint8_t x = random8(WIDTH);
    uint8_t y = random8(HEIGHT);

    leds[XY(x, y)] = CHSV(
      random8(),
      190,
      255
    );
  }
}

// ========== 10. FALA W KOLORZE DRUZYNY ==========

// Jasne pasy w kolorze druzyny plyna od dolu do gory,
// lekko pochylone, z delikatnym przesunieciem odcienia.
void drawTeamColor() {

  uint16_t t = millis() / 6;

  CHSV base = rgb2hsv_approximate(teamColor);

  for (uint8_t y = 0; y < HEIGHT; y++) {
    for (uint8_t x = 0; x < WIDTH; x++) {

      uint8_t phase = (HEIGHT - 1 - y) * 18 + x * 6;

      uint8_t wave = sin8(phase - t);
      uint8_t level = map8(scale8(wave, wave), 45, 255);

      int8_t hueShift = (int8_t)(sin8(phase / 2 + t / 3) / 16) - 8;

      leds[XY(x, y)] = CHSV(
        base.hue + hueShift,
        base.sat,
        scale8(base.val, level)
      );
    }
  }
}

// ========== 11. MRUGNIECIA (dobra / zla odpowiedz) ==========

// FLASH_COUNT blyskow w kolorze flashColor. Zwraca true po ostatnim.
bool drawFlash() {

  uint32_t elapsed = millis() - oneShotStartMs;
  uint32_t period = FLASH_ON_MS + FLASH_OFF_MS;

  if (elapsed >= period * FLASH_COUNT)
    return true;

  bool on = (elapsed % period) < FLASH_ON_MS;

  fill_solid(leds, NUM_LEDS, on ? flashColor : CRGB::Black);

  return false;
}

// ========== 12. KONIEC CZASU ==========

// Pomaranczowe swiatlo gasnie od gory do dolu. Zwraca true po wygaszeniu.
bool drawTimeoutFade() {

  uint32_t elapsed = millis() - oneShotStartMs;

  if (elapsed >= TIMEOUT_FADE_MS)
    return true;

  // 0..255 - jak daleko od gory doszlo gaszenie
  uint16_t progress = elapsed * 255 / TIMEOUT_FADE_MS;

  for (uint8_t y = 0; y < HEIGHT; y++) {

    // Gorne wiersze gasna pierwsze
    uint16_t rowStart = (uint16_t)y * 160 / HEIGHT;
    uint8_t level =
      progress <= rowStart ? 255 : (uint8_t)max(0, 255 - (int)(progress - rowStart) * 3);

    for (uint8_t x = 0; x < WIDTH; x++)
      leds[XY(x, y)] = CRGB(255, 110, 0).nscale8_video(level);
  }

  return false;
}

// ========== 13. BRAK POLACZENIA ==========

// Powolny niebieski oddech - prowadzacy widzi, ktory stol zgubil tablet.
void drawLost() {

  uint8_t breath = map8(sin8(millis() / 12), 25, 255);

  fill_solid(leds, NUM_LEDS, CRGB(0, 60, 255).nscale8_video(breath));
}

// ========== CZAS NA KARTE ==========

// Ogien siega tylko tak wysoko, ile czasu zostalo. Gorne wiersze gasna,
// wiersz na granicy jest przyciemniony, zeby opadanie bylo plynne.
void applyTimerMask() {

  if (!timerActive || timerTotalMs == 0)
    return;

  uint32_t now = millis();
  uint32_t remaining = now >= timerEndMs ? 0 : timerEndMs - now;

  // Wysokosc ognia w 1/256 wiersza, minimum jeden wiersz zaru
  uint32_t height256 = (uint64_t)remaining * HEIGHT * 256 / timerTotalMs;
  if (height256 < 256)
    height256 = 256;

  for (uint8_t y = 0; y < HEIGHT; y++) {

    // Wiersz liczony od dolu: 0 = najnizszy
    uint32_t fromBottom = HEIGHT - 1 - y;
    uint32_t rowBottom256 = fromBottom * 256;

    uint8_t level;
    if (height256 >= rowBottom256 + 256)
      level = 255;
    else if (height256 <= rowBottom256)
      level = 0;
    else
      level = height256 - rowBottom256;

    if (level == 255)
      continue;

    for (uint8_t x = 0; x < WIDTH; x++)
      leds[XY(x, y)].nscale8_video(level);
  }
}

// Mnoznik jasnosci w ostatnich sekundach: pulsowanie przyspiesza
// im mniej czasu zostalo.
uint8_t timerUrgencyScale() {

  if (!timerActive)
    return 255;

  uint32_t now = millis();
  uint32_t remaining = now >= timerEndMs ? 0 : timerEndMs - now;

  if (remaining > URGENT_MS)
    return 255;

  // Od ~1 Hz przy 10 s do ~3 Hz przy koncu
  uint32_t speed = 6 + (URGENT_MS - remaining) * 12 / URGENT_MS;
  uint8_t wave = sin8((uint8_t)(now * speed / 24));

  return map8(wave, 70, 255);
}

// ========== BLE - ODPOWIEDZI ==========

void bleReply(const String &msg) {

  if (!bleConnected || txChar == nullptr)
    return;

  txChar->setValue(msg.c_str());
  txChar->notify();
}

// Odpowiedz idzie i na Serial, i do telefonu
void reply(const String &msg) {

  Serial.println(msg);
  bleReply(msg);
}

// ========== ZMIANA EFEKTU ==========

void selectEffect(uint8_t effect) {

  currentEffect = effect;

  // Licznik czasu dotyczy tylko ognia karty - startFire() ustawia go po tym
  timerActive = false;

  memset(heat, 0, sizeof(heat));

  fill_solid(
    leds,
    NUM_LEDS,
    CRGB::Black
  );

  rainStep = 0;

  // Ogien startuje od zera i potrzebuje kilkunastu klatek, zeby sie
  // rozpalic - liczymy je od razu, bez wyswietlania.
  if (effect >= 2 && effect <= 5) {
    for (uint8_t i = 0; i < 25; i++)
      drawFire(GREEN_FIRE);
  }

  fadeStartMs = millis();

  for (uint8_t x = 0; x < WIDTH; x++) {

    rainY[x] = -(int8_t)random8(
      1,
      HEIGHT + 1
    );
  }

  reply("Efekt: " + String(currentEffect));
}

// ========== STANY GRY ==========

// Spoczynek: fala w kolorze druzyny, a zanim tablet poda kolor - tecza
void goToRest() {

  selectEffect(hasTeamColor ? 10 : 1);
}

// Ogien karty (2/3/4) z opcjonalnym czasem. Ponowna komenda tego samego
// ognia (np. po ponownym polaczeniu tabletu) tylko poprawia licznik,
// bez gaszenia i rozpalania od nowa.
void startFire(uint8_t effect, uint32_t remainingS, uint32_t totalS) {

  if (currentEffect != effect)
    selectEffect(effect);

  if (totalS > 0) {
    timerActive = true;
    timerTotalMs = totalS * 1000;
    timerEndMs = millis() + min(remainingS, totalS) * 1000;
  } else {
    timerActive = false;
  }
}

// Efekty jednorazowe pokazuja sie od razu, bez rozjasniania
void startOneShot(uint8_t effect) {

  selectEffect(effect);

  oneShotStartMs = millis();
  fadeStartMs = oneShotStartMs - FADE_IN_MS;
}

// ========== MENU ==========

void printMenu() {

  Serial.println();
  Serial.println("=== FASTLED MATRIX 10x16 ===");

  Serial.println("1 - Rainbow Wave");
  Serial.println("2 - Green Fire");
  Serial.println("3 - Yellow Fire");
  Serial.println("4 - Red Fire");
  Serial.println("5 - Pink Fire");
  Serial.println("6 - Pink Pulse");
  Serial.println("7 - Plasma");
  Serial.println("8 - Matrix Rain");
  Serial.println("9 - Sparkles");

  Serial.println("0 - Auto (co 15 sekund)");
  Serial.println("cRRGGBB - kolor druzyny");
  Serial.println("b40 - jasnosc 0-255");
  Serial.println("off - zgas");
  Serial.println("? - Pokaz menu");

  Serial.println("--- stany gry ---");
  Serial.println("idle - tecza (czekamy na kolor druzyny)");
  Serial.println("team - fala w kolorze druzyny");
  Serial.println("easy / medium / hard [R/T] - ogien karty, np. hard 45/60");
  Serial.println("ok / bad / timeout - wynik, potem powrot do fali");
  Serial.println("lost - niebieski puls (sam po rozlaczeniu)");

  // Pakiet BLE ma ok. 20 bajtow, wiec do telefonu idzie skrot
  bleReply("1-9 efekt, 0 auto");
  bleReply("b0-255 jasnosc, off");
}

// ========== KOMENDY ==========

// Wspolne dla Serial i BLE.
// Numery efektow zostaja do testow z Serial; tablet uzywa komend slownych:
// idle, team, cRRGGBB, easy/medium/hard [R/T], ok, bad, timeout.
// "b120" = jasnosc, "off" = zgaszenie

void handleCommand(String cmd) {

  cmd.trim();
  cmd.toLowerCase();

  if (cmd.length() == 0)
    return;

  char c = cmd[0];

  // Ogien karty: "easy", "medium 30/60" itd.
  uint8_t fireEffect = 0;
  String fireArgs;
  if (cmd.startsWith("easy")) {
    fireEffect = 2;
    fireArgs = cmd.substring(4);
  } else if (cmd.startsWith("medium")) {
    fireEffect = 3;
    fireArgs = cmd.substring(6);
  } else if (cmd.startsWith("hard")) {
    fireEffect = 4;
    fireArgs = cmd.substring(4);
  }

  if (fireEffect != 0) {

    unsigned int remainingS = 0;
    unsigned int totalS = 0;
    fireArgs.trim();
    if (sscanf(fireArgs.c_str(), "%u/%u", &remainingS, &totalS) != 2)
      totalS = 0;

    autoMode = false;
    lampOff = false;
    startFire(fireEffect, remainingS, totalS);

  } else if (cmd == "idle") {

    autoMode = false;
    lampOff = false;
    hasTeamColor = false;
    selectEffect(1);

  } else if (cmd == "team") {

    autoMode = false;
    lampOff = false;
    goToRest();

  } else if (cmd == "ok" || cmd == "bad") {

    autoMode = false;
    lampOff = false;
    flashColor = cmd == "ok" ? CRGB(0, 255, 40) : CRGB(255, 0, 0);
    startOneShot(11);

  } else if (cmd == "timeout") {

    autoMode = false;
    lampOff = false;
    startOneShot(12);

  } else if (cmd == "lost") {

    autoMode = false;
    lampOff = false;
    selectEffect(13);

  } else if (cmd.length() == 1 && c >= '1' && c <= '9') {

    autoMode = false;

    lampOff = false;

    FastLED.setBrightness(brightness);

    selectEffect(c - '0');

  } else if (cmd == "0") {

    autoMode = true;

    lampOff = false;

    lastAutoMs = millis();

    FastLED.setBrightness(brightness);

    selectEffect(1);

    reply("Tryb automatyczny WLACZONY");

  } else if (c == 'b' && cmd.length() > 1) {

    brightness = constrain(cmd.substring(1).toInt(), 0, 255);

    FastLED.setBrightness(brightness);

    reply("Jasnosc: " + String(brightness));

  } else if (cmd == "off") {

    autoMode = false;

    lampOff = true;

    reply("Zgaszone");

  } else if (c == 'c' && cmd.length() == 7) {

    // Kolor druzyny, np. "cf59e0b"
    uint32_t rgb = strtoul(cmd.substring(1).c_str(), nullptr, 16);

    teamColor = CRGB(
      (rgb >> 16) & 0xFF,
      (rgb >> 8) & 0xFF,
      rgb & 0xFF
    );
    hasTeamColor = true;

    autoMode = false;
    lampOff = false;

    // Zmiana koloru w trakcie wyboru - bez ponownego fade in od zera
    if (currentEffect != 10)
      selectEffect(10);

  } else if (cmd == "?") {

    printMenu();

  } else {

    reply("Nieznana komenda: " + cmd);
  }
}

// ========== BLE ==========

class RxCallbacks : public BLECharacteristicCallbacks {

  void onWrite(BLECharacteristic *c) override {

    BleCommand cmd = {};

    String value = c->getValue();

    value.toCharArray(cmd.text, sizeof(cmd.text));

    // Nie czekamy - jak kolejka pelna, komenda przepada
    xQueueSend(bleQueue, &cmd, 0);
  }
};

class ServerCallbacks : public BLEServerCallbacks {

  void onConnect(BLEServer *s) override {

    bleConnected = true;
  }

  void onDisconnect(BLEServer *s) override {

    bleConnected = false;

    // Niebieski puls - loop() przelaczy efekt w swoim watku
    bleLostPending = true;

    // Po rozlaczeniu lampa znowu jest widoczna
    BLEDevice::startAdvertising();
  }
};

void setupBle() {

  bleQueue = xQueueCreate(8, sizeof(BleCommand));

  uint64_t mac = ESP.getEfuseMac();

  char name[24];

  snprintf(
    name,
    sizeof(name),
    "%s%02X%02X",
    BLE_NAME_PREFIX,
    (uint8_t)(mac >> 32),
    (uint8_t)(mac >> 40)
  );

  BLEDevice::init(name);

  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);

  txChar = service->createCharacteristic(
    TX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  txChar->addDescriptor(new BLE2902());

  BLECharacteristic *rxChar = service->createCharacteristic(
    RX_UUID,
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_WRITE_NR
  );
  rxChar->setCallbacks(new RxCallbacks());

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);

  BLEDevice::startAdvertising();

  Serial.print("BLE: ");
  Serial.println(name);
}

// ========== SETUP ==========

void setup() {

  Serial.begin(115200);

  // Bez tego println czeka, az komputer odbierze dane z USB - gdy lampa
  // wisi na kablu bez otwartego portu, kazda zmiana efektu sie opoznia.
  Serial.setTxTimeoutMs(0);

  delay(300);

  FastLED.addLeds<
    LED_TYPE,
    DATA_PIN,
    COLOR_ORDER
  >(leds, NUM_LEDS);

  FastLED.setBrightness(brightness);

  FastLED.setMaxPowerInVoltsAndMilliamps(
    5,
    POWER_LIMIT_MA
  );

  FastLED.clear(true);

  setupBle();

  selectEffect(1);

  printMenu();
}

// ========== FADE ==========

// 0..255 -> 0..255, szybki start i lagodny koniec
uint8_t easeOut8(uint8_t x) {

  uint8_t rest = 255 - x;

  return 255 - scale8(rest, rest);
}

// ========== LOOP ==========

void loop() {

  // Sterowanie przez Serial Monitor (cala linia, np. "b80")
  if (Serial.available() > 0) {

    handleCommand(Serial.readStringUntil('\n'));
  }

  // Sterowanie przez BLE
  BleCommand bleCmd;

  while (xQueueReceive(bleQueue, &bleCmd, 0) == pdTRUE) {

    handleCommand(String(bleCmd.text));
  }

  if (bleLostPending) {

    bleLostPending = false;
    autoMode = false;
    selectEffect(13);
  }

  uint32_t now = millis();

  // Automatyczna zmiana efektu
  if (
    autoMode &&
    now - lastAutoMs >= AUTO_INTERVAL_MS
  ) {

    lastAutoMs = now;

    selectEffect(
      (currentEffect % EFFECT_COUNT) + 1
    );
  }

  // Limit FPS
  if (now - lastFrameMs < FRAME_MS) {

    delay(1);
    return;
  }

  lastFrameMs = now;

  // Wybrana animacja
  switch (currentEffect) {

    case 1:
      drawRainbowWave();
      break;

    case 2:
      drawFire(GREEN_FIRE);
      break;

    case 3:
      drawFire(YELLOW_FIRE);
      break;

    case 4:
      drawFire(RED_FIRE);
      break;

    case 5:
      drawFire(PINK_FIRE);
      break;

    case 6:
      drawPinkPulse();
      break;

    case 7:
      drawPlasma();
      break;

    case 8:
      drawMatrixRain();
      break;

    case 9:
      drawSparkles();
      break;

    case 10:
      drawTeamColor();
      break;

    case 11:
      if (drawFlash())
        goToRest();
      break;

    case 12:
      // Koniec czasu liczy sie jak zla odpowiedz: po pomaranczowym
      // gasnieciu te same czerwone mrugniecia co przy "bad"
      if (drawTimeoutFade()) {
        flashColor = CRGB(255, 0, 0);
        startOneShot(11);
      }
      break;

    case 13:
      drawLost();
      break;
  }

  applyTimerMask();

  // Fade in nowej animacji. Krzywa "ease out": jasnosc rosnie szybko na
  // poczatku i zwalnia pod koniec, wiec zmiana jest widoczna od razu.
  uint32_t fadeElapsed = now - fadeStartMs;

  uint8_t fade =
    fadeElapsed >= FADE_IN_MS
      ? 255
      : easeOut8((uint8_t)(fadeElapsed * 255 / FADE_IN_MS));

  FastLED.setBrightness(
    lampOff ? 0 : scale8(scale8(brightness, fade), timerUrgencyScale())
  );

  FastLED.show();
}
