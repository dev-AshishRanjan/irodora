/**
 * Palette Studio — mockup `10` (F-251): the curated palettes and the person's own, each shown as one
 * thing with what it is, where it came from, and what the engine computes of it (FR-22, FR-23, FR-49).
 *
 * ## Two forms, by category (ADR-0164 D1)
 *
 * A kasane is its layers drawn apart, outermost first, the hex on each (form 2). Every other palette is
 * a band of its members at the record's weights — order is proportion (F-151) — with its columns,
 * badges and actions beneath (form 1). Curated and personal palettes take the same two forms; the
 * words say which is which (ADR-0067).
 *
 * ## The band is shown, not judged (ADR-0162)
 *
 * A palette shown for choosing is drawn at `10`'s height; its figures are computed from the values and
 * name their model. The judgeable floor stays where a difference is judged by eye (`08`, `Pair`).
 *
 * ## Nothing here computes
 *
 * `palette-readout.ts` decides every word and figure; this file composes `10`. Building a palette is
 * `16`, the route's draft state (`PaletteBuilder`).
 */

import { memo, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import {
  Appear,
  Arrival,
  Button,
  Card,
  Chip,
  ChoiceGroup,
  EmptyState,
  IconButton,
  Illustration,
  Row,
  Screen,
  Sheet,
  Stack,
  Strip,
  Swatch,
  Text,
  type Script,
} from '@irodora/ui';
import type { WornCombination } from '../outfit/fromWear';
import type { PaletteStore } from '../palette';
import { fitsSlots } from '../palette';
import {
  BADGE,
  BAND_HEIGHT,
  CARD_ACTION,
  cardForm,
  columnLines,
  contrastBadge,
  CREATE,
  curatedOrder,
  curatedShown,
  descriptionLine,
  EXPORT_SELECTED,
  exportHref,
  kindLabel,
  labHandOff,
  LAYER_HEIGHT,
  layeringTag,
  personalShown,
  provenanceLine,
  provenanceTag,
  separationBadge,
  SOURCE_HEIGHT,
  STUDIO_APP_BAR,
  STUDIO_ART,
  titleLine,
  type ShownMember,
  type ShownPalette,
} from '../palette-readout';
import { japaneseRun, type MessageKey } from '../i18n';
import { useMessages } from '../i18n/useMessages';
import type { ScreenStates } from '../states';

/**
 * What this screen shows in each data condition it can reach (F-236, ADR-0129). Absent: *My Custom
 * Palettes* with none saved — `00`'s caption, and *Create New Palette* above resolves it.
 */
export const STATES = { absent: 'empty' } as const satisfies ScreenStates;

/** The two views the segmented control switches between (ADR-0165 D2). */
export type StudioView = 'curated' | 'custom';

/** Four columns a row beneath the band (ADR-0164 D2). */
const COLUMNS = 4;

/** Words laid over a sample are read by the sample's own name, once (F-248's tile form). */
const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants' as const,
};

type T = (key: MessageKey) => string;

interface CardProps {
  readonly palette: ShownPalette;
  readonly t: T;
  readonly script: Script;
  /** The Lab ranks against a profile; without one, *Apply* is disabled and says why. */
  readonly hasProfile: boolean;
  readonly onApply: ((combination: WornCombination) => void) | undefined;
  readonly onExport: ((href: string) => void) | undefined;
  readonly onMore: ((palette: ShownPalette) => void) | undefined;
}

/** The two badges, a bullet between them as `10` draws it. */
function Badges({
  words,
  script,
  testID,
}: {
  readonly words: readonly string[];
  readonly script: Script;
  readonly testID: string;
}): React.JSX.Element {
  return (
    <Row gap="xs" wrap align="center">
      {words.map((word, i) => (
        <Row key={word} gap="xs" align="center">
          {i === 0 ? null : (
            <Text size="caption" color="foreground.2" {...HIDDEN}>
              •
            </Text>
          )}
          <Chip
            form="badge"
            label={word}
            fill="surface.3"
            radius="pill"
            height={BADGE}
            size="caption"
            numeric
            wrap
            script={script}
            testID={`${testID}.${String(i)}`}
          />
        </Row>
      ))}
    </Row>
  );
}

