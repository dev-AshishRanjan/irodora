/**
 * Guided setup — twelve comparisons, then a profile the person can correct (FR-26, FR-30).
 *
 * ## No camera, and that is a feature rather than a limitation
 *
 * [ADR-0010](../../../docs/adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md) §2 makes
 * the swatch path the **primary** one, not the fallback: it is deterministic, it is private,
 * and it works for somebody who does not want to photograph their face. Nothing in this file
 * or in [`../profile/`](../profile/dimensions.ts) imports a camera module, and
 * `test/profile.test.ts` asserts that over the source with a decoy — because "we did not add
 * one" is a promise and an import scan is a check.
 *
 * ## The screen decides nothing about what the answers mean
 *
 * Which pole a trial's option represents, how agreement becomes confidence, what a range is
 * padded by — all of it is [`../profile/derive.ts`](../profile/derive.ts). This file renders
 * two swatches and records which one was tapped. A screen that re-stated any of it would be
 * the second copy, and the one nobody would be looking at when they drifted.
 *
 * ## Colour is never the only channel
 *
 * Every option carries the entry's **name** beside its swatch, so the choice is legible to
 * somebody who cannot separate the two colours — which is the population this whole screen is
 * asking a question of. Confidence is a sentence, not a colour. Selection is a checkmark and a
 * border, which is `Swatch`'s own guarantee.
 *
 * ## What the copy may not say
 *
 * That this is a measurement, or that it takes any particular number of seconds. It is an
 * estimate from twelve forced choices, the summary says so, and `CONFIDENCE_UNANIMOUS` caps
 * what any dimension can claim at 0.75 (ADR-0031, golden rule 11).
 */

import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Chip, Surface, Swatch, Text, useTheme } from '@irodora/ui';
import { PROFILE_DIMENSIONS, uuidv7, type ProfileDimension } from '@irodora/store';
import { colorFor, entryBySlug } from '../corpus';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';
import { applyDerivation, setDimension, type Profile } from '../profile/dimensions';
import { CONFIDENCE_MAJORITY, CONFIDENCE_NONE, deriveProfile, isComplete } from '../profile/derive';
import { TRIALS, type Trial, type TrialAnswer, type TrialOption } from '../profile/trials';
import { activeProfile, toWorking, type ProfileStore } from '../profile/store';

/**
 * Dimension → catalogue key. Total, so an eighth dimension is a compile error, not a blank row.
 *
 * Exported so `screens.test.tsx` can assert every dimension REACHES the summary without
 * retyping seven strings. What that check catches is a missing row, not a wrong label — the
 * label is the catalogue's own business, and `i18n.test.ts` is what checks it exists in both
 * languages.
 */
export const DIMENSION_KEYS = {
  lightness: 'profile.dim.lightness',
  temperature: 'profile.dim.temperature',
  chroma: 'profile.dim.chroma',
  contrast: 'profile.dim.contrast',
  neutrals: 'profile.dim.neutrals',
  accents: 'profile.dim.accents',
  avoid: 'profile.dim.avoid',
} as const satisfies Record<ProfileDimension, MessageKey>;

/**
 * The lightness bands a person can set the range to, in OKLCh L.
 *
 * Discrete rather than a slider: the corpus already speaks in `dark · mid · light`
 * (`taxonomy.lightnessBand`), the person has met those words in the Atlas, and a two-thumbed
 * range control is the kind of thing that works on a design and not under a thumb.
 *
 * The bands OVERLAP, which is deliberate — a lightness range is a preference, not a partition,
 * and neighbouring bands sharing ground is what lets "mid" and "light" both be reasonable
 * answers for the same person.
 */
const LIGHTNESS_BANDS = [
  { key: 'profile.band.dark', range: { min: 0.15, max: 0.45 } },
  { key: 'profile.band.mid', range: { min: 0.35, max: 0.7 } },
  { key: 'profile.band.light', range: { min: 0.6, max: 0.95 } },
  { key: 'profile.band.wide', range: { min: 0.15, max: 0.95 } },
] as const satisfies readonly { key: MessageKey; range: { min: number; max: number } }[];

