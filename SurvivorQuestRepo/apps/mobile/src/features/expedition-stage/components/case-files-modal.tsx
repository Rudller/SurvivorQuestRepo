import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";

import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { MOBILE_UX_TOKENS } from "../../../shared/ui/ux-tokens";
import { textRole } from "../../../shared/ui/typography";
import type { ExpeditionCaseFile, ExpeditionCaseFileKind, ExpeditionTask } from "../model/types";
import { resolveSwipeTarget, resolveUnlockStationNumber, sortCaseFiles } from "./case-files.model";
import { CaseFileImageViewer } from "./case-file-image-viewer";
import { fitContain } from "./case-file-image-zoom.model";
import { useCaseFileAudio } from "./use-case-file-audio";

/**
 * Poszlaki (akta sprawy) — karuzela kart przesuwanych w poziomie.
 *
 * Każda poszlaka to osobna karta z PEŁNĄ treścią, więc nie ma poziomu „lista →
 * szczegół”: okno otwiera się od razu na pierwszej odblokowanej karcie. Karty
 * są węższe od okna, więc sąsiednie wystają z boków — to jest podpowiedź, że
 * można przesuwać. Strzałki i kropki pod spodem robią to samo dla tych, którzy
 * gestu nie odkryją.
 *
 * Zablokowane poszlaki zostają w kolejce jako zamknięte karty z numerem: gracz
 * widzi, ile jeszcze zostało do zdobycia, ale nie treść (serwer jej nie wysyła).
 */

type Sizes = {
  title: number;
  subtitle: number;
  closeText: number;
  cardPadding: number;
  cardTitle: number;
  kindLabel: number;
  body: number;
  bodyLineHeight: number;
  dossierLabel: number;
  dossierValue: number;
  lockIcon: number;
  arrow: number;
  position: number;
};

const PHONE_SIZES: Sizes = {
  title: 18,
  subtitle: 13,
  closeText: 12,
  cardPadding: 18,
  cardTitle: 20,
  kindLabel: 11,
  body: 15,
  bodyLineHeight: 23,
  dossierLabel: 11,
  dossierValue: 15,
  lockIcon: 40,
  arrow: 44,
  position: 13,
};

const TABLET_SIZES: Sizes = {
  title: 28,
  subtitle: 17,
  closeText: 15,
  cardPadding: 32,
  cardTitle: 28,
  kindLabel: 13,
  body: 20,
  bodyLineHeight: 32,
  dossierLabel: 13,
  dossierValue: 20,
  lockIcon: 64,
  arrow: 56,
  position: 16,
};

// Jaka część szerokości okna przypada na jedną kartę; reszta to wystające sąsiadki.
const CARD_WIDTH_RATIO = { phone: 0.86, tablet: 0.84 };
const CARD_GAP = { phone: 12, tablet: 20 };

const CASE_FILES_TEXT: Record<
  UiLanguage,
  {
    title: string;
    subtitle: string;
    empty: string;
    locked: string;
    lockedHint: string;
    lockedWithStation: (stationNumber: number) => string;
    previous: string;
    next: string;
    close: string;
    kinds: Record<ExpeditionCaseFileKind, string>;
    imageFailed: string;
    imageZoomHint: string;
    audioPlay: string;
    audioPause: string;
    audioFailed: string;
  }
