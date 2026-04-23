import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Animated,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { resolveUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME, TEAM_COLORS, TEAM_ICONS, getTeamColors } from "../model/constants";
import {
  getRealizationLanguageFlag,
  getRealizationLanguageLabel,
  isRealizationLanguage,
  type OnboardingSession,
  type RealizationLanguage,
  type RealizationLanguageOption,
  type Screen,
  type TeamColor,
} from "../model/types";
import { TeamCustomizationStep, type TeamCustomizationStepText } from "./team-customization-step";

type SetupState = "idle" | "loading" | "ready" | "error";
type ApiConnectionStatus = "checking" | "connected" | "disconnected" | "config-missing";
type ApiServerPreset = "local" | "production" | "custom";

type MobileBootstrapRealization = {
  id: string;
  companyName: string;
  language?: RealizationLanguage;
  customLanguage?: string;
  selectedLanguage?: RealizationLanguage;
  availableLanguages?: RealizationLanguageOption[];
  introText?: string;
  gameRules?: string;
  status: "planned" | "in-progress" | "done";
  scheduledAt: string;
  durationMinutes: number;
  joinCode: string;
  locationRequired: boolean;
  showLeaderboard?: boolean;
  teamCount: number;
  stationIds: string[];
};

type MobileBootstrapResponse = {
  serverTime: string;
  teamColors: string[];
  badgeKeys: string[];
  realizations: MobileBootstrapRealization[];
};

type MobileJoinResponse = {
  sessionToken: string;
  realizationId: string;
  locationRequired: boolean;
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
  team: {
    id: string;
    slotNumber: number;
    name: string | null;
    color: string | null;
    badgeKey: string | null;
    points: number;
  };
};

type MobileClaimResponse = {
  teamId: string;
  name: string;
  color: string | null;
  badgeKey: string | null;
  changedFields: string[];
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
};

type MobileUpdateCustomizationResponse = {
  teamId: string;
  color: string | null;
  badgeKey: string | null;
  changedFields: string[];
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
};

type MobileSelectTeamResponse = {
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
  team: {
    id: string;
    slotNumber: number;
    name: string | null;
    color: string | null;
    badgeKey: string | null;
    points: number;
  };
  reassignment?: {
    replacedExistingAssignment: boolean;
    replacedAssignments: number;
    message?: string;
  };
};

type MobileApiError = {
  message?: string;
  error?: {
    message?: string;
  };
  data?: {
    error?: {
      message?: string;
    };
  };
};

const MOBILE_API_REQUEST_TIMEOUT_MS = 7000;

type MobileSessionStateResponse = {
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
  team?: {
    slotNumber: number;
    color: string | null;
    badgeKey: string | null;
  };
};

const API_BASE_URL_OVERRIDE_STORAGE_KEY = "sq.mobile.api-base-url-override.v1";
const MOBILE_DEVICE_ID_STORAGE_KEY = "sq.mobile.device-id.v1";
const CUSTOMIZATION_OCCUPANCY_POLL_INTERVAL_MS = 2500;
const LOCAL_DEFAULT_API_BASE_URL = "http://192.168.18.14:3001";
const PRODUCTION_API_BASE_URL_CANDIDATES = [
  "https://survivorquest.pl/api",
  "https://www.survivorquest.pl/api",
] as const;
const PRODUCTION_API_BASE_URL = PRODUCTION_API_BASE_URL_CANDIDATES[0];
const REQUEST_TIMEOUT_ERROR_PREFIX = "__mobile_api_timeout__:";

const TOP_PANEL_STEP_ORDER: Screen[] = ["api", "code", "team", "customization"];
const UI_DATE_LOCALE: Record<UiLanguage, string> = {
  polish: "pl-PL",
  english: "en-US",
  ukrainian: "uk-UA",
  russian: "ru-RU",
};

type OnboardingUiText = {
  expeditionMapLabel: string;
  noApiConfiguration: string;
  stepLabel: Record<Screen, string>;
  stepHint: Record<Screen, string>;
  stepCounter: (stepNumber: number) => string;
  apiStepTitle: string;
  apiStepDescription: string;
  apiConnectionLabel: string;
  closeAction: string;
  changeAction: string;
  serverLabel: string;
  statusLabel: string;
  apiStatusValue: Record<ApiConnectionStatus, string>;
  quickSelectLabel: string;
  localPresetLabel: string;
  productionPresetLabel: string;
  saveAction: string;
  defaultAction: string;
  recheckAction: string;
  goToStepTwoAction: string;
  codeStepTitle: string;
  codeStepDescription: string;
  activeApiLabel: string;
  realizationCodePlaceholder: string;
  activateRealizationAction: string;
  backToStepOneAction: string;
  loadingConfiguration: string;
  setupLoadFailed: string;
  teamStepTitle: string;
  teamStepDescription: string;
  assignmentResultLabel: string;
  assignmentNotReady: string;
  assignedTeamLabel: (slotNumber: number) => string;
  noAssignedTeam: string;
  availableTeamCountLabel: (teamCount: number | string) => string;
  codeDateLabel: (code: string, date: string) => string;
  changeTeamAction: string;
  backAction: string;
  goToBannerEditorAction: string;
  onboardingHint: string;
  languagePickerTitle: string;
  selectedLanguageLabel: (label: string) => string;
  teamPickerTitle: string;
  teamPickerDescription: string;
  teamLabel: (slotNumber: number) => string;
  currentlyAssignedLabel: string;
  tapToAssignLabel: string;
  switchingTeamAssignment: string;
  chooseTeamActionSheetTitle: string;
  actionSheetCancel: string;
  chooseTeamPrompt: (slots: string) => string;
  teamPickerInvalidInput: string;
  mobileMemberName: string;
  requiredRealizationCode: string;
  deviceInitializationInProgress: string;
  missingApiConfigForStep: string;
  backendConnectionFailed: string;
  realizationNotFound: string;
  autoAssignmentMessage: (slotNumber: number) => string;
  missingSessionOrApiConfig: string;
  reassignmentFallbackMessage: string;
  manualAssignmentMessage: (slotNumber: number) => string;
  saveRequiresSession: string;
  saveRequiresTeamName: string;
  saveRequiresApi: string;
  saveSuccessMessage: (name: string) => string;
  saveFailedMessage: (error: string) => string;
  liveSaveFailedMessage: (error: string) => string;
  colorTakenMessage: (slotNumber: number) => string;
  iconTakenMessage: (slotNumber: number) => string;
  invalidApiAddress: string;
  apiAddressSaved: string;
  apiAddressSaveSessionOnly: string;
  productionPresetError: string;
  productionPresetSaved: string;
  productionPresetSessionOnly: string;
  resetDefaultSaved: string;
  resetDefaultSessionOnly: string;
  timeoutError: (baseUrl: string) => string;
  http401Error: (rawMessage: string) => string;
  http403Error: (rawMessage: string) => string;
  http404Error: (rawMessage: string) => string;
  http409Error: (rawMessage: string) => string;
  http429Error: (rawMessage: string) => string;
  http5xxError: (statusCode: number, rawMessage: string) => string;
  networkError: (rawMessage: string) => string;
  unexpectedConnectionError: string;
  teamCustomizationText: TeamCustomizationStepText;
};

