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
import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Button, Screen, Surface, Text } from '@irodora/ui';
import { PREFERENCE_SATURATION, preferenceWeight } from '@irodora/recommendation';
import { familyLabel } from '../corpus';
import { useMessages } from '../i18n/useMessages';

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

const signed = (net: number): string => (net > 0 ? `+${String(net)}` : String(net));

export function Preferences({
  store,
  initialConfirming = false,
  now = () => Date.now(),
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
      <Text size="small" color="foreground.2" script={script}>
        {t('preferences.origin')}
      </Text>

      {rows.length === 0 ? (
        /*
         * THE STATE MOST PEOPLE SEE FIRST. A blank list reads as a broken screen; this says what
         * would appear here and what puts it there.
         */
        <Surface level="1" padding="lg">
          <View style={{ gap: nativeSpacing.xs }}>
            <Text size="body" color="foreground" script={script}>
              {t('preferences.empty')}
            </Text>
            <Text size="small" color="foreground.2" script={script}>
              {t('preferences.emptyHint')}
            </Text>
          </View>
        </Surface>
      ) : (
        <Surface level="1" padding="lg">
          <View style={{ gap: nativeSpacing.md }}>
            <Text size="body" color="foreground" script={script} heading>
              {t('preferences.learned')}
            </Text>
            <Text size="xs" color="foreground.2" script={script}>
              {`${t('preferences.formula')} ${String(PREFERENCE_SATURATION)}`}
            </Text>

            {rows.map((row) => (
              <View
                key={`${row.familyA}|${row.familyB}`}
                style={{ gap: nativeSpacing.xs }}
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
              </View>
            ))}
          </View>
        </Surface>
      )}

      <Surface level="1" padding="lg">
        <View style={{ gap: nativeSpacing.sm }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('preferences.resetTitle')}
          </Text>

          {confirming ? (
            <View style={{ gap: nativeSpacing.sm }}>
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
              <View style={{ flexDirection: 'row', gap: nativeSpacing.sm }}>
                <Button
                  label={t('preferences.resetCancel')}
                  variant="secondary"
                  onPress={() => {
                    setConfirming(false);
                  }}
                />
                <Button
                  label={t('preferences.resetDo')}
                  onPress={() => {
                    store.resetPreferences(now());
                    setConfirming(false);
                    setVersion((v) => v + 1);
                  }}
                />
              </View>
            </View>
          ) : (
            <View style={{ gap: nativeSpacing.xs }}>
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
              />
            </View>
          )}
        </View>
      </Surface>
    </Screen>
  );
}
