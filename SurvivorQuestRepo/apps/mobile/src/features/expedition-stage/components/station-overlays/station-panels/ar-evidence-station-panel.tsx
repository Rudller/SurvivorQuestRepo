import { useState, type ComponentProps } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import {
  FORENSIC_SAMPLE_CASE,
  findForensicEvidence,
  readCollectedEvidence,
  writeCollectedEvidence,
} from "../../forensic-evidence/forensic-case";
import { ForensicScanner, UV } from "../../forensic-evidence/forensic-scanner";
import { QuizAudioPanel } from "./quiz-audio-station-panel";
import { useStationPanelLayout } from "./shared-ui";

type ArEvidenceStationPanelProps = Omit<ComponentProps<typeof QuizAudioPanel>, "isAudioQuizStation">;

// Ślady AR + klasyczny quiz: drużyna zbiera odciski lampą UV, a potem wskazuje
// sprawcę jedną z czterech odpowiedzi. Zapis i sprawdzanie odpowiedzi są te
// same co w quizie (behavesAs: "quiz" w rejestrze).
export function ArEvidenceStationPanel(props: ArEvidenceStationPanelProps) {
  const layout = useStationPanelLayout();
  const stationId = props.station.stationId;
  const [collected, setCollected] = useState(() => readCollectedEvidence(stationId));
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const total = FORENSIC_SAMPLE_CASE.evidence.length;

  const handleCollect = (code: string) => {
    setCollected((current) => {
      if (current.includes(code)) {
        return current;
      }
      const next = [...current, code];
      writeCollectedEvidence(stationId, next);
      return next;
    });
  };

  return (
    <View style={{ rowGap: layout.isTablet ? 16 : 12 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: UV.border,
          borderRadius: 16,
          padding: layout.isTablet ? 16 : 12,
          backgroundColor: "rgba(46, 16, 101, 0.28)",
          rowGap: 10,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 18 : 15, fontWeight: "700" }}>
            Zebrane ślady
          </Text>
          <Text style={{ color: UV.glow, fontSize: layout.isTablet ? 18 : 15, fontWeight: "800" }}>
            {collected.length}/{total}
          </Text>
        </View>
        {collected.length > 0 ? (
          <View style={{ rowGap: 6 }}>
            {collected.map((code) => {
              const evidence = findForensicEvidence(code);
              if (!evidence) {
                return null;
              }
              return (
                <Text key={code} style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.isTablet ? 15 : 13 }}>
                  {evidence.label}: {evidence.person ?? "brak dopasowania"}
                </Text>
              );
            })}
          </View>
        ) : (
          <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.isTablet ? 15 : 13 }}>
            {FORENSIC_SAMPLE_CASE.intro}
          </Text>
        )}
        <Pressable
          onPress={() => setIsScannerOpen(true)}
          style={{
            backgroundColor: UV.accent,
            borderRadius: 12,
            paddingVertical: layout.isTablet ? 14 : 11,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#12062a", fontSize: layout.isTablet ? 18 : 15, fontWeight: "800" }}>
            {collected.length === 0 ? "Włącz lampę UV" : "Szukaj dalej lampą UV"}
          </Text>
        </Pressable>
      </View>

      <QuizAudioPanel {...props} isAudioQuizStation={false} />

      <Modal visible={isScannerOpen} animationType="fade" statusBarTranslucent onRequestClose={() => setIsScannerOpen(false)}>
        {isScannerOpen ? (
          <ForensicScanner collectedCodes={collected} onCollect={handleCollect} onClose={() => setIsScannerOpen(false)} />
        ) : null}
      </Modal>
    </View>
  );
}
