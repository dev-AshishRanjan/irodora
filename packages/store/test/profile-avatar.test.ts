/**
 * The avatar mockup `23` draws, in the encrypted database (F-241, FR-26, NFR-13).
 *
 * ## What this file can say, and what it cannot
 *
 * `node:sqlite` has no SQLCipher, so — exactly as `garment-image.test.ts` states — **nothing
 * here is evidence about encryption**. What it proves is that the bytes round-trip through a
 * real BLOB, that the metadata reads without loading one, that a replacement replaces, and that
 * forgetting the profile forgets the picture. The encryption is F-041's standing attestation.
 *
 * ## The assertion this file exists for
 *
 * A photograph of a person outliving the profile it belonged to is the worst version of the
 * defect `deleteProfile`'s own comment describes: `profile_avatar` declares `ON DELETE CASCADE`,
 * a cascade fires on a DELETE, and every removal in this store is an UPDATE. So the cascade is
 * a backstop and the tombstone is the mechanism — and the test below would pass on the cascade
 * alone only if the store started hard-deleting, which it does not.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import { createRepository, ingestImage, StoreError, uuidv7 } from '../src/index.js';
import { ARCHIVE_TABLES } from '../src/archive.js';
import { SYNC_TABLES } from '../src/schema.js';
import type { Driver, NewPersonalProfile, ProfileDimension, Repository } from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-profile-avatar-'));
let n = 0;
/** Every repository this file opened, so the teardown can close them all. */
const opened: Repository[] = [];
const open = (): { repo: Repository; driver: Driver } => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  const repo = createRepository(driver, info);
  opened.push(repo);
  return { repo, driver };
};

afterAll(() => {
  // CLOSED BEFORE REMOVED. Windows refuses to delete a file SQLite still holds open, and a
  // teardown that throws turns a green suite red for a reason that has nothing to do with it.
  for (const repo of opened) repo.close();
  rmSync(dir, { recursive: true, force: true });
});

const NOW = 1_760_000_000_000;

/** Total over `ProfileDimension`, so a new dimension is a compile error here rather than a gap. */
const every = <T>(value: T): Readonly<Record<ProfileDimension, T>> => ({
  lightness: value,
  temperature: value,
  chroma: value,
  contrast: value,
  neutrals: value,
  accents: value,
  avoid: value,
});

const profile = (id: string): NewPersonalProfile => ({
  id,
  method: 'guided',
  lightness: { min: 0.4, max: 0.72 },
  temperatureBias: 0.33,
  chroma: { min: 0.03, max: 0.15 },
  contrast: 'medium',
  confidence: every(0.6),
  origin: every('derived'),
  neutrals: ['ai-nezumi'],
  accents: ['beni-hi'],
  avoid: ['kariyasu'],
});

const be32 = (v: number): number[] => [
  (v >>> 24) & 0xff,
  (v >>> 16) & 0xff,
  (v >>> 8) & 0xff,
  v & 0xff,
];
const ascii = (s: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 1) out.push(s.charCodeAt(i));
  return out;
};
const chunk = (type: string, body: number[]): number[] => [
  ...be32(body.length),
  ...ascii(type),
  ...body,
  0,
  0,
  0,
  0,
];
/** A PNG carrying an `eXIf` chunk, so "the EXIF was stripped" is an assertion that can fail. */
const pngBytes = (width = 480, height = 480): Uint8Array =>
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk('IHDR', [...be32(width), ...be32(height), 0x08, 0x02, 0x00, 0x00, 0x00]),
    ...chunk('eXIf', [0xde, 0xad, 0xbe, 0xef]),
    ...chunk('IDAT', [0x78, 0x9c, 0x63, 0x00]),
    ...chunk('IEND', []),
  ]);

const withProfile = (): { repo: Repository; driver: Driver; id: string } => {
  const { repo, driver } = open();
  const id = uuidv7();
  repo.saveProfile(profile(id), NOW);
  return { repo, driver, id };
};

