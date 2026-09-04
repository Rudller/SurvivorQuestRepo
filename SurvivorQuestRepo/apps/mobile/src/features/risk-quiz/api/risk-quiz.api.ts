import { requestMobileApi } from "../../expedition-stage/api/mobile-session.api";

export type RiskDifficulty = "EASY" | "MEDIUM" | "HARD";

export type RiskDrawnStation = {
  id: string;
  type: string;
  name: string;
  description: string;
  imageUrl: string | null;
  points: number;
  timeLimitSeconds: number;
  completionCodeLength?: number;
  completionCodeInputMode?: "numeric" | "alphanumeric";
  quiz?: {
    question?: string;
    answers?: string[];
    correctAnswerIndex?: number;
    audioUrl?: string;
    acceptedAnswers?: string[];
    caesarShift?: number;
  };
};

export type RiskScanResult =
  | {
      exhausted: true;
      categoryName: string;
      difficulty: RiskDifficulty;
    }
  | {
      exhausted: false;
      cardId: string;
      categoryName: string;
      difficulty: RiskDifficulty;
      station: RiskDrawnStation;
    };

export type RiskAnswerResult = {
  isCorrect: boolean;
  correctIndex?: number;
  pointsDelta: number;
  teamPoints: number;
  streak: number;
  multiplier: number;
};

export async function postRiskQuizScan(
  apiBaseUrl: string,
  payload: { sessionToken: string; code: string },
) {
  return requestMobileApi<RiskScanResult>(apiBaseUrl, "/mobile/risk-quiz/scan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type RiskDeckStatus = {
  categoryCount: number;
  remainingCards: number;
  // Current team score. Comes back with every deck read so the scan screen
  // notices points that changed without the team doing anything — a photo card
  // approved (or rejected) by the Game Master.
  teamPoints?: number;
  // The team's photo cards and their verdicts; isCorrect stays null until the
  // Game Master decides.
  photoReviews?: {
    stationId: string;
    stationName: string;
    isCorrect: boolean | null;
    pointsDelta: number;
  }[];
};

export async function fetchRiskQuizDeckStatus(
  apiBaseUrl: string,
  payload: { sessionToken: string },
) {
  return requestMobileApi<RiskDeckStatus>(apiBaseUrl, "/mobile/risk-quiz/deck-status", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type RiskTestMenuEntry = {
  categoryId: string;
  categoryName: string;
  difficulty: RiskDifficulty;
  code: string;
};

export async function fetchRiskQuizTestMenu(
  apiBaseUrl: string,
  payload: { sessionToken: string },
) {
  return requestMobileApi<RiskTestMenuEntry[]>(apiBaseUrl, "/mobile/risk-quiz/test-menu", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function postRiskQuizAnswer(
  apiBaseUrl: string,
  payload: {
    sessionToken: string;
    cardId: string;
    stationId: string;
    selectedIndex?: number;
    completed?: boolean;
    // "Na czas"/"na punkty" cards: the code the organizer hands out at the
    // spot. Verified server-side, same as in a normal realization.
    completionCode?: string;
  },
) {
  return requestMobileApi<RiskAnswerResult>(apiBaseUrl, "/mobile/risk-quiz/answer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// The free-text twin of postRiskQuizPhotoTask: plain JSON, and it reports no
// verdict — the card stays open as "waiting for the Game Master" until the
// decision shows up in the deck status poll.
export async function postRiskQuizReviewedAnswer(
  apiBaseUrl: string,
  payload: { sessionToken: string; cardId: string; stationId: string; answerText: string },
) {
  return requestMobileApi<{
    status: "pending";
    pendingPointsDelta: number;
    teamPoints: number;
  }>(apiBaseUrl, "/mobile/risk-quiz/reviewed-answer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type RiskChatAuthorKind = "TEAM" | "GAME_MASTER" | "SYSTEM";

export type RiskChatMessage = {
  id: string;
  authorKind: RiskChatAuthorKind;
  teamId: string | null;
  authorName: string;
  content: string;
  // Event code for server-written messages, null for anything a human said.
  systemEvent: string | null;
  teamColor: string | null;
  teamBadgeImageUrl: string | null;
  createdAt: string;
};

export type RiskChatState = {
  enabled: boolean;
  canPost: boolean;
  // The reading team's own id, handed back by the server — the mobile session
  // never carries one, and it is what tells own lines from everyone else's.
  currentTeamId: string | null;
  messages: RiskChatMessage[];
};

// Poll the room. `afterId` asks for everything newer than the message the
// tablet already holds; omitting it returns the tail of the history, which is
// what a freshly opened screen wants.
export async function fetchRiskQuizChat(
  apiBaseUrl: string,
  payload: { sessionToken: string; afterId?: string },
) {
  return requestMobileApi<RiskChatState>(apiBaseUrl, "/mobile/risk-quiz/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function postRiskQuizChatMessage(
  apiBaseUrl: string,
  payload: { sessionToken: string; content: string },
) {
  return requestMobileApi<RiskChatMessage>(
    apiBaseUrl,
    "/mobile/risk-quiz/chat/send",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export type RiskPigType =
  | "FLASHLIGHT"
  | "UPSIDE_DOWN"
  | "SHAKE"
  | "FOG"
  | "DARKNESS"
  | "OVERHEAD"
  | "MIRROR"
  | "SLIDE"
  | "SILENCE";

export type RiskPigTarget = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  // False while that team is already under a pig — shown greyed out rather than
  // hidden, because seeing who is currently suffering is half the fun.
  isAvailable: boolean;
};

export type RiskPigState = {
  enabled: boolean;
  held: { type: RiskPigType } | null;
  // expiresAt is an absolute ISO instant, so the tablet can tick a smooth
  // countdown between polls without drifting.
  // fromName is null when the realization hides who threw the pig — the server
  // masks it there rather than here, so the name never reaches the tablet.
  incoming: { type: RiskPigType; fromName: string | null; expiresAt: string } | null;
  targets: RiskPigTarget[];
};

export async function fetchRiskQuizPigs(
  apiBaseUrl: string,
  payload: { sessionToken: string },
) {
  return requestMobileApi<RiskPigState>(apiBaseUrl, "/mobile/risk-quiz/pigs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Omitting targetTeamId asks the server to pick — that is both the "losuj cel"
// button and the fallback when the chosen team got hit by somebody else between
// rendering the list and tapping it.
export async function postRiskQuizPigThrow(
  apiBaseUrl: string,
  payload: { sessionToken: string; targetTeamId?: string },
) {
  return requestMobileApi<RiskPigState>(
    apiBaseUrl,
    "/mobile/risk-quiz/pigs/throw",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export type RiskPendingDraw = {
  cardId: string;
  categoryName: string;
  difficulty: RiskDifficulty;
  station: RiskDrawnStation;
};

export async function fetchRiskQuizPendingDraw(
  apiBaseUrl: string,
  payload: { sessionToken: string },
) {
  return requestMobileApi<{ draw: RiskPendingDraw | null }>(
    apiBaseUrl,
    "/mobile/risk-quiz/pending-draw",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
