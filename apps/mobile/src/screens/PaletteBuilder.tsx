/**
 * Create Custom Palette — mockup `16` (F-251): the draft state of `/atlas/palettes`, where a person
 * builds a palette in four slots, one a role, from the corpus tray, and the matrix computes what the
 * engine can say of it as they go (FR-49, FR-3, FR-5, FR-6, FR-35).
 *
 * ## The slots are the schema's roles (ADR-0165)
 *
 * Slot 1 is the anchor, then the light ground, the mid tone and the accent: `SLOT_ROLES`. One slot is
 * in hand at a time — the first empty one, or the one whose *Replace* was pressed — and a tray tile
 * puts its colour there. A colour another slot holds moves; the in-hand slot's own colour, chosen
 * again, leaves it. A locked slot keeps its colour (08's A arrives locked, as 13's top does).
 *
 * ## The schema decides, the screen says why
 *
 * Both saves go through `toStoreWrite`, which runs `parsePalette`: a draft the schema refuses is never
 * stored, and while it would be refused both saves are disabled and the bar says why (`draftProblem`).
 *
 * ## Nothing here computes
 *
 * `palette.ts` holds the draft; `palette-readout.ts` every word and figure; `outfit/cvd.ts` FR-35's
 * flag and swap. This file composes `16`.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import type { PaletteRole } from '@irodora/corpus';
import { uuidv7 } from '@irodora/store';
import {
  Button,
  Card,
  ChoiceGroup,
  IconButton,
  Illustration,
  Row,
  Screen,
  SelectionDot,
  Swatch,
  Tategaki,
  Text,
  TextField,
  useTheme,
  type Script,
} from '@irodora/ui';
import { allEntries, colorFor, entryBySlug, type PublishedEntry } from '../corpus';
import type { MessageKey } from '../i18n';
import { nameLine } from '../notation';
import { useMessages } from '../i18n/useMessages';
import { findSeparationProblems, type SeparationFinding } from '../outfit/cvd';
import {
  categoryOf,
  choose,
  DRAFT_CATEGORIES,
  draftProblem,
  EMPTY_DRAFT,
  isLocked,
  nextEmpty,
  rename,
  setCategory,
  slotOf,
  SLOT_ROLES,
  toggleLock,
  toStoreWrite,
  type PaletteDraft,
  type PaletteStore,
} from '../palette';
import {
  BUILDER_APP_BAR,
  BUILDER_ART,
  CHEVRON_GLYPH,
  CREATE_AND_SAVE,
  LOCK_GLYPH_16,
  MATRIX_LABEL_COLUMN,
  matrixRows,
  NAME_FIELD,
  pageOf,
  PROBLEM_KEYS,
  REPLACE_GLYPH,
  ROLE_KEYS,
  SAVE,
  SLOT_HEADING_KEYS,
  SLOT_SAMPLE,
  TILE_HEIGHT,
  TILE_WIDTH,
  TRAY_INSET,
  TRAY_PEEK,
  trayPages,
  TYPE_CHIP,
  TYPE_KEYS,
} from '../palette-readout';
import type { ScreenStates } from '../states';

/**
 * What this screen shows in each data condition it can reach (F-236, ADR-0129): none. An empty draft
 * draws its empty slots, each saying how it is filled (E4) — it is the screen at its start, not a
 * condition with a panel of its own.
 */
export const STATES = {} as const satisfies ScreenStates;

type T = (key: MessageKey) => string;

/** Words laid over a sample are read by the sample's own name, once (F-248's tile form). */
const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants' as const,
};

/** The joiners a line is built with, in each script's own punctuation (the review, L4). */
const joiners = (script: Script) =>
  script === 'japanese'
    ? { space: '', colon: '：', comma: '、', middle: '・', open: '（', close: '）' }
    : { space: ' ', colon: ': ', comma: ', ', middle: ' · ', open: ' (', close: ')' };