const ONBOARDING_UI_TEXT: Record<UiLanguage, OnboardingUiText> = {
  polish: {
    expeditionMapLabel: "Expedition Map",
    noApiConfiguration: "Brak konfiguracji",
    stepLabel: {
      api: "Połączenie API",
      code: "Kod realizacji",
      team: "Przydzielenie drużyny",
      customization: "Customizacja drużyny",
    },
    stepHint: {
      api: "Etap 1 potwierdza połączenie z backendem i gotowość API.",
      code: "Etap 2 wymaga wpisania kodu realizacji od administratora.",
      team: "Etap 3 pokazuje przydział drużyny przed konfiguracją baneru.",
      customization: "Skonfiguruj baner drużyny i przejdź do ekranu startu aplikacji.",
    },
    stepCounter: (stepNumber) => `Etap ${stepNumber}`,
    apiStepTitle: "Etap 1: potwierdzenie API",
    apiStepDescription: "Upewnij się, że backend odpowiada, zanim przejdziesz do wpisywania kodu realizacji.",
    apiConnectionLabel: "Połączenie API",
    closeAction: "Zamknij",
    changeAction: "Zmień",
    serverLabel: "Serwer",
    statusLabel: "Status",
    apiStatusValue: {
      checking: "sprawdzanie",
      connected: "połączono",
      disconnected: "brak połączenia",
      "config-missing": "brak konfiguracji",
    },
    quickSelectLabel: "Szybki wybór",
    localPresetLabel: "Lokalna baza testowa",
    productionPresetLabel: "Produkcja",
    saveAction: "Zapisz",
    defaultAction: "Domyślny",
    recheckAction: "Sprawdź ponownie",
    goToStepTwoAction: "Przejdź do etapu 2",
    codeStepTitle: "Etap 2: kod realizacji",
    codeStepDescription: "Wpisz kod przekazany przez administratora, aby przejść do przydziału drużyny.",
    activeApiLabel: "Aktywne API",
    realizationCodePlaceholder: "Kod realizacji",
    activateRealizationAction: "Aktywuj realizację",
    backToStepOneAction: "Cofnij do etapu 1",
    loadingConfiguration: "Pobieranie konfiguracji od administratora...",
    setupLoadFailed: "Nie udało się pobrać konfiguracji.",
    teamStepTitle: "Etap 3: przydzielenie drużyny",
    teamStepDescription: "System przypisuje drużynę na podstawie realizacji. Możesz ją zmienić przed startem aplikacji.",
    assignmentResultLabel: "Wynik przydziału",
    assignmentNotReady: "Przydział drużyny nie został jeszcze wykonany.",
    assignedTeamLabel: (slotNumber) => `Przydzielona drużyna: ${slotNumber}`,
    noAssignedTeam: "Brak przydzielonej drużyny.",
    availableTeamCountLabel: (teamCount) => `Liczba możliwych drużyn: ${teamCount}`,
    codeDateLabel: (code, date) => `Kod: ${code} • Termin: ${date}`,
    changeTeamAction: "Zmień drużynę",
    backAction: "Wstecz",
    goToBannerEditorAction: "Przejdź do edytora banera",
    onboardingHint:
      "Etap 1 sprawdza API, etap 2 aktywuje realizację kodem, etap 3 finalizuje przydział, a potem konfigurujesz baner drużyny.",
    languagePickerTitle: "Wybierz język treści gry",
    selectedLanguageLabel: (label) => `Wybrany: ${label}`,
    teamPickerTitle: "Wybierz drużynę",
    teamPickerDescription: "Lista możliwych drużyn pochodzi z limitu drużyn realizacji.",
    teamLabel: (slotNumber) => `Drużyna ${slotNumber}`,
    currentlyAssignedLabel: "Aktualnie przypisana",
    tapToAssignLabel: "Dotknij, aby przypisać",
    switchingTeamAssignment: "Zmieniam przydział drużyny...",
    chooseTeamActionSheetTitle: "Wybierz drużynę",
    actionSheetCancel: "Anuluj",
    chooseTeamPrompt: (slots) => `Wybierz numer drużyny (${slots})`,
    teamPickerInvalidInput: "Wpisz numer drużyny z listy.",
    mobileMemberName: "Użytkownik mobilny",
    requiredRealizationCode: "Wpisz kod realizacji.",
    deviceInitializationInProgress: "Trwa inicjalizacja urządzenia. Spróbuj ponownie za chwilę.",
    missingApiConfigForStep: "Brakuje konfiguracji API. Ustaw adres serwera w sekcji połączenia.",
    backendConnectionFailed: "Nie udało się połączyć z backendem.",
    realizationNotFound: "Nie znaleziono realizacji dla podanego kodu.",
    autoAssignmentMessage: (slotNumber) => `Przydzielono automatycznie: Drużyna ${slotNumber}.`,
    missingSessionOrApiConfig: "Brak aktywnej sesji lub konfiguracji API.",
    reassignmentFallbackMessage:
      "Drużyna była już zajęta na innym urządzeniu. Przypisanie zostało przełączone.",
    manualAssignmentMessage: (slotNumber) => `Przydzielono ręcznie: Drużyna ${slotNumber}.`,
    saveRequiresSession: "Brak aktywnej sesji. Najpierw aktywuj kod realizacji.",
    saveRequiresTeamName: "Podaj nazwę drużyny przed zapisaniem.",
    saveRequiresApi: "Brakuje konfiguracji API. Ustaw adres serwera.",
    saveSuccessMessage: (name) => `Zapisano ustawienia: ${name}.`,
    saveFailedMessage: (error) => `Nie udało się zapisać: ${error}`,
    liveSaveFailedMessage: (error) => `Nie udało się zapisać zmian na żywo: ${error}`,
    colorTakenMessage: (slotNumber) => `Ten kolor jest już wybrany przez Drużynę ${slotNumber}. Wybierz inny.`,
    iconTakenMessage: (slotNumber) => `Ta emotikona jest już wybrana przez Drużynę ${slotNumber}. Wybierz inną.`,
    invalidApiAddress: "Podaj poprawny adres serwera, np. http://192.168.18.2:3001.",
    apiAddressSaved: "Zapisano adres serwera API.",
    apiAddressSaveSessionOnly: "Adres ustawiony dla bieżącej sesji, ale nie udało się zapisać go na stałe.",
    productionPresetError: "Nie udało się ustawić serwera produkcyjnego.",
    productionPresetSaved: "Wybrano serwer produkcyjny API.",
    productionPresetSessionOnly:
      "Serwer produkcyjny ustawiony dla bieżącej sesji, ale nie udało się zapisać go na stałe.",
    resetDefaultSaved: "Przywrócono domyślną konfigurację serwera.",
    resetDefaultSessionOnly:
      "Przywrócono domyślną konfigurację dla tej sesji, ale nie udało się zapisać jej na stałe.",
    timeoutError: (baseUrl) => `Timeout przy połączeniu z API (${baseUrl}). Sprawdź adres i sieć.`,
    http401Error: (rawMessage) => `HTTP 401: brak autoryzacji lub wygasła sesja. ${rawMessage}`,
    http403Error: (rawMessage) => `HTTP 403: dostęp zabroniony. ${rawMessage}`,
    http404Error: (rawMessage) =>
      `HTTP 404: endpoint API nie istnieje (sprawdź bazowy URL i prefiks /api). ${rawMessage}`,
    http409Error: (rawMessage) => `HTTP 409: konflikt danych po stronie serwera. ${rawMessage}`,
    http429Error: (rawMessage) => `HTTP 429: limit zapytań został przekroczony. ${rawMessage}`,
    http5xxError: (statusCode, rawMessage) => `HTTP ${statusCode}: błąd serwera backend. ${rawMessage}`,
    networkError: (rawMessage) =>
      `Brak połączenia z API (network failure). Sprawdź HTTPS/certyfikat, DNS i dostępność serwera. ${rawMessage}`,
    unexpectedConnectionError: "Wystąpił nieoczekiwany błąd połączenia.",
    teamCustomizationText: {
      editorTitle: "Edytor baneru drużyny",
      editorHint: "Dopracuj wygląd baneru drużyny. Ten baner będzie widoczny w górnym panelu podczas gry.",
      bannerPreviewLabel: "Podgląd baneru",
      teamFallbackName: "Nazwa drużyny",
      teamLabel: "Drużyna",
      pointsLabel: "Punkty",
      customizationLabel: "Customizacja drużyny",
      teamNamePlaceholder: "Nazwa drużyny",
      teamColorLabel: "Kolor drużyny",
      teamIconLabel: "Ikona drużyny",
      startAction: "Start!",
      startingAction: "Uruchamianie...",
    },
  },
  english: {
    expeditionMapLabel: "Expedition Map",
    noApiConfiguration: "No configuration",
    stepLabel: {
      api: "API connection",
      code: "Realization code",
      team: "Team assignment",
      customization: "Team customization",
    },
    stepHint: {
      api: "Step 1 confirms backend connectivity and API readiness.",
      code: "Step 2 requires entering the realization code from the administrator.",
      team: "Step 3 shows the assigned team before banner configuration.",
      customization: "Configure your team banner and continue to the app start screen.",
    },
    stepCounter: (stepNumber) => `Step ${stepNumber}`,
    apiStepTitle: "Step 1: confirm API",
    apiStepDescription: "Make sure the backend responds before entering the realization code.",
    apiConnectionLabel: "API connection",
    closeAction: "Close",
    changeAction: "Change",
    serverLabel: "Server",
    statusLabel: "Status",
    apiStatusValue: {
      checking: "checking",
      connected: "connected",
      disconnected: "disconnected",
      "config-missing": "missing config",
    },
    quickSelectLabel: "Quick select",
    localPresetLabel: "Local test backend",
    productionPresetLabel: "Production",
    saveAction: "Save",
    defaultAction: "Default",
    recheckAction: "Check again",
    goToStepTwoAction: "Go to step 2",
    codeStepTitle: "Step 2: realization code",
    codeStepDescription: "Enter the code provided by the administrator to proceed to team assignment.",
    activeApiLabel: "Active API",
    realizationCodePlaceholder: "Realization code",
    activateRealizationAction: "Activate realization",
    backToStepOneAction: "Back to step 1",
    loadingConfiguration: "Loading configuration from administrator...",
    setupLoadFailed: "Failed to load configuration.",
    teamStepTitle: "Step 3: team assignment",
    teamStepDescription: "The system assigns a team based on the realization. You can change it before starting.",
    assignmentResultLabel: "Assignment result",
    assignmentNotReady: "Team assignment has not been completed yet.",
    assignedTeamLabel: (slotNumber) => `Assigned team: ${slotNumber}`,
    noAssignedTeam: "No team assigned.",
    availableTeamCountLabel: (teamCount) => `Available teams: ${teamCount}`,
    codeDateLabel: (code, date) => `Code: ${code} • Date: ${date}`,
    changeTeamAction: "Change team",
    backAction: "Back",
    goToBannerEditorAction: "Go to banner editor",
    onboardingHint: "Step 1 checks API, step 2 activates realization code, step 3 finalizes assignment, then you configure the team banner.",
    languagePickerTitle: "Choose game content language",
    selectedLanguageLabel: (label) => `Selected: ${label}`,
    teamPickerTitle: "Choose team",
    teamPickerDescription: "The list of teams is based on the realization team limit.",
    teamLabel: (slotNumber) => `Team ${slotNumber}`,
    currentlyAssignedLabel: "Currently assigned",
    tapToAssignLabel: "Tap to assign",
    switchingTeamAssignment: "Switching team assignment...",
    chooseTeamActionSheetTitle: "Choose team",
    actionSheetCancel: "Cancel",
    chooseTeamPrompt: (slots) => `Choose team number (${slots})`,
    teamPickerInvalidInput: "Enter a team number from the list.",
    mobileMemberName: "Mobile user",
    requiredRealizationCode: "Enter realization code.",
    deviceInitializationInProgress: "Device initialization in progress. Please try again in a moment.",
    missingApiConfigForStep: "API configuration is missing. Set the server address in the connection section.",
    backendConnectionFailed: "Failed to connect to backend.",
    realizationNotFound: "No realization was found for the provided code.",
    autoAssignmentMessage: (slotNumber) => `Automatically assigned: Team ${slotNumber}.`,
    missingSessionOrApiConfig: "No active session or API configuration.",
    reassignmentFallbackMessage: "This team was already taken on another device. Assignment has been switched.",
    manualAssignmentMessage: (slotNumber) => `Manually assigned: Team ${slotNumber}.`,
    saveRequiresSession: "No active session. Activate realization code first.",
    saveRequiresTeamName: "Enter a team name before saving.",
    saveRequiresApi: "API configuration is missing. Set a server address.",
    saveSuccessMessage: (name) => `Settings saved: ${name}.`,
    saveFailedMessage: (error) => `Could not save: ${error}`,
    liveSaveFailedMessage: (error) => `Could not save live changes: ${error}`,
    colorTakenMessage: (slotNumber) => `This color is already selected by Team ${slotNumber}. Pick another one.`,
    iconTakenMessage: (slotNumber) => `This emoji is already selected by Team ${slotNumber}. Pick another one.`,
    invalidApiAddress: "Provide a valid server address, e.g. http://192.168.18.2:3001.",
    apiAddressSaved: "API server address saved.",
    apiAddressSaveSessionOnly: "Address is set for this session, but could not be saved permanently.",
    productionPresetError: "Could not set production server.",
    productionPresetSaved: "Production API server selected.",
    productionPresetSessionOnly: "Production server is set for this session, but could not be saved permanently.",
    resetDefaultSaved: "Default server configuration restored.",
    resetDefaultSessionOnly: "Default configuration restored for this session, but could not be saved permanently.",
    timeoutError: (baseUrl) => `API request timed out (${baseUrl}). Check server address and network.`,
    http401Error: (rawMessage) => `HTTP 401: unauthorized or session expired. ${rawMessage}`,
    http403Error: (rawMessage) => `HTTP 403: access forbidden. ${rawMessage}`,
    http404Error: (rawMessage) => `HTTP 404: API endpoint does not exist (check base URL and /api prefix). ${rawMessage}`,
    http409Error: (rawMessage) => `HTTP 409: server data conflict. ${rawMessage}`,
    http429Error: (rawMessage) => `HTTP 429: request limit exceeded. ${rawMessage}`,
    http5xxError: (statusCode, rawMessage) => `HTTP ${statusCode}: backend server error. ${rawMessage}`,
    networkError: (rawMessage) =>
      `No API connection (network failure). Check HTTPS/certificate, DNS, and server availability. ${rawMessage}`,
    unexpectedConnectionError: "Unexpected connection error occurred.",
    teamCustomizationText: {
      editorTitle: "Team banner editor",
      editorHint: "Adjust your team banner appearance. This banner is visible in the top panel during the game.",
      bannerPreviewLabel: "Banner preview",
      teamFallbackName: "Team name",
      teamLabel: "Team",
      pointsLabel: "Points",
      customizationLabel: "Team customization",
      teamNamePlaceholder: "Team name",
      teamColorLabel: "Team color",
      teamIconLabel: "Team icon",
      startAction: "Start!",
      startingAction: "Starting...",
    },
  },
  ukrainian: {
    expeditionMapLabel: "Карта експедиції",
    noApiConfiguration: "Немає конфігурації",
    stepLabel: {
      api: "Підключення API",
      code: "Код реалізації",
      team: "Призначення команди",
      customization: "Налаштування команди",
    },
    stepHint: {
      api: "Крок 1 підтверджує зʼєднання з бекендом і готовність API.",
      code: "Крок 2 вимагає ввести код реалізації від адміністратора.",
      team: "Крок 3 показує призначену команду перед налаштуванням банера.",
      customization: "Налаштуйте банер команди й перейдіть до стартового екрана застосунку.",
    },
    stepCounter: (stepNumber) => `Крок ${stepNumber}`,
    apiStepTitle: "Крок 1: підтвердження API",
    apiStepDescription: "Переконайтеся, що бекенд відповідає, перш ніж вводити код реалізації.",
    apiConnectionLabel: "Підключення API",
    closeAction: "Закрити",
    changeAction: "Змінити",
    serverLabel: "Сервер",
    statusLabel: "Статус",
    apiStatusValue: {
      checking: "перевірка",
      connected: "підключено",
      disconnected: "немає зʼєднання",
      "config-missing": "немає конфігурації",
    },
    quickSelectLabel: "Швидкий вибір",
    localPresetLabel: "Локовий тестовий сервер",
    productionPresetLabel: "Продакшн",
    saveAction: "Зберегти",
    defaultAction: "За замовчуванням",
    recheckAction: "Перевірити ще раз",
    goToStepTwoAction: "Перейти до кроку 2",
    codeStepTitle: "Крок 2: код реалізації",
    codeStepDescription: "Введіть код від адміністратора, щоб перейти до призначення команди.",
    activeApiLabel: "Активний API",
    realizationCodePlaceholder: "Код реалізації",
    activateRealizationAction: "Активувати реалізацію",
    backToStepOneAction: "Повернутися до кроку 1",
    loadingConfiguration: "Завантаження конфігурації від адміністратора...",
    setupLoadFailed: "Не вдалося завантажити конфігурацію.",
    teamStepTitle: "Крок 3: призначення команди",
    teamStepDescription: "Система призначає команду на основі реалізації. Ви можете змінити її перед стартом.",
    assignmentResultLabel: "Результат призначення",
    assignmentNotReady: "Призначення команди ще не виконано.",
    assignedTeamLabel: (slotNumber) => `Призначена команда: ${slotNumber}`,
    noAssignedTeam: "Команду не призначено.",
    availableTeamCountLabel: (teamCount) => `Доступна кількість команд: ${teamCount}`,
    codeDateLabel: (code, date) => `Код: ${code} • Час: ${date}`,
    changeTeamAction: "Змінити команду",
    backAction: "Назад",
    goToBannerEditorAction: "Перейти до редактора банера",
    onboardingHint: "Крок 1 перевіряє API, крок 2 активує код реалізації, крок 3 завершує призначення, після чого ви налаштовуєте банер команди.",
    languagePickerTitle: "Виберіть мову ігрового контенту",
    selectedLanguageLabel: (label) => `Вибрано: ${label}`,
    teamPickerTitle: "Виберіть команду",
    teamPickerDescription: "Список команд формується за лімітом команд реалізації.",
    teamLabel: (slotNumber) => `Команда ${slotNumber}`,
    currentlyAssignedLabel: "Призначена зараз",
    tapToAssignLabel: "Торкніться, щоб призначити",
    switchingTeamAssignment: "Змінюю призначення команди...",
    chooseTeamActionSheetTitle: "Виберіть команду",
    actionSheetCancel: "Скасувати",
    chooseTeamPrompt: (slots) => `Виберіть номер команди (${slots})`,
    teamPickerInvalidInput: "Введіть номер команди зі списку.",
    mobileMemberName: "Мобільний користувач",
    requiredRealizationCode: "Введіть код реалізації.",
    deviceInitializationInProgress: "Триває ініціалізація пристрою. Спробуйте ще раз за мить.",
    missingApiConfigForStep: "Немає конфігурації API. Вкажіть адресу сервера в розділі підключення.",
    backendConnectionFailed: "Не вдалося підключитися до бекенду.",
    realizationNotFound: "Не знайдено реалізацію для вказаного коду.",
    autoAssignmentMessage: (slotNumber) => `Призначено автоматично: Команда ${slotNumber}.`,
    missingSessionOrApiConfig: "Немає активної сесії або конфігурації API.",
    reassignmentFallbackMessage: "Ця команда вже була зайнята на іншому пристрої. Призначення перемкнено.",
    manualAssignmentMessage: (slotNumber) => `Призначено вручну: Команда ${slotNumber}.`,
    saveRequiresSession: "Немає активної сесії. Спочатку активуйте код реалізації.",
    saveRequiresTeamName: "Вкажіть назву команди перед збереженням.",
    saveRequiresApi: "Немає конфігурації API. Вкажіть адресу сервера.",
    saveSuccessMessage: (name) => `Налаштування збережено: ${name}.`,
    saveFailedMessage: (error) => `Не вдалося зберегти: ${error}`,
    liveSaveFailedMessage: (error) => `Не вдалося зберегти зміни в реальному часі: ${error}`,
    colorTakenMessage: (slotNumber) => `Цей колір уже вибрала Команда ${slotNumber}. Оберіть інший.`,
    iconTakenMessage: (slotNumber) => `Цей емодзі вже вибрала Команда ${slotNumber}. Оберіть інший.`,
    invalidApiAddress: "Вкажіть правильну адресу сервера, наприклад http://192.168.18.2:3001.",
    apiAddressSaved: "Адресу API-сервера збережено.",
    apiAddressSaveSessionOnly: "Адресу встановлено для цієї сесії, але не вдалося зберегти назавжди.",
    productionPresetError: "Не вдалося встановити продакшн-сервер.",
    productionPresetSaved: "Вибрано продакшн API-сервер.",
    productionPresetSessionOnly:
      "Продакшн-сервер встановлено для цієї сесії, але не вдалося зберегти назавжди.",
    resetDefaultSaved: "Відновлено стандартну конфігурацію сервера.",
    resetDefaultSessionOnly:
      "Стандартну конфігурацію відновлено для цієї сесії, але не вдалося зберегти назавжди.",
    timeoutError: (baseUrl) => `Тайм-аут запиту до API (${baseUrl}). Перевірте адресу та мережу.`,
    http401Error: (rawMessage) => `HTTP 401: немає авторизації або сесія завершилась. ${rawMessage}`,
    http403Error: (rawMessage) => `HTTP 403: доступ заборонено. ${rawMessage}`,
    http404Error: (rawMessage) => `HTTP 404: API endpoint не існує (перевірте базову URL і префікс /api). ${rawMessage}`,
    http409Error: (rawMessage) => `HTTP 409: конфлікт даних на сервері. ${rawMessage}`,
    http429Error: (rawMessage) => `HTTP 429: перевищено ліміт запитів. ${rawMessage}`,
    http5xxError: (statusCode, rawMessage) => `HTTP ${statusCode}: помилка сервера бекенду. ${rawMessage}`,
    networkError: (rawMessage) =>
      `Немає зʼєднання з API (network failure). Перевірте HTTPS/сертифікат, DNS і доступність сервера. ${rawMessage}`,
    unexpectedConnectionError: "Сталася неочікувана помилка зʼєднання.",
    teamCustomizationText: {
      editorTitle: "Редактор банера команди",
      editorHint: "Налаштуйте вигляд банера команди. Цей банер буде видно у верхній панелі під час гри.",
      bannerPreviewLabel: "Попередній перегляд банера",
      teamFallbackName: "Назва команди",
      teamLabel: "Команда",
      pointsLabel: "Бали",
      customizationLabel: "Налаштування команди",
      teamNamePlaceholder: "Назва команди",
      teamColorLabel: "Колір команди",
      teamIconLabel: "Іконка команди",
      startAction: "Старт!",
      startingAction: "Запуск...",
    },
  },
  russian: {
    expeditionMapLabel: "Карта экспедиции",
    noApiConfiguration: "Нет конфигурации",
    stepLabel: {
      api: "Подключение API",
      code: "Код реализации",
      team: "Назначение команды",
      customization: "Настройка команды",
    },
    stepHint: {
      api: "Шаг 1 подтверждает подключение к бэкенду и готовность API.",
      code: "Шаг 2 требует ввести код реализации от администратора.",
      team: "Шаг 3 показывает назначенную команду перед настройкой баннера.",
      customization: "Настройте баннер команды и перейдите к стартовому экрану приложения.",
    },
    stepCounter: (stepNumber) => `Шаг ${stepNumber}`,
    apiStepTitle: "Шаг 1: подтверждение API",
    apiStepDescription: "Убедитесь, что бэкенд отвечает, прежде чем вводить код реализации.",
    apiConnectionLabel: "Подключение API",
    closeAction: "Закрыть",
    changeAction: "Изменить",
    serverLabel: "Сервер",
    statusLabel: "Статус",
    apiStatusValue: {
      checking: "проверка",
      connected: "подключено",
      disconnected: "нет соединения",
      "config-missing": "нет конфигурации",
    },
    quickSelectLabel: "Быстрый выбор",
    localPresetLabel: "Локовый тестовый сервер",
    productionPresetLabel: "Продакшн",
    saveAction: "Сохранить",
    defaultAction: "По умолчанию",
    recheckAction: "Проверить снова",
    goToStepTwoAction: "Перейти к шагу 2",
    codeStepTitle: "Шаг 2: код реализации",
    codeStepDescription: "Введите код от администратора, чтобы перейти к назначению команды.",
    activeApiLabel: "Активный API",
    realizationCodePlaceholder: "Код реализации",
    activateRealizationAction: "Активировать реализацию",
    backToStepOneAction: "Назад к шагу 1",
    loadingConfiguration: "Загрузка конфигурации от администратора...",
    setupLoadFailed: "Не удалось загрузить конфигурацию.",
    teamStepTitle: "Шаг 3: назначение команды",
    teamStepDescription: "Система назначает команду по реализации. Вы можете изменить её перед запуском.",
    assignmentResultLabel: "Результат назначения",
    assignmentNotReady: "Назначение команды ещё не выполнено.",
    assignedTeamLabel: (slotNumber) => `Назначенная команда: ${slotNumber}`,
    noAssignedTeam: "Команда не назначена.",
    availableTeamCountLabel: (teamCount) => `Доступное количество команд: ${teamCount}`,
    codeDateLabel: (code, date) => `Код: ${code} • Время: ${date}`,
    changeTeamAction: "Сменить команду",
    backAction: "Назад",
    goToBannerEditorAction: "Перейти в редактор баннера",
    onboardingHint: "Шаг 1 проверяет API, шаг 2 активирует код реализации, шаг 3 завершает назначение, затем вы настраиваете баннер команды.",
    languagePickerTitle: "Выберите язык игрового контента",
    selectedLanguageLabel: (label) => `Выбрано: ${label}`,
    teamPickerTitle: "Выберите команду",
    teamPickerDescription: "Список команд формируется по лимиту команд реализации.",
    teamLabel: (slotNumber) => `Команда ${slotNumber}`,
    currentlyAssignedLabel: "Назначена сейчас",
    tapToAssignLabel: "Нажмите, чтобы назначить",
    switchingTeamAssignment: "Меняю назначение команды...",
    chooseTeamActionSheetTitle: "Выберите команду",
    actionSheetCancel: "Отмена",
    chooseTeamPrompt: (slots) => `Выберите номер команды (${slots})`,
    teamPickerInvalidInput: "Введите номер команды из списка.",
    mobileMemberName: "Мобильный пользователь",
    requiredRealizationCode: "Введите код реализации.",
    deviceInitializationInProgress: "Идёт инициализация устройства. Повторите попытку через мгновение.",
    missingApiConfigForStep: "Нет конфигурации API. Укажите адрес сервера в разделе подключения.",
    backendConnectionFailed: "Не удалось подключиться к бэкенду.",
    realizationNotFound: "Реализация для указанного кода не найдена.",
    autoAssignmentMessage: (slotNumber) => `Назначено автоматически: Команда ${slotNumber}.`,
    missingSessionOrApiConfig: "Нет активной сессии или конфигурации API.",
    reassignmentFallbackMessage: "Эта команда уже занята на другом устройстве. Назначение было переключено.",
    manualAssignmentMessage: (slotNumber) => `Назначено вручную: Команда ${slotNumber}.`,
    saveRequiresSession: "Нет активной сессии. Сначала активируйте код реализации.",
    saveRequiresTeamName: "Укажите название команды перед сохранением.",
    saveRequiresApi: "Нет конфигурации API. Укажите адрес сервера.",
    saveSuccessMessage: (name) => `Настройки сохранены: ${name}.`,
    saveFailedMessage: (error) => `Не удалось сохранить: ${error}`,
    liveSaveFailedMessage: (error) => `Не удалось сохранить изменения в реальном времени: ${error}`,
    colorTakenMessage: (slotNumber) => `Этот цвет уже выбрала Команда ${slotNumber}. Выберите другой.`,
    iconTakenMessage: (slotNumber) => `Этот эмодзи уже выбрала Команда ${slotNumber}. Выберите другой.`,
    invalidApiAddress: "Укажите корректный адрес сервера, например http://192.168.18.2:3001.",
    apiAddressSaved: "Адрес API-сервера сохранён.",
    apiAddressSaveSessionOnly: "Адрес установлен для этой сессии, но сохранить его навсегда не удалось.",
    productionPresetError: "Не удалось установить продакшн-сервер.",
    productionPresetSaved: "Выбран продакшн API-сервер.",
    productionPresetSessionOnly: "Продакшн-сервер установлен для этой сессии, но сохранить его навсегда не удалось.",
    resetDefaultSaved: "Восстановлена конфигурация сервера по умолчанию.",
    resetDefaultSessionOnly:
      "Конфигурация по умолчанию восстановлена для этой сессии, но сохранить её навсегда не удалось.",
    timeoutError: (baseUrl) => `Тайм-аут запроса к API (${baseUrl}). Проверьте адрес и сеть.`,
    http401Error: (rawMessage) => `HTTP 401: нет авторизации или сессия истекла. ${rawMessage}`,
    http403Error: (rawMessage) => `HTTP 403: доступ запрещён. ${rawMessage}`,
    http404Error: (rawMessage) => `HTTP 404: API endpoint не существует (проверьте базовый URL и префикс /api). ${rawMessage}`,
    http409Error: (rawMessage) => `HTTP 409: конфликт данных на сервере. ${rawMessage}`,
    http429Error: (rawMessage) => `HTTP 429: превышен лимит запросов. ${rawMessage}`,
    http5xxError: (statusCode, rawMessage) => `HTTP ${statusCode}: ошибка сервера бэкенда. ${rawMessage}`,
    networkError: (rawMessage) =>
      `Нет подключения к API (network failure). Проверьте HTTPS/сертификат, DNS и доступность сервера. ${rawMessage}`,
    unexpectedConnectionError: "Произошла непредвиденная ошибка подключения.",
    teamCustomizationText: {
      editorTitle: "Редактор баннера команды",
      editorHint: "Настройте внешний вид баннера команды. Этот баннер виден в верхней панели во время игры.",
      bannerPreviewLabel: "Предпросмотр баннера",
      teamFallbackName: "Название команды",
      teamLabel: "Команда",
      pointsLabel: "Очки",
      customizationLabel: "Настройка команды",
      teamNamePlaceholder: "Название команды",
      teamColorLabel: "Цвет команды",
      teamIconLabel: "Иконка команды",
      startAction: "Старт!",
      startingAction: "Запуск...",
    },
  },
};

