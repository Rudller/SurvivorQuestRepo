import type { CurrentRealizationOverview } from "../types/current-realization-overview";

/**
 * Tłumaczenia wpisów `EventLog` na polski.
 *
 * Mieszkały w `apps/admin/src/app/current-realization/page.tsx`, dopóki log
 * zdarzeń był widoczny wyłącznie tam. Panel główny pokazuje teraz skrót tego
 * samego logu, a dwie kopie tej listy rozjechałyby się przy pierwszym nowym
 * `eventType` dodanym w backendzie.
 */

export type EventLogEntry = CurrentRealizationOverview["logs"][number];

export function renderTaskFailedReason(payload: Record<string, unknown>) {
  const reasonLabel = typeof payload.reasonLabel === "string" ? payload.reasonLabel.trim() : "";
  if (reasonLabel) {
    return reasonLabel;
  }

  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  if (!reason) {
    return "";
  }

  if (reason === "quiz_incorrect_answer") {
    return "Błędna odpowiedź quizu";
  }

  if (reason === "time_limit_expired") {
    return "Przekroczony limit czasu";
  }

  if (reason === "task_closed_before_completion") {
    return "Zamknięto zadanie przed ukończeniem";
  }

  return reason;
}

export function renderQrRejectedReason(reason: string) {
  if (reason === "invalid_token") {
    return "Nieprawidłowy kod QR";
  }

  if (reason === "expired_token") {
    return "Kod QR wygasł";
  }

  if (reason === "realization_mismatch") {
    return "Kod QR z innej realizacji";
  }

  if (reason === "station_not_in_realization") {
    return "Stanowisko nie należy do tej realizacji";
  }

  if (reason === "station_not_found") {
    return "Nie znaleziono stanowiska dla kodu QR";
  }

  return "Kod QR został odrzucony";
}

export function renderLogTitle(log: EventLogEntry, stationName: string | null) {
  if (log.eventType === "task_started") {
    return `Start zadania${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "task_completed") {
    return `Zadanie ukończone${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "task_failed") {
    return `Nieudane zadanie${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "team_profile_updated" || log.eventType === "team_customization_updated") {
    return "Personalizacja zakończona";
  }

  if (log.eventType === "team_joined") {
    return "Drużyna dołączyła";
  }

  if (log.eventType === "team_name_randomized") {
    return "Wylosowano nazwę drużyny";
  }

  if (log.eventType === "team_ready_for_start") {
    return "Drużyna gotowa do startu";
  }

  if (log.eventType === "station_qr_resolved") {
    return `Skan QR zaakceptowany${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "station_qr_rejected") {
    return "Skan QR odrzucony";
  }

  if (log.eventType === "realization_started") {
    return "Rozpoczęto realizację";
  }

  if (log.eventType === "realization_finished") {
    return "Zakończono realizację";
  }

  if (log.eventType === "realization_reset") {
    return "Zresetowano realizację";
  }

  if (log.eventType === "realization_device_exit_forced") {
    return "Wyrzucono urządzenia do konfiguracji";
  }

  if (log.eventType === "completed_tasks_reset") {
    return "Zresetowano ukończone zadania";
  }

  if (log.eventType === "task_reset_by_admin") {
    return `Zresetowano zadanie (admin)${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "points_recalculated") {
    return "Przeliczono punkty drużyny";
  }

  if (log.eventType === "team_location_updated") {
    return "Zaktualizowano lokalizację drużyny";
  }

  return log.eventType.replaceAll("_", " ");
}

export function renderLogDescription(log: EventLogEntry, stationName: string | null) {
  if (log.eventType === "task_failed") {
    return `Powód: ${renderTaskFailedReason(log.payload) || "nieznany"}`;
  }

  if (log.eventType === "task_completed") {
    const pointsAwarded = typeof log.payload.pointsAwarded === "number" ? log.payload.pointsAwarded : null;
    return pointsAwarded !== null ? `Zdobyte punkty: ${pointsAwarded}` : null;
  }

  if (log.eventType === "task_reset_by_admin") {
    return "Stan zadania ustawiono na „do zrobienia”.";
  }

  if (log.eventType === "station_qr_rejected") {
    const reason = typeof log.payload.reason === "string" ? log.payload.reason : "";
    return renderQrRejectedReason(reason);
  }

  if (log.eventType === "station_qr_resolved" && stationName) {
    return `Zeskanowano poprawny kod QR dla stanowiska ${stationName}.`;
  }

  if (log.eventType === "team_profile_updated" || log.eventType === "team_customization_updated") {
    const changedFields = Array.isArray(log.payload.changedFields)
      ? log.payload.changedFields.filter((value): value is string => typeof value === "string")
      : [];

    if (changedFields.length === 0) {
      return null;
    }

    const translated = changedFields.map((field) => {
      if (field === "name") return "nazwa";
      if (field === "color") return "kolor";
      if (field === "badge") return "odznaka";
      return field;
    });

    return `Zmieniono: ${translated.join(", ")}.`;
  }

  return null;
}