/** The slot that comes in hand on opening: the first empty one, or the first not locked. */
function inHandOf(draft: PaletteDraft): PaletteRole | null {
  return nextEmpty(draft) ?? SLOT_ROLES.find((role) => !isLocked(draft, role)) ?? null;
}

/** `Slot n: Anchor / Dark Base` — ADR-0163 reads 16's brackets as notation; the colon is 16's own. */
const slotHeading = (role: PaletteRole, t: T, script: Script): string => {
  const j = joiners(script);
  return `${t('palettes.slotWord')}${j.space}${String(SLOT_ROLES.indexOf(role) + 1)}${j.colon}${t(SLOT_HEADING_KEYS[role])}`;
};

interface SlotProps {
  readonly role: PaletteRole;
  readonly draft: PaletteDraft;
  /**
   * The person pressed this slot's *Replace* and it is in hand: its word reads *Choosing*, announced
   * as selected. The slot in hand on opening shows only by its framed tile, as 16 draws it.
   */
  readonly choosing: boolean;
  readonly t: T;
  readonly script: Script;
  readonly onReplace: (role: PaletteRole) => void;
  readonly onUnlock: (role: PaletteRole) => void;
}

/** One slot (`16.slots.slot-n`). At module scope and memoised (F-250 S3). */
const Slot = memo(function Slot({
  role,
  draft,
  choosing,
  t,
  script,
  onReplace,
  onUnlock,
}: SlotProps): React.JSX.Element {
  const { colors } = useTheme();
  const id = `builder.slot.${role}`;
  const slug = slotOf(draft, role);
  const entry = slug === null ? null : entryBySlug(slug);
  const locked = isLocked(draft, role);
  const j = joiners(script);
  const heading = slotHeading(role, t, script);
  const roleLine = `${t('palettes.role')}${j.space}${t(ROLE_KEYS[role])}`;
  // The slot in hand says so in words (M2): its Replace reads *Choosing*, announced as selected.
  const replaceWord = t(choosing ? 'palettes.choosing' : 'palettes.replace');
  return (
    <Card level="1" radius="sm" padding="sm" testID={id}>
      <Text
        size="caption"
        weight={500}
        color="foreground"
        heading
        numeric
        script={script}
        testID={`${id}.heading`}
      >
        {slotHeading(role, t, script)}
      </Text>
      <View style={{ marginTop: nativeSpacing.xs }}>
        {entry === null ? (
          // E4: an empty slot says how it is filled, in an outline at the sample's size.
          <View
            testID={`${id}.empty`}
            style={{
              height: SLOT_SAMPLE,
              justifyContent: 'center',
              paddingHorizontal: nativeSpacing.sm,
            }}
          >
            <Text size="caption" color="foreground.2" script={script}>
              {t('palettes.emptySlot')}
            </Text>
          </View>
        ) : (
          <Swatch
            name={entry.entry.name.en}
            hex={entry.derived.hex}
            color={colorFor(entry.entry)}
            width="fill"
            height={SLOT_SAMPLE}
            corner="sm"
            keyline
            group={false}
            testID={`${id}.sample`}
          />
        )}
      </View>
      {entry === null ? null : (
        <View style={{ marginTop: nativeSpacing.xs }}>
          <Text
            size="caption"
            weight={600}
            color="foreground"
            numeric
            selectable
            testID={`${id}.hex`}
          >
            {entry.derived.hex}
          </Text>
          {/* 16's line: the kanji, the romaji and the English (the review, S2). */}
          <Text size="caption" color="foreground.2" script={script} testID={`${id}.name`}>
            {`${nameLine(entry)} ${entry.entry.name.en}`}
          </Text>
        </View>
      )}
      <View style={{ marginTop: nativeSpacing.xs }}>
        <Row gap="xs" align="center" justify="between">
          {locked ? (
            // *• 🔒 Locked*: the dot is the on-state mark (ADR-0141; ADR-0163 D2), the word the state.
            <Row gap="xs" align="center">
              <SelectionDot visible color={colors['foreground.2']} testID={`${id}.locked.dot`} />
              <Button
                variant="plain"
                ink="foreground.2"
                glyph="lock-solid"
                glyphTint="glyph.lock"
                glyphSize={LOCK_GLYPH_16}
                step="caption"
                script={script}
                label={t('palettes.locked')}
                name={`${t('palettes.locked')}${j.comma}${heading}`}
                selected
                onPress={() => {
                  onUnlock(role);
                }}
                testID={`${id}.locked`}
              />
            </Row>
          ) : null}
          <Text size="caption" color="foreground.2" script={script} testID={`${id}.role`}>
            {roleLine}
          </Text>
          {locked ? null : (
            <Button
              variant="plain"
              ink="foreground.2"
              glyph="refresh"
              glyphAt="trailing"
              glyphSize={REPLACE_GLYPH}
              step="caption"
              script={script}
              label={replaceWord}
              name={`${replaceWord}${j.comma}${heading}`}
              selected={choosing}
              onPress={() => {
                onReplace(role);
              }}
              testID={`${id}.replace`}
            />
          )}
        </Row>
      </View>
    </Card>
  );
});

