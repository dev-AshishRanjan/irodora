/**
 * In-memory blob store adapter. Runs the same conformance suite an S3 adapter will.
 */

import type { BlobMetadata, BlobStorePort } from '../blob.js';

interface StoredBlob {
  readonly body: Uint8Array;
  readonly contentType: string;
}

export class InMemoryBlobStore implements BlobStorePort {
  readonly deleteIsIdempotent = true as const;
  readonly #blobs = new Map<string, StoredBlob>();

  put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    // Copied, not referenced. A caller reusing its buffer would otherwise mutate stored
    // bytes — and the S3 adapter cannot behave that way, so neither may this one.
    this.#blobs.set(key, { body: Uint8Array.from(body), contentType });
    return Promise.resolve();
  }

  get(key: string): Promise<Uint8Array | undefined> {
    const blob = this.#blobs.get(key);
    return Promise.resolve(blob ? Uint8Array.from(blob.body) : undefined);
  }

  head(key: string): Promise<BlobMetadata | undefined> {
    const blob = this.#blobs.get(key);
    return Promise.resolve(
      blob ? { key, size: blob.body.byteLength, contentType: blob.contentType } : undefined,
    );
  }

  delete(key: string): Promise<void> {
    this.#blobs.delete(key);
    return Promise.resolve();
  }

  ping(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
