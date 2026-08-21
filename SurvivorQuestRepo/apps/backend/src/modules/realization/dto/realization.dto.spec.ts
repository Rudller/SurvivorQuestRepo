import { BadRequestException } from '@nestjs/common';
import {
  CreateRealizationDto,
  validateRealizationPayload,
} from './realization.dto';

function basePayload(
  overrides: Partial<CreateRealizationDto> = {},
): CreateRealizationDto {
  return {
    companyName: 'Firma testowa',
    contactPerson: 'Jan Kowalski',
    contactPhone: '123456789',
    type: 'outdoor-games',
    language: 'polish',
    status: 'planned',
    scenarioId: 'scenario-1',
    teamCount: 2,
    peopleCount: 10,
    positionsCount: 5,
    durationMinutes: 120,
    scheduledAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('validateRealizationPayload — hideLeaderboardMinutesBeforeEnd', () => {
  it('defaults to 0 when not provided', () => {
    const result = validateRealizationPayload(basePayload());

    expect(result.hideLeaderboardMinutesBeforeEnd).toBe(0);
  });

  it('accepts and rounds a positive value', () => {
    const result = validateRealizationPayload(
      basePayload({ hideLeaderboardMinutesBeforeEnd: 5.7 }),
    );

    expect(result.hideLeaderboardMinutesBeforeEnd).toBe(6);
  });

  it('accepts 0 explicitly', () => {
    const result = validateRealizationPayload(
      basePayload({ hideLeaderboardMinutesBeforeEnd: 0 }),
    );

    expect(result.hideLeaderboardMinutesBeforeEnd).toBe(0);
  });

  it('rejects a negative value', () => {
    expect(() =>
      validateRealizationPayload(
        basePayload({ hideLeaderboardMinutesBeforeEnd: -1 }),
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects a non-numeric value', () => {
    expect(() =>
      validateRealizationPayload(
        basePayload({
          hideLeaderboardMinutesBeforeEnd: 'not-a-number' as unknown as number,
        }),
      ),
    ).toThrow(BadRequestException);
  });
});
