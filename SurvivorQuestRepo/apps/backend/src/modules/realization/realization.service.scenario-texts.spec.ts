import { resolveScenarioTextsForRealization } from './realization.service';

describe('resolveScenarioTextsForRealization', () => {
  const scenario = {
    introText: 'Witajcie',
    gameRules: 'Zasady',
    translations: { english: { introText: 'Welcome' } },
  };

  it('dla polskiej realizacji bierze polski tekst, a angielski idzie do tłumaczeń', () => {
    const texts = resolveScenarioTextsForRealization(scenario, 'polish');

    expect(texts.introText).toBe('Witajcie');
    expect(texts.gameRules).toBe('Zasady');
    expect(texts.translations).toEqual({ english: { introText: 'Welcome' } });
  });

  it('dla angielskiej realizacji tekst bazowy jest angielski, polski ląduje w tłumaczeniach', () => {
    const texts = resolveScenarioTextsForRealization(scenario, 'english');

    expect(texts.introText).toBe('Welcome');
    // Brak angielskich zasad: zostaje pole puste, a polska wersja jest w tłumaczeniach.
    expect(texts.gameRules).toBeNull();
    expect(texts.translations).toEqual({
      polish: { introText: 'Witajcie', gameRules: 'Zasady' },
    });
  });

  it('scenariusz bez tekstów nie daje nic do nadpisania', () => {
    const texts = resolveScenarioTextsForRealization(
      { introText: '', gameRules: '', translations: undefined },
      'polish',
    );

    expect(texts).toEqual({
      introText: null,
      gameRules: null,
      translations: null,
    });
  });
});
