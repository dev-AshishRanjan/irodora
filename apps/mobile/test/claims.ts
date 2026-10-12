/**
 * The banned claim constructions, read the way the claims lint reads them (F-221, ADR-0134 D3).
 *
 * `scripts/claims-patterns.mjs` compiles `claims.json` for the lint and for the fidelity run:
 * case-insensitive, matched within one line of text. This is the same rule in the test runner,
 * which cannot import a root script, and `claims.test.ts` holds it to the lint's own fixtures in
 * both directions, so the two readers cannot drift apart unnoticed.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Banned {
  readonly id: string;
  readonly pattern: string;
  readonly re: RegExp;
}

const CLAIMS = join(__dirname, '../../../.harness/verification/claims.json');

/** Every banned construction, compiled the lint's way. Throws over an empty or missing set. */
export function loadBanned(): readonly Banned[] {
  const config = JSON.parse(readFileSync(CLAIMS, 'utf8')) as {
    banned?: readonly { id: string; pattern: string }[];
  };
  const banned = config.banned ?? [];
  if (banned.length === 0) throw new Error('claims.json defines no banned construction');
  return banned.map((b) => ({ id: b.id, pattern: b.pattern, re: new RegExp(b.pattern, 'i') }));
}

/** The constructions one line of text contains. */
export function bannedIn(text: string, banned: readonly Banned[]): readonly Banned[] {
  return banned.filter((b) => b.re.test(text));
}
