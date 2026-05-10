import { Modal, Pressable, Text, View } from "react-native";
import {
  QuizPrestartOverlay,
  RealizationFinishOverlay,
  StationPreviewOverlay,
  StationTestMenuOverlay,
  WelcomePreviewOverlay,
} from "../components/station-overlays";
import { QrScannerOverlay } from "../components/qr-scanner-overlay";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useExpeditionStageOverlayContext, useExpeditionStageSessionContext } from "./expedition-stage-context";

type ExpeditionStageOverlayText = {
  timedTaskAlertTitle: string;
  timedTaskAlertBody: string;
  timedTaskAlertBack: string;
  timedTaskAlertCloseAndFail: string;
};

type AdaptiveLayoutLike = {
  isTablet: boolean;
  s: (value: number, min?: number, max?: number) => number;
  fs: (value: number, min?: number, max?: number) => number;
  hit: (value?: number) => number;
};

type ExpeditionStageOverlayLayerProps = {
  adaptiveLayout: AdaptiveLayoutLike;
  isLightTheme: boolean;
  text: ExpeditionStageOverlayText;
};

export function ExpeditionStageOverlayLayer({
  adaptiveLayout,
  isLightTheme,
  text,
}: ExpeditionStageOverlayLayerProps) {
  const { session, sessionState, isSessionEnded, sessionEndReason, sessionEndedAt } = useExpeditionStageSessionContext();
  const { stationTestEntries, overlayFlow, qrFlow } = useExpeditionStageOverlayContext();
  const isTabletLayout = adaptiveLayout.isTablet;

  return (
    <>
      <StationTestMenuOverlay
        visible={overlayFlow.isStationTestMenuOpen}
        stations={stationTestEntries}
        onClose={() => overlayFlow.setIsStationTestMenuOpen(false)}
        onEnterStation={overlayFlow.handleEnterStationTest}
        onOpenFinishScreen={() => {
          overlayFlow.setIsStationTestMenuOpen(false);
          overlayFlow.setIsFinishPreviewOpen(true);
        }}
        onPreviewSuccessPopup={() => overlayFlow.handlePreviewOutcomePopup("success")}
        onPreviewFailedPopup={() => overlayFlow.handlePreviewOutcomePopup("failed")}
        onOpenWelcomeScreen={() => {
          overlayFlow.setIsStationTestMenuOpen(false);
          overlayFlow.setIsWelcomePreviewOpen(true);
        }}
      />

      <WelcomePreviewOverlay
        visible={overlayFlow.isWelcomePreviewOpen}
        introText={sessionState.realization.introText ?? session.realization?.introText}
        onClose={() => overlayFlow.setIsWelcomePreviewOpen(false)}
      />

      <RealizationFinishOverlay
        visible={isSessionEnded || overlayFlow.isFinishPreviewOpen}
        reason={isSessionEnded ? sessionEndReason : "manual-preview"}
        endedAt={isSessionEnded ? sessionEndedAt : null}
        leaderboardEntries={sessionState.leaderboard.entries}
        currentTeamId={sessionState.team.id}
        showLeaderboard={sessionState.realization.showLeaderboard}
        canClose={!isSessionEnded && overlayFlow.isFinishPreviewOpen}
        onClose={() => overlayFlow.setIsFinishPreviewOpen(false)}
      />

      <StationPreviewOverlay
        station={overlayFlow.activeStationPreview}
        onClose={() => overlayFlow.setActiveStationTestId(null)}
        onRequestClose={overlayFlow.handleRequestCloseActiveStation}
        onCompleteTask={overlayFlow.handleCompleteStationTestTask}
        onQuizFailed={overlayFlow.handleQuizFailed}
        onTimeExpired={overlayFlow.handleTimeStationExpired}
        debugOutcomePreview={overlayFlow.debugOutcomePreview}
        onDebugOutcomePreviewConsumed={() => overlayFlow.setDebugOutcomePreview(null)}
      />

      <QuizPrestartOverlay
        visible={Boolean(overlayFlow.pendingQuizStartStation)}
        stationName={overlayFlow.pendingQuizStartStation?.name ?? null}
        stationType={overlayFlow.pendingQuizStartStation?.stationType ?? "quiz"}
        isStarting={overlayFlow.isStartingPendingQuiz}
        onClose={() => {
          overlayFlow.setPendingQuizStartStationId(null);
          overlayFlow.setIsStartingPendingQuiz(false);
        }}
        onStart={() => {
          void overlayFlow.handleStartPendingQuiz();
        }}
      />

      <QuizPrestartOverlay
        visible={Boolean(overlayFlow.pendingTimeStartStation)}
        stationName={overlayFlow.pendingTimeStartStation?.name ?? null}
        stationType="time"
        isStarting={overlayFlow.isStartingPendingTime}
        onClose={() => {
          overlayFlow.setPendingTimeStartStationId(null);
          overlayFlow.setIsStartingPendingTime(false);
        }}
        onStart={() => {
          void overlayFlow.handleStartPendingTime();
        }}
      />

      <QrScannerOverlay
        visible={qrFlow.isQrScannerOpen}
        isResolving={qrFlow.isQrResolving}
        onDetected={(value: string) => {
          void qrFlow.handleQrDetected(value);
        }}
        onClose={qrFlow.handleCloseQrScanner}
      />

      <Modal
        visible={Boolean(overlayFlow.timedCloseConfirmStation)}
        transparent
        animationType="fade"
        onRequestClose={() => overlayFlow.setTimedCloseConfirmStation(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center"
          style={{
            backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(0, 0, 0, 0.45)",
            paddingHorizontal: adaptiveLayout.s(isTabletLayout ? 36 : 24, 20, 44),
          }}
          onPress={() => overlayFlow.setTimedCloseConfirmStation(null)}
        >
          <Pressable
            className="w-full border"
            style={{
              maxWidth: adaptiveLayout.s(isTabletLayout ? 760 : 460, 420, 920),
              borderRadius: adaptiveLayout.s(isTabletLayout ? 28 : 18, 16, 34),
              paddingHorizontal: adaptiveLayout.s(isTabletLayout ? 28 : 20, 16, 34),
              paddingVertical: adaptiveLayout.s(isTabletLayout ? 26 : 20, 16, 34),
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <Text
              className="font-semibold"
              style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletLayout ? 28 : 18, 17, 32) }}
            >
              {text.timedTaskAlertTitle}
            </Text>
            <Text
              className="mt-2"
              style={{
                color: EXPEDITION_THEME.textMuted,
                fontSize: adaptiveLayout.fs(isTabletLayout ? 19 : 14, 13, 23),
                lineHeight: adaptiveLayout.s(isTabletLayout ? 30 : 24, 22, 36),
              }}
            >
              {text.timedTaskAlertBody}
            </Text>

            <View className="mt-5 flex-row" style={{ columnGap: adaptiveLayout.s(isTabletLayout ? 14 : 8, 6, 18) }}>
              <Pressable
                className="flex-1 items-center justify-center border active:opacity-90"
                style={{
                  borderRadius: adaptiveLayout.s(isTabletLayout ? 16 : 12, 10, 20),
                  minHeight: adaptiveLayout.hit(isTabletLayout ? 62 : 48),
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
                onPress={() => overlayFlow.setTimedCloseConfirmStation(null)}
              >
                <Text
                  className="font-semibold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletLayout ? 19 : 14, 13, 23) }}
                >
                  {text.timedTaskAlertBack}
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center justify-center border active:opacity-90"
                style={{
                  borderRadius: adaptiveLayout.s(isTabletLayout ? 16 : 12, 10, 20),
                  minHeight: adaptiveLayout.hit(isTabletLayout ? 62 : 48),
                  borderColor: "rgba(239, 68, 68, 0.7)",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                }}
                onPress={overlayFlow.handleConfirmTimedCloseFail}
              >
                <Text
                  className="font-semibold"
                  style={{ color: EXPEDITION_THEME.danger, fontSize: adaptiveLayout.fs(isTabletLayout ? 19 : 14, 13, 23) }}
                >
                  {text.timedTaskAlertCloseAndFail}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
