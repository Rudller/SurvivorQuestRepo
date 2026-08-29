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
