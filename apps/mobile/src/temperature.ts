/**
 * The warm–cool relation in words (ADR-0151 D4, ADR-0155 D3): 07's harmony row and 08's contrast line
 * read one set, keyed by the outfit harmony component's own direction (`warmCoolRelation`), so the
 * two pages can never word one relation two ways. The keys keep 07's names (F-248).
 */

import type { ExplanationDirection } from '@irodora/recommendation';
import type { MessageKey } from './i18n';

/** A relation, as the harmony component's direction states it. */
export type HarmonyRelation = ExplanationDirection;

/** The relation's words: *Shared Temperature · Mixed Temperature · Warm Against Cool*. */
export const HARMONY_KEYS = {
  supports: 'wear.harmony.supports',
  neutral: 'wear.harmony.neutral',
  opposes: 'wear.harmony.opposes',
} as const satisfies Record<HarmonyRelation, MessageKey>;
