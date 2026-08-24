/**
 * The hook a screen uses to read copy.
 *
 * Returns `t` bound to the resolved locale, plus the locale itself — screens need the latter
 * to pick the Japanese type scale, because leading differs by script and a single line-height
 * for both is a layout only ever checked in one language.
 */

import { useMemo } from 'react';
import { deviceLocale, t, type Locale } from './index';
import type { MessageKey } from './en';

export interface Messages {
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
  /** `latin` or `japanese` — the script the type scale must use for this locale. */
  readonly script: 'latin' | 'japanese';
}

export function useMessages(override?: Locale): Messages {
  return useMemo(() => {
    const locale = deviceLocale(override);
    return {
      locale,
      t: (key: MessageKey) => t(locale, key),
      script: locale === 'ja' ? 'japanese' : 'latin',
    };
  }, [override]);
}