/** FR-35's block (ADR-0165 D6, E4): a pair hard to tell apart, by slot, and the swap that helps. */
function SeparationBlock({
  findings,
  draft,
  t,
  script,
  onSwap,
}: {
  readonly findings: readonly SeparationFinding[];
  readonly draft: PaletteDraft;
  readonly t: T;
  readonly script: Script;
  readonly onSwap: (role: PaletteRole, slug: string) => void;
}): React.JSX.Element {
  const j = joiners(script);
  return (
    <View testID="builder.cvd" style={{ marginTop: nativeSpacing.sm, gap: nativeSpacing.sm }}>
      {findings.map((finding) => {
        const role = finding.b.id as PaletteRole;
        const alternative = finding.alternative;
        return (
          <View key={`${finding.a.id}-${finding.b.id}`} style={{ gap: nativeSpacing.xs }}>
            <Text size="caption" color="foreground" numeric script={script}>
              {`${t('cvd.hard')}${j.colon}${slotHeading(finding.a.id as PaletteRole, t, script)}${j.middle}${slotHeading(role, t, script)}`}
            </Text>
            <Text size="caption" color="foreground.2" numeric script={script}>
              {/* Floored, as every separation this screen prints (rule 11). */}
              {`${t('cvd.separation')}${j.space}${String(Math.floor(finding.separation))}`}
            </Text>
            {alternative === null ? (
              <Text size="caption" color="foreground.2" script={script}>
                {t('cvd.noAlternative')}
              </Text>
            ) : (
              <>
                <Text size="caption" color="foreground.2" numeric script={script}>
                  {`${t('cvd.swapTo')}${j.space}${alternative.label}${j.colon}${String(Math.floor(alternative.separation))}${j.open}${t('cvd.improvement')}${j.space}+${String(Math.floor(alternative.improvement))}${j.close}`}
                </Text>
                <Button
                  variant="secondary"
                  edge="border"
                  radius="sm"
                  step="caption"
                  // Named by the slot's role, so the label carries no figure to set (FR-48).
                  label={`${t('palettes.replace')}${script === 'japanese' ? '：' : ' — '}${t(SLOT_HEADING_KEYS[role])}`}
                  script={script}
                  disabled={isLocked(draft, role)}
                  onPress={() => {
                    onSwap(role, alternative.slug);
                  }}
                  testID={`builder.cvd.swap.${role}`}
                />
              </>
            )}
          </View>
        );
      })}
      <Text size="caption" color="foreground.2" script={script}>
        {t('cvd.method')}
      </Text>
    </View>
  );
}

interface TileProps {
  readonly entry: PublishedEntry;
  /** Its place on the page, 0–6: how a sweep finds a drawn tile whatever the page holds. */
  readonly index: number;
  readonly chosen: boolean;
  /** What a press does, for a screen reader: puts it in the slot in hand, or removes it (M2). */
  readonly hint: string | undefined;
  readonly onChoose: (slug: string) => void;
}

