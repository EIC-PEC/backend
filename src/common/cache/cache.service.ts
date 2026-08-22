import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly tagIndex = new Map<string, Set<string>>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Background garbage collection sweep every 60 seconds
    this.cleanupInterval = setInterval(() => this.purgeExpired(), 60000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Retrieve cached value if exists and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.invalidate(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL and optional tag grouping
   */
  set<T>(key: string, value: T, ttlSeconds = 300, tags: string[] = []): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt, tags });

    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  /**
   * Stale-While-Revalidate / Cache-Aside pattern
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
    tags: string[] = [],
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await factory();
    this.set(key, fresh, ttlSeconds, tags);
    return fresh;
  }

  /**
   * Invalidate a single key
   */
  invalidate(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
      this.store.delete(key);
    }
  }

  /**
   * Invalidate all keys matching a prefix (e.g. 'cms:')
   */
  invalidatePrefix(prefix: string): void {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.invalidate(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.debug(`Purged ${count} cached keys matching prefix: "${prefix}"`);
    }
  }

  /**
   * Invalidate all keys associated with a specific tag
   */
  invalidateTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (keys) {
      for (const key of Array.from(keys)) {
        this.store.delete(key);
      }
      this.tagIndex.delete(tag);
      this.logger.debug(`Purged cache tag: "${tag}"`);
    }
  }

  /**
   * Clear entire cache
   */
  flush(): void {
    this.store.clear();
    this.tagIndex.clear();
    this.logger.log('Global in-memory cache flushed.');
  }

  /**
   * Purge all expired entries
   */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.invalidate(key);
      }
    }
  }
}