type RealizationOnboardingScreenProps = {
  onComplete?: (session: OnboardingSession) => void;
  recoveryIntent?: {
    realizationCode: string;
    apiBaseUrl: string | null;
    notice: string;
  } | null;
  onRecoveryConsumed?: () => void;
};

function getErrorMessage(error: unknown, text: OnboardingUiText) {
  if (error instanceof Error && error.message.trim().length > 0) {
    const rawMessage = error.message.trim();
    if (rawMessage.startsWith(REQUEST_TIMEOUT_ERROR_PREFIX)) {
      return text.timeoutError(rawMessage.slice(REQUEST_TIMEOUT_ERROR_PREFIX.length));
    }
    const statusMatch = rawMessage.match(/\bHTTP\s+(\d{3})\b/i);
    const statusCode = statusMatch ? Number(statusMatch[1]) : null;

    if (statusCode === 401) {
      return text.http401Error(rawMessage);
    }
    if (statusCode === 403) {
      return text.http403Error(rawMessage);
    }
    if (statusCode === 404) {
      return text.http404Error(rawMessage);
    }
    if (statusCode === 409) {
      return text.http409Error(rawMessage);
    }
    if (statusCode === 429) {
      return text.http429Error(rawMessage);
    }
    if (statusCode !== null && statusCode >= 500) {
      return text.http5xxError(statusCode, rawMessage);
    }

    if (rawMessage.includes("Network request failed") || rawMessage.includes("Failed to fetch")) {
      return text.networkError(rawMessage);
    }

    return rawMessage;
  }

  return text.unexpectedConnectionError;
}

