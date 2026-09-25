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
import { noHaptics, type Haptics } from '../haptics';
import {
  Button,
  Card,
  APPEARANCES,
  DEFAULT_APPEARANCE,
  DEVICE_APPEARANCE,
  DISPLAY_SETTING_KEYS,
  DRAWN_DISPLAY_SETTINGS,
  EmptyState,
  Row,
  Screen,
  Select,
  Stack,
  Surface,
  Switch,
  Text,
  type Appearance,
  type DisplaySettingKey,
  type DisplaySettings,
} from '@irodora/ui';
import { PREFERENCE_SATURATION, preferenceWeight } from '@irodora/recommendation';
import { familyLabel } from '../corpus';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';
import type { DeviceTheme } from '../appearance';

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
  /**
   * Whether the theme list starts open.
   *
   * The same shape and the same reason as `initialConfirming` and ColourDetail's
   * `initialPanel`: a list that only opens on a tap is a list no suite can render, and the
   * options — including the phone's own colour, which is offered and refused on iOS — live
   * inside it.
   */
  readonly initialThemeListOpen?: boolean;
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
  /** The haptic port (F-206). Choosing a theme is a commit; scrolling past one is not. */
  readonly haptics?: Haptics;
  /**
   * The three display settings `15` draws, and how to change one (F-239).
   *
   * PROPS RATHER THAN THE HOOK, for a different reason from `appearance` above.
   * `useDisplaySettings()` does not throw outside its provider — it returns what `15` draws —
   * so a screen reading it would render perfectly and change nothing when a switch was tapped.
   * A missing writer is the failure that would be invisible; a missing prop is a type error.
   */
  readonly display?: DisplaySettings;
  readonly onChangeDisplaySetting?: (key: DisplaySettingKey, value: boolean) => void;
  /**
   * What came of asking the platform for its colour (F-154).
   *
   * A prop like the two above, for the same reason: `useAppearance()` throws outside its
   * provider and the conformance suite renders this screen without one. Absent means the
   * screen shows the unsupported state, which is the state every platform is in today.
   */
  readonly device?: DeviceTheme;
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

/**
 * Each choice → its label. Total, so a theme added to `DRAWN_THEMES` is a compile error here
 * rather than a blank row (F-225). The names are the ones `15` prints on its tiles.
 */
const APPEARANCE_KEYS = {
  sumi: 'appearance.theme.sumi',
  slate: 'appearance.theme.slate',
  obsidian: 'appearance.theme.obsidian',
  washi: 'appearance.theme.washi',
  system: 'appearance.system',
  device: 'appearance.device',
} as const satisfies Record<Appearance, MessageKey>;

/**
 * The catalogue's own union, narrowed from the string a `Select` hands back.
 *
 * Not a cast: `Select` speaks in strings, and an `as Appearance` would compile for a value that is
 * not one — which is how a theme nobody defined reaches the store. The list this narrows is built
 * from `APPEARANCES`, so the fallback is reachable only through a bug in that list.
 */
function asAppearance(value: string): Appearance {
  return APPEARANCES.find((choice) => choice === value) ?? DEFAULT_APPEARANCE;
}

/** What to say about the device colour, per outcome. Total, so a fourth kind is a compile error. */
const DEVICE_KEYS = {
  none: 'appearance.device.unsupported',
  refused: 'appearance.device.refused',
  applied: 'appearance.device.checked',
} as const satisfies Record<DeviceTheme['kind'], MessageKey>;

/**
 * The label `15` draws over each switch. Total, so a fourth setting cannot be added silently.
 *
 * Order comes from `DISPLAY_SETTING_KEYS` rather than from this object, and the two agree with
 * the mockup: tabular, haptics, provenance, top to bottom.
 */
const DISPLAY_KEYS = {
  tabularNumerals: 'settings.tabular',
  hapticOnSelection: 'settings.haptics',
  provenanceBadges: 'settings.provenance',
} as const satisfies Record<DisplaySettingKey, MessageKey>;

const signed = (net: number): string => (net > 0 ? `+${String(net)}` : String(net));

