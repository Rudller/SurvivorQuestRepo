// Ryzykanci have no separate "Zasady gry" field — the mobile app skips the
// post-start rules popup for them (see
// apps/mobile/src/features/onboarding/model/game-rules.ts), so the intro text
// shown on the waiting screen carries the whole briefing. New realizations of
// that type start from this text instead of an empty box.
//
// The numbers here mirror RISK_DIFFICULTY_POINTS and the streak multiplier in
// apps/backend/src/modules/risk-quiz/risk-quiz.constants.ts — the multiplier is
// 1 + 0.25 × (streak − 1) capped at 2, so it only kicks in from the second
// correct answer in a row. Keep them in step if the scoring ever changes.
export const RYZYKANCI_DEFAULT_INTRO_TEXT = `Gra polega na tym, że sami decydujecie, jak duże ryzyko podejmujecie. Im trudniejsze pytanie wybierzecie, tym więcej możecie zyskać — i tym więcej stracić.

**JAK GRAMY**
- Na stole leżą karty z kodami QR, pogrupowane w kategorie i trzy poziomy trudności.
- Wybieracie kartę i skanujecie jej kod tabletem.
- Dostajecie pytanie z tej kategorii i o tej trudności.
- Odpowiadacie albo pasujecie, a potem wracacie po kolejną kartę.

**PUNKTY**
- Łatwe: **+10** za poprawną odpowiedź, **−5** za błędną
- Średnie: **+20** / **−10**
- Trudne: **+30** / **−15**
- Pas liczy się dokładnie tak samo jak błędna odpowiedź.

**SERIA**
- Druga poprawna odpowiedź z rzędu to **×1,25**, trzecia **×1,5**, czwarta **×1,75**, piąta i każda kolejna **×2**.
- Mnożnik działa wyłącznie na punkty dodatnie. Kara zawsze jest pełna.
- Jeden błąd albo jeden pas zeruje serię.

**WAŻNE**
- Każde pytanie możecie rozwiązać tylko raz.
- Gdy wyczerpiecie pulę w danej kategorii i trudności, tablet o tym powie — bierzcie wtedy kartę z innej.
- Wygrywa drużyna z największą liczbą punktów na koniec gry.

Powodzenia.`;
