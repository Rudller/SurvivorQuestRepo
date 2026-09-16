import type { UiLanguage } from "../../i18n";
import type { RiskChatMessage, RiskPigType } from "../api/risk-quiz.api";
import { RISK_PIG_TEXT } from "./risk-quiz-pig-text";

type RiskFeedText = {
  gameMaster: string;
  gameStart: string;
  gameEnd: string;
  cardScored: (teamName: string, points: number, multiplier: number) => string;
  pigThrown: (fromName: string | null, pigLabel: string, targetName: string) => string;
  leadChange: (teamName: string, points: number) => string;
  deckExhausted: (teamName: string, categoryName: string) => string;
};

/**
 * Wording for the event feed under the top bar, in four languages.
 *
 * The server writes every system message with a Polish `content` (that is what
 * the admin panel shows) plus a `payload` holding the bare facts. The tablet
 * words the facts itself, so an English-speaking team reads "Foxes score 15
 * pts" rather than "Lisy zdobywa 15 pkt". Anything this table does not know —
 * a newer event code, a payload that does not parse — falls back to `content`.
 */
export const RISK_FEED_TEXT: Record<UiLanguage, RiskFeedText> = {
  polish: {
    gameMaster: "Mistrz Gry",
    gameStart: "Gra rozpoczęta. Powodzenia!",
    gameEnd: "Koniec gry. Dziękujemy za grę!",
    cardScored: (teamName, points, multiplier) =>
      `${teamName} zdobywa ${points} pkt${multiplier > 1 ? ` (x${multiplier})` : ""}`,
    pigThrown: (fromName, pigLabel, targetName) =>
      `${fromName ?? "Ktoś"} rzuca świnię „${pigLabel}” w ${targetName}`,
    leadChange: (teamName, points) => `${teamName} wychodzi na prowadzenie (${points} pkt)`,
    deckExhausted: (teamName, categoryName) => `${teamName} wyczerpała karty w kategorii „${categoryName}”`,
  },
  english: {
    gameMaster: "Game Master",
    gameStart: "Game on. Good luck!",
    gameEnd: "Game over. Thanks for playing!",
    cardScored: (teamName, points, multiplier) =>
      `${teamName} score ${points} pts${multiplier > 1 ? ` (x${multiplier})` : ""}`,
    pigThrown: (fromName, pigLabel, targetName) =>
      fromName
        ? `${fromName} throw the “${pigLabel}” pig at ${targetName}`
        : `Someone throws the “${pigLabel}” pig at ${targetName}`,
    leadChange: (teamName, points) => `${teamName} take the lead (${points} pts)`,
    deckExhausted: (teamName, categoryName) => `${teamName} have used up the “${categoryName}” cards`,
  },
  ukrainian: {
    gameMaster: "Організатор",
    gameStart: "Гру розпочато. Успіхів!",
    gameEnd: "Гру завершено. Дякуємо за гру!",
    cardScored: (teamName, points, multiplier) =>
      `${teamName} здобуває ${points} балів${multiplier > 1 ? ` (x${multiplier})` : ""}`,
    pigThrown: (fromName, pigLabel, targetName) =>
      `${fromName ?? "Хтось"} кидає свиню «${pigLabel}» у ${targetName}`,
    leadChange: (teamName, points) => `${teamName} виходить у лідери (${points} балів)`,
    deckExhausted: (teamName, categoryName) => `${teamName} вичерпала картки в категорії «${categoryName}»`,
  },
  russian: {
    gameMaster: "Организатор",
    gameStart: "Игра началась. Удачи!",
    gameEnd: "Игра окончена. Спасибо за игру!",
    cardScored: (teamName, points, multiplier) =>
      `${teamName} получает ${points} очков${multiplier > 1 ? ` (x${multiplier})` : ""}`,
    pigThrown: (fromName, pigLabel, targetName) =>
      `${fromName ?? "Кто-то"} бросает свинью «${pigLabel}» в ${targetName}`,
    leadChange: (teamName, points) => `${teamName} выходит в лидеры (${points} очков)`,
    deckExhausted: (teamName, categoryName) => `${teamName} исчерпала карточки в категории «${categoryName}»`,
  },
};

function readString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readPigType(payload: Record<string, unknown>, language: UiLanguage) {
  const value = payload["pigType"];
  const labels = RISK_PIG_TEXT[language].labels;
  return typeof value === "string" && value in labels ? labels[value as RiskPigType] : null;
}

// Returns null when the payload does not carry what the event needs — the
// caller then shows the server's own wording instead of a half-filled line.
function wordSystemEvent(message: RiskChatMessage, language: UiLanguage): string | null {
  const text = RISK_FEED_TEXT[language];
  const payload = message.payload;
  if (!payload) {
    return null;
  }
  switch (message.systemEvent) {
    case "game-start":
      return text.gameStart;
    case "game-end":
      return text.gameEnd;
    case "card-scored": {
      const teamName = readString(payload, "teamName");
      const points = readNumber(payload, "points");
      const multiplier = readNumber(payload, "multiplier") ?? 1;
      return teamName && points !== null ? text.cardScored(teamName, points, multiplier) : null;
    }
    case "pig-thrown": {
      const targetName = readString(payload, "targetName");
      const pigLabel = readPigType(payload, language);
      return targetName && pigLabel ? text.pigThrown(readString(payload, "fromName"), pigLabel, targetName) : null;
    }
    case "lead-change": {
      const teamName = readString(payload, "teamName");
      const points = readNumber(payload, "points");
      return teamName && points !== null ? text.leadChange(teamName, points) : null;
    }
    case "deck-exhausted": {
      const teamName = readString(payload, "teamName");
      const categoryName = readString(payload, "categoryName");
      return teamName && categoryName ? text.deckExhausted(teamName, categoryName) : null;
    }
    default:
      return null;
  }
}

export function describeRiskFeedEvent(message: RiskChatMessage, language: UiLanguage): string {
  if (message.authorKind === "GAME_MASTER") {
    return `${RISK_FEED_TEXT[language].gameMaster}: ${message.content}`;
  }
  if (message.authorKind === "SYSTEM") {
    return wordSystemEvent(message, language) ?? message.content;
  }
  return message.content;
}
