/**
 * The Japanese catalogue.
 *
 * `Record<MessageKey, string>` — so a missing key and an extra key are both `tsc` failures,
 * and neither needs a script that someone has to remember to wire into a gate.
 *
 * ## Translated is not the same as reviewed, and the gap is recorded rather than hidden
 *
 * ADR-0028 and the `i18n-copy` skill both forbid shipping machine translation without review
 * by a competent speaker. **OQ-5 — the engagement model for a Japanese editorial reviewer — is
 * open**, and it already blocks F-012 for the same reason.
 *
 * So the mechanism ships now and the *quality* is declared outstanding: every entry carries a
 * review status against a roster id ([ADR-0047](../../../../docs/adr/0047-editorial-identity-is-a-roster-id-not-a-name.md)),
 * the unreviewed count is asserted and printed by the test, and F-017 carries the
 * corresponding **attested** criterion. What must never happen is *"a missing translation
 * fails the build"* quietly becoming *"an unreviewed translation passes silently."*
 */

import type { MessageKey } from './en';

export const ja: Record<MessageKey, string> = {
  'home.title': 'このデバイスでエンジンが動作しています',
  'home.offline': 'ここで計算しました。どこにも送信していません。',
  'colour.hex': '16進',
  'colour.coordinates': 'OKLCh',
  'colour.source': '出典',
  'colour.difference': '色差',
  'colour.differenceUnit': 'ΔE00',
  'sample.indigo': '藍',
  'sample.blueBlack': '藍墨茶',
};

/**
 * Values that are legitimately identical in both languages.
 *
 * Without this list, "no ja value equals its en value" would be the check that catches a
 * copy-paste placeholder — and it would also flag these, which are notation rather than prose.
 * The list is explicit and short **by design**: every entry is a place the check is switched
 * off, so it must be short enough to read.
 */
export const IDENTICAL_BY_DESIGN: readonly MessageKey[] = [
  'colour.coordinates',
  'colour.differenceUnit',
];

/**
 * Which entries a competent speaker has reviewed, by roster id.
 *
 * Empty until OQ-5 closes. The test asserts the count is reported, not that it is zero —
 * asserting zero would mean the mechanism could never ship, and asserting nothing would let
 * "unreviewed" become invisible.
 */
export const JA_REVIEWED: Readonly<Partial<Record<MessageKey, string>>> = {};