/** A title row: the title, and on a personal palette the overflow that edits or deletes it. */
function TitleRow({
  palette,
  t,
  script,
  onMore,
  id,
}: {
  readonly palette: ShownPalette;
  readonly t: T;
  readonly script: Script;
  readonly onMore: CardProps['onMore'];
  readonly id: string;
}): React.JSX.Element {
  return (
    <Row gap="xs" align="center">
      <View style={{ flex: 1 }}>
        <Text
          size="body"
          weight={600}
          color="foreground"
          heading
          script={script}
          testID={`${id}.title`}
        >
          {titleLine(palette)}
        </Text>
      </View>
      {palette.origin === 'personal' && onMore !== undefined ? (
        <IconButton
          name="more"
          label={`${t('palettes.more')} ${titleLine(palette)}`}
          color="foreground.2"
          onPress={() => {
            onMore(palette);
          }}
          testID={`${id}.more`}
        />
      ) : null}
    </Row>
  );
}

/**
 * Form 1 (`10.palette-1`): the band at the record's weights, its columns, the two badges and the two
 * actions. At module scope and memoised (F-250 S3).
 */
const BandCard = memo(function BandCard({
  palette,
  t,
  script,
  hasProfile,
  onApply,
  onExport,
  onMore,
}: CardProps): React.JSX.Element {
  const id = `studio.palette.${palette.key}`;
  const rows = useMemo(() => {
    const out: ShownMember[][] = [];
    palette.members.forEach((m, i) => {
      if (i % COLUMNS === 0) out.push([]);
      out[out.length - 1]?.push(m);
    });
    return out;
  }, [palette.members]);
  const badges = [
    contrastBadge(palette.members, t),
    separationBadge(palette.members, t, script),
  ].filter((w): w is string => w !== null);
  return (
    <Card level="1" radius="sm" padding="md" testID={id}>
      <TitleRow palette={palette} t={t} script={script} onMore={onMore} id={id} />
      <View style={{ marginTop: nativeSpacing.xs, gap: nativeSpacing.xs }}>
        <Text size="caption" color="foreground.2" script={script} testID={`${id}.description`}>
          {descriptionLine(palette, t, script)}
        </Text>
        <Text
          size="caption"
          color="foreground.2"
          numeric
          script={script}
          testID={`${id}.provenance`}
        >
          {provenanceLine(palette, t, script)}
        </Text>
      </View>
      <View style={{ marginTop: nativeSpacing.sm }}>
        <Strip
          judged={false}
          height={BAND_HEIGHT}
          corner="sm"
          keyline
          members={palette.members.map((m) => ({ name: m.name, hex: m.hex, color: m.color }))}
          weights={palette.members.map((m) => m.weight)}
          testID={`${id}.band`}
        />
      </View>
      <View style={{ marginTop: nativeSpacing.xs, gap: nativeSpacing.sm }}>
        {rows.map((row, r) => (
          <Row key={String(r)} gap="xs" align="start">
            {Array.from({ length: COLUMNS }, (_, c) => {
              const member = row[c];
              if (member === undefined) return <View key={String(c)} style={{ flex: 1 }} />;
              const lines = columnLines(member, t);
              const n = r * COLUMNS + c;
              return (
                <View
                  key={member.slug}
                  style={{ flex: 1, alignItems: 'center', gap: nativeSpacing.xs }}
                  testID={`${id}.column.${String(n)}`}
                >
                  <Text size="caption" color="foreground.2" align="center" script={script}>
                    {lines.role}
                  </Text>
                  <Text size="caption" color="foreground" align="center" numeric selectable>
                    {lines.hex}
                  </Text>
                  <Text
                    size="caption"
                    color="foreground.2"
                    align="center"
                    face="gothic"
                    script="japanese"
                  >
                    {lines.name}
                  </Text>
                  {lines.english === null ? null : (
                    <Text size="caption" color="foreground.2" align="center" script={script}>
                      {lines.english}
                    </Text>
                  )}
                </View>
              );
            })}
          </Row>
        ))}
      </View>
      {badges.length === 0 ? null : (
        <View style={{ marginTop: nativeSpacing.sm, gap: nativeSpacing.xs }}>
          <Text size="caption" color="foreground.2" script={script}>
            {t('palettes.badges')}
          </Text>
          <Badges words={badges} script={script} testID={`${id}.badge`} />
        </View>
      )}
      <View style={{ marginTop: nativeSpacing.sm, gap: nativeSpacing.xs }}>
        <Row gap="xs">
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              edge="border"
              label={t('palettes.applyToLab')}
              height={CARD_ACTION}
              radius="sm"
              script={script}
              disabled={!hasProfile || onApply === undefined}
              onPress={() => {
                onApply?.(labHandOff(palette.members));
              }}
              testID={`${id}.apply`}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              edge="border"
              label={t('palettes.exportTokens')}
              height={CARD_ACTION}
              radius="sm"
              script={script}
              disabled={onExport === undefined}
              onPress={() => {
                onExport?.(exportHref(palette, 'tokens'));
              }}
              testID={`${id}.export`}
            />
          </View>
        </Row>
        {hasProfile ? null : (
          <Text size="caption" color="foreground.2" script={script} testID={`${id}.applyReason`}>
            {t('palettes.applyNeedsProfile')}
          </Text>
        )}
      </View>
    </Card>
  );
});

