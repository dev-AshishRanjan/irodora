/**
 * Locale resolution and message lookup.
 *
 * ## No fallback, anywhere
 *
 * `t()` indexes a `Record<MessageKey, string>`, and `MessageKey` is derived from the English
 * catalogue — so there is no path that can return an English string for a Japanese locale.
 * That is ADR-0028's rule made structural rather than configured.
 *
 * ## The locale comes from the device, and is not persisted here
 *
 * `expo-localization` reports what the person set on their phone. An in-session override
 * exists for the settings surface; **persisting it belongs to `@irodora/store` (F-041)**,
 * because storage does, and inventing a second store here would be the thing ADR-0051 §5
 * warns about.
 */

import { getLocales } from 'expo-localization';
import { en, type MessageKey } from './en';
import { ja } from './ja';

/** The locales that ship. Both from the first release; neither is a fallback for the other. */
export const LOCALES = ['en', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];

const CATALOGUES: Readonly<Record<Locale, Readonly<Record<MessageKey, string>>>> = { en, ja };

/**
 * Pick a locale from what the device reports.
 *
 * Exported and pure so the decision is testable at its real inputs — an empty list, an
 * unsupported language, a regional variant — rather than by mocking a platform module and
 * then testing the mock.
 *
 * **Matches on the language subtag.** `ja-JP` and `ja` are the same language to us; a device
 * set to Japanese must not fall through to English because of a region we did not enumerate.
 */
export function resolveLocale(
  tags: readonly (string | null | undefined)[],
  override?: Locale,
): Locale {
  if (override !== undefined) return override;
  for (const tag of tags) {
    if (typeof tag !== 'string' || tag === '') continue;
    const language = tag.split('-')[0]?.toLowerCase();
    const match = LOCALES.find((l) => l === language);
    if (match !== undefined) return match;
  }
  // Neither supported language was requested. English is the DEFAULT, not a fallback for a
  // missing Japanese string — there is no such thing here, because ja is total by type.
  return 'en';
}

/** The device's preference, in order. */
export function deviceLocale(override?: Locale): Locale {
  return resolveLocale(
    getLocales().map((l) => l.languageTag),
    override,
  );
}

/** Look up a message. Total by construction: every key exists in every catalogue. */
export function t(locale: Locale, key: MessageKey): string {
  return CATALOGUES[locale][key];
}

export { en, type MessageKey } from './en';
export {
  ja,
  IDENTICAL_BY_DESIGN,
  JA_REVIEWED,
  NOTATION_KEYS,
  NOTATION_MAX,
  NOTATION_SHAPE,
} from './ja';
export { MESSAGE_KEYS } from './en';
