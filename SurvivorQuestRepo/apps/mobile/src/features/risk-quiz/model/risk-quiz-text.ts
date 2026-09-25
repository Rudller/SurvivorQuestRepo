import type { UiLanguage } from "../../i18n";
import type { RiskQuizErrorText } from "./risk-quiz-error-text";

type HowToPlayStep = { firstLine: string; secondLine: string };

export type RiskQuizText = {
  errors: RiskQuizErrorText & {
    scan: string;
    submitOutcome: string;
    submitPhoto: string;
    submitReviewedAnswer: string;
    throwPig: string;
    sendChat: string;
    testMenu: string;
  };
  bottomPanel: {
    time: string;
    streak: string;
    closeCard: string;
    realizationFinished: string;
    openingScanner: string;
    scanCard: string;
    streakNote: string;
  };
  howToPlay: {
    steps: readonly [HowToPlayStep, HowToPlayStep, HowToPlayStep];
  };
  remainingCards: { label: string };
  // Zastępuje licznik, gdy zadanie przepadło po czasie.
  taskTimeUp: string;
  // Etykiety linii pod "Źle!", odsłaniającej dobrą odpowiedź albo hasło.
  correctAnswerLabel: string;
  secretLabel: string;
  finish: {
    title: string;
    subtitle: string;
    points: string;
    handBackTablets: string;
    thanks: string;
  };
  targetPicker: {
    cancel: string;
    alreadyHit: string;
    nobodyToHit: string;
    randomTarget: string;
    throwing: string;
  };
};

/**
 * Every string the Ryzykanci screens put in front of a player.
 *
 * Only the chat used to be translated; the rest of the mode was hard-coded
 * Polish, so an English-speaking team saw Polish captions on the pig mechanic,
 * the bottom bar and the how-to-play panel. Same shape as
 * `RISK_QUIZ_CHAT_TEXT` in risk-quiz-chat-dock.tsx.
 */