/**
 * Form 2 (`10.palette-2`): a kasane's layers drawn apart, the hex on each in the ink its layer takes
 * (C8), the kind above and the tags beneath. At module scope and memoised.
 */
const LayerCard = memo(function LayerCard({
  palette,
  t,
  script,
  onMore,
}: CardProps): React.JSX.Element {
  const id = `studio.palette.${palette.key}`;
  return (
    <Card level="1" radius="sm" padding="md" testID={id}>
      <Text size="caption" color="foreground.2" script={script} testID={`${id}.kind`}>
        {kindLabel(palette, t)}
      </Text>
      <View style={{ marginTop: nativeSpacing.xs }}>
        <TitleRow palette={palette} t={t} script={script} onMore={onMore} id={id} />
      </View>
      <View style={{ marginTop: nativeSpacing.sm }}>
        <Row gap="xs">
          {Array.from({ length: COLUMNS }, (_, i) => {
            const member = palette.members[i];
            if (member === undefined) return <View key={String(i)} style={{ flex: 1 }} />;
            const sample = { hex: member.hex, color: member.color };
            return (
              <View key={member.slug} style={{ flex: 1 }} testID={`${id}.layer.${String(i)}`}>
                <Swatch
                  name={member.name}
                  hex={member.hex}
                  color={member.color}
                  width="fill"
                  height={LAYER_HEIGHT}
                  corner="sm"
                  keyline
                  group={false}
                >
                  <View
                    pointerEvents="none"
                    style={{ flexGrow: 1, justifyContent: 'flex-end', padding: nativeSpacing.xs }}
                    {...HIDDEN}
                  >
                    <Text size="caption" weight={500} on={sample} numeric align="center">
                      {member.hex}
                    </Text>
                  </View>
                </Swatch>
              </View>
            );
          })}
        </Row>
      </View>
      <View style={{ marginTop: nativeSpacing.sm }}>
        <Badges
          words={[layeringTag(t), provenanceTag(palette, t)]}
          script={script}
          testID={`${id}.tag`}
        />
      </View>
    </Card>
  );
});