function formatScheduledAt(value: string, uiLanguage: UiLanguage) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return date.toLocaleString(UI_DATE_LOCALE[uiLanguage]);
}

function normalizeDurationMinutes(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 120;
  }

  return Math.round(parsed);
}

function normalizeRealizationStatus(value: unknown): "planned" | "in-progress" | "done" {
  if (value === "in-progress" || value === "done") {
    return value;
  }

  return "planned";
}

function normalizeLanguageOption(
  value: unknown,
  customLanguage?: string,
): RealizationLanguageOption | null {
  const source = typeof value === "string" ? { value } : (value as Record<string, unknown> | null);
  if (!source || typeof source !== "object") {
    return null;
  }

  const languageValue =
    typeof source.value === "string" && isRealizationLanguage(source.value.toLowerCase())
      ? (source.value.toLowerCase() as RealizationLanguage)
      : typeof source.language === "string" && isRealizationLanguage(source.language.toLowerCase())
        ? (source.language.toLowerCase() as RealizationLanguage)
        : null;

  if (!languageValue) {
    return null;
  }

  const label =
    typeof source.label === "string" && source.label.trim().length > 0
      ? source.label.trim()
      : languageValue === "other"
        ? customLanguage?.trim() || getRealizationLanguageLabel(languageValue)
        : getRealizationLanguageLabel(languageValue);

  return {
    value: languageValue,
    label,
  };
}

function normalizeLanguageOptions(
  options: unknown,
  fallbackLanguage?: RealizationLanguage,
  customLanguage?: string,
) {
  const parsed = Array.isArray(options)
    ? options
        .map((item) => normalizeLanguageOption(item, customLanguage))
        .filter((item): item is RealizationLanguageOption => Boolean(item))
    : [];
  const deduplicated = parsed.filter(
    (item, index, list) =>
      list.findIndex((candidate) => candidate.value === item.value) === index,
  );

  if (deduplicated.length > 0) {
    return deduplicated;
  }

  if (!fallbackLanguage) {
    return [] as RealizationLanguageOption[];
  }

  return [
    {
      value: fallbackLanguage,
      label:
        fallbackLanguage === "other"
          ? customLanguage?.trim() || getRealizationLanguageLabel(fallbackLanguage)
          : getRealizationLanguageLabel(fallbackLanguage),
    },
  ] satisfies RealizationLanguageOption[];
}

function resolveBannerTextColor(hexColor: string) {
  const normalizedHex = hexColor.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return "#f8fafc";
  }

  const parsedHex = Number.parseInt(normalizedHex, 16);
  const red = (parsedHex >> 16) & 255;
  const green = (parsedHex >> 8) & 255;
  const blue = parsedHex & 255;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 172 ? "#0f172a" : "#f8fafc";
}

function normalizeApiBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const hasExplicitProtocol = /^https?:\/\//i.test(trimmed);
  const hostCandidate = hasExplicitProtocol
    ? (() => {
        try {
          return new URL(trimmed).hostname.toLowerCase();
        } catch {
          return "";
        }
      })()
    : trimmed.split("/")[0]?.split(":")[0]?.trim().toLowerCase() ?? "";
  const shouldUseHttpByDefault =
    hostCandidate === "localhost" ||
    hostCandidate === "10.0.2.2" ||
    hostCandidate === "127.0.0.1" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostCandidate) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostCandidate) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostCandidate) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostCandidate);
  const inferredProtocol = shouldUseHttpByDefault ? "http" : "https";
  const candidate = hasExplicitProtocol ? trimmed : `${inferredProtocol}://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${pathname}`;
}

function addBaseUrlCandidate(list: string[], candidate: string | null) {
  if (!candidate) {
    return;
  }

  if (!list.includes(candidate)) {
    list.push(candidate);
  }
}

function resolveProductionApiBaseUrlCandidates(preferredBaseUrl?: string | null) {
  const candidates: string[] = [];

  addBaseUrlCandidate(candidates, normalizeApiBaseUrl(preferredBaseUrl));
  for (const candidate of PRODUCTION_API_BASE_URL_CANDIDATES) {
    addBaseUrlCandidate(candidates, normalizeApiBaseUrl(candidate));
  }

  return candidates;
}

function isProductionApiBaseUrl(baseUrl: string | null) {
  if (!baseUrl) {
    return false;
  }

  return resolveProductionApiBaseUrlCandidates().includes(baseUrl);
}

function resolveLocalApiBaseUrlCandidates() {
  const candidates: string[] = [];
  addBaseUrlCandidate(candidates, normalizeApiBaseUrl(LOCAL_DEFAULT_API_BASE_URL));
  const envBaseUrl = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

  if (envBaseUrl) {
    addBaseUrlCandidate(candidates, envBaseUrl);
  }

  let protocol = "http:";
  let host = "";

  if (Platform.OS === "web" && typeof window !== "undefined") {
    protocol = window.location.protocol === "https:" ? "https:" : "http:";
    host = window.location.hostname;
  }

  if (!host) {
    const scriptUrl = NativeModules?.SourceCode?.scriptURL as string | undefined;

    if (typeof scriptUrl === "string" && scriptUrl.trim().length > 0) {
      try {
        const parsed = new URL(scriptUrl);
        const scriptHost = parsed.hostname?.trim();

        if (!scriptHost) {
          return [];
        }

        host =
          Platform.OS === "android" && (scriptHost === "localhost" || scriptHost === "127.0.0.1")
            ? "10.0.2.2"
            : scriptHost;

        protocol =
          parsed.protocol === "exps:"
            ? "https:"
            : parsed.protocol === "exp:"
              ? "http:"
              : parsed.protocol === "https:"
                ? "https:"
                : "http:";
      } catch {
        return candidates;
      }
    }
  }

  if (!host) {
    return candidates;
  }

  const ports = [3000, 3001, 3002];
  for (const port of ports) {
    addBaseUrlCandidate(candidates, normalizeApiBaseUrl(`${protocol}//${host}:${port}`));
  }

  return candidates;
}

function resolveApiBaseUrlCandidates(overrideBaseUrl?: string | null) {
  const normalizedOverride = normalizeApiBaseUrl(overrideBaseUrl);
  if (normalizedOverride) {
    if (isProductionApiBaseUrl(normalizedOverride)) {
      return resolveProductionApiBaseUrlCandidates(normalizedOverride);
    }

    return [normalizedOverride];
  }

  return resolveLocalApiBaseUrlCandidates();
}

function resolveApiServerPreset(baseUrl: string | null): ApiServerPreset {
  if (isProductionApiBaseUrl(baseUrl)) {
    return "production";
  }

  if (!baseUrl) {
    return "local";
  }

  return "custom";
}

async function requestMobileApi<T>(baseUrl: string, path: string, init?: RequestInit) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseHasApiSuffix = normalizedBaseUrl.endsWith("/api");
  const requestPath = baseHasApiSuffix
    ? normalizedPath === "/api"
      ? ""
      : normalizedPath.startsWith("/api/")
        ? normalizedPath.slice(4)
        : normalizedPath
    : normalizedPath;
  const requestUrl = `${normalizedBaseUrl}${requestPath}`;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, MOBILE_API_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...init,
      signal: timeoutController.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${REQUEST_TIMEOUT_ERROR_PREFIX}${baseUrl}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = (await response.json().catch(() => ({}))) as T & MobileApiError;

  if (!response.ok) {
    const errorMessage =
      (typeof data.message === "string" && data.message.trim()) ||
      (typeof data.error?.message === "string" && data.error.message.trim()) ||
      (typeof data.data?.error?.message === "string" && data.data.error.message.trim()) ||
      null;
    throw new Error(
      `HTTP ${response.status} [${requestUrl}]${errorMessage ? ` ${errorMessage}` : ""}`,
    );
  }

  return data as T;
}

function isTeamColor(value: string | null): value is TeamColor {
  return TEAM_COLORS.some((color) => color.key === value);
}

function normalizeOccupancyMap(
  value: Record<string, number> | undefined,
): Record<string, number> {
  if (!value) {
    return {};
  }

  const normalized: Record<string, number> = {};
  for (const [key, slot] of Object.entries(value)) {
    if (typeof key !== "string" || !key.trim()) {
      continue;
    }
    if (!Number.isInteger(slot) || slot < 1) {
      continue;
    }
    normalized[key] = slot;
  }

  return normalized;
}

