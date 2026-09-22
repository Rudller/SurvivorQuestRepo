/**
 * Jak długo trzeba przytrzymać baner drużyny, żeby otworzyło się menu testowe.
 *
 * Ten sam gest działa w rozgrywce ekspedycyjnej i u Ryzykantów, więc wartość
 * musi być jedna. Do tej pory istniała w dwóch kopiach — w
 * use-expedition-stage-overlay-flow.ts i w risk-quiz-screen.tsx — spiętych
 * wyłącznie komentarzem "Matches TEST_MENU_TRIGGER_HOLD_MS in …". Komentarz nie
 * pilnuje niczego: rozjazd obu liczb dawałby dwa różne czasy przytrzymania na
 * tym samym urządzeniu i nic by o tym nie powiedziało.
 */
export const TEST_MENU_TRIGGER_HOLD_MS = 5_000;