describe('a picture in the database', () => {
  it('round-trips through a real BLOB, byte for byte', () => {
    const { repo, id } = withProfile();
    const image = ingestImage(pngBytes());
    repo.putProfileAvatar(id, image, NOW + 1);

    const back = repo.getProfileAvatar(id);
    expect(back).toBeDefined();
    expect(Array.from(back ?? [])).toStrictEqual(Array.from(image.bytes));
  });

  it('strips the EXIF on the way in', () => {
    // The fixture HAS an eXIf chunk, which is what makes this able to fail. A library
    // photograph's EXIF carries the coordinates it was taken at, and on a picture of a person
    // that is the location of a person.
    const original = pngBytes();
    const { repo, id } = withProfile();
    repo.putProfileAvatar(id, ingestImage(original), NOW + 1);

    const stored = repo.getProfileAvatar(id) ?? new Uint8Array();
    const marker = ascii('eXIf');
    const has = (bytes: Uint8Array): boolean =>
      Array.from(bytes).some((_, i) => marker.every((c, k) => bytes[i + k] === c));
    expect(has(original)).toBe(true);
    expect(has(stored)).toBe(false);
  });

  it('reports the picture without loading it', () => {
    const { repo, id } = withProfile();
    repo.putProfileAvatar(id, ingestImage(pngBytes(320, 200)), NOW + 1);

    expect(repo.getProfileAvatarInfo(id)).toStrictEqual({
      byteLength: expect.any(Number) as number,
      width: 320,
      height: 200,
      format: 'png',
    });
  });

  it('replaces rather than accumulates', () => {
    const { repo, driver, id } = withProfile();
    repo.putProfileAvatar(id, ingestImage(pngBytes(640, 480)), NOW + 1);
    repo.putProfileAvatar(id, ingestImage(pngBytes(800, 600)), NOW + 2);

    expect(repo.getProfileAvatarInfo(id)?.width).toBe(800);
    const rows = driver.query<{ n: number }>('SELECT COUNT(*) AS n FROM profile_avatar', []);
    expect(rows[0]?.n).toBe(1);
  });

  it('is absent until one is chosen, and absent again once it is cleared', () => {
    const { repo, id } = withProfile();
    expect(repo.getProfileAvatar(id)).toBeUndefined();
    expect(repo.getProfileAvatarInfo(id)).toBeUndefined();

    repo.putProfileAvatar(id, ingestImage(pngBytes()), NOW + 1);
    expect(repo.getProfileAvatarInfo(id)).toBeDefined();

    repo.clearProfileAvatar(id, NOW + 2);
    expect(repo.getProfileAvatar(id)).toBeUndefined();
    expect(repo.getProfileAvatarInfo(id)).toBeUndefined();
  });

  it('names the profile when there is none, rather than surfacing a constraint error', () => {
    const { repo } = open();
    expect(() => {
      repo.putProfileAvatar('not-a-profile', ingestImage(pngBytes()), NOW);
    }).toThrow(StoreError);
  });
});

describe('forgetting the profile forgets the face', () => {
  it('tombstones the avatar when the profile is deleted', () => {
    /*
     * THE ASSERTION THIS FILE EXISTS FOR. `ON DELETE CASCADE` is declared on the table and does
     * NOT fire here, because `deleteProfile` tombstones with an UPDATE — so this passes only if
     * the removal is written out, which is the same shape `profile_dimension_color` needed.
     */
    const { repo, id } = withProfile();
    repo.putProfileAvatar(id, ingestImage(pngBytes()), NOW + 1);
    expect(repo.getProfileAvatarInfo(id)).toBeDefined();

    repo.deleteProfile(id, NOW + 2);
    expect(repo.getProfileAvatar(id)).toBeUndefined();
    expect(repo.getProfileAvatarInfo(id)).toBeUndefined();
  });

  it('DECOY — a second profile keeps its own picture', () => {
    // Without this, "deleting removes it" would also pass for an implementation that removed
    // every avatar in the database, which is a different and much worse behaviour.
    const { repo } = open();
    const kept = uuidv7();
    const gone = uuidv7();
    repo.saveProfile(profile(kept), NOW);
    repo.saveProfile(profile(gone), NOW);
    repo.putProfileAvatar(kept, ingestImage(pngBytes(100, 100)), NOW + 1);
    repo.putProfileAvatar(gone, ingestImage(pngBytes(200, 200)), NOW + 1);

    repo.deleteProfile(gone, NOW + 2);
    expect(repo.getProfileAvatarInfo(kept)?.width).toBe(100);
    expect(repo.getProfileAvatarInfo(gone)).toBeUndefined();
  });

  it('records the removal in the change log, so a future sync can tell it from never-existed', () => {
    const { repo, driver, id } = withProfile();
    repo.putProfileAvatar(id, ingestImage(pngBytes()), NOW + 1);
    repo.clearProfileAvatar(id, NOW + 2);

    const rows = driver.query<{ op: string }>(
      "SELECT op FROM change_log WHERE table_name = 'profile_avatar' ORDER BY seq",
      [],
    );
    expect(rows.map((r) => r.op)).toStrictEqual(['insert', 'delete']);
  });
});

describe('what the archive carries, stated rather than discovered', () => {
  /*
   * THE DECISION F-241's THIRD CRITERION SENDS TO THE SECURITY REVIEWER.
   *
   * The archive is plaintext JSON on purpose — "a backup the user cannot read is not a backup
   * they own" — and `garment_image` is already in it. Migration 8 draws the line: a SETTING is
   * not part of an export because it is not something the person made, and an avatar is. This
   * test is where that decision is visible rather than implied by a list somebody has to read.
   */
  it('carries the avatar, beside the garment photographs it already carried', () => {
    expect(SYNC_TABLES).toContain('profile_avatar');
    expect(ARCHIVE_TABLES).toContain('profile_avatar');
    expect(ARCHIVE_TABLES).toContain('garment_image');
  });

  it('DECOY — it does not carry a setting, which is the line the two sit either side of', () => {
    expect(SYNC_TABLES as readonly string[]).not.toContain('setting');
    expect(ARCHIVE_TABLES as readonly string[]).not.toContain('setting');
  });
});
