import {
  RISK_DIFFICULTY_OPTIONS,
  type RiskCategory,
  type RiskDifficulty,
  type RiskScheme,
} from "../types/risk-quiz";

function polishPoolNoun(count: number) {
  if (count === 1) return "pula";
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? "pule" : "pul";
}

type PoolSummary = {
  categoryName: string;
  difficulty: RiskDifficulty;
  tasks: number;
  cards: number;
};

/**
 * Karty w puli: w talii realizacji faktyczne wiersze RiskCard, w szablonie z
 * biblioteki liczba, którą realizacja dostanie przy generowaniu kart.
 */
export function riskCategoryCardCount(category: RiskCategory, difficulty: RiskDifficulty) {
  return category.cardCounts?.[difficulty] ?? category.cardCodes?.cardsPerPool ?? 0;
}

export function riskCategoryTaskCount(category: RiskCategory, difficulty: RiskDifficulty) {
  return category.poolStations.filter((item) => item.difficulty === difficulty).length;
}

/**
 * Ile kart QR ma talia i ile z nich da się zagrać. Gra ogranicza się do
 * fizycznych kart, więc to ta liczba (a nie suma zadań) startuje na tablecie
 * jako „Zostało kart”. Pula z mniejszą liczbą zadań niż kart kończy się na
 * zadaniach — stąd ostrzeżenia.
 */
export function RiskDeckSummary({ scheme }: { scheme: RiskScheme }) {
  const pools: PoolSummary[] = scheme.schemeCategories.flatMap(({ category }) =>
    RISK_DIFFICULTY_OPTIONS.map(({ value: difficulty }) => ({
      categoryName: category.name,
      difficulty,
      tasks: riskCategoryTaskCount(category, difficulty),
      cards: riskCategoryCardCount(category, difficulty),
    })),
  );

  const totalCards = pools.reduce((sum, pool) => sum + pool.cards, 0);
  const playable = pools.reduce((sum, pool) => sum + Math.min(pool.cards, pool.tasks), 0);
  // Pula bez zadań to zwykle celowo nieużywany poziom — jedna zbiorcza linia
  // zamiast osobnego ostrzeżenia dla każdej, żeby nie zagłuszyła tych ważnych.
  const shortPools = pools.filter((pool) => pool.tasks > 0 && pool.tasks < pool.cards);
  const emptyPoolCount = pools.filter((pool) => pool.tasks === 0 && pool.cards > 0).length;
  const categoryCount = scheme.schemeCategories.length;
  const cardCounts = new Set(pools.map((pool) => pool.cards));
  const uniformCardsPerPool = cardCounts.size === 1 ? pools[0]?.cards : undefined;
  const difficultyLabel = (difficulty: RiskDifficulty) =>
    RISK_DIFFICULTY_OPTIONS.find((option) => option.value === difficulty)?.label.toLowerCase() ?? difficulty;

  if (categoryCount === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <p className="text-sm text-zinc-100">
        <strong className="text-amber-200">{totalCards} kart QR</strong>
        {uniformCardsPerPool !== undefined ? (
          <span className="text-zinc-400">
            {" "}
            ({categoryCount} {categoryCount === 1 ? "kategoria" : "kategorii"} × 3 poziomy × {uniformCardsPerPool})
          </span>
        ) : null}
      </p>
      <p className="text-xs text-zinc-400">
        Na tablecie gra startuje od <strong className="text-zinc-200">{playable}</strong> kart — drużyna w każdej puli
        odpowiada najwyżej tyle razy, ile jest w niej kart.
      </p>
      {emptyPoolCount > 0 ? (
        <p className="text-xs text-amber-300">
          {emptyPoolCount} {polishPoolNoun(emptyPoolCount)} bez zadań — ich karty nic nie wylosują.
        </p>
      ) : null}
      {shortPools.length > 0 ? (
        <ul className="space-y-0.5 text-xs text-amber-300">
          {shortPools.map((pool) => (
            <li key={`${pool.categoryName}:${pool.difficulty}`}>
              {pool.categoryName} – {difficultyLabel(pool.difficulty)}: {pool.tasks} zadań na {pool.cards} kart, zagra się
              tylko {pool.tasks}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Jedna linijka pod nazwą kategorii: zadania i karty na każdym poziomie. */
export function RiskCategoryPoolCounts({ category }: { category: RiskCategory }) {
  return (
    <p className="text-xs text-zinc-500">
      {RISK_DIFFICULTY_OPTIONS.map(({ value: difficulty, label }) => {
        const tasks = riskCategoryTaskCount(category, difficulty);
        const cards = riskCategoryCardCount(category, difficulty);
        return (
          <span key={difficulty} className={tasks < cards ? "text-amber-300" : undefined}>
            {difficulty !== "EASY" ? " · " : null}
            {label}: {tasks} zad. / {cards} kart
          </span>
        );
      })}
    </p>
  );
}