function normalizeCustomizationOccupancy(value: {
  colors?: Record<string, number>;
  icons?: Record<string, number>;
} | null | undefined) {
  return {
    colors: normalizeOccupancyMap(value?.colors),
    icons: normalizeOccupancyMap(value?.icons),
  };
}

export function RealizationOnboardingScreen({
  onComplete,
  recoveryIntent,
  onRecoveryConsumed,
}: RealizationOnboardingScreenProps) {
  const routePulse = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= 768;
  const contentMaxWidth = isTabletLayout ? 560 : 448;
  const contentHorizontalPadding = isTabletLayout ? 40 : 16;
  const contentTopPadding = isTabletLayout ? 44 : 24;
  const contentBottomPadding = isTabletLayout ? 56 : 32;
  const contentGapClassName = isTabletLayout ? "gap-8" : "gap-4";
  const teamPickerListMaxHeight = isTabletLayout ? 420 : 316;

  const [screen, setScreen] = useState<Screen>("api");
  const [setupState, setSetupState] = useState<SetupState>("idle");
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveMessageTone, setSaveMessageTone] = useState<"success" | "error" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingTeam, setIsSwitchingTeam] = useState(false);
  const [isTeamPickerOpen, setIsTeamPickerOpen] = useState(false);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [teamPickerError, setTeamPickerError] = useState<string | null>(null);

  const [realizationCode, setRealizationCode] = useState("");
  const [apiBaseUrlOverride, setApiBaseUrlOverride] = useState<string | null>(null);
  const [apiServerPreset, setApiServerPreset] = useState<ApiServerPreset>("local");
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = useState("");
  const [apiConfigMessage, setApiConfigMessage] = useState<string | null>(null);
  const [apiConfigMessageTone, setApiConfigMessageTone] = useState<"info" | "error" | null>(null);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [isHydratingApiConfig, setIsHydratingApiConfig] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [apiProbeNonce, setApiProbeNonce] = useState(0);
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [activeRealization, setActiveRealization] = useState<MobileBootstrapRealization | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<ApiConnectionStatus>(() =>
    resolveApiBaseUrlCandidates().length > 0 ? "checking" : "config-missing",
  );
  const [apiConnectionTarget, setApiConnectionTarget] = useState<string | null>(() => {
    const candidates = resolveApiBaseUrlCandidates();
    return candidates.length > 0 ? candidates[0] : null;
  });
  const [selectedLanguage, setSelectedLanguage] = useState<RealizationLanguage>("polish");
  const uiLanguage = useMemo(() => resolveUiLanguage(selectedLanguage), [selectedLanguage]);
  const text = ONBOARDING_UI_TEXT[uiLanguage];

  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState<TeamColor>("amber");
  const [teamIcon, setTeamIcon] = useState("🦊");
  const [customizationBlockMessage, setCustomizationBlockMessage] =
    useState<string | null>(null);
  const [customizationOccupancy, setCustomizationOccupancy] = useState(() =>
    normalizeCustomizationOccupancy(null),
  );
  const liveCustomizationRequestRef = useRef(0);
  const teamColors = useMemo(() => getTeamColors(uiLanguage), [uiLanguage]);

  const selectedColor = useMemo(
    () => teamColors.find((color) => color.key === teamColor) ?? teamColors[0],
    [teamColor, teamColors],
  );
  const bannerTextColor = resolveBannerTextColor(selectedColor.hex);
  const bannerMutedTextColor =
    bannerTextColor === "#0f172a" ? "rgba(15, 23, 42, 0.72)" : "rgba(248, 250, 252, 0.86)";
  const bannerIconBackground =
    bannerTextColor === "#0f172a" ? "rgba(255, 255, 255, 0.52)" : "rgba(15, 23, 42, 0.22)";
  const topPanelActiveStepIndex = TOP_PANEL_STEP_ORDER.indexOf(screen);
  const availableTeamSlots = useMemo(
    () => Array.from({ length: activeRealization?.teamCount ?? 0 }, (_, index) => index + 1),
    [activeRealization?.teamCount],
  );
  const apiStatusIndicatorColor =
    apiConnectionStatus === "connected"
      ? "#34d399"
      : apiConnectionStatus === "checking"
        ? "#fbbf24"
        : apiConnectionStatus === "config-missing"
          ? "#71717a"
          : EXPEDITION_THEME.danger;

  const activeLanguageOptions = useMemo(
    () => activeRealization?.availableLanguages ?? [],
    [activeRealization?.availableLanguages],
  );
  const hasMultipleLanguageOptions = activeLanguageOptions.length > 1;
  const currentLanguageFlag = getRealizationLanguageFlag(
    activeLanguageOptions.find((option) => option.value === selectedLanguage)?.value ?? selectedLanguage,
  );

  const selectedLanguageLabel =
    activeLanguageOptions.find((option) => option.value === selectedLanguage)?.label ??
    (selectedLanguage === "other"
      ? activeRealization?.customLanguage?.trim() || getRealizationLanguageLabel(selectedLanguage, uiLanguage)
      : getRealizationLanguageLabel(selectedLanguage, uiLanguage));

  const setSaveFeedback = useCallback((message: string | null, tone: "success" | "error" | null) => {
    setSaveMessage(message);
    setSaveMessageTone(tone);
  }, []);

  const setApiConfigFeedback = useCallback((message: string | null, tone: "info" | "error" | null) => {
    setApiConfigMessage(message);
    setApiConfigMessageTone(tone);
  }, []);

  useEffect(() => {
    if (!hasMultipleLanguageOptions && isLanguagePickerOpen) {
      setIsLanguagePickerOpen(false);
    }
  }, [hasMultipleLanguageOptions, isLanguagePickerOpen]);

  const refreshCustomizationState = useCallback(async () => {
    if (!apiBaseUrl || !sessionToken) {
      return;
    }

    const safeLanguage =
      selectedLanguage && isRealizationLanguage(selectedLanguage)
        ? selectedLanguage
        : undefined;
    const state = await requestMobileApi<MobileSessionStateResponse>(
      apiBaseUrl,
      "/api/mobile/session/state",
      {
        method: "POST",
        body: JSON.stringify({
          sessionToken,
          selectedLanguage: safeLanguage,
        }),
      },
    );

    setCustomizationOccupancy(
      normalizeCustomizationOccupancy(state.customizationOccupancy),
    );

    if (state.team?.slotNumber === selectedTeam) {
      if (isTeamColor(state.team.color)) {
        setTeamColor(state.team.color);
      }

      if (
        typeof state.team.badgeKey === "string" &&
        TEAM_ICONS.includes(state.team.badgeKey)
      ) {
        setTeamIcon(state.team.badgeKey);
      }
    }
  }, [apiBaseUrl, selectedLanguage, selectedTeam, sessionToken]);

  useEffect(() => {
    let isActive = true;

    const hydrateApiBaseUrlConfig = async () => {
      try {
        const storedOverride = await AsyncStorage.getItem(API_BASE_URL_OVERRIDE_STORAGE_KEY);
        if (!isActive) {
          return;
        }

        const normalizedOverride = normalizeApiBaseUrl(storedOverride);
        setApiBaseUrlOverride(normalizedOverride);
        setApiServerPreset(resolveApiServerPreset(normalizedOverride));
        const initialCandidates = resolveApiBaseUrlCandidates(normalizedOverride);
        setApiBaseUrlDraft(normalizedOverride ?? initialCandidates[0] ?? "");
      } catch {
        if (!isActive) {
          return;
        }
        const initialCandidates = resolveApiBaseUrlCandidates(null);
        setApiBaseUrlDraft(initialCandidates[0] ?? "");
      } finally {
        if (isActive) {
          setIsHydratingApiConfig(false);
        }
      }
    };

    void hydrateApiBaseUrlConfig();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!recoveryIntent) {
      return;
    }

    setRealizationCode(recoveryIntent.realizationCode);
    if (typeof recoveryIntent.apiBaseUrl === "string") {
      const normalizedRecoveryApiBaseUrl = normalizeApiBaseUrl(recoveryIntent.apiBaseUrl);
      setApiBaseUrlOverride(normalizedRecoveryApiBaseUrl);
      setApiServerPreset(resolveApiServerPreset(normalizedRecoveryApiBaseUrl));
    }
    setSetupMessage(recoveryIntent.notice);
    setSetupState("loading");
    setScreen("code");
    if (!deviceId) {
      return;
    }

    void onSubmitCode(recoveryIntent.realizationCode, recoveryIntent.apiBaseUrl).finally(() => {
      onRecoveryConsumed?.();
    });
  }, [deviceId, onRecoveryConsumed, recoveryIntent]);

  useEffect(() => {
    let isActive = true;

    const hydrateDeviceId = async () => {
      try {
        const storedDeviceId = await AsyncStorage.getItem(MOBILE_DEVICE_ID_STORAGE_KEY);
        if (!isActive) {
          return;
        }

        const normalizedStoredDeviceId = storedDeviceId?.trim() || null;
        if (normalizedStoredDeviceId) {
          setDeviceId(normalizedStoredDeviceId);
          return;
        }

        const generatedDeviceId = `sq-${Platform.OS}-${Math.random().toString(36).slice(2, 10)}`;
        await AsyncStorage.setItem(MOBILE_DEVICE_ID_STORAGE_KEY, generatedDeviceId);

        if (isActive) {
          setDeviceId(generatedDeviceId);
        }
      } catch {
        if (!isActive) {
          return;
        }

        setDeviceId(`sq-${Platform.OS}-${Math.random().toString(36).slice(2, 10)}`);
      }
    };

    void hydrateDeviceId();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (isHydratingApiConfig) {
      return;
    }

    const baseUrlCandidates = resolveApiBaseUrlCandidates(apiBaseUrlOverride);

    if (baseUrlCandidates.length === 0) {
      setApiConnectionStatus("config-missing");
      setApiConnectionTarget(null);
      return;
    }

    let isCancelled = false;

    const probeConnection = async () => {
      setApiConnectionStatus("checking");
      setApiConnectionTarget(baseUrlCandidates[0]);
      let lastProbeError: unknown = null;

      for (const candidate of baseUrlCandidates) {
        if (isCancelled) {
          return;
        }

        setApiConnectionTarget(candidate);

        try {
          await requestMobileApi<MobileBootstrapResponse>(candidate, "/api/mobile/bootstrap");

          if (!isCancelled) {
            setApiConnectionStatus("connected");
            setApiConfigFeedback(null, null);
          }
          return;
        } catch (error) {
          lastProbeError = error;
          // try next candidate
        }
      }

      if (!isCancelled) {
        setApiConnectionStatus("disconnected");
        if (lastProbeError) {
          setApiConfigFeedback(getErrorMessage(lastProbeError, text), "error");
        }
      }
    };

    void probeConnection();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrlOverride, apiProbeNonce, isHydratingApiConfig, setApiConfigFeedback, text]);

  useEffect(() => {
    if (screen !== "customization" || !apiBaseUrl || !sessionToken) {
      return;
    }

    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollCustomizationOccupancy = async () => {
      try {
        await refreshCustomizationState();
      } catch {
        // Keep current occupancy; next poll will retry.
      } finally {
        if (!isCancelled) {
          timeoutId = setTimeout(
            () => void pollCustomizationOccupancy(),
            CUSTOMIZATION_OCCUPANCY_POLL_INTERVAL_MS,
          );
        }
      }
    };

    void pollCustomizationOccupancy();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [refreshCustomizationState, screen]);

  function completeOnboarding(nextSessionToken: string, nextTeamName: string) {
    const normalizedStatus = normalizeRealizationStatus(activeRealization?.status);
    const awaitingAdminStart = normalizedStatus === "planned" && Boolean(apiBaseUrl);
    const effectiveSelectedLanguage =
      selectedLanguage ??
      activeRealization?.selectedLanguage ??
      activeRealization?.language ??
      "polish";

    onComplete?.({
      realizationId: activeRealization?.id ?? null,
      realizationCode,
      sessionToken: nextSessionToken,
      apiBaseUrl,
      selectedLanguage: effectiveSelectedLanguage,
      realization: activeRealization
        ? {
            id: activeRealization.id,
            companyName: activeRealization.companyName,
            language: activeRealization.language,
            customLanguage: activeRealization.customLanguage?.trim() || undefined,
            selectedLanguage: effectiveSelectedLanguage,
            availableLanguages: activeRealization.availableLanguages ?? [],
            status: normalizedStatus,
            scheduledAt: activeRealization.scheduledAt,
            durationMinutes: normalizeDurationMinutes(activeRealization.durationMinutes),
            joinCode: activeRealization.joinCode,
            teamCount: activeRealization.teamCount,
            stationIds: activeRealization.stationIds,
            locationRequired: activeRealization.locationRequired,
            showLeaderboard: activeRealization.showLeaderboard !== false,
            introText: activeRealization.introText?.trim() || undefined,
            gameRules: activeRealization.gameRules?.trim() || undefined,
          }
        : null,
      awaitingAdminStart,
      showGameRulesAfterStart:
        !awaitingAdminStart && Boolean(activeRealization?.gameRules?.trim()),
      team: {
        slotNumber: selectedTeam,
        name: nextTeamName,
        colorKey: teamColor,
        colorLabel: selectedColor.label,
        colorHex: selectedColor.hex,
        icon: teamIcon,
      },
    });
  }

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(routePulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(routePulse, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [routePulse]);

  const firstMarkerPulse = {
    opacity: routePulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.48, 0.1],
    }),
    transform: [
      {
        scale: routePulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.5],
        }),
      },
    ],
  };

  const secondMarkerPulse = {
    opacity: routePulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.38, 0.08],
    }),
    transform: [
      {
        scale: routePulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1.1, 1.65],
        }),
      },
    ],
  };

  async function onSubmitCode(
    overrideCode?: string,
    preferredApiBaseUrl?: string | null,
  ) {
    const normalizedCode = (overrideCode ?? realizationCode).trim().toUpperCase();

    if (!normalizedCode) {
      setSetupState("error");
      setSetupMessage(text.requiredRealizationCode);
      return;
    }

    if (!deviceId) {
      setSetupState("error");
      setSetupMessage(text.deviceInitializationInProgress);
      return;
    }

    setRealizationCode(normalizedCode);
    setSetupState("loading");
    setSetupMessage(null);
    setSaveFeedback(null, null);
    setActiveRealization(null);
    setSelectedLanguage("polish");
    setApiBaseUrl(null);
    setSessionToken(null);
    setSelectedTeam(null);
    setCustomizationBlockMessage(null);
    setCustomizationOccupancy(normalizeCustomizationOccupancy(null));
    setTeamPickerError(null);
    setIsTeamPickerOpen(false);

    const baseUrlCandidates = resolveApiBaseUrlCandidates(
      preferredApiBaseUrl ?? apiBaseUrlOverride,
    );

    if (baseUrlCandidates.length === 0) {
      setApiConnectionStatus("config-missing");
      setApiConnectionTarget(null);
      setSetupState("error");
      setSetupMessage(text.missingApiConfigForStep);
      return;
    }

    try {
      let resolvedBaseUrl: string | null = null;
      let bootstrap: MobileBootstrapResponse | null = null;
      let bootstrapError: unknown = null;
      setApiConnectionStatus("checking");

      for (const candidate of baseUrlCandidates) {
        setApiConnectionTarget(candidate);

        try {
          bootstrap = await requestMobileApi<MobileBootstrapResponse>(candidate, "/api/mobile/bootstrap");
          resolvedBaseUrl = candidate;
          break;
        } catch (error) {
          bootstrapError = error;
        }
      }

      if (!resolvedBaseUrl || !bootstrap) {
        setApiConnectionStatus("disconnected");
        throw bootstrapError ?? new Error(text.backendConnectionFailed);
      }
      setApiConnectionStatus("connected");

      const join = await requestMobileApi<MobileJoinResponse>(resolvedBaseUrl, "/api/mobile/session/join", {
        method: "POST",
        body: JSON.stringify({
          joinCode: normalizedCode,
          deviceId,
          memberName: text.mobileMemberName,
        }),
      });

      const realization =
        bootstrap.realizations.find((item) => item.id === join.realizationId) ??
        bootstrap.realizations.find((item) => item.joinCode.trim().toUpperCase() === normalizedCode);

      if (!realization) {
        throw new Error(text.realizationNotFound);
      }

      const normalizedLanguage =
        typeof realization.language === "string" && isRealizationLanguage(realization.language.toLowerCase())
          ? (realization.language.toLowerCase() as RealizationLanguage)
          : undefined;
      const normalizedCustomLanguage = realization.customLanguage?.trim() || undefined;
      const normalizedAvailableLanguages = normalizeLanguageOptions(
        realization.availableLanguages,
        normalizedLanguage,
        normalizedCustomLanguage,
      );
      const normalizedSelectedLanguage =
        (typeof realization.selectedLanguage === "string" &&
        isRealizationLanguage(realization.selectedLanguage.toLowerCase())
          ? (realization.selectedLanguage.toLowerCase() as RealizationLanguage)
          : undefined) ??
        normalizedLanguage ??
        normalizedAvailableLanguages[0]?.value ??
        "polish";

      const normalizedRealization = {
        ...realization,
        language: normalizedLanguage,
        customLanguage: normalizedCustomLanguage,
        selectedLanguage: normalizedSelectedLanguage,
        availableLanguages: normalizedAvailableLanguages,
        status: normalizeRealizationStatus(realization.status),
        introText: realization.introText?.trim() || undefined,
        gameRules: realization.gameRules?.trim() || undefined,
        durationMinutes: normalizeDurationMinutes(realization.durationMinutes),
        showLeaderboard: realization.showLeaderboard !== false,
      };

      setApiBaseUrl(resolvedBaseUrl);
      setActiveRealization(normalizedRealization);
      setSelectedLanguage(normalizedRealization.selectedLanguage);
      setSessionToken(join.sessionToken);
      setSelectedTeam(join.team.slotNumber);
      setTeamName(join.team.name?.trim() || text.teamLabel(join.team.slotNumber));
      setCustomizationBlockMessage(null);
      setCustomizationOccupancy(
        normalizeCustomizationOccupancy(join.customizationOccupancy),
      );

      if (isTeamColor(join.team.color)) {
        setTeamColor(join.team.color);
      } else {
        setTeamColor("amber");
      }

      if (typeof join.team.badgeKey === "string" && TEAM_ICONS.includes(join.team.badgeKey)) {
        setTeamIcon(join.team.badgeKey);
      } else {
        setTeamIcon("🦊");
      }

      setSetupState("ready");
      setSetupMessage(text.autoAssignmentMessage(join.team.slotNumber));
      setScreen("team");
    } catch (error) {
      setSetupState("error");
      setSetupMessage(getErrorMessage(error, text));
    }
  }

  function triggerApiProbe() {
    setApiProbeNonce((current) => current + 1);
  }

  async function onSelectTeamFromPopup(slotNumber: number) {
    if (slotNumber === selectedTeam) {
      setIsTeamPickerOpen(false);
      return;
    }

    if (!sessionToken || !apiBaseUrl) {
      setTeamPickerError(text.missingSessionOrApiConfig);
      return;
    }

    setIsSwitchingTeam(true);
    setTeamPickerError(null);

    try {
      const result = await requestMobileApi<MobileSelectTeamResponse>(apiBaseUrl, "/api/mobile/team/select", {
        method: "POST",
        body: JSON.stringify({
          sessionToken,
          slotNumber,
        }),
      });

      setSelectedTeam(result.team.slotNumber);
      setTeamName(result.team.name?.trim() || text.teamLabel(result.team.slotNumber));
      setCustomizationBlockMessage(null);
      setCustomizationOccupancy(
        normalizeCustomizationOccupancy(result.customizationOccupancy),
      );

      if (isTeamColor(result.team.color)) {
        setTeamColor(result.team.color);
      } else {
        setTeamColor("amber");
      }

      if (typeof result.team.badgeKey === "string" && TEAM_ICONS.includes(result.team.badgeKey)) {
        setTeamIcon(result.team.badgeKey);
      } else {
        setTeamIcon("🦊");
      }

      const reassignmentMessage =
        result.reassignment?.replacedExistingAssignment === true
          ? result.reassignment.message ?? text.reassignmentFallbackMessage
          : null;
      setSetupMessage(
        reassignmentMessage ??
          text.manualAssignmentMessage(result.team.slotNumber),
      );
      setIsTeamPickerOpen(false);
    } catch (error) {
      setTeamPickerError(getErrorMessage(error, text));
    } finally {
      setIsSwitchingTeam(false);
    }
  }

  async function onSaveCustomization() {
    const trimmedName = teamName.trim();

    if (!sessionToken) {
      setSaveFeedback(text.saveRequiresSession, "error");
      return;
    }

    if (!trimmedName) {
      setSaveFeedback(text.saveRequiresTeamName, "error");
      return;
    }

    if (!apiBaseUrl) {
      setSaveFeedback(text.saveRequiresApi, "error");
      return;
    }

    setIsSaving(true);
    setSaveFeedback(null, null);
    let completionTeamName: string | null = null;

    try {
      const result = await requestMobileApi<MobileClaimResponse>(apiBaseUrl, "/api/mobile/team/claim", {
        method: "POST",
        body: JSON.stringify({
          sessionToken,
          name: trimmedName,
          color: teamColor,
          badgeKey: teamIcon,
        }),
      });

      const normalizedResultName = result.name.trim() || trimmedName;
      setTeamName(normalizedResultName);
      setCustomizationBlockMessage(null);
      setCustomizationOccupancy(
        normalizeCustomizationOccupancy(result.customizationOccupancy),
      );
      setSaveFeedback(text.saveSuccessMessage(normalizedResultName), "success");
      completionTeamName = normalizedResultName;
    } catch (error) {
      setSaveFeedback(text.saveFailedMessage(getErrorMessage(error, text)), "error");
    } finally {
      setIsSaving(false);
    }

    if (completionTeamName) {
      completeOnboarding(sessionToken, completionTeamName);
    }
  }

  const handleTeamNameChange = useCallback((value: string) => {
    setTeamName(value);
    setCustomizationBlockMessage(null);
    setSaveFeedback(null, null);
  }, [setSaveFeedback]);

  const persistLiveCustomization = useCallback(
    async (input: {
      nextColor?: TeamColor;
      nextIcon?: string;
      previousColor: TeamColor;
      previousIcon: string;
    }) => {
      if (!sessionToken || !apiBaseUrl) {
        return;
      }

      const requestId = liveCustomizationRequestRef.current + 1;
      liveCustomizationRequestRef.current = requestId;

      try {
        const result = await requestMobileApi<MobileUpdateCustomizationResponse>(
          apiBaseUrl,
          "/api/mobile/team/customization",
          {
            method: "POST",
            body: JSON.stringify({
              sessionToken,
              ...(typeof input.nextColor !== "undefined"
                ? { color: input.nextColor }
                : {}),
              ...(typeof input.nextIcon !== "undefined"
                ? { badgeKey: input.nextIcon }
                : {}),
            }),
          },
        );

        if (liveCustomizationRequestRef.current !== requestId) {
          return;
        }

        setCustomizationOccupancy(
          normalizeCustomizationOccupancy(result.customizationOccupancy),
        );
        setCustomizationBlockMessage(null);
      } catch (error) {
        if (liveCustomizationRequestRef.current !== requestId) {
          return;
        }

        setTeamColor(input.previousColor);
        setTeamIcon(input.previousIcon);
        setSaveFeedback(text.liveSaveFailedMessage(getErrorMessage(error, text)), "error");
        await refreshCustomizationState().catch(() => undefined);
      }
    },
    [apiBaseUrl, refreshCustomizationState, sessionToken, setSaveFeedback, text],
  );

  const handleTeamColorChange = useCallback((value: TeamColor) => {
    const previousColor = teamColor;
    const previousIcon = teamIcon;
    const occupiedBy = customizationOccupancy.colors[value];
    if (
      typeof occupiedBy === "number" &&
      (!selectedTeam || occupiedBy !== selectedTeam)
    ) {
      setCustomizationBlockMessage(
        text.colorTakenMessage(occupiedBy),
      );
      return;
    }

    setTeamColor(value);
    setCustomizationBlockMessage(null);
    setSaveFeedback(null, null);
    void persistLiveCustomization({
      nextColor: value,
      previousColor,
      previousIcon,
    });
  }, [
    customizationOccupancy.colors,
    persistLiveCustomization,
    selectedTeam,
    setSaveFeedback,
    teamColor,
    teamIcon,
    text,
  ]);

  const handleTeamIconChange = useCallback((value: string) => {
    const previousColor = teamColor;
    const previousIcon = teamIcon;
    const occupiedBy = customizationOccupancy.icons[value];
    if (
      typeof occupiedBy === "number" &&
      (!selectedTeam || occupiedBy !== selectedTeam)
    ) {
      setCustomizationBlockMessage(
        text.iconTakenMessage(occupiedBy),
      );
      return;
    }

    setTeamIcon(value);
    setCustomizationBlockMessage(null);
    setSaveFeedback(null, null);
    void persistLiveCustomization({
      nextIcon: value,
      previousColor,
      previousIcon,
    });
  }, [
    customizationOccupancy.icons,
    persistLiveCustomization,
    selectedTeam,
    setSaveFeedback,
    teamColor,
    teamIcon,
    text,
  ]);

  const canSaveCustomization = Boolean(selectedTeam) && !isSaving;

  function openTeamPicker() {
    setTeamPickerError(null);

    if (availableTeamSlots.length === 0) {
      return;
    }

    if (Platform.OS === "ios") {
      const options = [...availableTeamSlots.map((slot) => text.teamLabel(slot)), text.actionSheetCancel];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: text.chooseTeamActionSheetTitle,
        },
        (selectedIndex) => {
          if (typeof selectedIndex !== "number" || selectedIndex === cancelButtonIndex) {
            return;
          }

          const slot = availableTeamSlots[selectedIndex];

          if (typeof slot === "number") {
            void onSelectTeamFromPopup(slot);
          }
        },
      );
      return;
    }

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const selected = window.prompt(
        text.chooseTeamPrompt(availableTeamSlots.join(", ")),
        String(selectedTeam ?? availableTeamSlots[0]),
      );

      if (selected === null) {
        return;
      }

      const parsed = Number(selected.trim());

      if (!Number.isInteger(parsed) || !availableTeamSlots.includes(parsed)) {
        setTeamPickerError(text.teamPickerInvalidInput);
        return;
      }

      void onSelectTeamFromPopup(parsed);
      return;
    }

    setIsTeamPickerOpen(true);
  }

  async function saveApiServerOverride() {
    const normalized = normalizeApiBaseUrl(apiBaseUrlDraft);
    if (!normalized) {
      setApiConfigFeedback(text.invalidApiAddress, "error");
      return;
    }

    setApiBaseUrlOverride(normalized);
    setApiServerPreset(resolveApiServerPreset(normalized));
    setApiBaseUrlDraft(normalized);
    setApiConnectionTarget(normalized);
    setApiConnectionStatus("checking");
    triggerApiProbe();
    setIsApiConfigOpen(false);

    try {
      await AsyncStorage.setItem(API_BASE_URL_OVERRIDE_STORAGE_KEY, normalized);
      setApiConfigFeedback(text.apiAddressSaved, "info");
    } catch {
      setApiConfigFeedback(text.apiAddressSaveSessionOnly, "error");
    }
  }

  async function applyApiServerPreset(preset: "local" | "production") {
    if (preset === "production") {
      const normalizedProductionBaseUrl = normalizeApiBaseUrl(PRODUCTION_API_BASE_URL);
      if (!normalizedProductionBaseUrl) {
        setApiConfigFeedback(text.productionPresetError, "error");
        return;
      }

      setApiServerPreset("production");
      setApiBaseUrlOverride(normalizedProductionBaseUrl);
      setApiBaseUrlDraft(normalizedProductionBaseUrl);
      setApiConnectionTarget(normalizedProductionBaseUrl);
      setApiConnectionStatus("checking");
      triggerApiProbe();
      setIsApiConfigOpen(false);

      try {
        await AsyncStorage.setItem(API_BASE_URL_OVERRIDE_STORAGE_KEY, normalizedProductionBaseUrl);
        setApiConfigFeedback(text.productionPresetSaved, "info");
      } catch {
        setApiConfigFeedback(text.productionPresetSessionOnly, "error");
      }
      return;
    }

    await resetApiServerOverride();
  }

  async function resetApiServerOverride() {
    const fallbackCandidates = resolveLocalApiBaseUrlCandidates();
    setApiServerPreset("local");
    setApiBaseUrlOverride(null);
    setApiBaseUrlDraft(fallbackCandidates[0] ?? "");
    setApiConnectionTarget(fallbackCandidates[0] ?? null);
    setApiConnectionStatus(fallbackCandidates.length > 0 ? "checking" : "config-missing");
    triggerApiProbe();
    setIsApiConfigOpen(false);

    try {
      await AsyncStorage.removeItem(API_BASE_URL_OVERRIDE_STORAGE_KEY);
      setApiConfigFeedback(text.resetDefaultSaved, "info");
    } catch {
      setApiConfigFeedback(text.resetDefaultSessionOnly, "error");
    }
  }

  return (
    <View className="relative flex-1 overflow-hidden" style={{ backgroundColor: EXPEDITION_THEME.background }}>
      <View pointerEvents="none" className="absolute inset-0">
        <Svg width="100%" height="100%" viewBox="0 0 430 932" preserveAspectRatio="xMidYMid slice">
          <Rect x="0" y="0" width="430" height="932" fill={EXPEDITION_THEME.background} />
          <Path
            d="M48 130 C128 170 164 236 150 330 C136 428 205 486 228 590 C254 704 328 736 362 846"
            fill="none"
            stroke={EXPEDITION_THEME.mapLine}
            strokeDasharray="8 11"
            strokeWidth={2}
            opacity={0.7}
          />
          <Path
            d="M76 454 C154 424 198 478 274 520"
            fill="none"
            stroke={EXPEDITION_THEME.mapLine}
            strokeDasharray="5 10"
            strokeWidth={1.5}
            opacity={0.5}
          />
          <Circle cx="48" cy="130" r="4" fill={EXPEDITION_THEME.mapNode} opacity={0.9} />
          <Circle cx="150" cy="330" r="4" fill={EXPEDITION_THEME.mapNode} opacity={0.9} />
          <Circle cx="228" cy="590" r="4" fill={EXPEDITION_THEME.mapNode} opacity={0.9} />
          <Circle cx="362" cy="846" r="4" fill={EXPEDITION_THEME.mapNode} opacity={0.9} />
        </Svg>
      </View>

      <Animated.View
        pointerEvents="none"
        className="absolute h-4 w-4 rounded-full"
        style={[{ left: "11%", top: "14%", backgroundColor: EXPEDITION_THEME.accent }, firstMarkerPulse]}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute h-4 w-4 rounded-full"
        style={[{ right: "16%", top: "61%", backgroundColor: EXPEDITION_THEME.accentStrong }, secondMarkerPulse]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: isTabletLayout ? "center" : "flex-start",
          paddingHorizontal: contentHorizontalPadding,
          paddingTop: contentTopPadding,
          paddingBottom: contentBottomPadding,
        }}
      >
        <View className={`w-full ${contentGapClassName}`} style={{ maxWidth: contentMaxWidth }}>
          {screen !== "customization" && (
            <View
              className={`rounded-3xl border ${isTabletLayout ? "px-8 py-7" : "px-5 py-5"}`}
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
            >
              <Text className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
                {text.expeditionMapLabel}
              </Text>
              <Text
                className={`mt-1 font-semibold tracking-tight ${isTabletLayout ? "text-5xl" : "text-3xl"}`}
                style={{ color: EXPEDITION_THEME.textPrimary }}
              >
                SurvivorQuest
              </Text>
              <Text className="mt-2 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                {text.stepHint[screen]}
              </Text>

              <View className="mt-4 flex-row gap-2">
                {TOP_PANEL_STEP_ORDER.map((step, index) => {
                  const isActive = index === topPanelActiveStepIndex;
                  const isCompleted = topPanelActiveStepIndex > -1 && index < topPanelActiveStepIndex;

                  return (
                    <View
                      key={step}
                      className="flex-1 rounded-xl border px-2 py-2"
                      style={{
                        borderColor: isActive || isCompleted ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                        backgroundColor: isActive ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                      }}
                    >
                      <Text
                        className="text-[10px] uppercase tracking-widest"
                        style={{ color: isActive || isCompleted ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.textSubtle }}
                      >
                        {text.stepCounter(index + 1)}
                      </Text>
                      <Text className="mt-0.5 text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                        {text.stepLabel[step]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {screen === "api" && (
            <View
              className={`rounded-3xl border ${isTabletLayout ? "p-7" : "p-5"}`}
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
            >
              <View className="gap-1.5">
                <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {text.apiStepTitle}
                </Text>
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {text.apiStepDescription}
                </Text>
              </View>

              <View
                className="mt-4 rounded-2xl border px-4 py-3"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                    {text.apiConnectionLabel}
                  </Text>
                  <Pressable
                    className={`border active:opacity-80 ${isTabletLayout ? "rounded-2xl px-4 py-2" : "rounded-xl px-2.5 py-1"}`}
                    style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
                    onPress={() => {
                      setIsApiConfigOpen((current) => {
                        const next = !current;

                        if (next) {
                          setApiBaseUrlDraft(apiConnectionTarget ?? "");
                        }

                        return next;
                      });
                      setApiConfigFeedback(null, null);
                    }}
                  >
                    <Text className={`${isTabletLayout ? "text-sm" : "text-xs"} font-semibold`} style={{ color: EXPEDITION_THEME.textPrimary }}>
                      {isApiConfigOpen ? text.closeAction : text.changeAction}
                    </Text>
                  </Pressable>
                </View>
                <Text className="mt-1 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {text.serverLabel}: {apiConnectionTarget ?? text.noApiConfiguration}
                </Text>
                <View className="mt-1.5 flex-row items-center gap-2">
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: apiStatusIndicatorColor }} />
                  <Text className="text-sm font-medium" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    {text.statusLabel}: {text.apiStatusValue[apiConnectionStatus]}
                  </Text>
                </View>
                {apiConfigMessage ? (
                  <Text
                    className="mt-2 text-xs"
                    style={{
                      color:
                        apiConfigMessageTone === "error" ||
                        apiConnectionStatus === "disconnected" ||
                        /^HTTP\s+\d{3}/i.test(apiConfigMessage)
                          ? EXPEDITION_THEME.danger
                          : EXPEDITION_THEME.textMuted,
                    }}
                  >
                    {apiConfigMessage}
                  </Text>
                ) : null}

                {isApiConfigOpen && (
                  <View className="mt-3 gap-2">
                    <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                      {text.quickSelectLabel}
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        className={`flex-1 border active:opacity-90 ${isTabletLayout ? "rounded-2xl px-3 py-2.5" : "rounded-xl px-3 py-2"}`}
                        style={{
                          borderColor: apiServerPreset === "local" ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                          backgroundColor: apiServerPreset === "local" ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panel,
                        }}
                        onPress={() => void applyApiServerPreset("local")}
                      >
                        <Text className="text-center text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          {text.localPresetLabel}
                        </Text>
                      </Pressable>
                      <Pressable
                        className={`flex-1 border active:opacity-90 ${isTabletLayout ? "rounded-2xl px-3 py-2.5" : "rounded-xl px-3 py-2"}`}
                        style={{
                          borderColor: apiServerPreset === "production" ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                          backgroundColor: apiServerPreset === "production" ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panel,
                        }}
                        onPress={() => void applyApiServerPreset("production")}
                      >
                        <Text className="text-center text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          {text.productionPresetLabel}
                        </Text>
                      </Pressable>
                    </View>

                    <TextInput
                      className="rounded-xl border px-3 py-2 text-sm"
                      style={{
                        borderColor: EXPEDITION_THEME.border,
                        backgroundColor: EXPEDITION_THEME.panel,
                        color: EXPEDITION_THEME.textPrimary,
                      }}
                      value={apiBaseUrlDraft}
                      onChangeText={(value) => {
                        setApiBaseUrlDraft(value);
                        setApiConfigFeedback(null, null);
                      }}
                      placeholder="http://192.168.18.2:3001"
                      placeholderTextColor={EXPEDITION_THEME.textSubtle}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <View className="flex-row gap-2">
                      <Pressable
                        className={`flex-1 active:opacity-90 ${isTabletLayout ? "rounded-2xl px-4 py-3" : "rounded-xl px-3 py-2"}`}
                        style={{ backgroundColor: EXPEDITION_THEME.accent }}
                        onPress={() => void saveApiServerOverride()}
                      >
                        <Text className={`text-center ${isTabletLayout ? "text-base" : "text-sm"} font-semibold text-zinc-950`}>
                          {text.saveAction}
                        </Text>
                      </Pressable>
                      <Pressable
                        className={`flex-1 border active:opacity-90 ${isTabletLayout ? "rounded-2xl px-4 py-3" : "rounded-xl px-3 py-2"}`}
                        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
                        onPress={() => void resetApiServerOverride()}
                      >
                        <Text className={`text-center ${isTabletLayout ? "text-base" : "text-sm"} font-semibold`} style={{ color: EXPEDITION_THEME.textPrimary }}>
                          {text.defaultAction}
                        </Text>
                      </Pressable>
                    </View>

                  </View>
                )}
              </View>

              <View className="mt-4 flex-row gap-2">
                <Pressable
                  className="flex-1 rounded-2xl border px-3 py-3 active:opacity-90"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                  onPress={triggerApiProbe}
                >
                  <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    {text.recheckAction}
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-2xl px-3 py-3 active:opacity-90"
                  style={{
                    backgroundColor: EXPEDITION_THEME.accent,
                    opacity: apiConnectionStatus === "connected" ? 1 : 0.6,
                  }}
                  onPress={() => setScreen("code")}
                  disabled={apiConnectionStatus !== "connected"}
                >
                  <Text className="text-center font-semibold text-zinc-950">{text.goToStepTwoAction}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {screen === "code" && (
            <View
              className={`rounded-3xl border ${isTabletLayout ? "p-7" : "p-5"}`}
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
            >
              <View className="gap-1.5">
                <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {text.codeStepTitle}
                </Text>
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {text.codeStepDescription}
                </Text>
              </View>

              <Text className="mt-3 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                {text.activeApiLabel}: {apiConnectionTarget ?? text.noApiConfiguration}
              </Text>

              <TextInput
                className="mt-3 rounded-2xl border px-4 py-3 text-base font-semibold tracking-widest"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                  color: EXPEDITION_THEME.textPrimary,
                }}
                value={realizationCode}
                onChangeText={(value) => setRealizationCode(value.toUpperCase())}
                placeholder={text.realizationCodePlaceholder}
                placeholderTextColor={EXPEDITION_THEME.textSubtle}
                autoCapitalize="characters"
                maxLength={12}
              />

              <Pressable
                className="mt-4 rounded-2xl px-4 py-3 active:opacity-90"
                style={{ backgroundColor: EXPEDITION_THEME.accent }}
                onPress={() => void onSubmitCode()}
              >
                <Text className="text-center text-base font-semibold text-zinc-950">{text.activateRealizationAction}</Text>
              </Pressable>

              <Pressable
                className="mt-2 rounded-2xl border px-4 py-3 active:opacity-90"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
                onPress={() => setScreen("api")}
              >
                <Text className="text-center text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {text.backToStepOneAction}
                </Text>
              </Pressable>

              {setupState === "loading" && (
                <View
                  className="mt-4 rounded-2xl border px-4 py-4"
                  style={{
                    borderColor: EXPEDITION_THEME.border,
                    backgroundColor: EXPEDITION_THEME.panelMuted,
                  }}
                >
                  <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
                  <Text className="mt-3 text-center text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                    {text.loadingConfiguration}
                  </Text>
                </View>
              )}

              {setupState === "error" && (
                <View
                  className="mt-4 rounded-2xl border px-4 py-4"
                  style={{ borderColor: EXPEDITION_THEME.danger, backgroundColor: "rgba(239, 111, 108, 0.12)" }}
                >
                  <Text className="text-sm" style={{ color: EXPEDITION_THEME.danger }}>
                    {setupMessage ?? text.setupLoadFailed}
                  </Text>
                </View>
              )}
            </View>
          )}

          {screen === "team" && (
            <View
              className={`rounded-3xl border ${isTabletLayout ? "p-7" : "p-5"}`}
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
            >
              <View className="gap-1">
                <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {text.teamStepTitle}
                </Text>
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {text.teamStepDescription}
                </Text>
              </View>

              <View
                className="mt-4 rounded-2xl border px-4 py-4"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
              >
                <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                  {text.assignmentResultLabel}
                </Text>
                <Text className="mt-1 text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {setupMessage ?? text.assignmentNotReady}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {selectedTeam ? text.assignedTeamLabel(selectedTeam) : text.noAssignedTeam}
                </Text>
                <Text className="mt-0.5 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {text.availableTeamCountLabel(activeRealization?.teamCount ?? "-")}
                </Text>
                {activeRealization && (
                  <>
                    <Text className="mt-2 text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                      {activeRealization.companyName}
                    </Text>
                    <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                      {text.codeDateLabel(realizationCode, formatScheduledAt(activeRealization.scheduledAt, uiLanguage))}
                    </Text>
                  </>
                )}
              </View>

              {hasMultipleLanguageOptions && (
                <View className="mt-3 items-end">
                  <Pressable
                    className="h-11 w-11 items-center justify-center rounded-full border active:opacity-90"
                    style={{
                      borderColor: EXPEDITION_THEME.border,
                      backgroundColor: EXPEDITION_THEME.panelMuted,
                    }}
                    onPress={() => setIsLanguagePickerOpen(true)}
                  >
                    <Text className="text-xl">{currentLanguageFlag}</Text>
                  </Pressable>
                </View>
              )}

              <Pressable
                className="mt-3 rounded-2xl border px-3 py-3 active:opacity-90"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelStrong,
                  opacity: availableTeamSlots.length > 0 ? 1 : 0.6,
                }}
                onPress={openTeamPicker}
                disabled={availableTeamSlots.length === 0}
                >
                  <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    {text.changeTeamAction}
                  </Text>
                </Pressable>

              <View className="mt-4 flex-row gap-2">
                <Pressable
                  className="flex-1 rounded-2xl border px-3 py-3 active:opacity-90"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                  onPress={() => setScreen("code")}
                >
                  <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    {text.backAction}
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-2xl px-3 py-3 active:opacity-90"
                  style={{ backgroundColor: EXPEDITION_THEME.accent, opacity: selectedTeam ? 1 : 0.6 }}
                  onPress={() => setScreen("customization")}
                  disabled={!selectedTeam}
                >
                  <Text className="text-center font-semibold text-zinc-950">
                    {text.goToBannerEditorAction}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {screen === "customization" && (
            <TeamCustomizationStep
              isTabletLayout={isTabletLayout}
              selectedTeam={selectedTeam}
              teamName={teamName}
              teamColor={teamColor}
              teamIcon={teamIcon}
              teamColors={teamColors}
              selectedColor={selectedColor}
              bannerTextColor={bannerTextColor}
              bannerMutedTextColor={bannerMutedTextColor}
              bannerIconBackground={bannerIconBackground}
              saveMessage={saveMessage}
              saveMessageTone={saveMessageTone}
              isSaving={isSaving}
              canSave={canSaveCustomization}
              occupiedColors={customizationOccupancy.colors}
              occupiedIcons={customizationOccupancy.icons}
              blockMessage={customizationBlockMessage}
              text={text.teamCustomizationText}
              onTeamNameChange={handleTeamNameChange}
              onTeamColorChange={handleTeamColorChange}
              onTeamIconChange={handleTeamIconChange}
              onSave={onSaveCustomization}
            />
          )}

          {screen !== "customization" && (
            <Text className="px-2 text-center text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
              {text.onboardingHint}
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isLanguagePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguagePickerOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center px-4"
          style={{ backgroundColor: "rgba(12, 18, 15, 0.72)" }}
          onPress={() => setIsLanguagePickerOpen(false)}
        >
          <Pressable
            className={`w-full rounded-3xl border ${isTabletLayout ? "p-6" : "p-4"}`}
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
              maxWidth: isTabletLayout ? 760 : 640,
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.languagePickerTitle}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
              {text.selectedLanguageLabel(selectedLanguageLabel)}
            </Text>

            <View className="mt-3 gap-2">
              {activeLanguageOptions.map((option) => {
                const isActive = option.value === selectedLanguage;

                return (
                  <Pressable
                    key={`language-option-${option.value}`}
                    className="rounded-2xl border px-3 py-3 active:opacity-90"
                    style={{
                      borderColor: isActive ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                      backgroundColor: isActive ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                    }}
                    onPress={() => {
                      setSelectedLanguage(option.value);
                      setIsLanguagePickerOpen(false);
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg">{getRealizationLanguageFlag(option.value)}</Text>
                        <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          {option.label}
                        </Text>
                      </View>
                      {isActive ? (
                        <Text className="text-sm font-bold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                          ✓
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              className="mt-4 rounded-2xl border px-3 py-3 active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={() => setIsLanguagePickerOpen(false)}
            >
              <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {text.closeAction}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isTeamPickerOpen && Platform.OS !== "ios" && Platform.OS !== "web"}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTeamPickerOpen(false)}
      >
        <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: "rgba(12, 18, 15, 0.72)" }}>
          <View
            className={`w-full rounded-3xl border ${isTabletLayout ? "p-6" : "p-4"}`}
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
              maxWidth: isTabletLayout ? 760 : 640,
            }}
          >
            <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.teamPickerTitle}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
              {text.teamPickerDescription}
            </Text>

            <View className="mt-3 rounded-2xl border p-2" style={{ borderColor: EXPEDITION_THEME.border }}>
              <ScrollView style={{ maxHeight: teamPickerListMaxHeight }} showsVerticalScrollIndicator>
                <View className="gap-2">
                  {availableTeamSlots.map((slotNumber) => {
                    const isCurrent = slotNumber === selectedTeam;

                    return (
                      <Pressable
                        key={slotNumber}
                        className="rounded-2xl border px-3 py-3 active:opacity-90"
                        style={{
                          borderColor: isCurrent ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                          backgroundColor: isCurrent ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                          minHeight: isTabletLayout ? 76 : 64,
                          justifyContent: "center",
                          opacity: isSwitchingTeam ? 0.65 : 1,
                        }}
                        onPress={() => void onSelectTeamFromPopup(slotNumber)}
                        disabled={isSwitchingTeam}
                      >
                        <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          {text.teamLabel(slotNumber)}
                        </Text>
                        <Text className="mt-0.5 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {isCurrent ? text.currentlyAssignedLabel : text.tapToAssignLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {isSwitchingTeam && (
              <View className="mt-3 flex-row items-center gap-2">
                <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
                <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {text.switchingTeamAssignment}
                </Text>
              </View>
            )}

            {teamPickerError && (
              <Text className="mt-3 text-xs" style={{ color: EXPEDITION_THEME.danger }}>
                {teamPickerError}
              </Text>
            )}

            <Pressable
              className="mt-4 rounded-2xl border px-3 py-3 active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={() => setIsTeamPickerOpen(false)}
            >
              <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {text.closeAction}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
