/**
 * Wire scalars.
 *
 * ## When a scalar may be branded
 *
 * A brand makes two strings that mean different things un-swappable, which is exactly what
 * you want for a slug and an opaque cursor. But a branded type is NOT assignable from a
 * plain `string`, and `packages/color-*` declares its types in plain TypeScript because
 * NFR-3 forbids it a runtime dependency on Zod — so it can never name our brands.
 *
 * The rule that follows, and it is not obvious until it bites:
 *
 * > **Brand a wire scalar only where the colour engine has no counterpart type for it.**
 *
 * `slug`, `hex`, `requestId` and `cursor` exist only on the wire, so they are branded.
 * `confidence` and the version strings appear inside `Provenance` and
 * `ReproducibilityEnvelope`, so they are constrained but NOT branded — branding them would
 * break the compile-time identity assertions in `color.ts`, which are the only thing
 * keeping the engine type and the wire schema from drifting apart.
 */

import { z } from 'zod';

/** A stable, URL-safe identifier for a corpus entry. Lowercase kebab, never generated from user input at read time. */
export const slugSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'A slug is lowercase alphanumeric segments joined by single hyphens.',
  )
  .brand<'Slug'>();

/**
 * `#RRGGBB`. Case is accepted as it arrives and NOT normalised here — normalisation is a
 * colour-engine concern, and a transform in this layer would make the schema
 * unrepresentable as JSON Schema, breaking the OpenAPI leg.
 */
export const hexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'A hex colour is # followed by exactly six hexadecimal digits.')
  .brand<'Hex'>();

/** The correlation id echoed on every response and present in every log line. */
export const requestIdSchema = z.string().min(1).max(64).brand<'RequestId'>();

/**
 * A published corpus version, e.g. `2026.08.1`. Deliberately unbranded: it is
 * `ReproducibilityEnvelope.corpus`, and the engine declares that field as a plain string.
 */
export const corpusVersionSchema = z
  .string()
  .regex(
    /^\d{4}\.\d{2}\.\d+$/,
    'A corpus version is YYYY.MM.N — the month it was published and its sequence within that month.',
  );

/** Semantic version of the engine that produced a result. Unbranded, for the same reason as `corpusVersionSchema`. */
export const semanticVersionSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
    'A semantic version is MAJOR.MINOR.PATCH with an optional pre-release.',
  );

/**
 * `[0,1]`. A bounded quality signal from stated inputs — NOT a probability (ADR-0005).
 * Unbranded so it stays assignable to `Provenance.confidence`.
 */
export const unitIntervalSchema = z.number().min(0).max(1);

/** The two locales the product supports from day one (ADR-0028). Not open-ended: a missing translation is a build failure, not a fallback. */
export const localeSchema = z.enum(['en', 'ja']);

/**
 * Text that must exist in both locales. Both required — an optional `ja` would let a
 * half-translated entry through the contract and be discovered by a Japanese reader.
 */
export const localizedTextSchema = z.object({
  en: z.string().min(1),
  ja: z.string().min(1),
});

export type Slug = z.infer<typeof slugSchema>;
export type Hex = z.infer<typeof hexSchema>;
export type RequestId = z.infer<typeof requestIdSchema>;
export type CorpusVersion = z.infer<typeof corpusVersionSchema>;
export type SemanticVersion = z.infer<typeof semanticVersionSchema>;
export type UnitInterval = z.infer<typeof unitIntervalSchema>;
export type Locale = z.infer<typeof localeSchema>;
export type LocalizedText = z.infer<typeof localizedTextSchema>;
