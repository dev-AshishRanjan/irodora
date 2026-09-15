/**
 * The seasonal summary's words (F-223, ADR-0102).
 *
 * One catalogue key per season and modifier pair, typed so that a pair with no key — or a key for a
 * pair the engine cannot produce — fails `typecheck` in both locales at once (ADR-0056).
 *
 * The summary itself is computed on read from a profile by `@irodora/recommendation`'s
 * `summariseSeason` over the published rule; this module only says which words name its answer.
 */

import {
  summariseSeason,
  type ModifierId,
  type PersonalProfile,
  type SeasonalRules,
  type SeasonalSummary,
  type SeasonId,
} from '@irodora/recommendation';
import type { MessageKey } from '../i18n/en';
import { seasonalRules } from '../rules';

/**
 * A profile's seasonal summary, by the published rule — the one way the app gets a label.
 *
 * Computed on every read and never stored: a saved profile has no field for it, so a label cannot
 * outlive a corrected range or stand in for one (ADR-0102). `rules` is for tests; the app passes
 * nothing and gets the published rule.
 */
export const seasonalSummary = (
  profile: PersonalProfile,
  rules: SeasonalRules = seasonalRules(),
): SeasonalSummary => summariseSeason(profile, rules);

export const SEASON_LABEL_KEYS = {
  spring: {
    light: 'profile.season.spring.light',
    deep: 'profile.season.spring.deep',
    bright: 'profile.season.spring.bright',
    muted: 'profile.season.spring.muted',
    warm: 'profile.season.spring.warm',
    cool: 'profile.season.spring.cool',
  },
  summer: {
    light: 'profile.season.summer.light',
    deep: 'profile.season.summer.deep',
    bright: 'profile.season.summer.bright',
    muted: 'profile.season.summer.muted',
    warm: 'profile.season.summer.warm',
    cool: 'profile.season.summer.cool',
  },
  autumn: {
    light: 'profile.season.autumn.light',
    deep: 'profile.season.autumn.deep',
    bright: 'profile.season.autumn.bright',
    muted: 'profile.season.autumn.muted',
    warm: 'profile.season.autumn.warm',
    cool: 'profile.season.autumn.cool',
  },
  winter: {
    light: 'profile.season.winter.light',
    deep: 'profile.season.winter.deep',
    bright: 'profile.season.winter.bright',
    muted: 'profile.season.winter.muted',
    warm: 'profile.season.winter.warm',
    cool: 'profile.season.winter.cool',
  },
} as const satisfies Record<SeasonId, Record<ModifierId, MessageKey>>;

/** The catalogue key that names a season and modifier pair. */
export const seasonLabelKey = (season: SeasonId, modifier: ModifierId): MessageKey =>
  SEASON_LABEL_KEYS[season][modifier];
