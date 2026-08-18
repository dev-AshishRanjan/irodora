/**
 * The cache port.
 *
 * Valkey in every profile today, but the interface is what the application depends on, so
 * swapping it is a deployment decision rather than a refactor (ADR-0001, NFR-18).
 *
 * The contract is deliberately small. A cache with a rich interface becomes a database with
 * eviction, and then losing it stops being survivable — which is the one property a cache
 * has to keep.
 */

/** Time-to-live in seconds. There is no "cache forever": an entry nobody expires is a leak with good manners. */
export type TtlSeconds = number;

export interface CachePort {
  /** `undefined` for a miss. A miss is not an error — it is the normal case on a cold start. */
  get(key: string): Promise<string | undefined>;

  set(key: string, value: string, ttlSeconds: TtlSeconds): Promise<void>;

  delete(key: string): Promise<void>;

  /**
   * Set only if absent. Returns whether this caller won.
   *
   * This is the primitive behind **idempotency keys**, and it is the reason the port cannot be
   * `get` + `set`: doing it in two calls is a race that shows up as a duplicate wardrobe item
   * on a flaky mobile network.
   *
   * It used to say "and rate limits" as well. That was wrong, and F-015 found it while trying
   * to build one — see `increment`.
   */
  setIfAbsent(key: string, value: string, ttlSeconds: TtlSeconds): Promise<boolean>;

  /**
   * Add one to a counter and return the new value, creating it at 1 if absent.
   *
   * **This exists because `setIfAbsent` cannot express a rate limiter.** The two look like the
   * same kind of primitive and are not:
   *
   * - Idempotency is *claim once*. `setIfAbsent` answers it atomically, in one call.
   * - A limiter is a *counter*. `setIfAbsent` + `get` + `set` is a read-modify-write across
   *   three round trips, and two concurrent requests both read `n` and both write `n + 1`.
   *
   * The failure direction is what makes it unacceptable rather than merely imprecise: the
   * limiter **under-counts**, so it admits more than its limit — silently, and precisely under
   * the concurrency a limiter exists for. A rate limiter that under-enforces is worse than none,
   * because it reports a protection it does not provide.
   *
   * ## The TTL applies to the window, not to each call
   *
   * `ttlSeconds` sets the expiry **when the counter is created** and must not extend it on
   * subsequent increments. A limiter whose window slides forward on every request never resets
   * under sustained load, so a client that keeps knocking stays locked out forever — which turns
   * a throttle into a ban nobody chose.
   *
   * Returning the **new** value rather than void is what lets a caller decide in one round trip;
   * returning void would put a `get` back in the path and reintroduce the race one layer up.
   */
  increment(key: string, ttlSeconds: TtlSeconds): Promise<number>;

  /** Liveness of the backing store, for `/readyz`. Must not throw — it answers a question. */
  ping(): Promise<boolean>;
}
