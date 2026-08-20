/**
 * The English catalogue — **and the source of the key set** (ADR-0056).
 *
 * `MessageKey` is `keyof typeof en`, and `ja` is typed `Record<MessageKey, string>`. That is
 * the whole completeness mechanism: a **missing** key fails `tsc`, an **extra** key fails
 * `tsc`, and neither can be switched off by configuration.
 *
 * ADR-0028 forbids fallback, and fallback is the core behaviour of every mainstream runtime
 * i18n library — `fallbackLng` is a flag, and a guarantee that depends on a flag staying false
 * is a reminder, not a guarantee. This is the same move as `Provenance` on `Color`:
 * [[provenance-in-the-type-is-what-makes-honesty-structural]].
 *
 * ## Writing rules that are not style preferences
 *
 * **Prefer copy that does not inflect.** We have no ICU (ADR-0056's stated cost), so "2
 * colours" is written as a count beside a noun rather than as a pluralised sentence. That is a
 * constraint on the writing, not only on the code.
 *
 * **Say only what the system can demonstrate** (NFR-21, ADR-0031). The claims lint reads these
 * strings like any other source, so the banned overstatements fail the build here exactly as
 * they would in a component — as this very paragraph found out: its first draft quoted two of
 * them as examples and the lint rejected it, correctly, because a lint that trusted intent
 * would be trusting the thing it exists to check. claims-ok: names the rule without using a
 * banned construction; the phrases themselves live in claims.json, which is their one home.
 */

export const en = {
  'home.title': 'The engine is running on this device',
  'home.offline': 'Computed here, offline. Nothing was sent anywhere.',
  'colour.hex': 'Hex',
  'colour.coordinates': 'OKLCh',
  'colour.source': 'Source',
  'colour.difference': 'Difference',
  /** The unit is a name, not a claim — ΔE00 is a defined quantity, not an accuracy statement. */
  'colour.differenceUnit': 'ΔE00',
  'sample.indigo': 'Indigo',
  'sample.blueBlack': 'Blue-black',
} as const;

/** Every key the app may render. Derived, never listed twice. */
export type MessageKey = keyof typeof en;

/** Every key, as data — for the completeness and unused-key checks. */
export const MESSAGE_KEYS = Object.keys(en) as readonly MessageKey[];
