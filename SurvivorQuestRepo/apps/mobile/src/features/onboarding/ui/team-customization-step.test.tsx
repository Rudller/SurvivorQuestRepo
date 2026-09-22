import { render } from "@testing-library/react-native";

import { TeamCustomizationStep, type TeamCustomizationStepText } from "./team-customization-step";
import { TEAM_COLORS } from "../model/constants";

// Ryzykanci realizations run the whole game on chamfered panels; the team
// editor was the one screen still wearing the expedition's rounded card, so it
// read as a different app right before the game started.

const text: TeamCustomizationStepText = {
  editorTitle: "Twoja drużyna",
  editorHint: "Ustaw nazwę i wygląd",
  bannerPreviewLabel: "Podgląd",
  teamFallbackName: "Drużyna",
  teamLabel: "Drużyna",
  pointsLabel: "pkt",
  customizationLabel: "Personalizacja",
  teamNamePlaceholder: "Nazwa drużyny",
  teamColorLabel: "Kolor",
  languageLabel: "Język",
  avatarLabel: "Awatar",
  avatarHint: "Wybierz emoji lub zrób selfie",
  photoOption: "Zdjęcie",
  emojiOption: "Emoji",
  takeSelfie: "Zrób selfie",
  retakeSelfie: "Zrób ponownie",
  selfieOverlayTitle: "Selfie",
  selfieOverlaySubtitle: "Cała drużyna w kadrze",
  startAction: "Zaczynamy",
  startingAction: "Zapisywanie...",
};

function renderStep(overrides: Partial<Parameters<typeof TeamCustomizationStep>[0]> = {}) {
  return render(
    <TeamCustomizationStep
      isTabletLayout={false}
      selectedTeam={1}
      teamName="Rekiny"
      teamColor={TEAM_COLORS[0].key}
      selfiePreviewUri={null}
      teamIcon="🦊"
      teamColors={TEAM_COLORS}
      selectedColor={TEAM_COLORS[0]}
      bannerTextColor="#ffffff"
      bannerMutedTextColor="#cccccc"
      bannerIconBackground="#222222"
      saveMessage={null}
      saveMessageTone={null}
      blockMessage={null}
      isSaving={false}
      canSave
      occupiedColors={{}}
      selfieUploadError={null}
      text={text}
      onTeamNameChange={() => {}}
      onTeamColorChange={() => {}}
      onOpenSelfieCapture={() => {}}
      onOpenIconPicker={() => {}}
      onSave={() => {}}
      {...overrides}
    />,
  );
}

describe("TeamCustomizationStep", () => {
  it("keeps the rounded expedition shell by default", async () => {
    const { queryByTestId, getByText } = await renderStep();

    expect(queryByTestId("team-customization-chamfer")).toBeNull();
    expect(getByText(text.editorTitle)).toBeTruthy();
  });

  it("switches to a chamfered shell for Ryzykanci", async () => {
    const { getByTestId, getByText } = await renderStep({ variant: "risk" });

    expect(getByTestId("team-customization-chamfer")).toBeTruthy();
    // The shape changes, the contents do not.
    expect(getByText(text.editorTitle)).toBeTruthy();
    expect(getByText(text.startAction)).toBeTruthy();
  });
});