export const RISK_QUIZ_TEXT: Record<UiLanguage, RiskQuizText> = {
  polish: {
    errors: {
      timeout: "Serwer nie odpowiada. Sprawdźcie połączenie.",
      offline: "Brak połączenia z serwerem.",
      scan: "Nie udało się zeskanować karty.",
      cardAlreadyUsed: "Ta karta była już przez was użyta — weźcie inną.",
      submitOutcome: "Nie udało się wysłać wyniku.",
      submitPhoto: "Nie udało się wysłać zdjęcia.",
      submitReviewedAnswer: "Nie udało się wysłać odpowiedzi.",
      throwPig: "Nie udało się rzucić świni.",
      sendChat: "Nie udało się wysłać wiadomości.",
      testMenu: "Nie udało się wczytać menu testowego.",
    },
    bottomPanel: {
      time: "Czas",
      streak: "Seria",
      closeCard: "Zamknij kartę",
      realizationFinished: "Realizacja zakończona",
      openingScanner: "Otwieranie skanera...",
      scanCard: "Skanuj kartę",
      streakNote: "Seria bez pudła mnoży punkty za kolejne karty.",
    },
    howToPlay: {
      steps: [
        { firstLine: "Wybierz", secondLine: "kartę" },
        { firstLine: "Zeskanuj", secondLine: "kod QR" },
        { firstLine: "Odpowiedz", secondLine: "na pytanie" },
      ],
    },
    remainingCards: { label: "Zostało kart" },
    taskTimeUp: "Czas minął!",
    correctAnswerLabel: "Poprawna odpowiedź",
    secretLabel: "Hasło",
    finish: {
      title: "Koniec gry",
      subtitle: "Talia zamknięta. Oto jak poszło drużynom.",
      points: "pkt",
      handBackTablets: "Oddajcie tablety organizatorowi.",
      thanks: "Dziękujemy za grę 💚",
    },
    targetPicker: {
      cancel: "Anuluj",
      alreadyHit: "już oświniona",
      nobodyToHit: "Nie ma kogo oświnić — grasz sam.",
      randomTarget: "Losuj cel",
      throwing: "Rzucam...",
    },
  },
  english: {
    errors: {
      timeout: "The server is not responding. Check your connection.",
      offline: "No connection to the server.",
      scan: "Could not scan the card.",
      cardAlreadyUsed: "Your team has already used this card — take another one.",
      submitOutcome: "Could not send the result.",
      submitPhoto: "Could not send the photo.",
      submitReviewedAnswer: "Could not send the answer.",
      throwPig: "Could not throw the pig.",
      sendChat: "Could not send the message.",
      testMenu: "Could not load the test menu.",
    },
    bottomPanel: {
      time: "Time",
      streak: "Streak",
      closeCard: "Close the card",
      realizationFinished: "Event finished",
      openingScanner: "Opening the scanner...",
      scanCard: "Scan a card",
      streakNote: "A streak without a miss multiplies the points on later cards.",
    },
    howToPlay: {
      steps: [
        { firstLine: "Pick", secondLine: "a card" },
        { firstLine: "Scan", secondLine: "the QR code" },
        { firstLine: "Answer", secondLine: "the question" },
      ],
    },
    remainingCards: { label: "Cards left" },
    taskTimeUp: "Time's up!",
    correctAnswerLabel: "Correct answer",
    secretLabel: "Password",
    finish: {
      title: "Game over",
      subtitle: "The deck is closed. Here is how the teams did.",
      points: "pts",
      handBackTablets: "Please hand the tablets back to the organiser.",
      thanks: "Thanks for playing 💚",
    },
    targetPicker: {
      cancel: "Cancel",
      alreadyHit: "already hit",
      nobodyToHit: "Nobody to hit — you are playing alone.",
      randomTarget: "Random target",
      throwing: "Throwing...",
    },
  },
  ukrainian: {
    errors: {
      timeout: "Сервер не відповідає. Перевірте з'єднання.",
      offline: "Немає зв'язку із сервером.",
      scan: "Не вдалося відсканувати картку.",
      cardAlreadyUsed: "Ви вже використали цю картку — візьміть іншу.",
      submitOutcome: "Не вдалося надіслати результат.",
      submitPhoto: "Не вдалося надіслати фото.",
      submitReviewedAnswer: "Не вдалося надіслати відповідь.",
      throwPig: "Не вдалося кинути свиню.",
      sendChat: "Не вдалося надіслати повідомлення.",
      testMenu: "Не вдалося завантажити тестове меню.",
    },
    bottomPanel: {
      time: "Час",
      streak: "Серія",
      closeCard: "Закрити картку",
      realizationFinished: "Захід завершено",
      openingScanner: "Відкриваємо сканер...",
      scanCard: "Сканувати картку",
      streakNote: "Серія без промаху множить бали за наступні картки.",
    },
    howToPlay: {
      steps: [
        { firstLine: "Обери", secondLine: "картку" },
        { firstLine: "Скануй", secondLine: "QR-код" },
        { firstLine: "Дай відповідь", secondLine: "на питання" },
      ],
    },
    remainingCards: { label: "Залишилось карток" },
    taskTimeUp: "Час вийшов!",
    correctAnswerLabel: "Правильна відповідь",
    secretLabel: "Гасло",
    finish: {
      title: "Гру завершено",
      subtitle: "Колоду закрито. Ось як упоралися команди.",
      points: "очк.",
      handBackTablets: "Поверніть планшети організатору.",
      thanks: "Дякуємо за гру 💚",
    },
    targetPicker: {
      cancel: "Скасувати",
      alreadyHit: "уже під свинею",
      nobodyToHit: "Немає в кого кинути — ви граєте самі.",
      randomTarget: "Випадкова ціль",
      throwing: "Кидаємо...",
    },
  },
  russian: {
    errors: {
      timeout: "Сервер не отвечает. Проверьте соединение.",
      offline: "Нет связи с сервером.",
      scan: "Не удалось отсканировать карточку.",
      cardAlreadyUsed: "Вы уже использовали эту карточку — возьмите другую.",
      submitOutcome: "Не удалось отправить результат.",
      submitPhoto: "Не удалось отправить фото.",
      submitReviewedAnswer: "Не удалось отправить ответ.",
      throwPig: "Не удалось бросить свинью.",
      sendChat: "Не удалось отправить сообщение.",
      testMenu: "Не удалось загрузить тестовое меню.",
    },
    bottomPanel: {
      time: "Время",
      streak: "Серия",
      closeCard: "Закрыть карточку",
      realizationFinished: "Мероприятие завершено",
      openingScanner: "Открываем сканер...",
      scanCard: "Сканировать карточку",
      streakNote: "Серия без промаха умножает очки за следующие карточки.",
    },
    howToPlay: {
      steps: [
        { firstLine: "Выбери", secondLine: "карточку" },
        { firstLine: "Сканируй", secondLine: "QR-код" },
        { firstLine: "Ответь", secondLine: "на вопрос" },
      ],
    },
    remainingCards: { label: "Осталось карточек" },
    taskTimeUp: "Время вышло!",
    correctAnswerLabel: "Правильный ответ",
    secretLabel: "Пароль",
    finish: {
      title: "Игра окончена",
      subtitle: "Колода закрыта. Вот как справились команды.",
      points: "очк.",
      handBackTablets: "Верните планшеты организатору.",
      thanks: "Спасибо за игру 💚",
    },
    targetPicker: {
      cancel: "Отмена",
      alreadyHit: "уже под свиньёй",
      nobodyToHit: "Некого атаковать — вы играете одни.",
      randomTarget: "Случайная цель",
      throwing: "Бросаем...",
    },
  },
};
