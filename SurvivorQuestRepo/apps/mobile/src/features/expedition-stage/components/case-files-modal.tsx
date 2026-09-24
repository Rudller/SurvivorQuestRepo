import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { MOBILE_UX_TOKENS } from "../../../shared/ui/ux-tokens";
import { textRole } from "../../../shared/ui/typography";
import type { ExpeditionCaseFile, ExpeditionCaseFileKind, ExpeditionTask } from "../model/types";
import {
  countUnlockedCaseFiles,
  resolveUnlockStationNumber,
  sortCaseFiles,
} from "./case-files.model";
import { useCaseFileAudio } from "./use-case-file-audio";

/**
 * Akta sprawy — lista dowodów i ich szczegóły.
 *
 * Dwa poziomy siedzą w JEDNYM `Modal`: poziom szczegółu podmienia zawartość
 * panelu, zamiast otwierać drugi modal. Zagnieżdżone RN-owe modale bywają na
 * Androidzie zawodne, a tu nie ma czego zyskać — obie warstwy i tak dzielą to
 * samo przyciemnienie tła.
 *
 * Poziom pierwszy jest LISTĄ, nie siatką kafelków: tytuł dowodu jest treścią,
 * a siatka by go ucięła.
 */

const CASE_FILES_TEXT: Record<
  UiLanguage,
  {
    title: string;
    counter: (unlocked: number, total: number) => string;
    empty: string;
    locked: string;
    lockedWithStation: (stationNumber: number) => string;
    back: string;
    close: string;
    kinds: Record<ExpeditionCaseFileKind, string>;
    imageFailed: string;
    audioPlay: string;
    audioPause: string;
    audioFailed: string;
  }
