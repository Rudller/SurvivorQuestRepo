import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Image, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, Image as SvgImage, Path, Pattern } from "react-native-svg";

// A panel whose corners are cut at 45 degrees instead of rounded, so each
// corner reads as two hard bends rather than an arc. React Native has no
// border style for this, so the surface (fill + border) is drawn as an SVG
// octagon sized from onLayout and the children are laid out on top of it.
type ChamferedPanelProps = {
  // Length of the 45-degree cut along each edge.
  cut: number;
  backgroundColor: string;
  borderColor?: string;
  borderWidth?: number;
  // Optional bitmap painted inside the panel and clipped to the cut corners --
  // a plain RN <Image> child would keep its own square corners and spill over
  // them, so images that fill the panel have to go through the SVG instead.
  imageUri?: string;
  // Matches RN's resizeMode for `imageUri`: "contain" letterboxes, "cover" crops.
  imageFit?: "contain" | "cover";
  // Outer bloom around the outline. Faked with a few progressively wider,
  // fainter strokes rather than an SVG blur filter, which is not reliable
  // across react-native-svg's native and web backends.
  glowColor?: string;
  glowRadius?: number;
  glowOpacity?: number;
  // Breathes the whole bloom in and out on a loop.
  glowPulse?: boolean;
  glowPulseDurationMs?: number;
  // Repeating fill drawn over the background and clipped to the panel shape.
  texture?: ChamferedPanelTexture;
  textureColor?: string;
  textureOpacity?: number;
  textureScale?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export type ChamferedPanelTexture = "none" | "diagonal-hatch" | "cross-hatch" | "dots" | "diamonds";

const GLOW_LAYERS = 4;
// How far down the bloom dims at the bottom of a pulse.
const GLOW_PULSE_MIN_OPACITY = 0.42;

export function buildChamferedPath(width: number, height: number, cut: number, inset: number, offset = 0) {
  const safeCut = Math.max(0, Math.min(cut, Math.min(width, height) / 2 - inset));
  const left = offset + inset;
  const top = offset + inset;
  const right = offset + width - inset;
  const bottom = offset + height - inset;
  return [
    `M ${left + safeCut} ${top}`,
    `L ${right - safeCut} ${top}`,
    `L ${right} ${top + safeCut}`,
    `L ${right} ${bottom - safeCut}`,
    `L ${right - safeCut} ${bottom}`,
    `L ${left + safeCut} ${bottom}`,
    `L ${left} ${bottom - safeCut}`,
    `L ${left} ${top + safeCut}`,
    "Z",
  ].join(" ");
}

// Tile geometry per texture. Every tile repeats seamlessly on an N x N grid,
// so the diagonals are drawn three times to carry across the tile edges.
function buildTexturePaths(texture: ChamferedPanelTexture, tile: number) {
  switch (texture) {
    case "diagonal-hatch":
      return [`M 0 ${tile} L ${tile} 0`, `M ${-tile / 2} ${tile / 2} L ${tile / 2} ${-tile / 2}`, `M ${tile / 2} ${tile * 1.5} L ${tile * 1.5} ${tile / 2}`];
    case "cross-hatch":
      return [`M 0 ${tile} L ${tile} 0`, `M 0 0 L ${tile} ${tile}`];
    case "dots":
      return [`M ${tile / 2} ${tile / 2} l 0.01 0`];
    // A 45-degree lattice, echoing the panel's own cut corners.
    case "diamonds":
      return [`M ${tile / 2} 0 L ${tile} ${tile / 2} L ${tile / 2} ${tile} L 0 ${tile / 2} Z`];
    default:
      return [];
  }
}

export function ChamferedPanel({
  cut,
  backgroundColor,
  borderColor,
  borderWidth = 1,
  imageUri,
  imageFit = "contain",
  glowColor,
  glowRadius = 14,
  glowOpacity = 0.5,
  glowPulse = false,
  glowPulseDurationMs = 2600,
  texture = "none",
  textureColor,
  textureOpacity = 0.09,
  textureScale = 1,
  style,
  children,
}: ChamferedPanelProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const glowPulseAnimation = useRef(new Animated.Value(1)).current;
  // SVG clip paths and patterns are referenced by id, so every instance needs
  // its own or two panels on screen would share the first one's definitions.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `chamfer-clip-${instanceId}`;
  const patternId = `chamfer-texture-${instanceId}`;

  const isPulsing = Boolean(glowColor) && glowPulse;

  useEffect(() => {
    if (!isPulsing) {
      return;
    }
    const halfDuration = Math.max(120, glowPulseDurationMs / 2);
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnimation, {
          toValue: GLOW_PULSE_MIN_OPACITY,
          duration: halfDuration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulseAnimation, {
          toValue: 1,
          duration: halfDuration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    return () => {
      pulseLoop.stop();
      glowPulseAnimation.setValue(1);
    };
  }, [isPulsing, glowPulseDurationMs, glowPulseAnimation]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  const strokeWidth = borderColor ? borderWidth : 0;
  // The bloom is painted outside the panel box, so the canvas has to be bigger
  // than the panel and shifted back over it.
  const glowPadding = glowColor ? Math.max(0, glowRadius) : 0;
  const outlinePath = buildChamferedPath(size.width, size.height, cut, strokeWidth / 2, glowPadding);
  const hasTexture = texture !== "none" && Boolean(textureColor);
  const tile = Math.max(4, 8 * textureScale);
  const texturePaths = hasTexture ? buildTexturePaths(texture, tile) : [];

  return (
    <View style={[{ position: "relative" }, style]} onLayout={handleLayout}>
      {size.width > 0 && size.height > 0 ? (
        <>
          {glowColor ? (
            // The bloom lives in its own layer so the pulse can ride a plain
            // View opacity on the native driver instead of animating SVG props.
            <Animated.View
              style={{
                position: "absolute",
                top: -glowPadding,
                left: -glowPadding,
                opacity: isPulsing ? glowPulseAnimation : 1,
              }}
              pointerEvents="none"
            >
              <Svg width={size.width + glowPadding * 2} height={size.height + glowPadding * 2}>
                {Array.from({ length: GLOW_LAYERS }, (_, layer) => {
                  // Widest and faintest ring first; each next one tightens onto
                  // the outline and gets stronger, which stacks into a falloff.
                  const step = (layer + 1) / GLOW_LAYERS;
                  return (
                    <Path
                      key={layer}
                      d={outlinePath}
                      fill="none"
                      stroke={glowColor}
                      strokeWidth={strokeWidth + glowRadius * 2 * (1 - step + 1 / GLOW_LAYERS)}
                      opacity={glowOpacity * step ** 2 * 0.5}
                    />
                  );
                })}
              </Svg>
            </Animated.View>
          ) : null}

          <View
            style={{ position: "absolute", top: -glowPadding, left: -glowPadding }}
            pointerEvents="none"
          >
            <Svg width={size.width + glowPadding * 2} height={size.height + glowPadding * 2}>
                <Defs>
                {imageUri ? (
                  <ClipPath id={clipId}>
                    <Path d={buildChamferedPath(size.width, size.height, cut, strokeWidth, glowPadding)} />
                  </ClipPath>
                ) : null}
                {hasTexture ? (
                  <Pattern id={patternId} patternUnits="userSpaceOnUse" width={tile} height={tile}>
                    {texturePaths.map((d, index) => (
                      <Path
                        key={index}
                        d={d}
                        fill="none"
                        stroke={textureColor}
                        strokeWidth={texture === "dots" ? Math.max(1.2, tile / 6) : Math.max(0.7, tile / 10)}
                        strokeLinecap="round"
                        opacity={textureOpacity}
                      />
                    ))}
                  </Pattern>
                ) : null}
              </Defs>

              <Path d={outlinePath} fill={backgroundColor} />
              {hasTexture ? <Path d={outlinePath} fill={`url(#${patternId})`} /> : null}
              {imageUri ? (
                <SvgImage
                  href={{ uri: imageUri }}
                  x={glowPadding}
                  y={glowPadding}
                  width={size.width}
                  height={size.height}
                  preserveAspectRatio={imageFit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
                  clipPath={`url(#${clipId})`}
                />
              ) : null}
              {strokeWidth > 0 ? (
                <Path d={outlinePath} fill="none" stroke={borderColor} strokeWidth={strokeWidth} />
              ) : null}
            </Svg>
          </View>
        </>
      ) : null}
      {children}
    </View>
  );
}

export type PanelCornerStyle = "rounded" | "chamfered";

// One surface of the panel, drawn either rounded (plain View border radius) or
// chamfered (SVG octagon). `imageUri` fills the surface and is clipped to it.
export function PanelSurface({
  cornerStyle,
  radius,
  backgroundColor,
  borderColor,
  borderWidth,
  imageUri,
  imageFit = "contain",
  texture,
  textureColor,
  textureOpacity,
  textureScale,
  style,
  children,
}: {
  cornerStyle: PanelCornerStyle;
  radius: number;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  imageUri?: string;
  imageFit?: "contain" | "cover";
  // Only the chamfered variant can carry a texture -- a rounded RN View has no
  // way to paint a repeating fill.
  texture?: ChamferedPanelTexture;
  textureColor?: string;
  textureOpacity?: number;
  textureScale?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  if (cornerStyle === "chamfered") {
    return (
      <ChamferedPanel
        cut={radius}
        backgroundColor={backgroundColor}
        borderColor={borderColor}
        borderWidth={borderWidth}
        imageUri={imageUri}
        imageFit={imageFit}
        texture={texture}
        textureColor={textureColor}
        textureOpacity={textureOpacity}
        textureScale={textureScale}
        style={style}
      >
        {children}
      </ChamferedPanel>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth,
          borderColor,
          backgroundColor,
          overflow: imageUri ? "hidden" : undefined,
        },
        style,
      ]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} resizeMode={imageFit} />
      ) : null}
      {children}
    </View>
  );
}
