/**
 * Palette Studio — build, edit, reorder and save a palette (FR-49).
 *
 * ## The screen decides nothing about validity
 *
 * Whether a draft can be saved is `parsePalette`'s answer, reached through `draftProblem` and
 * `toStoreWrite` in [`../palette.ts`](../palette.ts). This file disables a control and shows a
 * sentence; it does not know what an anchor is, what a rank is, or that ranks must be
 * contiguous. A screen that re-stated those rules would be a second copy of them, and the
 * corpus one is the copy nobody would be looking at when they drifted apart.
 *
 * ## Order is proportion, and that is why reordering is here at all
 *
 * The weight ladder is derived from rank, so moving a colour up changes its share of the
 * palette. The screen says so (`studio.order`) rather than leaving a reorder control whose
 * only visible effect is the order of some rows.
 *
 * ## What this screen must never render
 *
 * **The corpus classification label.** A device-built palette is `classification: "editorial"`
 * — the honest field for work that is neither canonical nor ours — and that token's label
 * reads *"Irodora original"*, which is untrue of a palette somebody else made. The origin is
 * stated in the Studio's own words instead, and `screens.test.tsx` asserts the label is absent
 * as a whole text node. See
 * [ADR-0067](../../../docs/adr/0067-a-palette-built-on-a-device-is-validated-by-the-corpus-schema-and-says-it-came-from-a-device.md).
 *
 * ## Why the messages are plain text rather than `Status`
 *
 * F-069: a status colour may not sit beside a colour sample without a `swatch.well` between
 * them, because simultaneous contrast changes how the sample reads. This screen is mostly
 * samples, and a saved-confirmation is prose rather than a reading about data — so it carries
 * no colour channel at all, which satisfies golden rule 13 by having nothing to satisfy.
 * `screens.test.tsx` now runs `checkStatusAdjacency` over every screen, so the next person to
 * reach for a status token here is told rather than trusted.
 *
 * ## The store arrives as a prop
 *
 * Required, not defaulted. A default that quietly did not persist would look identical to one
 * that did, right up to the moment somebody reopened the app. The route supplies the device
 * repository; the conformance registry supplies an in-memory one.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { Button, Chip, SearchField, Surface, Swatch, Text, TextField, useTheme } from '@irodora/ui';
import { PALETTE_ROLES, type PaletteRole } from '@irodora/corpus';
import { uuidv7 } from '@irodora/store';
import {
  addMember,
  draftFrom,
  draftProblem,
  EMPTY_DRAFT,
  moveMember,
  removeMember,
  rename,
  setRole,
  toStoreWrite,
  type DraftProblem,
  type PaletteDraft,
  type PaletteStore,
} from '../palette';
import { allEntries, colorFor, entryBySlug, type PublishedEntry } from '../corpus';
import { findSeparationProblems } from '../outfit/cvd';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** Role → catalogue key. Total, so a fifth role is a compile error rather than a blank chip. */
const ROLE_KEYS = {
  anchor: 'role.anchor',
  neutral: 'role.neutral',
  light: 'role.light',
  accent: 'role.accent',
} as const satisfies Record<PaletteRole, MessageKey>;

/** Problem → catalogue key. Total for the same reason. */
const PROBLEM_KEYS = {
  empty: 'studio.problem.empty',
  noAnchor: 'studio.problem.noAnchor',
  noName: 'studio.problem.noName',
  other: 'studio.problem.other',
} as const satisfies Record<DraftProblem, MessageKey>;

/** How many matches the picker offers. Enough to choose from, few enough to scan. */
const MATCH_LIMIT = 8;

function matches(query: string, taken: ReadonlySet<string>): readonly PublishedEntry[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  return allEntries()
    .filter((e) => !taken.has(e.entry.slug))
    .filter((e) =>
      [
        e.entry.name.kanji,
        e.entry.name.kana,
        e.entry.name.romaji,
        e.entry.name.en,
        e.entry.slug,
      ].some((v) => v.toLowerCase().includes(q)),
    )
    .slice(0, MATCH_LIMIT);
}

export interface PaletteStudioProps {
  /** Where palettes are written. Required — see the note above. */
  readonly store: PaletteStore;
  /**
   * A draft to open on, so a test or a future "edit this palette" route can start populated.
   *
   * The same affordance `Compare` has, for the same reason: the empty and populated branches
   * of this screen render almost disjoint trees, and a suite that can only reach the empty one
   * is checking a screen nobody has used yet.
   */
  readonly initialDraft?: PaletteDraft;
  /** `YYYY-MM-DD`. Injected so a saved record is testable at a chosen date. */
  readonly today?: string;
}