> = {
  polish: {
    title: "Poszlaki",
    subtitle: "Zebrane dowody w sprawie — przesuwajcie karty w bok.",
    empty: "Nie ma jeszcze żadnych poszlak.",
    locked: "Zabezpieczony",
    lockedHint: "Rozwiązujcie zadania, żeby odblokować tę poszlakę.",
    lockedWithStation: (stationNumber) => `Ukończ stanowisko #${stationNumber}`,
    previous: "Poprzednia poszlaka",
    next: "Następna poszlaka",
    close: "Zamknij",
    kinds: { text: "Notatka", image: "Zdjęcie", audio: "Nagranie", dossier: "Kartoteka" },
    imageFailed: "Nie udało się wczytać zdjęcia.",
    imageZoomHint: "Dotknij, aby powiększyć",
    audioPlay: "Odtwórz",
    audioPause: "Pauza",
    audioFailed: "Nie udało się odtworzyć nagrania.",
  },
  english: {
    title: "Clues",
    subtitle: "Evidence gathered in the case — swipe the cards sideways.",
    empty: "There are no clues yet.",
    locked: "Secured",
    lockedHint: "Solve tasks to unlock this clue.",
    lockedWithStation: (stationNumber) => `Complete station #${stationNumber}`,
    previous: "Previous clue",
    next: "Next clue",
    close: "Close",
    kinds: { text: "Note", image: "Photo", audio: "Recording", dossier: "Dossier" },
    imageFailed: "The photo could not be loaded.",
    imageZoomHint: "Tap to enlarge",
    audioPlay: "Play",
    audioPause: "Pause",
    audioFailed: "The recording could not be played.",
  },
  ukrainian: {
    title: "Докази",
    subtitle: "Зібрані докази у справі — гортайте картки вбік.",
    empty: "Доказів ще немає.",
    locked: "Засекречено",
    lockedHint: "Виконуйте завдання, щоб відкрити цей доказ.",
    lockedWithStation: (stationNumber) => `Пройдіть станцію #${stationNumber}`,
    previous: "Попередній доказ",
    next: "Наступний доказ",
    close: "Закрити",
    kinds: { text: "Нотатка", image: "Фото", audio: "Запис", dossier: "Картотека" },
    imageFailed: "Не вдалося завантажити фото.",
    imageZoomHint: "Торкніться, щоб збільшити",
    audioPlay: "Відтворити",
    audioPause: "Пауза",
    audioFailed: "Не вдалося відтворити запис.",
  },
  russian: {
    title: "Улики",
    subtitle: "Собранные улики по делу — листайте карточки в сторону.",
    empty: "Улик пока нет.",
    locked: "Засекречено",
    lockedHint: "Выполняйте задания, чтобы открыть эту улику.",
    lockedWithStation: (stationNumber) => `Пройдите станцию #${stationNumber}`,
    previous: "Предыдущая улика",
    next: "Следующая улика",
    close: "Закрыть",
    kinds: { text: "Заметка", image: "Фото", audio: "Запись", dossier: "Картотека" },
    imageFailed: "Не удалось загрузить фото.",
    imageZoomHint: "Нажмите, чтобы увеличить",
    audioPlay: "Воспроизвести",
    audioPause: "Пауза",
    audioFailed: "Не удалось воспроизвести запись.",
  },
};

type SharedText = (typeof CASE_FILES_TEXT)["polish"];

type CaseFilesModalProps = {
  visible: boolean;
  caseFiles: ExpeditionCaseFile[];
  tasks: ExpeditionTask[];
  isTabletLayout: boolean;
  isLightTheme: boolean;
  onRequestClose: () => void;
};