> = {
  polish: {
    title: "Akta sprawy",
    counter: (unlocked, total) => `${unlocked} z ${total}`,
    empty: "Akta są jeszcze puste.",
    locked: "Zabezpieczony",
    lockedWithStation: (stationNumber) => `Ukończ stanowisko #${stationNumber}`,
    back: "Wróć",
    close: "Zamknij",
    kinds: { text: "Notatka", image: "Zdjęcie", audio: "Nagranie", dossier: "Kartoteka" },
    imageFailed: "Nie udało się wczytać zdjęcia.",
    audioPlay: "Odtwórz",
    audioPause: "Pauza",
    audioFailed: "Nie udało się odtworzyć nagrania.",
  },
  english: {
    title: "Case files",
    counter: (unlocked, total) => `${unlocked} of ${total}`,
    empty: "The case file is still empty.",
    locked: "Secured",
    lockedWithStation: (stationNumber) => `Complete station #${stationNumber}`,
    back: "Back",
    close: "Close",
    kinds: { text: "Note", image: "Photo", audio: "Recording", dossier: "Dossier" },
    imageFailed: "The photo could not be loaded.",
    audioPlay: "Play",
    audioPause: "Pause",
    audioFailed: "The recording could not be played.",
  },
  ukrainian: {
    title: "Матеріали справи",
    counter: (unlocked, total) => `${unlocked} з ${total}`,
    empty: "Матеріали справи ще порожні.",
    locked: "Засекречено",
    lockedWithStation: (stationNumber) => `Пройдіть станцію #${stationNumber}`,
    back: "Назад",
    close: "Закрити",
    kinds: { text: "Нотатка", image: "Фото", audio: "Запис", dossier: "Картотека" },
    imageFailed: "Не вдалося завантажити фото.",
    audioPlay: "Відтворити",
    audioPause: "Пауза",
    audioFailed: "Не вдалося відтворити запис.",
  },
  russian: {
    title: "Материалы дела",
    counter: (unlocked, total) => `${unlocked} из ${total}`,
    empty: "Материалы дела пока пусты.",
    locked: "Засекречено",
    lockedWithStation: (stationNumber) => `Пройдите станцию #${stationNumber}`,
    back: "Назад",
    close: "Закрыть",
    kinds: { text: "Заметка", image: "Фото", audio: "Запись", dossier: "Картотека" },
    imageFailed: "Не удалось загрузить фото.",
    audioPlay: "Воспроизвести",
    audioPause: "Пауза",
    audioFailed: "Не удалось воспроизвести запись.",
  },
};

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ordered = useMemo(() => sortCaseFiles(caseFiles), [caseFiles]);
  const unlockedCount = countUnlockedCaseFiles(ordered);
  const selected = ordered.find((caseFile) => caseFile.id === selectedId) ?? null;

  function close() {
    setSelectedId(null);
    onRequestClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        className="flex-1 items-center justify-center px-4"
        style={{
          backgroundColor: isLightTheme
            ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)`
            : `rgba(${EXPEDITION_THEME.scrimDeepRgb}, 0.78)`,
        }}
        onPress={close}
      >
        <Pressable
          testID="case-files-modal"
          className={`w-full rounded-3xl border ${isTabletLayout ? "p-6" : "p-4"}`}
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panel,
            maxWidth: isTabletLayout ? 760 : 620,
          }}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text
                className="text-lg"
                style={[textRole("caseTitle"), { color: EXPEDITION_THEME.textPrimary }]}
              >
                {selected?.title ?? text.title}
              </Text>
              {!selected ? (
                <Text
                  className="mt-1 text-xs uppercase"
                  style={[textRole("navigation"), { color: EXPEDITION_THEME.textSubtle }]}
                >
                  {text.counter(unlockedCount, ordered.length)}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={selected ? () => setSelectedId(null) : close}
              className="rounded-2xl border px-3 py-2 active:opacity-85"
              style={{ borderColor: EXPEDITION_THEME.border, minHeight: MOBILE_UX_TOKENS.minTouchTarget }}
            >
              <Text className="text-xs" style={[textRole("navigation"), { color: EXPEDITION_THEME.textMuted }]}>
                {selected ? text.back : text.close}
              </Text>
            </Pressable>
          </View>

          {selected ? (
            <CaseFileDetail caseFile={selected} text={text} isTabletLayout={isTabletLayout} />
          ) : (
            <CaseFileList
              caseFiles={ordered}
              tasks={tasks}
              text={text}
              isTabletLayout={isTabletLayout}
              onSelect={setSelectedId}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type SharedText = (typeof CASE_FILES_TEXT)["polish"];

function CaseFileList({
  caseFiles,
  tasks,
  text,
  isTabletLayout,
  onSelect,
}: {
  caseFiles: ExpeditionCaseFile[];
  tasks: ExpeditionTask[];
  text: SharedText;
  isTabletLayout: boolean;
  onSelect: (id: string) => void;
}) {
  if (caseFiles.length === 0) {
    return (
      <Text className="mt-6 text-sm" style={[textRole("body"), { color: EXPEDITION_THEME.textMuted }]}>
        {text.empty}
      </Text>
    );
  }

  return (
    <ScrollView className="mt-4" style={{ maxHeight: isTabletLayout ? 460 : 320 }}>
      {caseFiles.map((caseFile, index) => {
        const stationNumber = resolveUnlockStationNumber(caseFile, tasks);

        return (
          <Pressable
            key={caseFile.id}
            testID={`case-file-row-${caseFile.id}`}
            disabled={caseFile.locked}
            onPress={() => onSelect(caseFile.id)}
            accessibilityRole="button"
            accessibilityState={{ disabled: caseFile.locked }}
            className="flex-row items-center gap-3 border-b py-3 active:opacity-85"
            style={{
              borderBottomColor: EXPEDITION_THEME.border,
              opacity: caseFile.locked ? MOBILE_UX_TOKENS.disabledOpacity : 1,
            }}
          >
            <View
              className="items-center justify-center rounded-xl border"
              style={{
                width: isTabletLayout ? 52 : 44,
                height: isTabletLayout ? 52 : 44,
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panelMuted,
              }}
            >
              <Text
                className="text-[10px] uppercase"
                style={[textRole("navigation"), { color: EXPEDITION_THEME.textSubtle }]}
              >
                {caseFile.locked ? "🔒" : text.kinds[caseFile.kind].slice(0, 3)}
              </Text>
            </View>

            <View className="flex-1">
              <Text
                className="text-sm"
                numberOfLines={1}
                style={[textRole("bodyStrong"), { color: EXPEDITION_THEME.textPrimary }]}
              >
                {caseFile.locked
                  ? `${text.locked} ${String(index + 1).padStart(2, "0")}`
                  : caseFile.title}
              </Text>
              <Text className="text-xs" style={[textRole("body"), { color: EXPEDITION_THEME.textSubtle }]}>
                {caseFile.locked && stationNumber
                  ? text.lockedWithStation(stationNumber)
                  : text.kinds[caseFile.kind]}
              </Text>
            </View>

            {!caseFile.locked ? (
              <Text className="text-lg" style={{ color: EXPEDITION_THEME.textSubtle }}>
                ›
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function CaseFileDetail({
  caseFile,
  text,
  isTabletLayout,
}: {
  caseFile: ExpeditionCaseFile;
  text: SharedText;
  isTabletLayout: boolean;
}) {
  return (
    <ScrollView className="mt-4" style={{ maxHeight: isTabletLayout ? 520 : 380 }}>
      <Text
        className="mb-3 text-[10px] uppercase"
        style={[textRole("navigation"), { color: EXPEDITION_THEME.textSubtle }]}
      >
        {text.kinds[caseFile.kind]}
      </Text>

      {caseFile.kind === "text" ? (
        <Text
          className="text-sm"
          style={[
            textRole("body"),
            { color: EXPEDITION_THEME.textPrimary, lineHeight: isTabletLayout ? 26 : 22 },
          ]}
        >
          {caseFile.body}
        </Text>
      ) : null}

      {caseFile.kind === "image" ? <CaseFileImage url={caseFile.url} text={text} /> : null}

      {caseFile.kind === "audio" ? <CaseFileAudio url={caseFile.url} text={text} /> : null}

      {caseFile.kind === "dossier" ? (
        <View>
          {(caseFile.fields ?? []).map((field, index) => (
            <View
              key={`${field.label}-${index}`}
              className={`border-b py-2 ${isTabletLayout ? "flex-row items-baseline gap-4" : ""}`}
              style={{ borderBottomColor: EXPEDITION_THEME.border }}
            >
              <Text
                className="text-[10px] uppercase"
                style={[
                  textRole("navigation"),
                  { color: EXPEDITION_THEME.textSubtle, width: isTabletLayout ? 160 : undefined },
                ]}
              >
                {field.label}
              </Text>
              <Text
                className="flex-1 text-sm"
                style={[textRole("bodyStrong"), { color: EXPEDITION_THEME.textPrimary }]}
              >
                {field.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function CaseFileImage({ url, text }: { url: string | undefined; text: SharedText }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);

  if (!url || hasFailed) {
    return (
      <Text className="text-sm" style={[textRole("body"), { color: EXPEDITION_THEME.textMuted }]}>
        {text.imageFailed}
      </Text>
    );
  }

  return (
    <View>
      <Image
        source={{ uri: url }}
        // `contain`, nie `cover`: dowód to dokument, a nie ozdoba — obcięcie
        // krawędzi mogłoby zabrać właśnie ten fragment, po który gracz przyszedł.
        resizeMode="contain"
        accessibilityLabel={text.kinds.image}
        style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12 }}
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