/** One tray tile (`16.tray.chip-n`): the colour whole, its kanji set down it (C8). */
const Tile = memo(function Tile({
  entry,
  index,
  chosen,
  hint,
  onChoose,
}: TileProps): React.JSX.Element {
  const sample = { hex: entry.derived.hex, color: colorFor(entry.entry) };
  return (
    <Swatch
      name={entry.entry.name.en}
      hex={entry.derived.hex}
      color={sample.color}
      width={TILE_WIDTH}
      height={TILE_HEIGHT}
      corner="sm"
      selected={chosen}
      group={false}
      // No slot in hand, nothing to fill: the tile is shown, not pressed (every slot locked).
      disabled={hint === undefined}
      {...(hint === undefined ? {} : { hint })}
      onPress={() => {
        onChoose(entry.entry.slug);
      }}
      testID={`builder.tray.tile.${String(index)}`}
    >
      <View
        pointerEvents="none"
        style={{
          flexGrow: 1,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: nativeSpacing.xs,
          // At large text a three-character name is taller than the tile: it is cut at the tile's
          // edge, never drawn on the tray in the sample's ink (the review, M3; F-344).
          overflow: 'hidden',
        }}
        {...HIDDEN}
      >
        <Tategaki text={entry.entry.name.kanji} on={sample} />
      </View>
    </Swatch>
  );
});

export interface PaletteBuilderProps {
  readonly store: PaletteStore;
  /** The draft to open on: empty, 08's pair, or a stored palette being edited. */
  readonly initialDraft?: PaletteDraft;
  /** The stored palette's id when editing: a save updates it. */
  readonly editingId?: string;
  /** `YYYY-MM-DD`. Injected so a saved record is testable at a chosen date. */
  readonly today?: string;
  /** *← Palettes*: back to the catalogue. Absent in the conformance suite. */
  readonly onBack?: () => void;
  /** After *Create & Save*: the catalogue's *My Custom Palettes*. */
  readonly onSaved?: () => void;
}

