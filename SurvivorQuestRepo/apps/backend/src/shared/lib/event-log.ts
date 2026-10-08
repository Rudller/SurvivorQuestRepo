import type { Prisma } from '@prisma/client';

/**
 * Typy zdarzeń, których nie pokazujemy w logu realizacji.
 *
 * `team_location_updated` backend zapisywał przy każdej zmianie pozycji
 * tabletu — ok. 90% całego EventLogu (awaria 2026-10-06). Ostatnią pozycję
 * drużyny trzyma i tak `Team.lastLocation*`, więc nowe wpisy już nie powstają,
 * a filtr chowa stare, które zostały w bazie.
 */
export const HIDDEN_EVENT_LOG_TYPES = ['team_location_updated'];

export const VISIBLE_EVENT_LOG_WHERE = {
  eventType: { notIn: HIDDEN_EVENT_LOG_TYPES },
} satisfies Prisma.EventLogWhereInput;
