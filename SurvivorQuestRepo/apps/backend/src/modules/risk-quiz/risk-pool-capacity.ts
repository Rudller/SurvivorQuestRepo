import { RiskDifficulty } from '@prisma/client';

/**
 * Ile odpowiedzi drużyna może dać w jednej puli (kategoria + poziom).
 *
 * Gra ogranicza się do fizycznych kart, nie do zadań: 10 wydrukowanych kart
 * "Historia — łatwe" to 10 losowań, nawet jeśli w puli jest 11 zadań. Zadań
 * może też być mniej niż kart — wtedy pula kończy się na zadaniach, bo tego
 * samego zadania drużyna drugi raz nie dostanie.
 */
export function riskPoolCapacity(cards: number, tasks: number): number {
  return Math.max(0, Math.min(cards, tasks));
}

export function riskPoolKey(
  categoryId: string,
  difficulty: RiskDifficulty,
): string {
  return `${categoryId}:${difficulty}`;
}

export function countByRiskPool(
  rows: { categoryId: string; difficulty: RiskDifficulty }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = riskPoolKey(row.categoryId, row.difficulty);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export type RiskPoolCapacity = {
  categoryId: string;
  difficulty: RiskDifficulty;
  cards: number;
  tasks: number;
  capacity: number;
};

/** Pojemność każdej puli, w której jest choć jedna karta albo zadanie. */
export function buildRiskPoolCapacities(input: {
  cards: { categoryId: string; difficulty: RiskDifficulty }[];
  poolStations: { categoryId: string; difficulty: RiskDifficulty }[];
}): RiskPoolCapacity[] {
  const cardsByKey = countByRiskPool(input.cards);
  const tasksByKey = countByRiskPool(input.poolStations);
  const pools = new Map<
    string,
    { categoryId: string; difficulty: RiskDifficulty }
  >();
  for (const row of [...input.cards, ...input.poolStations]) {
    pools.set(riskPoolKey(row.categoryId, row.difficulty), {
      categoryId: row.categoryId,
      difficulty: row.difficulty,
    });
  }

  return [...pools.entries()].map(([key, pool]) => {
    const cards = cardsByKey.get(key) ?? 0;
    const tasks = tasksByKey.get(key) ?? 0;
    return { ...pool, cards, tasks, capacity: riskPoolCapacity(cards, tasks) };
  });
}