/** Chroma tolerance, as a ceiling. Every band starts at zero: nobody is intolerant of grey. */
const CHROMA_BANDS = [
  { key: 'profile.chromaBand.low', range: { min: 0, max: 0.05 } },
  { key: 'profile.chromaBand.mid', range: { min: 0, max: 0.1 } },
  { key: 'profile.chromaBand.high', range: { min: 0, max: 0.2 } },
] as const satisfies readonly { key: MessageKey; range: { min: number; max: number } }[];

const TEMPERATURE_STEPS = [
  { key: 'profile.temp.cool', bias: -1 },
  { key: 'profile.temp.leansCool', bias: -1 / 3 },
  { key: 'profile.temp.leansWarm', bias: 1 / 3 },
  { key: 'profile.temp.warm', bias: 1 },
] as const satisfies readonly { key: MessageKey; bias: number }[];

const CONTRAST_STEPS = [
  { key: 'profile.contrast.low', value: 'low' },
  { key: 'profile.contrast.medium', value: 'medium' },
  { key: 'profile.contrast.high', value: 'high' },
] as const satisfies readonly { key: MessageKey; value: 'low' | 'medium' | 'high' }[];

/**
 * Which band chip reads as selected.
 *
 * **By the range's midpoint, not by equality.** A derived range is 0.46 … 0.79 and equals no
 * band exactly, so an equality test would leave every chip unselected on the screen a person
 * first sees — which reads as broken rather than as "this was derived". The midpoint answers
 * "which of these is closest to what you have", which is the question the chips are asking.
 */
function nearestBand<T extends { readonly range: { readonly min: number; readonly max: number } }>(
  bands: readonly T[],
  current: { readonly min: number; readonly max: number },
): T | undefined {
  const middle = (current.min + current.max) / 2;
  return bands.reduce<T | undefined>((best, band) => {
    if (best === undefined) return band;
    const gap = (b: T): number => Math.abs((b.range.min + b.range.max) / 2 - middle);
    return gap(band) < gap(best) ? band : best;
  }, undefined);
}

/** Confidence → the sentence that explains where it came from. Never a number, never a colour. */
function confidenceKey(value: number): MessageKey {
  if (value === CONFIDENCE_NONE) return 'profile.confidence.none';
  if (value <= CONFIDENCE_MAJORITY) return 'profile.confidence.split';
  return 'profile.confidence.agreed';
}

export interface ProfileSetupProps {
  /**
   * Where the profile is written. Required, never defaulted — a default that quietly did not
   * persist would look identical to one that did until the person reopened the app.
   */
  readonly store: ProfileStore;
  /**
   * Answers to start from, so the summary half of this screen is reachable in a test.
   *
   * The comparison branch and the summary branch render almost disjoint trees, and a suite
   * that can only reach the first is checking a screen nobody has finished.
   */
  readonly initialAnswers?: readonly TrialAnswer[];
}

