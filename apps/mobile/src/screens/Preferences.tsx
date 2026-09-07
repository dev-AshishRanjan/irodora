/**
 * Preferences — what the app has learned, in the numbers it learned it from (FR-37, F-109).
 *
 * ## The counts are the surface, not the weight
 *
 * F-046 stored **counts** rather than a float precisely so the number would stay explicable.
 * A screen showing only `1.19×` would turn an inspectable mechanism back into an opaque one and
 * undo that decision at the last step — so every row shows accepted, rejected, the net, and the
 * weight, and the weight is rendered as *the result of the numbers beside it*.
 *
 * The net is shown because `preferenceWeight` is a pure function of it. Without it, two rows
 * with different counts and an identical weight look like a bug rather than the point.
 *
 * ## The weight is imported, never recomputed
 *
 * `preferenceWeight` comes from `@irodora/recommendation`. A local copy of *"linear to
 * saturation, then flat"* would drift from the engine and the drift would be invisible: both
 * numbers would look plausible, and the one on this screen would be the one a person checked by
 * hand (E-008's shape).
 *
 * ## Colour is never the only channel
 *
 * A leaning is naturally a bar or a tint. Here it is **words and numbers first** — the direction
 * is in the text, and nothing is encoded in colour alone (golden rule 13).
 *
 * ## Every dynamic string is a LABEL beside a VALUE, never a sentence with a number in it
 *
 * `t()` takes a key and returns a string; there is no interpolation, because ADR-0056 made the
 * catalogue enumerated TypeScript rather than a runtime i18n framework. Composing sentences
 * from fragments is the classic way that breaks in Japanese, where the word order is not
 * English's. So the pattern here is `label` + `value` — *"Accepted 5"*, 「採用 5」 — which
 * reads correctly in both because it is not a sentence at all.
 */

import { useMemo, useState } from 'react';
import {
  Button,
  Chip,
  DEFAULT_APPEARANCE,
  EmptyState,
  Row,
  Screen,
  Stack,
  Surface,
  Text,
  type Appearance,
} from '@irodora/ui';
import { THEME_FAMILIES, type ThemeFamily } from '@irodora/design-tokens';
import { PREFERENCE_SATURATION, preferenceWeight } from '@irodora/recommendation';
import { familyLabel } from '../corpus';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** What this screen needs from the repository — nothing more, so a test can supply it. */
export interface PreferenceStore {
  listPreferences(): readonly {
    readonly familyA: string;
    readonly familyB: string;
    readonly accepted: number;
    readonly rejected: number;
  }[];
  resetPreferences(now: number): void;
}

export interface PreferencesProps {
  readonly store: PreferenceStore;
  /** Injected so a conformance subject can render the confirmation without tapping. */
  readonly initialConfirming?: boolean;
  readonly now?: () => number;
  /**
   * Where an outfit gets built. Supplied by the route; absent in the conformance suite.
   *
   * Optional rather than required, and the empty state renders differently without it — a
   * button that navigates nowhere is worse than a sentence that explains.
   */
  readonly onBuildOutfit?: () => void;
  /**
   * The chosen appearance and how to change it (F-153).
   *
   * PROPS RATHER THAN THE HOOK, deliberately. `useAppearance()` throws outside its provider,
   * and the conformance suite renders this screen without one — a screen that reached for the
   * context itself could not be checked by the suite where the accessibility guarantees are
   * actually verified. The route reads the hook and passes the two values down.
   */
  readonly appearance?: Appearance;
  readonly onChooseAppearance?: (next: Appearance) => void;
}

/** Two decimal places: the weight is a multiplier a person is meant to be able to check. */
const asMultiplier = (weight: number): string => `${weight.toFixed(2)}×`;

/**
 * The family's published word, or the stored slug if the vocabulary has no row for it.
 *
 * `familyLabel` THROWS on an unknown family, deliberately: the content gate guarantees every
 * family a published entry uses is in the vocabulary, so a miss there means two generations of
 * content shipped together. That guarantee is about ENTRIES, and these are PREFERENCES — user
 * data recorded against whatever the corpus said at the time.
 *
 * So a republished corpus that retires a family would, without this, make the whole screen
 * throw and take the other rows with it. Degrading one row to its slug is the smaller loss, and
 * the slug is still recognisable enough for somebody deciding whether to reset.
 */
