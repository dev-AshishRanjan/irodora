/**
 * The banned claim constructions, compiled once (F-221).
 *
 * `claims.json` holds the patterns as data (ADR-0031). The claims lint reads them over source
 * lines; F-221's fidelity run reads them over the text a captured screen rendered, where a figure
 * and a label written apart in the source become one claim on the screen. Two readers compiling
 * the patterns two ways would disagree about the same sentence — so both compile them here, with
 * the one flag the lint has always used: case-insensitive, matched within a single line of text.
 *
 * The jest sweep reads the same file from TypeScript; `apps/mobile`'s claims test holds it to this
 * module's answers over the lint's own fixtures (drawn, variants, near-misses), so the three
 * readers cannot drift apart unnoticed.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Where the patterns live. */
export const CLAIMS = join(ROOT, '.harness/verification/claims.json');

/**
 * `claims.json`, parsed. It throws when the file is missing or holds no banned construction: a
 * check over an empty pattern set reports zero findings, and zero findings from nothing is the
 * failure this gate exists to prevent.
 */
export function loadClaims(path = CLAIMS) {
  if (!existsSync(path)) throw new Error(`claims: ${path} is missing`);
  const config = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(config.banned) || config.banned.length === 0)
    throw new Error('claims: no banned constructions are defined');
  return config;
}

/** Each banned construction with its expression, compiled the one way. */
export function compileBanned(banned) {
  return banned.map((b) => ({
    id: b.id,
    why: b.why,
    pattern: b.pattern,
    re: new RegExp(b.pattern, 'i'),
  }));
}

/** The constructions one line of text contains, in `claims.json`'s order. */
export function bannedIn(text, compiled) {
  return compiled.filter((b) => b.re.test(text));
}