export function PaletteBuilder({
  store,
  initialDraft,
  editingId,
  today,
  onBack,
  onSaved,
}: PaletteBuilderProps): React.JSX.Element {
  const { t, script } = useMessages();
  const { colors } = useTheme();
  const [draft, setDraft] = useState<PaletteDraft>(initialDraft ?? EMPTY_DRAFT);
  // The first empty slot, or on a full draft the first one not locked: some slot is always in hand,
  // as 16 draws its tray with a tile chosen (the review, M2).
  // The slot whose *Replace* was pressed, until a tile fills it (M2): an interaction 16 does not draw.
  const [pressed, setPressed] = useState<PaletteRole | null>(null);
  const [inHand, setInHand] = useState<PaletteRole | null>(() =>
    inHandOf(initialDraft ?? EMPTY_DRAFT),
  );
  // Held, so a second save updates the same record (FR-49; the old Studio's rule).
  const [id] = useState<string>(() => editingId ?? uuidv7());
  const [saved, setSaved] = useState(false);

  const pages = useMemo(() => trayPages(allEntries()), []);
  const handSlug = inHand === null ? null : slotOf(draft, inHand);
  const [page, setPage] = useState(() => {
    // The page holding the first colour the draft arrives with, so the tray opens where it is.
    const first = SLOT_ROLES.flatMap((r) => slotOf(draft, r) ?? [])[0];
    return first === undefined ? 0 : (pageOf(pages, first) ?? 0);
  });

  const context = useMemo(
    () => ({ id, today: today ?? new Date().toISOString().slice(0, 10) }),
    [id, today],
  );
  const problem = draftProblem(draft, context);
  const rows = matrixRows(draft, t, script);
  const findings = useMemo(
    () =>
      findSeparationProblems(
        SLOT_ROLES.flatMap((role) => {
          const slug = slotOf(draft, role);
          const entry = slug === null ? null : entryBySlug(slug);
          return entry === null
            ? []
            : [{ id: role, label: entry.entry.name.en, color: colorFor(entry.entry) }];
        }),
      ),
    [draft],
  );

  /** Any edit invalidates the confirmation: *Saved* must mean what is on screen now. */
  const edit = useCallback((next: PaletteDraft): void => {
    setDraft(next);
    setSaved(false);
  }, []);

  const onChoose = useCallback(
    (slug: string): void => {
      const role = inHand ?? inHandOf(draft);
      if (role === null) return;
      const next = choose(draft, role, slug);
      edit(next);
      // After a choice the next empty slot comes in hand; a cleared slot stays in hand.
      setInHand(slotOf(next, role) === null ? role : (nextEmpty(next, role) ?? role));
      setPressed(null);
    },
    [draft, inHand, edit],
  );

  /** *Replace*: its slot comes in hand, and the tray opens on the page holding its colour (M2). */
  const onReplace = useCallback(
    (role: PaletteRole): void => {
      setInHand(role);
      setPressed(role);
      const held = slotOf(draft, role);
      const at = held === null ? null : pageOf(pages, held);
      if (at !== null) setPage(at);
    },
    [draft, pages],
  );

  const onUnlock = useCallback((role: PaletteRole): void => {
    setDraft((d) => toggleLock(d, role));
    setSaved(false);
  }, []);

  /** What a tile's press does, in words, for the slot in hand (M2). */
  const hintFor = (slug: string): string | undefined => {
    if (inHand === null) return undefined;
    const heading = slotHeading(inHand, t, script);
    return slotOf(draft, inHand) === slug
      ? `${t('palettes.removeFrom')}${joiners(script).space}${heading}`
      : `${t('palettes.putIn')}${joiners(script).space}${heading}`;
  };

  const save = (): boolean => {
    if (problem !== null) return false;
    store.savePalette(
      toStoreWrite(draft, context, () => uuidv7()),
      Date.now(),
    );
    setSaved(true);
    return true;
  };

  const tray = pages[page] ?? [];
  const previous = pages[page - 1]?.at(-1);
  const following = pages[page + 1]?.[0];

  return (
    <Screen
      scroll={false}
      bleed
      script={script}
      appBar={{
        height: BUILDER_APP_BAR,
        inset: nativeSpacing.md,
        gap: nativeSpacing.sm,
        rule: true,
        script,
        ...(onBack === undefined
          ? {}
          : {
              back: {
                glyph: 'back' as const,
                label: t('palettes.back'),
                name: t('palettes.backName'),
                ink: 'foreground.2' as const,
                onPress: onBack,
              },
            }),
        title: {
          text: t(editingId === undefined ? 'palettes.createTitle' : 'palettes.editTitle'),
          align: 'centre',
          placement: 'bar',
          layout: 'inline',
          size: 'label',
          weight: 600,
        },
        trailing: {
          button: {
            variant: 'secondary',
            edge: 'border.strong',
            label: t('palettes.save'),
            height: SAVE,
            radius: 'sm',
            step: 'caption',
            inset: 'sm',
            script,
            disabled: problem !== null,
            onPress: () => {
              save();
            },
            testID: 'builder.save',
          },
        },
      }}
      actionBar={{
        rule: false,
        actions: [
          {
            label: t(editingId === undefined ? 'palettes.createAndSave' : 'palettes.saveAndReturn'),
            glyph: 'arrow-right',
            height: CREATE_AND_SAVE,
            radius: 'sm',
            step: 'caption',
            script,
            disabled: problem !== null,
            onPress: () => {
              if (save()) onSaved?.();
            },
            testID: 'builder.create',
          },
        ],
        ...(problem !== null
          ? { note: t(PROBLEM_KEYS[problem]) }
          : saved
            ? { note: t('studio.saved') }
            : {}),
        padding: { top: nativeSpacing.sm, side: nativeSpacing.xl, bottom: nativeSpacing.md },
        script,
      }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* THE ART, behind everything (ADR-0166 D7): kimono left, sashiko twice right. */}
          <View
            pointerEvents="none"
            testID="builder.art"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            {BUILDER_ART.map((art) => (
              <View
                key={art.key}
                style={{
                  position: 'absolute',
                  top: art.top,
                  ...(art.side === 'left' ? { left: 0 } : { right: 0 }),
                }}
              >
                <Illustration
                  name={art.name}
                  tone="backdrop"
                  color="foreground"
                  width={art.width}
                  testID={`builder.art.${art.key}`}
                />
              </View>
            ))}
          </View>

          <View
            style={{
              paddingHorizontal: nativeSpacing.xl,
              paddingTop: nativeSpacing.md,
              paddingBottom: nativeSpacing.md,
              gap: nativeSpacing.sm,
            }}
          >
            <Card level="1" radius="sm" padding="sm" testID="builder.name">
              <TextField
                label={t('studio.name')}
                labelPlacement="inside"
                height={NAME_FIELD}
                radius="sm"
                size="label"
                value={draft.name}
                onChangeText={(name) => {
                  edit(rename(draft, name));
                }}
                script={script}
                testID="builder.name.field"
              />
              <View style={{ marginTop: nativeSpacing.xs }}>
                <ChoiceGroup
                  label={t('palettes.type')}
                  value={categoryOf(draft)}
                  options={DRAFT_CATEGORIES.map((c) => ({ value: c, label: t(TYPE_KEYS[c]) }))}
                  onChange={(c) => {
                    if (c !== null) edit(setCategory(draft, c));
                  }}
                  pills={{
                    height: TYPE_CHIP,
                    size: 'caption',
                    selectedFill: 'surface.3',
                    radius: 'sm',
                    gap: 'xs',
                  }}
                  script={script}
                  testID="builder.type"
                />
              </View>
            </Card>

            <View style={{ gap: nativeSpacing.sm }}>
              {[SLOT_ROLES.slice(0, 2), SLOT_ROLES.slice(2)].map((pair) => (
                <Row key={pair[0]} gap="sm" align="stretch">
                  {pair.map((role) => (
                    <View key={role} style={{ flex: 1 }}>
                      <Slot
                        role={role}
                        draft={draft}
                        choosing={pressed === role && inHand === role}
                        t={t}
                        script={script}
                        onReplace={onReplace}
                        onUnlock={onUnlock}
                      />
                    </View>
                  ))}
                </Row>
              ))}
            </View>

            <Card level="1" radius="sm" padding="sm" testID="builder.matrix">
              <Text size="caption" weight={600} color="foreground" heading script={script}>
                {t('palettes.matrix.title')}
              </Text>
              {rows.map((row) => (
                <View key={row.key} testID={`builder.matrix.${row.key}`}>
                  <View
                    style={{ marginVertical: nativeSpacing.sm }}
                    testID={`builder.matrix.${row.key}.rule`}
                  >
                    <Rule />
                  </View>
                  <Row gap="sm" align="start">
                    <View style={{ width: MATRIX_LABEL_COLUMN }}>
                      <Row gap="xs" wrap align="baseline">
                        <Text size="label" color="foreground" script={script}>
                          {row.label}
                        </Text>
                        {row.pair === null ? null : (
                          <Text size="caption" color="foreground.2" numeric script={script}>
                            {row.pair}
                          </Text>
                        )}
                      </Row>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        size="caption"
                        color="foreground"
                        numeric
                        script={script}
                        testID={`builder.matrix.${row.key}.value`}
                      >
                        {row.value}
                      </Text>
                    </View>
                  </Row>
                </View>
              ))}
              {findings.length === 0 ? null : (
                <SeparationBlock
                  findings={findings}
                  draft={draft}
                  t={t}
                  script={script}
                  onSwap={(role, slug) => {
                    edit(choose(draft, role, slug));
                  }}
                />
              )}
            </Card>
          </View>
        </ScrollView>

        {/*
          THE TRAY (ADR-0166 D6), fixed above the action bar: a peeking tile, a divider, ‹, seven
          tiles, ›, a divider, a peeking tile. The chevrons step a page; their targets stay in the tray.
        */}
        <View
          testID="builder.tray"
          style={{
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingVertical: TRAY_INSET,
          }}
        >
          <TrayRow
            tray={tray}
            previous={previous}
            following={following}
            handSlug={handSlug}
            t={t}
            hintFor={hintFor}
            onChoose={onChoose}
            onPage={(by) => {
              setPage((p) => Math.min(Math.max(p + by, 0), pages.length - 1));
            }}
            atStart={page === 0}
            atEnd={page === pages.length - 1}
          />
        </View>
      </View>
    </Screen>
  );
}

