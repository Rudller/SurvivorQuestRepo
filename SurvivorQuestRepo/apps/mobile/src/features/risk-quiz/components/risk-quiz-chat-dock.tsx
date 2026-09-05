import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME, TEAM_COLORS } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { ChamferedPanel } from "../../../shared/ui/chamfered-panel";
import type { RiskChatMessage } from "../api/risk-quiz.api";

// Matches RISK_CHAT_MESSAGE_MAX_LENGTH in the backend's risk-quiz.constants.ts,
// so a team hits the ceiling while typing rather than losing the message to a
// 400 at send time.
export const RISK_CHAT_MESSAGE_MAX_LENGTH = 500;

// Height is the thing being animated, so this cannot run on the native driver.
// The chamfered frame redraws from onLayout as the box grows, which is what
// keeps the cut corners correct at every intermediate size.
const EXPAND_DURATION_MS = 240;

type RiskQuizChatDockProps = {
  messages: RiskChatMessage[];
  draft: string;
  canPost: boolean;
  isSending: boolean;
  errorMessage: string | null;
  // Which team is reading, so their own lines sit on the right.
  currentTeamId: string | null;
  isExpanded: boolean;
  unreadCount: number;
  // Raised keyboard height, so the expanded panel gives up room instead of
  // sliding under the keyboard.
  keyboardHeight: number;
  onToggleExpanded: () => void;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
};

type RiskQuizChatText = {
  title: string;
  placeholder: string;
  send: string;
  empty: string;
  emptyPreview: string;
  readOnly: string;
  gameMaster: string;
};

const RISK_QUIZ_CHAT_TEXT_ENGLISH: RiskQuizChatText = {
  title: "Chat",
  placeholder: "Write a message",
  send: "Send",
  empty: "No messages yet. Say hello!",
  emptyPreview: "No messages yet",
  readOnly: "Only the Game Master can post here.",
  gameMaster: "Game Master",
};

const RISK_QUIZ_CHAT_TEXT: Record<UiLanguage, RiskQuizChatText> = {
  polish: {
    title: "Czat",
    placeholder: "Napisz wiadomość",
    send: "Wyślij",
    empty: "Jeszcze nikt nic nie napisał. Przywitajcie się!",
    emptyPreview: "Brak wiadomości",
    readOnly: "W tym czacie pisze tylko Mistrz Gry.",
    gameMaster: "Mistrz Gry",
  },
  english: RISK_QUIZ_CHAT_TEXT_ENGLISH,
  ukrainian: {
    title: "Чат",
    placeholder: "Напишіть повідомлення",
    send: "Надіслати",
    empty: "Ще ніхто нічого не написав. Привітайтеся!",
    emptyPreview: "Немає повідомлень",
    readOnly: "У цьому чаті пише лише організатор.",
    gameMaster: "Організатор",
  },
  russian: {
    title: "Чат",
    placeholder: "Напишите сообщение",
    send: "Отправить",
    empty: "Пока никто ничего не написал. Поздоровайтесь!",
    emptyPreview: "Нет сообщений",
    readOnly: "В этом чате пишет только организатор.",
    gameMaster: "Организатор",
  },
};

// Team.color stores a palette key ("amber"), not a hex — feeding it straight
// into a style silently produces no colour at all. This is the same lookup the
// team banner uses, so a name in the chat matches the banner exactly.
const TEAM_COLOR_HEX_BY_KEY = new Map<string, string>(
  TEAM_COLORS.map((color) => [color.key, color.hex]),
);

function resolveTeamColorHex(colorKey: string | null) {
  if (!colorKey) {
    return null;
  }
  return TEAM_COLOR_HEX_BY_KEY.get(colorKey) ?? null;
}

function formatTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function RiskQuizChatDock({
  messages,
  draft,
  canPost,
  isSending,
  errorMessage,
  currentTeamId,
  isExpanded,
  unreadCount,
  keyboardHeight,
  onToggleExpanded,
  onChangeDraft,
  onSend,
}: RiskQuizChatDockProps) {
  const uiLanguage = useUiLanguage();
  const text = RISK_QUIZ_CHAT_TEXT[uiLanguage];
  const adaptiveLayout = useAdaptiveLayout();
  const isTablet = adaptiveLayout.isTablet;
  const scrollRef = useRef<ScrollView>(null);

  // Same scale ladder the bottom bar uses, so the two panels stay in step at
  // every screen size instead of only matching on one device.
  const collapsedHeight = adaptiveLayout.s(isTablet ? 58 : 50, 44, 66);
  // Deliberately smaller than the bottom bar's cut: at 24px the two corner cuts
  // would nearly meet across a 50px-tall strip and the frame would read as a
  // hexagon rather than a clipped rectangle.
  const panelCut = adaptiveLayout.s(isTablet ? 16 : 14, 12, 20);
  // Thinner than the bottom bar's frame: that panel is the primary action and
  // earns a heavy edge, the dock sits above it as a secondary surface.
  const panelBorderWidth = adaptiveLayout.s(isTablet ? 2 : 1, 1, 2);
  // The bottom bar's own corner cut. Insetting the dock by exactly this much
  // lines its edges up with where that panel's diagonal break ends and its flat
  // top edge begins, so the two stack instead of merely sitting near each other.
  const bottomBarCut = adaptiveLayout.s(isTablet ? 24 : 22, 18, 28);
  const labelFontSize = adaptiveLayout.fs(isTablet ? 11 : 10, 10, 12);
  const previewFontSize = adaptiveLayout.fs(isTablet ? 15 : 13, 12, 17);
  const messageFontSize = adaptiveLayout.fs(isTablet ? 15 : 12, 11, 17);
  const authorFontSize = adaptiveLayout.fs(isTablet ? 12 : 10, 9, 13);
  const actionFontSize = adaptiveLayout.fs(isTablet ? 15 : 12, 11, 16);
  const paddingHorizontal = adaptiveLayout.s(isTablet ? 18 : 16, 14, 22);

  // Roughly half the screen, less whatever the keyboard already took. The floor
  // keeps a usable strip of history even on a phone with the keyboard up.
  const expandedHeight = Math.max(
    adaptiveLayout.s(180, 160, 220),
    Math.min(
      adaptiveLayout.s(isTablet ? 460 : 300, 260, 520),
      adaptiveLayout.height * 0.45 - keyboardHeight * 0.5,
    ),
  );

  const expandAnimation = useState(() => new Animated.Value(isExpanded ? 1 : 0))[0];
  // Swapped at the animation's midpoint rather than cross-faded, the same trick
  // the bottom bar's scan/close button uses for its flip — one content at a
  // time, so neither can steal a tap from the other mid-transition.
  const [showsExpandedContent, setShowsExpandedContent] = useState(isExpanded);
  const wasExpandedRef = useRef(isExpanded);

  useEffect(() => {
    if (wasExpandedRef.current === isExpanded) {
      return;
    }
    wasExpandedRef.current = isExpanded;

    const swapTimeout = setTimeout(
      () => setShowsExpandedContent(isExpanded),
      EXPAND_DURATION_MS / 2,
    );
    Animated.timing(expandAnimation, {
      toValue: isExpanded ? 1 : 0,
      duration: EXPAND_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      // Height is a layout property — the native driver cannot animate it.
      useNativeDriver: false,
    }).start();

    return () => clearTimeout(swapTimeout);
  }, [isExpanded, expandAnimation]);

  useEffect(() => {
    if (!showsExpandedContent) {
      return;
    }
    const timeout = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(timeout);
  }, [showsExpandedContent, messages.length]);

  const latest = messages.at(-1);
  const isLatestFromGameMaster = latest?.authorKind === "GAME_MASTER";
  const isSendDisabled = !canPost || isSending || !draft.trim();

  const animatedHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedHeight, expandedHeight],
  });

  return (
    <View
      style={{
        width: "100%",
        alignItems: "center",
        // Narrows the dock on every screen size; the maxWidth below caps it once
        // the bottom bar has hit its own 560 ceiling.
        paddingHorizontal: bottomBarCut,
      }}
    >
      <Animated.View
        testID="risk-chat-dock"
        // Real style props, not nativewind classes — className never reaches an
        // Animated.View in this app.
        style={{ width: "100%", maxWidth: 560 - bottomBarCut * 2, height: animatedHeight }}
      >
      <ChamferedPanel
        cut={panelCut}
        backgroundColor={EXPEDITION_THEME.panel}
        borderColor={EXPEDITION_THEME.border}
        borderWidth={panelBorderWidth}
        // No glow at all. The bottom bar's glowing, pulsing frame is what marks
        // the primary action; repeating it directly above only dilutes that
        // signal. The dock stays a plain chamfered surface, and the unread badge
        // carries "there is something new" on its own.
        texture="cross-hatch"
        textureColor={EXPEDITION_THEME.accent}
        textureOpacity={0.08}
        textureScale={1.3}
        style={{ flex: 1, overflow: "hidden" }}
      >
        {showsExpandedContent ? (
          <View style={{ flex: 1 }}>
            <Pressable
              testID="risk-chat-collapse"
              onPress={onToggleExpanded}
              className="flex-row items-center justify-between active:opacity-80"
              style={{
                paddingHorizontal,
                paddingVertical: adaptiveLayout.s(isTablet ? 10 : 8, 6, 12),
              }}
            >
              <Text
                className="uppercase tracking-widest"
                style={{ color: EXPEDITION_THEME.textSubtle, fontSize: labelFontSize }}
              >
                {text.title}
              </Text>
              <Text style={{ color: EXPEDITION_THEME.accentStrong, fontSize: previewFontSize }}>
                ▼
              </Text>
            </Pressable>

            <ScrollView
              ref={scrollRef}
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal,
                paddingBottom: 8,
                rowGap: adaptiveLayout.s(isTablet ? 8 : 6, 4, 10),
              }}
              // The screen dismisses the keyboard on taps into empty space; raw
              // touch events bubble regardless of who becomes the responder, so
              // stop them here or scrolling the history closes the keyboard.
              onTouchEnd={(event) => event.stopPropagation()}
            >
              {messages.length === 0 ? (
                <Text
                  className="text-center"
                  style={{
                    color: EXPEDITION_THEME.textMuted,
                    fontSize: messageFontSize,
                    marginTop: 12,
                  }}
                >
                  {text.empty}
                </Text>
              ) : null}
              {messages.map((message) => (
                <ChatRow
                  key={message.id}
                  message={message}
                  isOwn={message.authorKind === "TEAM" && message.teamId === currentTeamId}
                  authorFontSize={authorFontSize}
                  messageFontSize={messageFontSize}
                  labelFontSize={labelFontSize}
                  gameMasterLabel={text.gameMaster}
                  gameMasterCut={adaptiveLayout.s(isTablet ? 12 : 10, 8, 14)}
                />
              ))}
            </ScrollView>

            <View
              style={{
                paddingHorizontal,
                paddingBottom: adaptiveLayout.s(isTablet ? 12 : 10, 8, 14),
                rowGap: 6,
              }}
            >
              {errorMessage ? (
                <Text style={{ color: EXPEDITION_THEME.danger, fontSize: authorFontSize }}>
                  {errorMessage}
                </Text>
              ) : null}

              {canPost ? (
                <View className="flex-row" style={{ columnGap: 6 }}>
                  <TextInput
                    testID="risk-chat-input"
                    className="flex-1 px-3"
                    style={{
                      borderWidth: 1,
                      borderColor: EXPEDITION_THEME.border,
                      backgroundColor: EXPEDITION_THEME.panelStrong,
                      color: EXPEDITION_THEME.textPrimary,
                      fontSize: actionFontSize,
                      paddingVertical: adaptiveLayout.s(isTablet ? 10 : 7, 6, 12),
                    }}
                    placeholder={text.placeholder}
                    placeholderTextColor={EXPEDITION_THEME.textSubtle}
                    value={draft}
                    onChangeText={onChangeDraft}
                    maxLength={RISK_CHAT_MESSAGE_MAX_LENGTH}
                    editable={!isSending}
                    onSubmitEditing={onSend}
                    returnKeyType="send"
                    onTouchEnd={(event) => event.stopPropagation()}
                  />
                  <Pressable
                    testID="risk-chat-send"
                    onPress={onSend}
                    disabled={isSendDisabled}
                    className="items-center justify-center px-4 active:opacity-90"
                    style={{
                      backgroundColor: isSendDisabled
                        ? EXPEDITION_THEME.panelStrong
                        : EXPEDITION_THEME.accent,
                      minHeight: adaptiveLayout.hit(isTablet ? 44 : 36),
                    }}
                  >
                    {isSending ? (
                      <ActivityIndicator color={EXPEDITION_THEME.background} />
                    ) : (
                      <Text
                        className="font-semibold uppercase tracking-widest"
                        style={{
                          color: isSendDisabled
                            ? EXPEDITION_THEME.textMuted
                            : EXPEDITION_THEME.background,
                          fontSize: labelFontSize,
                        }}
                      >
                        {text.send}
                      </Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Text
                  className="text-center"
                  style={{ color: EXPEDITION_THEME.textMuted, fontSize: authorFontSize }}
                >
                  {text.readOnly}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <Pressable
            testID="risk-chat-strip"
            onPress={onToggleExpanded}
            className="flex-1 flex-row items-center active:opacity-90"
            style={{ paddingHorizontal, columnGap: 10 }}
          >
            <Text style={{ color: EXPEDITION_THEME.accentStrong, fontSize: previewFontSize }}>
              ▲
            </Text>
            <View className="flex-1">
              {/* The label doubles as the sender badge, so a Game Master
                  announcement is recognisable while the dock is still shut —
                  the whole point of the band treatment would be lost if it
                  only appeared once somebody expanded the room. */}
              <Text
                className="uppercase tracking-widest"
                style={{
                  color: isLatestFromGameMaster
                    ? EXPEDITION_THEME.accent
                    : EXPEDITION_THEME.textSubtle,
                  fontSize: labelFontSize,
                }}
              >
                {isLatestFromGameMaster ? text.gameMaster : text.title}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: previewFontSize }}>
                {latest ? (
                  latest.authorKind === "SYSTEM" ? (
                    <Text
                      style={{ color: EXPEDITION_THEME.textMuted, fontStyle: "italic" }}
                    >
                      {latest.content}
                    </Text>
                  ) : isLatestFromGameMaster ? (
                    <Text
                      className="font-semibold"
                      style={{ color: EXPEDITION_THEME.accent }}
                    >
                      {latest.content}
                    </Text>
                  ) : (
                    <>
                      <Text
                        className="font-semibold"
                        style={{
                          color:
                            resolveTeamColorHex(latest.teamColor) ??
                            EXPEDITION_THEME.textMuted,
                        }}
                      >
                        {latest.authorName}:{" "}
                      </Text>
                      <Text style={{ color: EXPEDITION_THEME.textPrimary }}>
                        {latest.content}
                      </Text>
                    </>
                  )
                ) : (
                  <Text style={{ color: EXPEDITION_THEME.textMuted }}>
                    {text.emptyPreview}
                  </Text>
                )}
              </Text>
            </View>
            {unreadCount > 0 ? (
              <View
                testID="risk-chat-unread"
                className="items-center justify-center px-2"
                style={{
                  backgroundColor: EXPEDITION_THEME.accent,
                  minWidth: adaptiveLayout.s(24, 20, 30),
                  height: adaptiveLayout.s(24, 20, 30),
                }}
              >
                <Text
                  className="font-extrabold"
                  style={{ color: EXPEDITION_THEME.background, fontSize: labelFontSize }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )}
        </ChamferedPanel>
      </Animated.View>
    </View>
  );
}

type ChatRowProps = {
  message: RiskChatMessage;
  isOwn: boolean;
  authorFontSize: number;
  messageFontSize: number;
  labelFontSize: number;
  gameMasterLabel: string;
  gameMasterCut: number;
};

function ChatRow({
  message,
  isOwn,
  authorFontSize,
  messageFontSize,
  labelFontSize,
  gameMasterLabel,
  gameMasterCut,
}: ChatRowProps) {
  // System messages are the room narrating itself, not someone talking — no
  // bubble, centred, muted, so they never read as a team's line.
  if (message.authorKind === "SYSTEM") {
    return (
      <Text
        className="text-center"
        style={{
          color: EXPEDITION_THEME.textMuted,
          fontSize: authorFontSize,
          fontStyle: "italic",
          paddingHorizontal: 8,
        }}
      >
        {message.content}
      </Text>
    );
  }

  // The Game Master is not another voice in the room — it is the room being
  // addressed. So the message drops the bubble entirely and spans the full
  // width as an accent-filled band, which reads as an announcement at a glance
  // even when the conversation above it is busy.
  if (message.authorKind === "GAME_MASTER") {
    return (
      <ChamferedPanel
        cut={gameMasterCut}
        backgroundColor={EXPEDITION_THEME.accent}
        style={{ paddingHorizontal: 10, paddingVertical: 6 }}
      >
        <View className="flex-row items-center justify-between">
          <Text
            className="font-extrabold uppercase tracking-widest"
            style={{ color: EXPEDITION_THEME.background, fontSize: labelFontSize }}
          >
            {gameMasterLabel}
          </Text>
          <Text
            style={{
              color: EXPEDITION_THEME.background,
              fontSize: labelFontSize,
              opacity: 0.65,
            }}
          >
            {formatTime(message.createdAt)}
          </Text>
        </View>
        <Text
          className="font-semibold"
          style={{ color: EXPEDITION_THEME.background, fontSize: messageFontSize }}
        >
          {message.content}
        </Text>
      </ChamferedPanel>
    );
  }

  const accent = resolveTeamColorHex(message.teamColor) ?? EXPEDITION_THEME.textMuted;

  return (
    <View style={{ alignItems: isOwn ? "flex-end" : "flex-start" }}>
      <View
        className="px-2.5 py-1.5"
        style={{
          maxWidth: "88%",
          borderWidth: 1,
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panelStrong,
        }}
      >
        <View className="flex-row items-center" style={{ columnGap: 5 }}>
          <View style={{ width: 7, height: 7, backgroundColor: accent }} />
          <Text className="font-semibold" style={{ color: accent, fontSize: authorFontSize }}>
            {message.authorName}
          </Text>
          <Text style={{ color: EXPEDITION_THEME.textSubtle, fontSize: authorFontSize }}>
            {formatTime(message.createdAt)}
          </Text>
        </View>
        <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: messageFontSize }}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}
