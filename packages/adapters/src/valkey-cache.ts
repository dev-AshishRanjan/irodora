/**
 * The Valkey adapter.
 *
 * Valkey is the BSD-licensed Redis fork and speaks the same protocol, so an ioredis client
 * talks to it unchanged — without the SSPL question.
 */

import type { CachePort, TtlSeconds } from '@irodora/ports';
// Named import, not default. ioredis 6 ships the class as a named export; the default is a
// namespace object, so `import Redis from 'ioredis'` typechecks as a namespace and fails at
// `new Redis(...)` with "not constructable".
import { Redis } from 'ioredis';

export interface ValkeyOptions {
  readonly url: string;
  /** Short by design: `/readyz` is polled on a schedule, and a probe that hangs has already failed. */
  readonly connectTimeoutMillis?: number;
  /** Bounds a command that is waiting on a connection that is not coming back. */
  readonly commandTimeoutMillis?: number;
}

export class ValkeyCache implements CachePort {
  readonly #client: Redis;

  constructor(options: ValkeyOptions) {
    const timeout = options.connectTimeoutMillis ?? 2000;

    this.#client = new Redis(options.url, {
      connectTimeout: timeout,
      // Do not retry forever inside a command. Readiness is the mechanism that reports a
      // cache being away; a command that retries indefinitely turns that into a hung request.
      maxRetriesPerRequest: 1,
      // Bounded, so a command during a real outage fails fast instead of waiting on the
      // queue below.
      commandTimeout: options.commandTimeoutMillis ?? timeout,
      // Connect on construction rather than lazily, so a bad URL surfaces at boot rather
      // than on the first user request.
      lazyConnect: false,
      // Left ENABLED, deliberately, and this was found the hard way: with the offline queue
      // off, any command issued before the socket finishes connecting fails immediately with
      // "Stream isn't writeable". `/readyz` is polled from the moment the process starts, so
      // the very first probe would report the cache unavailable while it was perfectly
      // healthy — and an orchestrator would hold traffic off a container that was ready.
      //
      // The queue is what makes a command wait for the connection instead of failing at it;
      // `commandTimeout` is what stops it waiting forever.
      enableOfflineQueue: true,
    });

    // ioredis emits 'error' on every reconnect attempt. Unhandled, an EventEmitter 'error'
    // takes the process down — so a cache blip would become a crash loop, which is exactly
    // what readiness exists to avoid.
    this.#client.on('error', () => undefined);
  }

  async get(key: string): Promise<string | undefined> {
    // `?? undefined`, not a truthiness check: an empty string is a stored value, and reading
    // it as a miss silently disables caching for every empty response.
    const value = await this.#client.get(key);
    return value ?? undefined;
  }

  async set(key: string, value: string, ttlSeconds: TtlSeconds): Promise<void> {
    if (ttlSeconds <= 0) {
      // Valkey rejects EX 0. A zero TTL means "already expired", so the honest translation
      // is to store nothing rather than to store it forever.
      await this.#client.del(key);
      return;
    }

    await this.#client.set(key, value, 'EX', Math.ceil(ttlSeconds));
  }

  async delete(key: string): Promise<void> {
    await this.#client.del(key);
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: TtlSeconds): Promise<boolean> {
    if (ttlSeconds <= 0) return false;

    // SET NX EX in ONE command. Doing this as GET then SET is a race, and it is the race
    // behind a duplicate wardrobe item created by a mobile retry.
    const result = await this.#client.set(key, value, 'EX', Math.ceil(ttlSeconds), 'NX');
    return result === 'OK';
  }

  async increment(key: string, ttlSeconds: TtlSeconds): Promise<number> {
    if (ttlSeconds <= 0) {
      // Consistent with `set`: Valkey rejects EX 0, and a zero TTL means "already expired".
      // Counting into a key that must not persist would leave an immortal counter behind.
      await this.#client.del(key);
      return 0;
    }

    // INCR is atomic and creates the key at 1 — that is the whole reason this method exists
    // rather than being GET then SET, which two concurrent requests both win.
    const value = await this.#client.incr(key);

    // Expire ONLY on creation. `INCR` does not set a TTL, and calling EXPIRE unconditionally
    // would slide the window forward on every request, so a client under sustained load would
    // never see it reset — a throttle silently becoming a permanent ban.
    //
    // `value === 1` is the create signal, and it is exact: INCR returns 1 only when the key was
    // absent. A key that expired between requests also returns 1, which is correct — that is a
    // new window.
    if (value === 1) await this.#client.expire(key, Math.ceil(ttlSeconds));

    return value;
  }

  async ping(): Promise<boolean> {
    try {
      // The command RESOLVING is the signal — ioredis types the reply as the literal 'PONG',
      // so comparing against it is a tautology the type-aware lint correctly rejects. What
      // matters is that the server answered within the command timeout.
      await this.#client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.#client.quit();
    } catch {
      this.#client.disconnect();
    }
  }
}