export function ProfileSetup({ store, initialAnswers }: ProfileSetupProps): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script } = useMessages();

  const existing = activeProfile(store);
  const [answers, setAnswers] = useState<readonly TrialAnswer[]>(initialAnswers ?? []);
  /*
   * The id is held in state so finishing the comparisons a second time UPDATES this device's
   * profile rather than leaving two. It reuses the stored one where there is one, which is
   * what makes `applyDerivation`'s latch reach a profile from a previous session.
   */
  const [id] = useState<string>(() => existing?.id ?? uuidv7());
  const [corrections, setCorrections] = useState<Profile | null>(() =>
    existing === null ? null : toWorking(existing),
  );
  const [saved, setSaved] = useState(false);

  const complete = isComplete(answers);
  /*
   * The derivation runs on every render and is a pure function of the answers, so there is no
   * cached profile that can disagree with what is on screen. `applyDerivation` then puts the
   * person's corrections back on top — which is the only place criterion 4 is implemented.
   */
  const derived = deriveProfile(id, answers);
  const profile = corrections === null ? derived : applyDerivation(corrections, derived);

  const answer = (trial: Trial, option: TrialOption): void => {
    setAnswers((previous) => [
      ...previous.filter((a) => a.trialId !== trial.id),
      { trialId: trial.id, pole: option.pole },
    ]);
    setSaved(false);
  };

  /** Any correction invalidates the confirmation: "saved" must describe what is on screen now. */
  const correct = (next: Profile): void => {
    setCorrections(next);
    setSaved(false);
  };

  const save = (): void => {
    store.saveProfile(profile, Date.now());
    setSaved(true);
  };

  const answered = answers.length;
  const current = TRIALS.find((trial) => !answers.some((a) => a.trialId === trial.id));

  function Option({ trial, option }: { trial: Trial; option: TrialOption }) {
    const entries = option.slugs.flatMap((slug) => {
      const found = entryBySlug(slug);
      return found === null ? [] : [found];
    });
    if (entries.length === 0) return null;
    const names = entries.map((e) => e.entry.name.en).join(' + ');
    return (
      <Surface level="1" padding={16}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {entries.map((e) => (
              <Swatch
                key={e.entry.slug}
                name={e.entry.name.en}
                hex={e.derived.hex}
                color={colorFor(e.entry)}
                size={64}
              />
            ))}
          </View>
          {/*
            The names, always. Two swatches a person cannot separate is exactly the case this
            screen has to keep answerable — golden rule 13, and here it is not an edge case but
            the whole audience of the CVD work.
          */}
          <Text size="body" color="foreground" script={script}>
            {entries.map((e) => `${e.entry.name.kanji} ${e.entry.name.en}`).join('  +  ')}
          </Text>
          <Button
            label={`${t('profile.choose')} — ${names}`}
            onPress={() => {
              answer(trial, option);
            }}
          />
        </View>
      </Surface>
    );
  }

  function Dimension({ dimension }: { dimension: ProfileDimension }) {
    return (
      <Surface level="1" padding={16}>
        <View style={{ gap: 8 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t(DIMENSION_KEYS[dimension])}
          </Text>
          <Text size="small" color="foreground.2" script={script}>
            {t(confidenceKey(profile.confidence[dimension]))}
          </Text>
          {profile.origin[dimension] === 'user' ? (
            <Text size="xs" color="foreground.2" script={script}>
              {t('profile.corrected')}
            </Text>
          ) : null}
          <DimensionEditor dimension={dimension} />
        </View>
      </Surface>
    );
  }

  function DimensionEditor({ dimension }: { dimension: ProfileDimension }) {
    switch (dimension) {
      case 'lightness':
        return (
          <Chips>
            {LIGHTNESS_BANDS.map((band) => (
              <Chip
                key={band.key}
                label={t(band.key)}
                selected={nearestBand(LIGHTNESS_BANDS, profile.lightness)?.key === band.key}
                onPress={() => {
                  correct(setDimension(profile, { kind: 'lightness', range: band.range }));
                }}
              />
            ))}
          </Chips>
        );
      case 'chroma':
        return (
          <Chips>
            {CHROMA_BANDS.map((band) => (
              <Chip
                key={band.key}
                label={t(band.key)}
                selected={nearestBand(CHROMA_BANDS, profile.chroma)?.key === band.key}
                onPress={() => {
                  correct(setDimension(profile, { kind: 'chroma', range: band.range }));
                }}
              />
            ))}
          </Chips>
        );
      case 'temperature': {
        const nearestTemperature = TEMPERATURE_STEPS.reduce((best, step) =>
          Math.abs(step.bias - profile.temperatureBias) <
          Math.abs(best.bias - profile.temperatureBias)
            ? step
            : best,
        );
        return (
          <Chips>
            {TEMPERATURE_STEPS.map((step) => (
              <Chip
                key={step.key}
                label={t(step.key)}
                // Nearest, for the same reason `nearestBand` exists: the derived bias lands on
                // one of these four exactly, but a corrected profile from an older build might
                // not, and an equality test would show nothing selected.
                selected={step.key === nearestTemperature.key}
                onPress={() => {
                  correct(setDimension(profile, { kind: 'temperature', bias: step.bias }));
                }}
              />
            ))}
          </Chips>
        );
      }
      case 'contrast':
        return (
          <Chips>
            {CONTRAST_STEPS.map((step) => (
              <Chip
                key={step.key}
                label={t(step.key)}
                selected={profile.contrast === step.value}
                onPress={() => {
                  correct(setDimension(profile, { kind: 'contrast', preference: step.value }));
                }}
              />
            ))}
          </Chips>
        );
      case 'neutrals':
      case 'accents':
      case 'avoid':
        return <ListEditor dimension={dimension} />;
    }
  }

  /**
   * A list dimension, as keep-or-drop chips over the derived candidates.
   *
   * Toggling rather than removing, so a drop is reversible — a "remove" that cannot be undone
   * makes a person cautious about the correction the criterion exists to invite. The candidate
   * set is the derivation's; adding a colour from outside it is not something this screen
   * offers, and saying so is better than a picker that implies the list is arbitrary.
   */
  function ListEditor({ dimension }: { dimension: 'neutrals' | 'accents' | 'avoid' }) {
    const kept = profile[dimension];
    const candidates = [...new Set([...derived[dimension], ...kept])];
    if (candidates.length === 0)
      return (
        <Text size="small" color="foreground" script={script}>
          {t('profile.listEmpty')}
        </Text>
      );
    return (
      <View style={{ gap: 8 }}>
        {candidates.map((slug) => {
          const found = entryBySlug(slug);
          if (found === null) return null;
          const on = kept.includes(slug);
          return (
            <View
              key={slug}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Swatch
                name={found.entry.name.en}
                hex={found.derived.hex}
                color={colorFor(found.entry)}
                size={40}
              />
              <Text size="small" color="foreground" script={script}>
                {`${found.entry.name.kanji} ${found.entry.name.en}`}
              </Text>
              <Chip
                label={`${t(on ? 'profile.drop' : 'profile.keep')} — ${found.entry.name.en}`}
                selected={on}
                onPress={() => {
                  correct(
                    setDimension(profile, {
                      kind: dimension,
                      slugs: on ? kept.filter((s) => s !== slug) : [...kept, slug],
                    }),
                  );
                }}
              />
            </View>
          );
        })}
      </View>
    );
  }

  const Chips = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text size="title" color="foreground" script={script} heading>
        {t('profile.title')}
      </Text>
      <Text size="small" color="foreground.2" script={script}>
        {t('profile.privacy')}
      </Text>

      {current !== undefined ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
            <Text size="small" color="foreground.2" script={script}>
              {t('profile.progress')}
            </Text>
            {/* Tabular, like every other count and value in the app. */}
            <Text size="small" color="foreground.2" numeric>
              {`${String(answered + 1)} / ${String(TRIALS.length)}`}
            </Text>
          </View>
          <Text size="body" color="foreground" script={script} heading>
            {t('profile.question')}
          </Text>
          {current.options.map((option) => (
            <Option key={option.pole} trial={current} option={option} />
          ))}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('profile.summary')}
          </Text>
          {/*
            THE HONESTY LINE, and it is not decoration. Everything below is an estimate from
            twelve forced choices, and the invitation to correct it is what ADR-0010 §6 is for.
          */}
          <Text size="small" color="foreground" script={script}>
            {t('profile.estimate')}
          </Text>

          {PROFILE_DIMENSIONS.map((dimension) => (
            <Dimension key={dimension} dimension={dimension} />
          ))}

          <Button
            label={t('profile.restart')}
            variant="secondary"
            onPress={() => {
              setAnswers([]);
              setSaved(false);
            }}
          />
          <Text size="xs" color="foreground.2" script={script}>
            {t('profile.restartHint')}
          </Text>
        </View>
      )}

      <Button
        label={t('profile.save')}
        disabled={!complete}
        onPress={() => {
          save();
        }}
      />
      {/*
        A disabled control with no stated reason is the accessibility failure that looks like
        polish. The sentence is rendered whenever the button is disabled, not on hover and not
        after a failed tap.
      */}
      {complete ? null : (
        <Text size="small" color="foreground" script={script}>
          {t('profile.notFinished')}
        </Text>
      )}
      {saved ? (
        <Text size="small" color="foreground" script={script}>
          {t('profile.saved')}
        </Text>
      ) : null}
    </ScrollView>
  );
}