export function PaletteStudio({
  store,
  initialDraft,
  today,
}: PaletteStudioProps): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script } = useMessages();

  const [draft, setDraft] = useState<PaletteDraft>(initialDraft ?? EMPTY_DRAFT);
  /*
   * The id is held in state, so re-saving an edited palette UPDATES it rather than writing a
   * second one. A fresh id per save would leave the person with a new palette for every
   * keystroke they came back to fix.
   */
  const [id, setId] = useState<string>(() => uuidv7());
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const [stored, setStored] = useState(() => store.listPalettes());

  const context = useMemo(
    () => ({ id, today: today ?? new Date().toISOString().slice(0, 10) }),
    [id, today],
  );

  const problem = draftProblem(draft, context);
  const taken = new Set(draft.members.map((m) => m.slug));
  const found = matches(query, taken);

  /*
   * F-032. Recomputed on every render and memoised on the members, because the corpus search
   * behind `proposeAlternative` runs over all 120 entries per flagged pair — cheap, but not
   * cheap enough to redo on a keystroke in the search field.
   */
  const separationProblems = useMemo(
    () =>
      findSeparationProblems(
        draft.members.flatMap((m) => {
          const entry = entryBySlug(m.slug);
          return entry === null
            ? []
            : [{ id: m.slug, label: entry.entry.name.en, color: colorFor(entry.entry) }];
        }),
      ),
    [draft.members],
  );

  /** Any edit invalidates the confirmation: "saved" must mean what is on screen now. */
  const edit = (next: PaletteDraft): void => {
    setDraft(next);
    setSaved(false);
  };

  const save = (): void => {
    store.savePalette(
      toStoreWrite(draft, context, () => uuidv7()),
      Date.now(),
    );
    setStored(store.listPalettes());
    setSaved(true);
  };

  function Member({ slug, role, index }: { slug: string; role: PaletteRole; index: number }) {
    const entry = entryBySlug(slug);
    if (entry === null) return null;
    return (
      <View style={{ gap: 8, paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Swatch
            name={entry.entry.name.en}
            hex={entry.derived.hex}
            color={colorFor(entry.entry)}
            size={48}
          />
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Text size="body" color="foreground" script={script}>
              {`${entry.entry.name.kanji} ${entry.entry.name.en}`}
            </Text>
            {/* Tabular and selectable, like every other colour value in the app (C9). */}
            <Text size="small" color="foreground.2" numeric selectable>
              {entry.derived.hex}
            </Text>
          </View>
        </View>

        <Text size="xs" color="foreground.2" script={script}>
          {t('studio.role')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PALETTE_ROLES.map((r) => (
            <Chip
              key={r}
              label={t(ROLE_KEYS[r])}
              selected={r === role}
              onPress={() => {
                edit(setRole(draft, slug, r));
              }}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {/*
            The colour's name is in each label. A screen reader moving through a list of
            members otherwise hears "Move up" four times with nothing to tell them apart, and
            `Button` ties its label to its accessible name on purpose.
          */}
          <Button
            label={`${t('studio.moveUp')} — ${entry.entry.name.en}`}
            variant="secondary"
            disabled={index === 0}
            onPress={() => {
              edit(moveMember(draft, slug, -1));
            }}
          />
          <Button
            label={`${t('studio.moveDown')} — ${entry.entry.name.en}`}
            variant="secondary"
            disabled={index === draft.members.length - 1}
            onPress={() => {
              edit(moveMember(draft, slug, 1));
            }}
          />
          <Button
            label={`${t('studio.remove')} — ${entry.entry.name.en}`}
            variant="secondary"
            onPress={() => {
              edit(removeMember(draft, slug));
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text size="title" color="foreground" script={script} heading>
        {t('studio.title')}
      </Text>
      {/*
        Where this palette came from, in the Studio's own words. NEVER the corpus
        classification label — see the note at the top of this file.
      */}
      <Text size="small" color="foreground.2" script={script}>
        {t('studio.origin')}
      </Text>

      <Surface level="1" padding={16}>
        <TextField
          label={t('studio.name')}
          hint={t('studio.nameHint')}
          script={script}
          value={draft.name}
          onChangeText={(text) => {
            edit(rename(draft, text));
          }}
        />
      </Surface>

      <Surface level="1" padding={16}>
        <View style={{ gap: 4 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('studio.members')}
          </Text>
          <Text size="xs" color="foreground.2" script={script}>
            {t('studio.order')}
          </Text>

          {draft.members.length === 0 ? (
            <View style={{ gap: 4, paddingVertical: 8 }}>
              <Text size="small" color="foreground" script={script}>
                {t('studio.empty')}
              </Text>
              <Text size="xs" color="foreground.2" script={script}>
                {t('studio.emptyHint')}
              </Text>
            </View>
          ) : (
            draft.members.map((m, i) => (
              <Member key={m.slug} slug={m.slug} role={m.role} index={i} />
            ))
          )}
        </View>
      </Surface>

      <Surface level="1" padding={16}>
        <View style={{ gap: 8 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('studio.add')}
          </Text>
          <SearchField label={t('atlas.search')} value={query} onChangeText={setQuery} />
          {found.map((m) => (
            <Pressable
              key={m.entry.slug}
              accessibilityRole="button"
              accessibilityLabel={`${t('studio.add')} — ${m.entry.name.en}`}
              onPress={() => {
                edit(addMember(draft, m.entry.slug));
                setQuery('');
              }}
              style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
            >
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Swatch
                  name={m.entry.name.en}
                  hex={m.derived.hex}
                  color={colorFor(m.entry)}
                  size={32}
                />
                <Text size="small" color="foreground.2" script={script}>
                  {`${m.entry.name.kanji} ${m.entry.name.en}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Surface>

      <Surface level="1" padding={16}>
        <View style={{ gap: 8 }}>
          <Button
            label={t('studio.save')}
            disabled={problem !== null}
            onPress={() => {
              save();
            }}
          />
          {/*
            The reason, beside the control it disables. A disabled button with no explanation
            is the accessibility failure that looks like polish — and the sentence comes from
            the schema's verdict, not from a second opinion about it.
          */}
          {problem === null ? null : (
            <Text size="small" color="foreground" script={script}>
              {t(PROBLEM_KEYS[problem])}
            </Text>
          )}
          {saved ? (
            <Text size="small" color="foreground" script={script}>
              {t('studio.saved')}
            </Text>
          ) : null}
        </View>
      </Surface>

      {/*
        F-032 — CVD mode, on the surface that exists.

        FR-35 calls it "outfit mode" and there is no outfit surface: the builder is F-033 and it
        is R4. A palette is a set of colours the person assembled by hand, which is exactly the
        input this check takes — so the flag lands here, and the computation is identical when an
        outfit surface arrives.

        NO SIMULATION PREVIEW. What is drawn is a sentence about a pair, a number, and a swap
        [[cvd-is-scoring-not-rendering]]. And no status token: F-069 forbids a status colour
        beside a colour sample without a `swatch.well` between them, and this panel is mostly
        samples — so the flag carries no colour channel at all, which satisfies golden rule 13
        by having nothing to satisfy.
      */}
      <Surface level="1" padding={16}>
        <View style={{ gap: 8 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('cvd.title')}
          </Text>
          {separationProblems.length === 0 ? (
            <Text size="small" color="foreground" script={script}>
              {t('cvd.none')}
            </Text>
          ) : (
            separationProblems.map((finding) => (
              <View key={`${finding.a.id}-${finding.b.id}`} style={{ gap: 6, paddingVertical: 6 }}>
                <Text size="small" color="foreground" script={script}>
                  {`${t('cvd.hard')}: ${finding.a.label} · ${finding.b.label}`}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                  <Text size="xs" color="foreground.2" script={script}>
                    {t('cvd.separation')}
                  </Text>
                  {/* Tabular, like every other measured value in the app. */}
                  <Text size="xs" color="foreground.2" numeric>
                    {finding.separation.toFixed(0)}
                  </Text>
                </View>
                {finding.alternative === null ? (
                  <Text size="xs" color="foreground.2" script={script}>
                    {t('cvd.noAlternative')}
                  </Text>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    {(() => {
                      const entry = entryBySlug(finding.alternative.slug);
                      return entry === null ? null : (
                        <Swatch
                          name={entry.entry.name.en}
                          hex={entry.derived.hex}
                          color={colorFor(entry.entry)}
                          size={40}
                        />
                      );
                    })()}
                    <Text size="xs" color="foreground.2" script={script}>
                      {`${t('cvd.swapTo')} ${finding.alternative.label}`}
                    </Text>
                    <Text size="xs" color="foreground.2" numeric>
                      {`${finding.alternative.separation.toFixed(0)} (${t('cvd.improvement')} +${finding.alternative.improvement.toFixed(0)})`}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
          <Text size="xs" color="foreground.2" script={script}>
            {t('cvd.method')}
          </Text>
        </View>
      </Surface>

      <Surface level="1" padding={16}>
        <View style={{ gap: 8 }}>
          <Text size="body" color="foreground" script={script} heading>
            {t('studio.yours')}
          </Text>
          {stored.length === 0 ? (
            <Text size="small" color="foreground.2" script={script}>
              {t('studio.none')}
            </Text>
          ) : (
            stored.map((p) => (
              <View key={p.id} style={{ gap: 4, paddingVertical: 4 }}>
                <Text size="small" color="foreground" script={script}>
                  {p.nameEn}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button
                    label={`${t('studio.open')} — ${p.nameEn}`}
                    variant="secondary"
                    onPress={() => {
                      setId(p.id);
                      setDraft(draftFrom(p.members, p.nameEn));
                      setSaved(false);
                    }}
                  />
                  {/*
                    Deletable, because the alternative is a record the person cannot get rid
                    of on a device they own — and with no server there is no other way to.
                  */}
                  <Button
                    label={`${t('studio.delete')} — ${p.nameEn}`}
                    variant="secondary"
                    onPress={() => {
                      store.deletePalette(p.id, Date.now());
                      setStored(store.listPalettes());
                      if (p.id === id) {
                        setId(uuidv7());
                        setDraft(EMPTY_DRAFT);
                      }
                      setSaved(false);
                    }}
                  />
                </View>
              </View>
            ))
          )}
          <Button
            label={t('studio.new')}
            variant="secondary"
            onPress={() => {
              setId(uuidv7());
              setDraft(EMPTY_DRAFT);
              setSaved(false);
            }}
          />
        </View>
      </Surface>
    </ScrollView>
  );
}
