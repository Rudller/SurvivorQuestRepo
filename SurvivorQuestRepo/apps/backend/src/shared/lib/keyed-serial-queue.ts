/**
 * Kolejka w pamięci procesu: zadania z tym samym kluczem idą po kolei, z różnymi
 * — równolegle. Do „sprawdź, potem zapisz” wołanego z kilku tabletów naraz,
 * gdzie baza nie ma unikalnego indeksu, który rozstrzygnąłby wyścig.
 *
 * Zakłada jeden proces backendu (jeden kontener). Przy kilku instancjach trzeba
 * advisory lock w Postgresie.
 */
export class KeyedSerialQueue {
  private readonly tails = new Map<string, Promise<unknown>>();

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(task);
    const tail = current.catch(() => undefined);
    this.tails.set(key, tail);
    try {
      return await current;
    } finally {
      if (this.tails.get(key) === tail) {
        this.tails.delete(key);
      }
    }
  }
}