const familyWordOr = (family: string, locale: 'en' | 'ja'): string => {
  try {
    return familyLabel(family, locale);
  } catch {
    return family;
  }
};

/** Family → its label. Total, so a fifth theme is a compile error rather than a blank chip. */
const FAMILY_KEYS = {
  base: 'appearance.family.base',
  fuka: 'appearance.family.fuka',
  yama: 'appearance.family.yama',
  aota: 'appearance.family.aota',
} as const satisfies Record<ThemeFamily, MessageKey>;

/** The three answers to "light or dark", in the order they are offered. */
const MODES = ['system', 'light', 'dark'] as const;

const MODE_KEYS = {
  system: 'appearance.mode.system',
  light: 'appearance.mode.light',
  dark: 'appearance.mode.dark',
} as const satisfies Record<(typeof MODES)[number], MessageKey>;

const signed = (net: number): string => (net > 0 ? `+${String(net)}` : String(net));

export function Preferences({
  store,
  initialConfirming = false,
  now = () => Date.now(),
  onBuildOutfit,
  appearance = DEFAULT_APPEARANCE,
  onChooseAppearance,
}: PreferencesProps): React.JSX.Element {
  const { t, locale, script } = useMessages();
  const [confirming, setConfirming] = useState(initialConfirming);
  const [version, setVersion] = useState(0);

  const rows = useMemo(() => {
    void version; // re-read after a reset
    const familyWord = (family: string): string => familyWordOr(family, locale);
    return store.listPreferences().map((p) => ({
      ...p,
      net: p.accepted - p.rejected,
      weight: preferenceWeight({ accepted: p.accepted, rejected: p.rejected }),
      label: `${familyWord(p.familyA)} · ${familyWord(p.familyB)}`,
    }));
  }, [store, locale, version]);

  return (
    <Screen title={t('preferences.title')} script={script}>
      {/*
        APPEARANCE, FIRST (F-153). It is the only thing on this screen a person came here to
        change; everything below it is something the app learned and is reporting back.

        CHIPS RATHER THAN A SELECT, and that is an interim worth naming: `Select` is F-156 and
        does not exist yet. Chips are already registered in the conformance suite, already
        announce their selected state, and are honest about there being four of something —
        which is more than a control that does not exist can claim.
      */}
      <Surface level="1" padding="lg">
        <Stack gap="md">
          <Text size="body" color="foreground" script={script} heading>
            {t('appearance.title')}
          </Text>

          <Text size="label" color="foreground.2" script={script}>
            {t('appearance.theme')}
          </Text>
          <Row gap="sm" wrap>
            {THEME_FAMILIES.map((family) => (
              <Chip
                key={family}
                label={t(FAMILY_KEYS[family])}
                selected={family === appearance.family}
                script={script}
                onPress={() => {
                  onChooseAppearance?.({ ...appearance, family });
                }}
              />
            ))}
          </Row>

          <Text size="label" color="foreground.2" script={script}>
            {t('appearance.mode')}
          </Text>
          <Row gap="sm" wrap>
            {MODES.map((mode) => (
              <Chip
                key={mode}
                label={t(MODE_KEYS[mode])}
                selected={mode === appearance.mode}
                script={script}
                onPress={() => {
                  onChooseAppearance?.({ ...appearance, mode });
                }}
              />
            ))}
          </Row>

          {/*
            WHAT A THEME DOES NOT DO, said on the screen rather than only in the manifest. The
            ground a colour is judged against is never tinted, and a person choosing a theme in
            a colour-measurement app deserves to know that before they wonder.
          */}
          <Text size="xs" color="foreground.2" script={script}>
            {t('appearance.hint')}
          </Text>
        </Stack>
      </Surface>

      <Text size="small" color="foreground.2" script={script}>
        {t('preferences.origin')}
      </Text>

      {rows.length === 0 ? (
        /*
         * THE STATE MOST PEOPLE SEE FIRST. A blank list reads as a broken screen; this says what
         * would appear here and what puts it there.
         */
        <Surface level="1" padding="lg">
          {/*
            THE DESIGNED EMPTY STATE (F-152 criterion 2), and the union forced the interesting
            question. The hint says "keep or pass on an outfit and the pairing appears here",
            and that happens on ANOTHER screen — so this offers the route where the route
            exists, in the same two branches the Wardrobe uses and for the same reason. Both
            branches are registered subjects rather than one of them being assumed.
          */}
          {onBuildOutfit === undefined ? (
            <EmptyState
              message={t('preferences.empty')}
              hint={t('preferences.emptyHint')}
              script={script}
              resolvedHere
            />
          ) : (
            <EmptyState
              message={t('preferences.empty')}
              hint={t('preferences.emptyHint')}
              script={script}
              action={{ label: t('outfit.title'), onPress: onBuildOutfit }}
            />
          )}
        </Surface>
      ) : (
        <Surface level="1" padding="lg">
          <Stack gap="md">
            <Text size="body" color="foreground" script={script} heading>
              {t('preferences.learned')}
            </Text>
            <Text size="xs" color="foreground.2" script={script}>
              {`${t('preferences.formula')} ${String(PREFERENCE_SATURATION)}`}
            </Text>

            {rows.map((row) => (
              <Stack
                key={`${row.familyA}|${row.familyB}`}
                gap="xs"
                /*
                 * GROUPED ON PURPOSE. The counts are meaningless without the pairing they
                 * belong to, so a screen reader that announced "Kept 5, Passed 2" as its own
                 * element would be reading a number with no subject. `accessible` makes the two
                 * lines one stop; the role is what the conformance suite requires of anything
                 * that becomes a focusable element, and `text` is what this is.
                 */
                accessible
                accessibilityRole="text"
                accessibilityLabel={[
                  row.label,
                  `${t('preferences.accepted')} ${String(row.accepted)}`,
                  `${t('preferences.rejected')} ${String(row.rejected)}`,
                  `${t('preferences.weight')} ${asMultiplier(row.weight)}`,
                ].join(', ')}
              >
                <Text size="body" color="foreground" script={script}>
                  {row.label}
                </Text>
                {/*
                  THE COUNTS AND THE WEIGHT TOGETHER, in that order. The weight is last because
                  it is derived from what precedes it, so a reader going left to right meets the
                  evidence before the conclusion.
                */}
                <Text size="small" color="foreground.2" script={script}>
                  {[
                    `${t('preferences.accepted')} ${String(row.accepted)}`,
                    `${t('preferences.rejected')} ${String(row.rejected)}`,
                    `${t('preferences.net')} ${signed(row.net)}`,
                    `${t('preferences.weight')} ${asMultiplier(row.weight)}`,
                  ].join(' · ')}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Surface>
      )}

      <Surface level="1" padding="lg">
        <Stack gap="sm">
          <Text size="body" color="foreground" script={script} heading>
            {t('preferences.resetTitle')}
          </Text>

          {confirming ? (
            <Stack gap="sm">
              {/*
                THE QUESTION NAMES THE COUNT. This is the only thing between a tap and an
                irreversible delete, so it says what goes rather than asking "are you sure".
              */}
              <Text size="body" color="foreground" script={script}>
                {`${t('preferences.resetCount')} ${String(rows.length)}`}
              </Text>
              <Text size="small" color="foreground" script={script}>
                {t('preferences.resetIrreversible')}
              </Text>
              <Row gap="sm">
                <Button
                  label={t('preferences.resetCancel')}
                  variant="secondary"
                  onPress={() => {
                    setConfirming(false);
                  }}
                  script={script}
                />
                <Button
                  label={t('preferences.resetDo')}
                  onPress={() => {
                    store.resetPreferences(now());
                    setConfirming(false);
                    setVersion((v) => v + 1);
                  }}
                  script={script}
                />
              </Row>
            </Stack>
          ) : (
            <Stack gap="xs">
              <Text size="small" color="foreground.2" script={script}>
                {t('preferences.resetHint')}
              </Text>
              <Button
                label={t('preferences.reset')}
                variant="secondary"
                disabled={rows.length === 0}
                onPress={() => {
                  setConfirming(true);
                }}
                script={script}
              />
            </Stack>
          )}
        </Stack>
      </Surface>
    </Screen>
  );
}