export function Preferences({
  store,
  initialConfirming = false,
  initialThemeListOpen = false,
  now = () => Date.now(),
  onBuildOutfit,
  appearance = DEFAULT_APPEARANCE,
  onChooseAppearance,
  haptics = noHaptics,
  device = { kind: 'none', why: 'unsupported' },
  display = DRAWN_DISPLAY_SETTINGS,
  onChangeDisplaySetting,
}: PreferencesProps): React.JSX.Element {
  const { t, locale, script } = useMessages();
  const [confirming, setConfirming] = useState(initialConfirming);
  const [themeListOpen, setThemeListOpen] = useState(initialThemeListOpen);
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
    <Screen title={t('settings.title')} script={script}>
      {/*
        APPEARANCE, FIRST (F-153). It is the only thing on this screen a person came here to
        change; everything below it is something the app learned and is reporting back.

        CHIPS RATHER THAN A SELECT, and that is an interim worth naming: `Select` is F-156 and
        does not exist yet. Chips are already registered in the conformance suite, already
        announce their selected state, and are honest about there being four of something —
        which is more than a control that does not exist can claim.
      */}
      <Card
        level="1"
        padding="md"
        header={
          <Text size="body" color="foreground" script={script} heading>
            {t('appearance.title')}
          </Text>
        }
      >
        <Stack gap="sm">
          {/*
            ONE LIST, AND IT IS INTERIM (F-225). Mockup 15 draws the four themes as tiles, which
            F-262 builds; until then the choices 15 offers are here, in 15's order, followed by the
            two FR-70 asks for that no mockup draws (E4): follow the phone, and the phone's colour.
            There is no light-or-dark control any more — each drawn theme already is one, and 15
            draws none.

            THE PHONE'S OWN COLOUR IS A DISABLED OPTION rather than an absent one, which is the
            same call F-154 made and for the same reason: a control that is not there cannot
            explain itself. Android 12 and later offer a colour; iOS offers none and never will.
          */}
          <Select
            open={themeListOpen}
            onOpenChange={setThemeListOpen}
            label={t('appearance.theme')}
            closeLabel={t('appearance.close')}
            script={script}
            value={appearance}
            options={APPEARANCES.map((choice) => ({
              value: choice,
              label: t(APPEARANCE_KEYS[choice]),
              ...(choice === DEVICE_APPEARANCE ? { disabled: device.kind !== 'applied' } : {}),
            }))}
            onValueChange={(choice) => {
              haptics.commit();
              // Narrowed rather than cast: a value that is not a choice is a bug in the option
              // list above, and it should not reach the store.
              onChooseAppearance?.(asAppearance(choice));
            }}
          />

          {/*
            WHAT CAME OF ASKING, in every case. A theme derived from a seed nobody chose is the
            one place in this product where a person cannot see the input, so the screen says
            what happened to it: unavailable, refused with the reason, or applied and CHECKED.
          */}
          <Text size="xs" color="foreground.2" script={script}>
            {t(DEVICE_KEYS[device.kind])}
          </Text>
          {device.kind === 'refused' ? (
            <Text size="xs" color="foreground.2" script={script}>
              {device.reason}
            </Text>
          ) : null}
          {device.kind === 'applied' && device.corrected > 0 ? (
            <Row gap="sm">
              <Text size="xs" color="foreground.2" script={script}>
                {t('appearance.device.corrected')}
              </Text>
              <Text size="xs" color="foreground.2" numeric>
                {String(device.corrected)}
              </Text>
            </Row>
          ) : null}

          {/*
            WHAT A THEME DOES, said on the screen rather than only in the manifest (F-225). The
            cards a colour sits on carry the theme's slight tint, which is what the colour is seen
            against (ADR-0111), and a person choosing a theme in a colour app deserves to know it.
          */}
          <Text size="xs" color="foreground.2" script={script}>
            {t('appearance.hint')}
          </Text>
        </Stack>
      </Card>

      {/*
        WHAT THE PLATFORM OWNS, said rather than left absent (F-180).

        Language follows the device locale and reduced motion follows the accessibility setting;
        neither has an in-app switch, and neither is going to get one — the platform already
        asked, and asking again is how two answers start disagreeing. An absence somebody has to
        infer is a worse state than one the screen names.

        HAPTICS ARE THE EXCEPTION, AND SUBORDINATE RATHER THAN PARALLEL (ADR-0104). `15` draws a
        haptics switch, so there is one; off means this app asks for nothing, on means it asks and
        the phone still decides. There is no state in which the two disagree and this app wins,
        which is the failure the paragraph above is about.
      */}
      <Text size="xs" color="foreground.2" script={script}>
        {t('settings.platform')}
      </Text>

      {/*
        THE ENGINE SECTION, WHICH IS THREE SWITCHES AND THE FIRST BOOLEANS THIS PRODUCT HAS
        (F-239). `15` draws them under a heading numbered "3."; the ordinal is a position in that
        mockup's section order and F-262 is the feature that puts the sections in it, so the
        number is not printed over the second card on today's screen.

        NO HAPTIC FIRES HERE, and the omission is deliberate rather than forgotten. F-206 names
        what a commit is — "a garment saved, a reading taken, a theme chosen" — and a preference
        switch is not on that list. The middle row makes the point by itself: a switch that
        buzzed to confirm being turned off would be answering with the thing it just refused.

        THE DOT BESIDE EACH TRACK is `15.engine.*.state`, drawn when the switch is on. The
        reading is argued in `Switch`'s `marker` prop, where the alternative is written down.
      */}
      <Card
        level="1"
        padding="md"
        header={
          <Text size="body" color="foreground" script={script} heading>
            {t('settings.engine')}
          </Text>
        }
      >
        <Stack gap="sm">
          {DISPLAY_SETTING_KEYS.map((key) => (
            <Switch
              key={key}
              testID={`display.${key}`}
              label={t(DISPLAY_KEYS[key])}
              checked={display[key]}
              marker
              script={script}
              onCheckedChange={(next) => {
                onChangeDisplaySetting?.(key, next);
              }}
            />
          ))}
        </Stack>
      </Card>

      {/*
        THE LEARNED PREFERENCES KEEP THEIR OWN NAME, one level down. This screen was TITLED
        "What the app has learned" while containing the appearance chooser — the name of one
        section over the whole thing, which is half of why the themes were reported missing.
      */}
      <Text size="title" color="foreground" script={script} heading>
        {t('preferences.title')}
      </Text>
      <Text size="small" color="foreground.2" script={script}>
        {t('preferences.origin')}
      </Text>

      {rows.length === 0 ? (
        /*
         * THE STATE MOST PEOPLE SEE FIRST. A blank list reads as a broken screen; this says what
         * would appear here and what puts it there.
         */
        <Surface
          /* surface-not-card: an EmptyState, or the route out of it. Both are the component, not a card around it. */
          level="1"
          padding="md"
        >
          {/*
            THE DESIGNED EMPTY STATE (F-152 criterion 2), and the union forced the interesting
            question. The hint says "keep or pass on an outfit and the pairing appears here",
            and that happens on ANOTHER screen — so this offers the route where the route
            exists, in the same two branches the Wardrobe uses and for the same reason. Both
            branches are registered subjects rather than one of them being assumed.
          */}
          {onBuildOutfit === undefined ? (
            <EmptyState
              art="pairing"
              message={t('preferences.empty')}
              hint={t('preferences.emptyHint')}
              script={script}
              resolvedHere
            />
          ) : (
            <EmptyState
              art="pairing"
              message={t('preferences.empty')}
              hint={t('preferences.emptyHint')}
              script={script}
              action={{ label: t('outfit.title'), onPress: onBuildOutfit }}
            />
          )}
        </Surface>
      ) : (
        <Card
          level="1"
          padding="md"
          header={
            <Text size="body" color="foreground" script={script} heading>
              {t('preferences.learned')}
            </Text>
          }
        >
          <Stack gap="sm">
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
        </Card>
      )}

      <Card
        level="1"
        padding="md"
        header={
          <Text size="body" color="foreground" script={script} heading>
            {t('preferences.resetTitle')}
          </Text>
        }
      >
        <Stack gap="sm">
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
      </Card>
    </Screen>
  );
}
