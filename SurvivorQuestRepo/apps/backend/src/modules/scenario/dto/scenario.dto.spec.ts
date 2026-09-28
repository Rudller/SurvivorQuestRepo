import { BadRequestException } from '@nestjs/common';
import {
  parseCreateScenarioDto,
  parseUpdateScenarioDto,
  toCreateScenarioEntity,
  toUpdatedScenarioEntity,
} from './scenario.dto';

const basePayload = {
  name: 'Sprawa Lokatora',
  description: '',
  introText: '',
  gameRules: '',
  stationIds: ['station-1'],
};

describe('scenario dto — categories', () => {
  it('przycina, odrzuca puste i dubluje tagi tylko raz', () => {
    const dto = parseCreateScenarioDto({
      ...basePayload,
      categories: [' Kryminalny ', '', 'Kryminalny', 'Hotel'],
    });

    expect(dto.categories).toEqual(['Kryminalny', 'Hotel']);
  });

  it('bez pola categories daje pustą listę, żeby stare klienty nie padały', () => {
    expect(parseCreateScenarioDto(basePayload).categories).toEqual([]);
  });

  it('odrzuca categories, które nie są listą napisów', () => {
    expect(() =>
      parseCreateScenarioDto({ ...basePayload, categories: 'Kryminalny' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateScenarioDto({ ...basePayload, categories: [42] }),
    ).toThrow(BadRequestException);
  });

  it('przenosi tagi do encji przy tworzeniu i edycji', () => {
    const created = toCreateScenarioEntity(
      parseCreateScenarioDto({ ...basePayload, categories: ['Kryminalny'] }),
    );
    expect(created.categories).toEqual(['Kryminalny']);

    const updated = toUpdatedScenarioEntity(
      created,
      parseUpdateScenarioDto({
        ...basePayload,
        id: created.id,
        categories: ['Hotel'],
      }),
    );
    expect(updated.categories).toEqual(['Hotel']);
  });
});
