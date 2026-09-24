import { useEffect, useId } from "react";
import { Animated, Easing, View, useAnimatedValue, useWindowDimensions } from "react-native";
import Svg, { Defs, Line, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { useReduceMotion } from "../../../shared/a11y/use-reduce-motion";
import {
  EXPEDITION_THEME,
  getExpeditionThemeFamily,
  getExpeditionThemeMode,
} from "../../onboarding/model/constants";
import {
  BACKDROP_DOT_DASH,
  BACKDROP_DOT_ROW_BOUNDS,
  BACKDROP_DOT_ROWS,
  BACKDROP_VIEWBOX_HEIGHT,
  BACKDROP_VIEWBOX_WIDTH,
  buildGraphiteBands,
  buildRfidArcs,
  buildSteppedTraces,
  resolveBackdropSpec,
  type BackdropColorToken,
} from "./hidden-map-backdrop.model";

/**
 * Warstwa dekoracyjna pod rozgrywką, gdy realizacja ma ukrytą mapę i admin nie
 * wgrał własnej grafiki. Zastępuje stan zastany, w którym tłem była ikona
 * aplikacji 512 px rozciągnięta `cover` na cały ekran.
 *
 * Cała geometria i wszystkie decyzje siedzą w hidden-map-backdrop.model.ts —
 * tutaj jest wyłącznie zamiana danych na elementy SVG. To nie jest kosmetyka
 * podziału plików: bez tego nie dałoby się przypiąć testem budżetu czerwieni
 * ani wykrwawiania poza kadr, a repo świadomie nie snapshotuje rysunków.
 *
 * Oprawa i tryb czytane są z globalnego stanu przez gettery, tak samo jak robi
 * to paleta — komponent nie dostaje ich propsami, bo ustawiane są raz na
 * wejściu w realizację (mobile-app.tsx) i nie zmieniają się pod spodem.
 *
 * Rysunek jest STATYCZNY. Nic w tym SVG nie może zacząć się przemalowywać: z
 * risk-quiz-pig-effects.tsx — „anything that paints a full-screen SVG has to
 * re-rasterise the whole thing". Jedyny ruch, jaki tu wejdzie, to osobna
 * warstwa animowana wyłącznie przez opacity i transform na native driverze.
 */
export function HiddenMapBackdrop() {
  const spec = resolveBackdropSpec(getExpeditionThemeFamily(), getExpeditionThemeMode());
  const isLightTheme = getExpeditionThemeMode() === "light";

  // Identyfikatory w <Defs> są globalne dla dokumentu SVG, więc każda instancja
  // musi mieć własne — wzorzec z shared/ui/chamfered-panel.tsx. Ta warstwa jest
  // dziś singletonem, ale nic tego nie gwarantuje, a kolizja objawiłaby się
  // cudzym gradientem zamiast błędem.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glowId = `backdropGlow${instanceId}`;
  const vignetteId = `backdropVignette${instanceId}`;

  // Wariant jasny przyciemnia krawędzie własnym tonem scrimu oprawy, żeby
  // winieta nigdy nie zabarwiła ekranu inaczej niż paleta.
  const vignetteColor = isLightTheme ? `rgb(${EXPEDITION_THEME.scrimWashRgb})` : "#000000";

  const bands = spec.motif === "access-card" ? buildGraphiteBands() : [];
  const traces = spec.motif === "access-card" ? buildSteppedTraces() : [];
  const arcs = spec.motif === "access-card" ? buildRfidArcs() : [];

  const bandColor = tokenColor(spec.bandColorToken);
  const traceColor = tokenColor(spec.traceColorToken);
  const arcColor = tokenColor(spec.arcColorToken);

  return (
    <View
      testID="hidden-map-backdrop"
      pointerEvents="none"
      // Dekoracja nie jest treścią. Gałąź, którą ta warstwa zastępuje, niosła
      // accessibilityLabel „Mapa wydarzenia" — ogłoszenie tego tła jako mapy
      // byłoby wobec czytnika ekranu po prostu nieprawdą. Etykieta zostaje przy
      // realnej grafice wgranej przez admina.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${BACKDROP_VIEWBOX_WIDTH} ${BACKDROP_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="22%" r="62%">
            <Stop offset="0" stopColor={tokenColor(spec.glowToken)} stopOpacity={spec.glowOpacity} />
            <Stop offset="1" stopColor={tokenColor(spec.glowToken)} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={vignetteId} cx="50%" cy="42%" r="78%">
            <Stop offset="0" stopColor={vignetteColor} stopOpacity={0} />
            <Stop offset="1" stopColor={vignetteColor} stopOpacity={spec.vignetteOpacity} />
          </RadialGradient>
        </Defs>

        {/* Nieprzezroczysta baza — to ona kasuje rozciągniętą ikonę. */}
        <Rect
          x={0}
          y={0}
          width={BACKDROP_VIEWBOX_WIDTH}
          height={BACKDROP_VIEWBOX_HEIGHT}
          fill={EXPEDITION_THEME.background}
        />
        {spec.glowOpacity > 0 ? (
          <Rect
            x={0}
            y={0}
            width={BACKDROP_VIEWBOX_WIDTH}
            height={BACKDROP_VIEWBOX_HEIGHT}
            fill={`url(#${glowId})`}
          />
        ) : null}

        {bands.map((band) =>
          spec.bandStyle === "fill" ? (
            <Path key={band.id} d={band.d} fill={bandColor} fillOpacity={spec.bandOpacity} />
          ) : (
            <Path
              key={band.id}
              d={band.d}
              fill="none"
              stroke={bandColor}
              strokeWidth={1}
              strokeOpacity={spec.bandOpacity}
            />
          ),
        )}

        {traces.map((trace) => (
          <Path
            key={trace.id}
            d={trace.d}
            fill="none"
            stroke={traceColor}
            strokeWidth={1}
            strokeOpacity={spec.traceOpacity}
            // Ścieżki na karcie są cięte maszynowo — zaokrąglone końcówki i
            // złącza zmiękczyłyby je w ozdobnik.
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        ))}

        {spec.dotOpacity > 0
          ? BACKDROP_DOT_ROWS.map((y) => (
              <Line
                key={`dots-${y}`}
                x1={BACKDROP_DOT_ROW_BOUNDS.x1}
                y1={y}
                x2={BACKDROP_DOT_ROW_BOUNDS.x2}
                y2={y}
                stroke={traceColor}
                strokeWidth={3}
                strokeOpacity={spec.dotOpacity}
                strokeDasharray={BACKDROP_DOT_DASH}
                strokeLinecap="round"
              />
            ))
          : null}

        {arcs.map((arc, index) => (
          <Path
            key={arc.id}
            d={arc.d}
            fill="none"
            stroke={arcColor}
            strokeWidth={index === 0 ? 1.5 : 1}
            strokeOpacity={spec.arcOpacities[index]}
          />
        ))}

        {spec.accentMarks.map((mark, index) => (
          <Rect
            key={`accent-${index}`}
            x={mark.x}
            y={mark.y}
            width={mark.width}
            height={mark.height}
            fill={EXPEDITION_THEME.accent}
            fillOpacity={spec.accentMarkOpacity}
          />
        ))}

        {/* Ostatnia w kolejności malowania: przygasza motyw przy krawędziach,
            czyli dokładnie tam, gdzie siedzą panele chromu. */}
        <Rect
          x={0}
          y={0}
          width={BACKDROP_VIEWBOX_WIDTH}
          height={BACKDROP_VIEWBOX_HEIGHT}
          fill={`url(#${vignetteId})`}
        />
      </Svg>

      {spec.hasScanSweep ? <BackdropScanSweep /> : null}
    </View>
  );
}

/**
 * Pojedyncze przejście jasnego pasa przez ekran, raz na około dwadzieścia
 * sekund.
 *
 * Dlaczego w ogóle: całkowicie martwe tło czyta się jak zamrożony obrazek albo
 * stan ładowania, a tła w tej aplikacji już żyją — spadające karty u
 * Ryzykantów, oddychająca aureola pod logo. Dlaczego tak rzadko: przy ukrytej
 * mapie gracz patrzy na ten ekran przez całą rozgrywkę, więc ciągły ruch pod
 * panelami stanowisk byłby długotrwałym rozpraszaczem, a nie klimatem.
 *
 * Pas jest zbudowany z trzech nakładających się widoków o rosnącym kryciu,
 * bo repo nie ma biblioteki gradientów — ten sam chwyt co warstwowa poświata w
 * shared/ui/chamfered-panel.tsx, tyle że bez wchodzenia w SVG: zwykłe widoki z
 * kolorem tła nie dokładają drugiej powierzchni do rasteryzacji.
 *
 * Nic w tej warstwie nie jest przemalowywane. Rusza się wyłącznie `translateX`
 * i `opacity`, oba na native driverze — z risk-quiz-pig-effects.tsx: „anything
 * that paints a full-screen SVG has to re-rasterise the whole thing".
 */
const SWEEP_TRAVEL_MS = 2600;
const SWEEP_REST_MS = 17000;
const SWEEP_WIDTH_RATIO = 0.26;
const SWEEP_PEAK_OPACITY = 0.35;

function BackdropScanSweep() {
  const { width } = useWindowDimensions();
  const isReduceMotionEnabled = useReduceMotion();
  const progress = useAnimatedValue(0);
  const bandWidth = Math.max(1, width * SWEEP_WIDTH_RATIO);

  useEffect(() => {
    if (isReduceMotionEnabled) {
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: SWEEP_TRAVEL_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(SWEEP_REST_MS),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
      progress.setValue(0);
    };
  }, [isReduceMotionEnabled, progress]);

  // Odstępstwo od precedensu z ryzykanci-logo-header.tsx, które parkuje
  // animację w połowie zamiast ją usuwać: TAM zaparkowana aureola to nadal
  // sensowna, statyczna poświata. TUTAJ zaparkowany jasny pas w poprzek ekranu
  // byłby artefaktem, którego nikt nie zaprojektował. Dlatego nie renderujemy
  // go wcale. Nie „naprawiać" tego z powrotem na parkowanie.
  if (isReduceMotionEnabled) {
    return null;
  }

  return (
    <Animated.View
      testID="hidden-map-backdrop-sweep"
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: bandWidth,
        opacity: progress.interpolate({
          // Rampa zamiast stałego krycia: bez niej pas pojawiałby się i znikał
          // skokiem przy krawędziach ekranu.
          inputRange: [0, 0.18, 0.82, 1],
          outputRange: [0, SWEEP_PEAK_OPACITY, SWEEP_PEAK_OPACITY, 0],
        }),
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-bandWidth, width],
            }),
          },
        ],
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: EXPEDITION_THEME.accentStrong,
          opacity: 0.18,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: bandWidth * 0.2,
          right: bandWidth * 0.2,
          backgroundColor: EXPEDITION_THEME.accentStrong,
          opacity: 0.32,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: bandWidth * 0.39,
          right: bandWidth * 0.39,
          backgroundColor: EXPEDITION_THEME.accentStrong,
          opacity: 0.5,
        }}
      />
    </Animated.View>
  );
}

function tokenColor(token: BackdropColorToken): string {
  switch (token) {
    case "border":
      return EXPEDITION_THEME.border;
    case "textSubtle":
      return EXPEDITION_THEME.textSubtle;
    case "accent":
      return EXPEDITION_THEME.accent;
    case "accentStrong":
      return EXPEDITION_THEME.accentStrong;
  }
}
