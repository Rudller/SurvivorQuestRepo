import { BadRequestException } from '@nestjs/common';
import {
  COMPLETION_CODE_REGEX,
  isCompletionCodeRequiredStationType,
  isStationType,
} from '../../station/domain/station.rules';
import { normalizeStationDraft } from '../../station/normalizers/station.normalizer';
import type { StationDraftInput } from '../../station/station.service';
import { DEFAULT_STATION_DESCRIPTION } from '../domain/realization.defaults';
import type { ScenarioStationDraftPayload } from '../entities/realization.entity';

export type ParseTimeLimitResult =
  | { ok: true; value: number }
  | { ok: false; value: null };

function isValidStationCoordinate(latitude: unknown, longitude: unknown) {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function normalizeScenarioStationDrafts(
  drafts: ScenarioStationDraftPayload[] | undefined,
  parseTimeLimitSeconds: (value: unknown) => ParseTimeLimitResult,
): StationDraftInput[] | undefined {
  if (!drafts) {
    return undefined;
  }

  if (drafts.length === 0) {
    throw new BadRequestException(
      'Realization must include at least one station',
    );
  }

  return drafts.map((draft) => {
    const parsedTimeLimit = parseTimeLimitSeconds(draft.timeLimitSeconds);
    const hasLatitude = typeof draft.latitude === 'number';
    const hasLongitude = typeof draft.longitude === 'number';
    const hasCoordinates = hasLatitude || hasLongitude;
    const stationType = isStationType(draft.type) ? draft.type : undefined;
    const requiresCompletionCode =
      stationType && isCompletionCodeRequiredStationType(stationType);
    const normalizedCompletionCode =
      typeof draft.completionCode === 'string'
        ? draft.completionCode.trim().toUpperCase()
        : '';

    if (
      !draft.name?.trim() ||
      !stationType ||
      typeof draft.points !== 'number' ||
      draft.points <= 0 ||
      !parsedTimeLimit.ok ||
      (requiresCompletionCode &&
        !COMPLETION_CODE_REGEX.test(normalizedCompletionCode)) ||
      (hasCoordinates &&
        !isValidStationCoordinate(draft.latitude, draft.longitude))
    ) {
      throw new BadRequestException('Invalid payload');
    }

    return normalizeStationDraft(
      {
        name: draft.name.trim(),
        type: stationType,
        description: draft.description?.trim() || DEFAULT_STATION_DESCRIPTION,
        imageUrl: draft.imageUrl?.trim() || undefined,
        points: Math.round(draft.points),
        timeLimitSeconds: parsedTimeLimit.value,
        completionCode: requiresCompletionCode
          ? normalizedCompletionCode
          : undefined,
        quiz: draft.quiz,
        translations: draft.translations,
        latitude: hasCoordinates ? draft.latitude : undefined,
        longitude: hasCoordinates ? draft.longitude : undefined,
        sourceTemplateId: draft.sourceTemplateId?.trim() || undefined,
      },
      draft.name.trim(),
    );
  });
}
