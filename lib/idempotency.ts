interface IdempotencyStoreOptions {
  ttlMs: number;
  maximumEntries: number;
}

interface IdempotencyEntry {
  expiresAt: number;
  fingerprint: string;
  result: Promise<unknown>;
}

export type IdempotencyRunResult<T> =
  | { status: "completed"; value: T; replayed: boolean }
  | { status: "conflict" };

export class InMemoryIdempotencyStore {
  private readonly entries = new Map<string, IdempotencyEntry>();
  private readonly maximumEntries: number;
  private readonly ttlMs: number;

  constructor({ ttlMs, maximumEntries }: IdempotencyStoreOptions) {
    if (ttlMs < 1 || maximumEntries < 1) {
      throw new Error("Idempotency store values must be positive.");
    }

    this.ttlMs = ttlMs;
    this.maximumEntries = maximumEntries;
  }

  async run<T>(
    key: string,
    fingerprint: string,
    operation: () => Promise<T>,
    shouldRetain: (value: T) => boolean = () => true,
  ): Promise<IdempotencyRunResult<T>> {
    const now = Date.now();
    this.removeExpiredEntries(now);
    const existingEntry = this.entries.get(key);

    if (existingEntry) {
      if (existingEntry.fingerprint !== fingerprint) {
        return { status: "conflict" };
      }

      return {
        status: "completed",
        value: (await existingEntry.result) as T,
        replayed: true,
      };
    }

    this.makeRoomForEntry();
    const result = operation();
    this.entries.set(key, {
      expiresAt: now + this.ttlMs,
      fingerprint,
      result,
    });

    try {
      const value = await result;
      if (!shouldRetain(value)) {
        this.entries.delete(key);
      }
      return { status: "completed", value, replayed: false };
    } catch (error) {
      this.entries.delete(key);
      throw error;
    }
  }

  private makeRoomForEntry(): void {
    if (this.entries.size < this.maximumEntries) {
      return;
    }

    const oldestKey = this.entries.keys().next().value;
    if (typeof oldestKey === "string") {
      this.entries.delete(oldestKey);
    }
  }

  private removeExpiredEntries(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}
