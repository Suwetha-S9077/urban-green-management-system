/**
 * Tiny in-memory cache with per-key TTL. Concurrent callers share one in-flight load,
 * so an expensive aggregation runs once even if many requests arrive together.
 * Failed loads are never cached.
 */
export class TtlCache {
  private readonly store = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
  private readonly ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  getOrLoad<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > now) return hit.value as Promise<T>;

    const value = loader();
    this.store.set(key, { expiresAt: now + this.ttlMs, value });
    value.catch(() => {
      this.store.delete(key);
    });
    return value;
  }
}
