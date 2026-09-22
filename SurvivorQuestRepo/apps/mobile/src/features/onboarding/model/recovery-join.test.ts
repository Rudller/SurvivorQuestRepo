import {
  hasCompleteTeamCustomization,
  shouldSkipTeamStepAfterJoin,
} from "./recovery-join";

const customizedTeam = {
  name: "Rysie",
  color: "amber",
  badgeImageUrl: null,
  badgeKey: "fox",
};

describe("hasCompleteTeamCustomization", () => {
  it("accepts an emoji badge as a chosen avatar", () => {
    expect(hasCompleteTeamCustomization(customizedTeam)).toBe(true);
  });

  it("accepts a selfie as a chosen avatar", () => {
    expect(
      hasCompleteTeamCustomization({
        ...customizedTeam,
        badgeKey: null,
        badgeImageUrl: "https://example.test/selfie.jpg",
      }),
    ).toBe(true);
  });

  it("rejects a team with no name, no avatar or an unknown color", () => {
    expect(hasCompleteTeamCustomization({ ...customizedTeam, name: "  " })).toBe(false);
    expect(
      hasCompleteTeamCustomization({ ...customizedTeam, badgeKey: null, badgeImageUrl: null }),
    ).toBe(false);
    expect(hasCompleteTeamCustomization({ ...customizedTeam, color: "chartreuse" })).toBe(false);
  });
});

describe("shouldSkipTeamStepAfterJoin", () => {
  it("skips the team step on a normal join of a fully customized team", () => {
    expect(shouldSkipTeamStepAfterJoin(customizedTeam, false)).toBe(true);
  });

  it("stops on the team step when the join replays a recovery intent", () => {
    expect(shouldSkipTeamStepAfterJoin(customizedTeam, true)).toBe(false);
  });

  it("stops on the team step when the team is not customized yet", () => {
    const blankTeam = { name: null, color: null, badgeImageUrl: null, badgeKey: null };

    expect(shouldSkipTeamStepAfterJoin(blankTeam, false)).toBe(false);
    expect(shouldSkipTeamStepAfterJoin(blankTeam, true)).toBe(false);
  });
});