export function CaseFilesModal({
  visible,
  caseFiles,
  tasks,
  isTabletLayout,
  isLightTheme,
  onRequestClose,
}: CaseFilesModalProps) {
  const uiLanguage = useUiLanguage();
  const text = CASE_FILES_TEXT[uiLanguage] ?? CASE_FILES_TEXT.polish;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sizes = isTabletLayout ? TABLET_SIZES : PHONE_SIZES;

  const ordered = useMemo(() => sortCaseFiles(caseFiles), [caseFiles]);
  const firstUnlockedIndex = Math.max(0, ordered.findIndex((caseFile) => !caseFile.locked));

  const panelPadding = isTabletLayout ? 28 : 16;
  const panelWidth = Math.min(windowWidth - (isTabletLayout ? 48 : 32), isTabletLayout ? 1120 : 620);
  // Do pierwszego onLayout karuzela liczy szerokość z wymiarów okna — dzięki
  // temu pierwsza klatka ma już właściwe karty, a nie zera.
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const carouselWidth = measuredWidth ?? panelWidth - panelPadding * 2;
  const cardWidth = Math.round(carouselWidth * (isTabletLayout ? CARD_WIDTH_RATIO.tablet : CARD_WIDTH_RATIO.phone));
  const cardGap = isTabletLayout ? CARD_GAP.tablet : CARD_GAP.phone;
  const snapInterval = cardWidth + cardGap;
  const sideInset = Math.max(0, (carouselWidth - cardWidth) / 2);

  const [index, setIndex] = useState(firstUnlockedIndex);
  // Jeden podgląd na cały modal (a nie po jednym na kartę). Po pierwszym
  // otwarciu zostaje zamontowany, żeby zamknięcie mogło się animować.
  const [zoom, setZoom] = useState<{ url: string; visible: boolean } | null>(null);

  // Przesuwanie kart robimy sami (PanResponder + Animated), a nie natywnym
  // snapem ScrollView: ten na Androidzie cofał spokojny swipe, gdy palec zwolnił
  // przed puszczeniem — patrz resolveSwipeTarget. Pionowy scroll w karcie
  // zostaje natywny.
  const offset = useRef(new Animated.Value(-firstUnlockedIndex * snapInterval)).current;
  // PanResponder powstaje raz, więc bieżące wartości czyta z refa.
  const live = useRef({ index, snapInterval, count: ordered.length });
  live.current = { index, snapInterval, count: ordered.length };

  function goTo(nextIndex: number) {
    const clamped = Math.min(Math.max(nextIndex, 0), ordered.length - 1);
    setIndex(clamped);
    Animated.spring(offset, {
      toValue: -clamped * snapInterval,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  }
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  // Każde otwarcie zaczyna od pierwszej odblokowanej karty — także gdy między
  // otwarciami odblokowała się nowa.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setIndex(firstUnlockedIndex);
    offset.setValue(-firstUnlockedIndex * snapInterval);
    // snapInterval celowo poza zależnościami: zmiana rozmiaru obsługuje efekt niżej.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, firstUnlockedIndex]);

  // Po pomiarze szerokości (albo obrocie) karta ma zostać na swoim miejscu.
  useEffect(() => {
    offset.setValue(-live.current.index * snapInterval);
  }, [offset, snapInterval]);

  const swipe = useMemo(
    () =>
      PanResponder.create({
        // Dotyk trzeba wziąć już na starcie: inaczej respondentem zostaje panel
        // okna (Pressable nad karuzelą), a gdy responderem jest przodek, przy
        // ruchu pytani są tylko JEGO przodkowie — karuzela nigdy by gestu nie dostała.
        // Przyciski w karcie są głębiej, więc i tak dostają start pierwsze.
        onStartShouldSetPanResponder: () => true,
        // Capture: swipe w bok ma wygrać z przyciskami w karcie (np. zdjęcie),
        // ale tylko gdy ruch jest wyraźnie poziomy — pionowy zostaje dla scrolla karty.
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          offset.stopAnimation();
        },
        onPanResponderMove: (_event, gesture) => {
          const { index: current, snapInterval: interval, count } = live.current;
          const atEdge = (current === 0 && gesture.dx > 0) || (current === count - 1 && gesture.dx < 0);
          // Za pierwszą i ostatnią kartą karta stawia opór zamiast odjeżdżać.
          offset.setValue(-current * interval + (atEdge ? gesture.dx * 0.3 : gesture.dx));
        },
        onPanResponderRelease: (_event, gesture) => {
          const { index: current, snapInterval: interval, count } = live.current;
          goToRef.current(resolveSwipeTarget({ index: current, dx: gesture.dx, vx: gesture.vx, interval, count }));
        },
        onPanResponderTerminate: () => {
          goToRef.current(live.current.index);
        },
      }),
    [offset],
  );

  function handleCarouselLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== measuredWidth) {
      setMeasuredWidth(nextWidth);
    }
  }

  const canGoBack = index > 0;
  const canGoForward = index < ordered.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable
        className="flex-1 items-center justify-center"
        style={{
          backgroundColor: isLightTheme
            ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)`
            : `rgba(${EXPEDITION_THEME.scrimDeepRgb}, 0.78)`,
        }}
        onPress={onRequestClose}
      >
        <Pressable
          testID="case-files-modal"
          className="rounded-3xl border"
          style={{
            width: panelWidth,
            height: Math.round(windowHeight * (isTabletLayout ? 0.86 : 0.8)),
            padding: panelPadding,
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panel,
          }}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text
                style={[
                  textRole("caseTitle"),
                  { color: EXPEDITION_THEME.textPrimary, fontSize: sizes.title, lineHeight: Math.round(sizes.title * 1.25) },
                ]}
              >
                {text.title}
              </Text>
              <Text
                className="mt-1"
                style={[textRole("body"), { color: EXPEDITION_THEME.textSubtle, fontSize: sizes.subtitle }]}
              >
                {text.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={onRequestClose}
              className="items-center justify-center rounded-2xl border active:opacity-85"
              style={{
                borderColor: EXPEDITION_THEME.border,
                minHeight: isTabletLayout ? 52 : MOBILE_UX_TOKENS.minTouchTarget,
                paddingHorizontal: isTabletLayout ? 20 : 12,
              }}
            >
              <Text style={[textRole("navigation"), { color: EXPEDITION_THEME.textMuted, fontSize: sizes.closeText }]}>
                {text.close}
              </Text>
            </Pressable>
          </View>

          {ordered.length === 0 ? (
            <Text
              className="mt-6"
              style={[textRole("body"), { color: EXPEDITION_THEME.textMuted, fontSize: sizes.body }]}
            >
              {text.empty}
            </Text>
          ) : (
            <>
              <View
                testID="case-files-carousel"
                className="flex-1"
                style={{ marginTop: isTabletLayout ? 20 : 14, overflow: "hidden" }}
                onLayout={handleCarouselLayout}
                {...swipe.panHandlers}
              >
                <Animated.View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    paddingHorizontal: sideInset,
                    columnGap: cardGap,
                    transform: [{ translateX: offset }],
                  }}
                >
                  {ordered.map((caseFile, cardIndex) => (
                    <CaseFileCard
                      key={caseFile.id}
                      caseFile={caseFile}
                      position={cardIndex}
                      tasks={tasks}
                      text={text}
                      sizes={sizes}
                      width={cardWidth}
                      isCurrent={cardIndex === index}
                      onOpenImage={(url) => setZoom({ url, visible: true })}
                    />
                  ))}
                </Animated.View>
              </View>

              <View
                className="flex-row items-center justify-between"
                style={{ marginTop: isTabletLayout ? 18 : 12 }}
              >
                <CarouselArrow
                  testID="case-files-prev"
                  label={text.previous}
                  glyph="‹"
                  size={sizes.arrow}
                  disabled={!canGoBack}
                  onPress={() => goTo(index - 1)}
                />

                <View className="flex-1 items-center" style={{ rowGap: 8 }}>
                  <View className="flex-row flex-wrap justify-center" style={{ columnGap: 8, rowGap: 6 }}>
                    {ordered.map((caseFile, dotIndex) => (
                      <Pressable
                        key={caseFile.id}
                        onPress={() => goTo(dotIndex)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`${dotIndex + 1} / ${ordered.length}`}
                        style={{
                          width: dotIndex === index ? 22 : 9,
                          height: 9,
                          borderRadius: 999,
                          backgroundColor:
                            dotIndex === index
                              ? EXPEDITION_THEME.accentStrong
                              : caseFile.locked
                                ? EXPEDITION_THEME.border
                                : EXPEDITION_THEME.textSubtle,
                        }}
                      />
                    ))}
                  </View>
                  <Text
                    testID="case-files-position"
                    style={[textRole("navigation"), { color: EXPEDITION_THEME.textSubtle, fontSize: sizes.position }]}
                  >
                    {`${index + 1} / ${ordered.length}`}
                  </Text>
                </View>

                <CarouselArrow
                  testID="case-files-next"
                  label={text.next}
                  glyph="›"
                  size={sizes.arrow}
                  disabled={!canGoForward}
                  onPress={() => goTo(index + 1)}
                />
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
      {zoom ? (
        <CaseFileImageViewer
          url={zoom.url}
          visible={zoom.visible}
          closeLabel={text.close}
          onRequestClose={() => setZoom((current) => (current ? { ...current, visible: false } : current))}
        />
      ) : null}
    </Modal>
  );
}

function CarouselArrow({
  testID,
  label,
  glyph,
  size,
  disabled,
  onPress,
}: {
  testID: string;
  label: string;
  glyph: string;
  size: number;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="items-center justify-center rounded-full border active:opacity-85"
      style={{
        width: size,
        height: size,
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: EXPEDITION_THEME.panelStrong,
        opacity: disabled ? MOBILE_UX_TOKENS.disabledOpacity : 1,
      }}
    >
      <Text style={{ color: EXPEDITION_THEME.accentStrong, fontSize: Math.round(size * 0.55), lineHeight: Math.round(size * 0.62) }}>
        {glyph}
      </Text>
    </Pressable>
  );
}

function CaseFileCard({
  caseFile,
  position,
  tasks,
  text,
  sizes,
  width,
  isCurrent,
  onOpenImage,
}: {
  caseFile: ExpeditionCaseFile;
  position: number;
  tasks: ExpeditionTask[];
  text: SharedText;
  sizes: Sizes;
  width: number;
  isCurrent: boolean;
  onOpenImage: (url: string) => void;
}) {
  const isWide = sizes === TABLET_SIZES;
  const number = String(position + 1).padStart(2, "0");

  return (
    <View
      testID={`case-file-card-${caseFile.id}`}
      className="rounded-2xl border"
      style={{
        width,
        borderColor: isCurrent ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
        backgroundColor: EXPEDITION_THEME.panelStrong,
        opacity: caseFile.locked ? 0.75 : 1,
      }}
    >
      {caseFile.locked ? (
        <View className="flex-1 items-center justify-center" style={{ padding: sizes.cardPadding, rowGap: 12 }}>
          <Text style={{ fontSize: sizes.lockIcon }}>🔒</Text>
          <Text
            style={[textRole("caseTitle"), { color: EXPEDITION_THEME.textPrimary, fontSize: sizes.cardTitle }]}
          >
            {`${text.locked} ${number}`}
          </Text>
          <Text
            className="text-center"
            style={[textRole("body"), { color: EXPEDITION_THEME.textSubtle, fontSize: sizes.body }]}
          >
            {(() => {
              const stationNumber = resolveUnlockStationNumber(caseFile, tasks);
              return stationNumber ? text.lockedWithStation(stationNumber) : text.lockedHint;
            })()}
          </Text>
        </View>
      ) : (
        // Pionowy scroll w karcie: długa kartoteka nie może wyjść poza okno.
        <ScrollView
          nestedScrollEnabled
          // Zdjęcie ma zająć całe wolne miejsce karty, więc treść musi rosnąć do jej wysokości.
          contentContainerStyle={{ padding: sizes.cardPadding, flexGrow: caseFile.kind === "image" ? 1 : 0 }}
        >
          <Text
            className="mb-2 uppercase"
            style={[textRole("navigation"), { color: EXPEDITION_THEME.textSubtle, fontSize: sizes.kindLabel }]}
          >
            {`${number} · ${text.kinds[caseFile.kind]}`}
          </Text>
          <Text
            className="mb-4"
            style={[
              textRole("caseTitle"),
              {
                color: EXPEDITION_THEME.textPrimary,
                fontSize: sizes.cardTitle,
                lineHeight: Math.round(sizes.cardTitle * 1.25),
              },
            ]}
          >
            {caseFile.title}
          </Text>

          {caseFile.kind === "text" ? (
            <Text
              style={[
                textRole("body"),
                { color: EXPEDITION_THEME.textPrimary, fontSize: sizes.body, lineHeight: sizes.bodyLineHeight },
              ]}
            >
              {caseFile.body}
            </Text>
          ) : null}

          {caseFile.kind === "image" ? <CaseFileImage url={caseFile.url} text={text} onOpen={onOpenImage} /> : null}

          {caseFile.kind === "audio" ? <CaseFileAudio url={caseFile.url} text={text} /> : null}

          {caseFile.kind === "dossier" ? (
            <View>
              {(caseFile.fields ?? []).map((field, fieldIndex) => (
                <View
                  key={`${field.label}-${fieldIndex}`}
                  className={`border-b ${isWide ? "flex-row items-baseline gap-4" : ""}`}
                  style={{ borderBottomColor: EXPEDITION_THEME.border, paddingVertical: isWide ? 12 : 8 }}
                >
                  <Text
                    className="uppercase"
                    style={[
                      textRole("navigation"),
                      {
                        color: EXPEDITION_THEME.textSubtle,
                        fontSize: sizes.dossierLabel,
                        width: isWide ? "32%" : undefined,
                      },
                    ]}
                  >
                    {field.label}
                  </Text>
                  <Text
                    className="flex-1"
                    style={[
                      textRole("bodyStrong"),
                      {
                        color: EXPEDITION_THEME.textPrimary,
                        fontSize: sizes.dossierValue,
                        lineHeight: Math.round(sizes.dossierValue * 1.45),
                      },
                    ]}
                  >
                    {field.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function CaseFileImage({
  url,
  text,
  onOpen,
}: {
  url: string | undefined;
  text: SharedText;
  onOpen: (url: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);
  // Wolne miejsce w karcie (onLayout) i naturalny rozmiar zdjęcia (onLoad).
  // Z obu liczymy dokładny rozmiar wpisany w kartę z zachowaniem proporcji —
  // samo `contain` na całym polu też by je zachowało, ale zaokrąglone rogi
  // lądowałyby wtedy na pustych pasach zamiast na krawędziach zdjęcia.
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const displayed = area ? (natural ? fitContain(natural, area) : area) : null;

  if (!url || hasFailed) {
    return (
      <Text className="text-sm" style={[textRole("body"), { color: EXPEDITION_THEME.textMuted }]}>
        {text.imageFailed}
      </Text>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 180 }}>
      <View
        style={{ flex: 1 }}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0 && (width !== area?.width || height !== area?.height)) {
            setArea({ width, height });
          }
        }}
      >
        {/* Zdjęcie leży w warstwie absolutnej, więc nie wpływa na mierzone pole —
            inaczej pole rosłoby razem ze zdjęciem i nigdy nie malało. */}
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pressable
            testID="case-file-image-open"
            onPress={() => onOpen(url)}
            disabled={isLoading}
            accessibilityRole="imagebutton"
            accessibilityHint={text.imageZoomHint}
          >
            <Image
              source={{ uri: url }}
              // `contain`, nie `cover`: dowód to dokument, a nie ozdoba — obcięcie
              // krawędzi mogłoby zabrać właśnie ten fragment, po który gracz przyszedł.
              resizeMode="contain"
              accessibilityLabel={text.kinds.image}
              style={
                displayed
                  ? { width: displayed.width, height: displayed.height, borderRadius: 12 }
                  : { width: "100%", aspectRatio: 4 / 3, borderRadius: 12 }
              }
              onLoad={(event) => {
                const { width, height } = event.nativeEvent.source;
                if (width > 0 && height > 0) {
                  setNatural({ width, height });
                }
              }}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasFailed(true);
              }}
            />
            {isLoading ? (
              <View className="absolute inset-0 items-center justify-center">
                <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
      {isLoading ? null : (
        <Text className="mt-2 text-center text-xs" style={[textRole("body"), { color: EXPEDITION_THEME.textSubtle }]}>
          {`🔍 ${text.imageZoomHint}`}
        </Text>
      )}
    </View>
  );
}

function CaseFileAudio({ url, text }: { url: string | undefined; text: SharedText }) {
  const { isPlaying, isLoading, error, toggle } = useCaseFileAudio(url);

  return (
    <View className="gap-2">
      <Pressable
        testID="case-file-audio-toggle"
        onPress={() => void toggle()}
        disabled={!url}
        className="flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3 active:opacity-85"
        style={{
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panelStrong,
          minHeight: MOBILE_UX_TOKENS.minTouchTarget,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
        ) : (
          <Text className="text-base" style={{ color: EXPEDITION_THEME.accentStrong }}>
            {isPlaying ? "❚❚" : "▶"}
          </Text>
        )}
        <Text className="text-sm" style={[textRole("bodyStrong"), { color: EXPEDITION_THEME.textPrimary }]}>
          {isPlaying ? text.audioPause : text.audioPlay}
        </Text>
      </Pressable>
      {error ? (
        <Text className="text-xs" style={[textRole("body"), { color: EXPEDITION_THEME.danger }]}>
          {text.audioFailed}
        </Text>
      ) : null}
    </View>
  );
}