export interface PaletteStudioProps {
  /** Where the person's palettes are read and deleted. */
  readonly store: PaletteStore;
  /** The view to open on: the route's `view`. */
  readonly initialView?: StudioView;
  /** Whether a profile is stored: the Outfit Lab ranks against one (ADR-0165 D2). */
  readonly hasProfile?: boolean;
  /** Back to the Atlas. Absent in the conformance suite, and then no back is drawn. */
  readonly onBack?: () => void;
  /** *Create New Palette*: `16`, an empty draft. */
  readonly onCreate?: () => void;
  /** *Apply to Outfit Lab*: the combination handed to the Lab (E-219). */
  readonly onApply?: (combination: WornCombination) => void;
  /** *Export Tokens* and the chooser: the export screen at this address. */
  readonly onExport?: (href: string) => void;
  /** *Edit this palette*: `16`, holding it. */
  readonly onEdit?: (id: string) => void;
}

export function PaletteStudio({
  store,
  initialView = 'curated',
  hasProfile = false,
  onBack,
  onCreate,
  onApply,
  onExport,
  onEdit,
}: PaletteStudioProps): React.JSX.Element {
  const { t, script } = useMessages();
  const [view, setView] = useState<StudioView>(initialView);
  const [stored, setStored] = useState(() => store.listPalettes());
  const [choosing, setChoosing] = useState(false);
  const [more, setMore] = useState<ShownPalette | null>(null);

  const curated = useMemo(() => curatedOrder().map(curatedShown), []);
  // Newest first (ADR-0164 D1): the store lists in creation order.
  const personal = useMemo(() => [...stored].reverse().map(personalShown), [stored]);
  const shown = view === 'curated' ? curated : personal;

  const onMore = onEdit === undefined ? undefined : setMore;
  const moreStored = more === null ? undefined : stored.find((p) => p.id === more.id);
  const editable = moreStored !== undefined && fitsSlots(moreStored.members);

  return (
    <Screen
      script={script}
      padding="md"
      appBar={{
        height: STUDIO_APP_BAR,
        inset: nativeSpacing.md,
        gap: nativeSpacing.sm,
        script,
        ...(onBack === undefined
          ? {}
          : {
              back: {
                glyph: 'back' as const,
                label: t('tab.atlas'),
                name: t('detail.backToAtlas'),
                ink: 'foreground.2' as const,
                onPress: onBack,
              },
            }),
        title: {
          text: t('studio.title'),
          // In Japanese the run is the title itself (ADR-0164 D8; the OQ-48 interim).
          ...(script === 'japanese' ? {} : { ja: japaneseRun('studio.title') }),
          align: 'leading',
          placement: 'below',
          layout: 'inline',
          size: 'body',
          weight: 600,
        },
        trailing: {
          button: {
            variant: 'secondary',
            edge: 'border',
            glyph: 'plus',
            label: t('palettes.create'),
            height: CREATE,
            radius: 'sm',
            step: 'caption',
            inset: 'sm',
            script,
            disabled: onCreate === undefined,
            onPress: () => {
              onCreate?.();
            },
            testID: 'studio.create',
          },
        },
      }}
      actionBar={{
        actions: [
          {
            variant: 'tonal',
            level: 'strong',
            label: t('palettes.exportSelected'),
            height: EXPORT_SELECTED,
            radius: 'sm',
            step: 'label',
            script,
            disabled: onExport === undefined || shown.length === 0,
            onPress: () => {
              setChoosing(true);
            },
            testID: 'studio.exportSelected',
          },
        ],
        padding: { top: nativeSpacing.lg, side: nativeSpacing.md, bottom: nativeSpacing.lg },
        script,
      }}
    >
      {/*
        THE ART, behind everything (F-247's lesson; ADR-0166 D7): `10`'s leaves down the right margin,
        under the opaque cards. No word sits on a stroke.
      */}
      <View
        pointerEvents="none"
        testID="studio.art"
        style={{
          position: 'absolute',
          top: STUDIO_ART.top - STUDIO_APP_BAR,
          right: 0,
          width: STUDIO_ART.width,
        }}
      >
        <Illustration
          name="leaves"
          tone="backdrop"
          color="foreground"
          width={STUDIO_ART.width}
          testID="studio.art.leaves"
        />
      </View>

      <ChoiceGroup
        label={t('palettes.view')}
        value={view}
        options={[
          { value: 'curated', label: t('palettes.curated') },
          { value: 'custom', label: t('palettes.custom') },
        ]}
        onChange={(v) => {
          if (v !== null) setView(v);
        }}
        segmented={{
          mark: 'dot',
          height: SOURCE_HEIGHT,
          radius: 'pill',
          edge: 'border',
          selectedFill: 'surface.3',
        }}
        script={script}
        testID="studio.view"
      />

      {shown.length === 0 ? (
        <EmptyState
          message={t('studio.none')}
          hint={t('palettes.noneHint')}
          resolvedHere
          script={script}
        />
      ) : (
        /* A LIST ARRIVES ONCE (F-266): each view's cards stagger in the first time they are drawn. */
        <Arrival key={view}>
          <Stack gap="sm">
            {shown.map((palette, index) => (
              <Appear key={palette.key} index={index}>
                {cardForm(palette.category) === 'layers' ? (
                  <LayerCard
                    palette={palette}
                    t={t}
                    script={script}
                    hasProfile={hasProfile}
                    onApply={onApply}
                    onExport={onExport}
                    onMore={onMore}
                  />
                ) : (
                  <BandCard
                    palette={palette}
                    t={t}
                    script={script}
                    hasProfile={hasProfile}
                    onApply={onApply}
                    onExport={onExport}
                    onMore={onMore}
                  />
                )}
              </Appear>
            ))}
          </Stack>
        </Arrival>
      )}

      {/*
        EXPORT SELECTED (ADR-0165 D2, E4): `03`'s floating sheet listing this view's palettes, one to
        choose. The rest state stays as `10` draws it: no card is marked selected.
      */}
      <Sheet
        form="floating"
        open={choosing}
        onOpenChange={setChoosing}
        title={t('palettes.chooseExport')}
        closeLabel={t('palettes.chooseClose')}
        handleLabel={t('palettes.chooseHandle')}
        handleHint={t('palettes.chooseHandleHint')}
        testID="studio.chooser"
      >
        <Stack gap="xs">
          {shown.map((palette) => (
            <Pressable
              key={palette.key}
              testID={`studio.chooser.${palette.key}`}
              accessibilityRole="button"
              accessibilityLabel={titleLine(palette)}
              onPress={() => {
                setChoosing(false);
                onExport?.(exportHref(palette));
              }}
              style={{ minHeight: nativeTapTarget, justifyContent: 'center' }}
            >
              <Text size="label" color="foreground" script={script}>
                {titleLine(palette)}
              </Text>
            </Pressable>
          ))}
        </Stack>
      </Sheet>

      {/* A PERSONAL PALETTE'S OVERFLOW (ADR-0165 D2, E4): Edit, and Delete on its own row. */}
      <Sheet
        form="floating"
        open={more !== null}
        onOpenChange={(open) => {
          if (!open) setMore(null);
        }}
        title={more === null ? t('palettes.more') : `${t('palettes.more')} ${titleLine(more)}`}
        closeLabel={t('palettes.chooseClose')}
        handleLabel={t('palettes.chooseHandle')}
        handleHint={t('palettes.chooseHandleHint')}
        testID="studio.more"
      >
        {more === null ? null : (
          <Stack gap="sm">
            <Button
              variant="secondary"
              edge="border"
              label={t('palettes.edit')}
              radius="sm"
              script={script}
              disabled={!editable}
              onPress={() => {
                setMore(null);
                onEdit?.(more.id);
              }}
              testID="studio.more.edit"
            />
            {editable ? null : (
              <Text
                size="caption"
                color="foreground.2"
                script={script}
                testID="studio.more.editReason"
              >
                {t('palettes.editUnfit')}
              </Text>
            )}
            <Button
              variant="secondary"
              edge="border"
              label={t('studio.delete')}
              radius="sm"
              script={script}
              onPress={() => {
                store.deletePalette(more.id, Date.now());
                setStored(store.listPalettes());
                setMore(null);
              }}
              testID="studio.more.delete"
            />
          </Stack>
        )}
      </Sheet>
    </Screen>
  );
}