/** A one-dp rule in `border`, as the matrix draws between its rows and the tray beside its chevrons. */
function Rule({
  vertical = false,
  testID,
}: {
  readonly vertical?: boolean;
  readonly testID?: string;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      style={
        vertical
          ? { width: 1, height: TILE_HEIGHT, backgroundColor: colors.border }
          : { height: 1, backgroundColor: colors.border }
      }
    />
  );
}

/** A neighbouring page's tile, cut by the screen's edge as `16` draws it: shown, not chosen from. */
function Peek({
  entry,
  side,
}: {
  readonly entry: PublishedEntry | undefined;
  readonly side: 'left' | 'right';
}): React.JSX.Element {
  return (
    <View
      testID={`builder.tray.peek.${side}`}
      style={{
        width: TRAY_PEEK,
        overflow: 'hidden',
        alignItems: side === 'left' ? 'flex-end' : 'flex-start',
      }}
      {...HIDDEN}
    >
      {entry === undefined ? null : (
        <Swatch
          name={entry.entry.name.en}
          hex={entry.derived.hex}
          color={colorFor(entry.entry)}
          width={TILE_WIDTH}
          height={TILE_HEIGHT}
          corner="sm"
          group={false}
        />
      )}
    </View>
  );
}

function TrayRow({
  tray,
  previous,
  following,
  handSlug,
  t,
  hintFor,
  onChoose,
  onPage,
  atStart,
  atEnd,
}: {
  readonly tray: readonly PublishedEntry[];
  readonly previous: PublishedEntry | undefined;
  readonly following: PublishedEntry | undefined;
  readonly handSlug: string | null;
  readonly t: T;
  readonly hintFor: (slug: string) => string | undefined;
  readonly onChoose: (slug: string) => void;
  readonly onPage: (by: -1 | 1) => void;
  readonly atStart: boolean;
  readonly atEnd: boolean;
}): React.JSX.Element {
  return (
    <Row gap="xs" align="center">
      <Peek entry={previous} side="left" />
      <Rule vertical testID="builder.tray.divider.left" />
      <IconButton
        name="chevron-left"
        label={t('palettes.previous')}
        color="foreground.2"
        size={CHEVRON_GLYPH}
        disabled={atStart}
        onPress={() => {
          onPage(-1);
        }}
        testID="builder.tray.previous"
      />
      <View style={{ flex: 1 }}>
        <Row gap="xs" justify="between" align="center">
          {tray.map((entry, index) => (
            <Tile
              key={entry.entry.slug}
              index={index}
              entry={entry}
              chosen={entry.entry.slug === handSlug}
              hint={hintFor(entry.entry.slug)}
              onChoose={onChoose}
            />
          ))}
        </Row>
      </View>
      <IconButton
        name="chevron-right"
        label={t('palettes.next')}
        color="foreground.2"
        size={CHEVRON_GLYPH}
        disabled={atEnd}
        onPress={() => {
          onPage(1);
        }}
        testID="builder.tray.next"
      />
      <Rule vertical testID="builder.tray.divider.right" />
      <Peek entry={following} side="right" />
    </Row>
  );
}
