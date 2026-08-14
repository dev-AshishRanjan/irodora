/**
 * The blob store port.
 *
 * S3-compatible everywhere — MinIO locally, the VPS provider's object storage, S3 in the
 * cloud profile. Wardrobe images live here under envelope encryption (F-042); this port
 * moves opaque bytes and knows nothing about that.
 */

export interface BlobMetadata {
  readonly key: string;
  readonly size: number;
  readonly contentType: string;
}

export interface BlobStorePort {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;

  /** `undefined` when absent — distinguishable from an empty object, which is a legitimate stored value. */
  get(key: string): Promise<Uint8Array | undefined>;

  head(key: string): Promise<BlobMetadata | undefined>;

  delete(key: string): Promise<void>;

  /**
   * Deleting something that is not there succeeds.
   *
   * Stated on the interface rather than left to each adapter, because DSR erasure (F-035)
   * retries, and an adapter that throws on a second delete turns a completed erasure into a
   * failed job — which then looks like data that was not erased.
   */
  readonly deleteIsIdempotent: true;

  ping(): Promise<boolean>;
}
