/**
 * One colour, and everything the record carries.
 *
 * ## Why this screen is long
 *
 * FR-21 promises every field present or explicitly `null` **with a reason**, and FR-24 promises
 * provenance on the colour surface rather than on a legal page. Both are promises about what a
 * reader can *see*, so a shorter screen would be a smaller promise. The `unknowns` reasons are
 * rendered where the value would have been — which is the only place they mean anything.
 *
 * ## Three things this screen must not get wrong
 *
 * 1. **The classification is displayed** (FR-23). The renderer switches on it and it cannot
 *    default, because the whole point is that the UI never presents our own curation as
 *    historical. For the seed corpus every entry is `japanese-inspired`, and the label says so
 *    in plain words rather than as a tag a reader has to decode.
 * 2. **`reviewIndependence` reaches a reader.** F-084's attested criterion, discharged here:
 *    if the label never renders, the honesty is confined to a JSON field and ADR-0060 bought
 *    nothing over simply dropping the author-reviewer rule.
 * 3. **No value is recomputed.** Every coordinate comes from `derived`, computed by the engine
 *    at publish time and frozen. The one place the engine *is* called is the colour-vision
 *    block, because a simulation is a derived answer the bundle does not carry — which is the
 *    distinction criterion 3 draws, and `verify-guards.mjs` boundary #24 enforces.
 */

import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { simulateAnomalous, type Deficiency } from '@irodora/cvd-engine';
import { srgbToHex } from '@irodora/color-spaces';
import { Button, Row, Screen, Stack, Surface, Swatch, Text, useTheme } from '@irodora/ui';
import {
  colorFor,
  familyLabel,
  entryBySlug,
  palettesContaining,
  resolveSlugs,
  type CorpusEntry,
  type PublishedEntry,
} from '../corpus';
import { CHROMA_KEYS, LIGHTNESS_KEYS, SEASON_KEYS, TEMPERATURE_KEYS } from './Atlas';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/**
 * Corpus vocabulary → catalogue key, as total records.
 *
 * A value the corpus can hold and the catalogue cannot name is a compile error rather than a
 * blank line on the screen a reader is using to decide whether to trust us.
 */
/**
 * Classification → its label.
 *
 * Exported since F-023 so the card uses the SAME map. Two copies of the FR-23 vocabulary would
 * drift, and the one that drifts would be the one on the artefact that leaves the app with none
 * of its context.
 */
export const CLASSIFICATION_KEYS = {
  historical: 'classification.historical',
  traditional: 'classification.traditional',
  'modern-japanese': 'classification.modern-japanese',
  'japanese-inspired': 'classification.japanese-inspired',
  editorial: 'classification.editorial',
} as const satisfies Record<string, MessageKey>;

const SOURCE_TYPE_KEYS = {
  measurement: 'sourceType.measurement',
  publication: 'sourceType.publication',
  'museum-record': 'sourceType.museum-record',
  editorial: 'sourceType.editorial',
  standard: 'sourceType.standard',
} as const satisfies Record<string, MessageKey>;

const INDEPENDENCE_KEYS = {
  independent: 'independence.independent',
  self: 'independence.self',
} as const satisfies Record<string, MessageKey>;

const ROLE_KEYS = {
  anchor: 'role.anchor',
  neutral: 'role.neutral',
  light: 'role.light',
  accent: 'role.accent',
} as const satisfies Record<string, MessageKey>;

/**
 * The three colour-vision types, and the key each announces under.
 *
 * Typed `Record<Deficiency, MessageKey>` rather than `satisfies` alone, so indexing by a
 * `Deficiency` is total: a fourth deficiency added to the engine would be a compile error here
 * rather than a blank label on the screen.
 */
const CVD_KEYS: Record<Deficiency, MessageKey> = {
  protan: 'cvd.protan',
  deutan: 'cvd.deutan',
  tritan: 'cvd.tritan',
};

/**
 * The strongest severity Machado tabulates.
 *
 * `simulateAnomalous` rather than `simulateDichromacy`, and the reason is in the engine
 * rather than in a preference: `VIENOT_1999` deliberately has **no tritan entry**, because
 * Viénot's single-plane simplification is not accurate for it and publishing one anyway would
 * be inventing a value the source does not. `simulateDichromacy('tritan')` throws, by design.
 *
 * So the block models **anomalous trichromacy at maximum severity**, which Machado's tables do
 * cover for all three — and the copy says "red-weak" rather than "protanopia", because the two
 * are different conditions and the label has to match the model that produced the swatch.
 */
const CVD_SEVERITY = 1;

const triple = (t: readonly number[], places = 3): string =>
  t.map((n) => n.toFixed(places)).join('  ');

export interface ColourDetailProps {
  readonly slug: string;
  /**
   * Open this colour's card. Supplied by the route, absent in the conformance suite.
   *
   * Same shape and same reason as Home's: a card nothing routes to is 120 documents nobody
   * can reach [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
   */
  readonly onOpenCard?: (slug: string) => void;
}

export function ColourDetail({ slug, onOpenCard }: ColourDetailProps): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script, locale } = useMessages();
  const found = entryBySlug(slug);

  if (found === null)
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: nativeSpacing.xl }}>
        <Text size="body" color="foreground" script={script}>
          {t('detail.notFound')}
        </Text>
      </View>
    );

  const { entry, derived } = found;

  /** A labelled row. `value === null` renders the recorded reason where the value would be. */
  function DetailRow({
    label,
    value,
    reasonFor,
  }: {
    readonly label: string;
    readonly value: string | null;
    readonly reasonFor?: string;
  }): React.JSX.Element {
    const reason = reasonFor === undefined ? undefined : entry.unknowns[reasonFor];
    return (
      <View style={{ gap: nativeSpacing.xs, paddingVertical: nativeSpacing.xs }}>
        <Text size="label" color="foreground.2" script={script}>
          {label}
        </Text>
        {value !== null ? (
          <Text size="small" color="foreground" script={script}>
            {value}
          </Text>
        ) : (
          /*
            FR-21's "no silent blanks", rendered. The reason the field is empty is worth more
            to a reader than the emptiness, and it is the thing the gate spent a rule on.
          */
          <Text size="small" color="foreground.2" script={script}>
            {reason === undefined
              ? t('detail.notRecorded')
              : `${t('detail.notRecorded')} — ${reason}`}
          </Text>
        )}
      </View>
    );
  }

  function DetailSection({
    title,
    children,
  }: {
    readonly title: string;
    readonly children: React.ReactNode;
  }): React.JSX.Element {
    return (
      <Surface level="1" padding="lg">
        <Stack gap="xs">
          <Text size="body" color="foreground" script={script} heading>
            {title}
          </Text>
          {children}
        </Stack>
      </Surface>
    );
  }

  function RelatedList({
    label,
    slugs,
  }: {
    readonly label: string;
    readonly slugs: readonly string[];
  }): React.JSX.Element {
    const resolved: readonly PublishedEntry[] = resolveSlugs(slugs);
    return (
      <View style={{ gap: nativeSpacing.xs, paddingVertical: nativeSpacing.xs }}>
        <Text size="label" color="foreground.2" script={script}>
          {label}
        </Text>
        {resolved.length === 0 ? (
          <Text size="small" color="foreground.2" script={script}>
            {t('rel.none')}
          </Text>
        ) : (
          <Row gap="sm" wrap>
            {resolved.map((r) => (
              <View key={r.entry.slug} style={{ alignItems: 'center', gap: nativeSpacing.xs }}>
                <Swatch
                  name={r.entry.name.en}
                  hex={r.derived.hex}
                  color={colorFor(r.entry)}
                  size={44}
                />
                <Text size="xs" color="foreground.2" script={script}>
                  {r.entry.name.en}
                </Text>
              </View>
            ))}
          </Row>
        )}
      </View>
    );
  }

  const seasons = entry.taxonomy.season;
  const palettes = palettesContaining(entry.slug);

  /*
   * The one engine call on this screen, and it is a DERIVED ANSWER rather than a stored value.
   * The bundle carries what the colour IS; what it looks like to someone with a colour-vision
   * deficiency is a question the bundle does not answer and the engine does. That is the
   * distinction criterion 3 draws, and boundary #24 enforces.
   *
   * The INPUT is `derived.rgb` — the bundle's own gamut-mapped, ENCODED sRGB. Machado's
   * matrices are applied to encoded sRGB (see `simulateAnomalous`), and the first draft of
   * this passed `entry.color.xyz`, which type-checks perfectly because both are `Triple` and
   * returns a plausible wrong colour. Same trap as handing OKLCh to ΔE00.
   */
  const cvd = (Object.keys(CVD_KEYS) as Deficiency[]).map((kind) => ({
    kind,
    hex: srgbToHex(simulateAnomalous(derived.rgb, kind, CVD_SEVERITY)),
  }));

  return (
    /*
      NO `title` PROP, DELIBERATELY. This screen's heading is the entry's kanji set beside the
      sample, not a page title above it — the colour and its name are one object here. Passing
      a title would put a second heading above that pairing and break it.

      That composition is F-148's subject, and this feature deliberately does not touch it: the
      wrapper changes, the header does not.
    */
    <Screen script={script}>
      <Row gap="lg">
        <Swatch name={entry.name.en} hex={derived.hex} color={colorFor(entry)} size={96} />
        <View style={{ gap: nativeSpacing.xs, flexShrink: 1 }}>
          <Text size="title" color="foreground" script={script} heading>
            {entry.name.kanji}
          </Text>
          <Text size="body" color="foreground" script={script}>
            {entry.name.en}
          </Text>
          {/*
            FR-23, on the surface. This label is the difference between an honest corpus and a
            corpus that merely stores an honest field.
          */}
          <Text size="small" color="foreground.2" script={script}>
            {t(CLASSIFICATION_KEYS[entry.classification])}
          </Text>
        </View>
      </Row>

      <DetailSection title={t('detail.names')}>
        <DetailRow label={t('detail.kanji')} value={entry.name.kanji} />
        <DetailRow label={t('detail.kana')} value={entry.name.kana} />
        <DetailRow label={t('detail.romaji')} value={entry.name.romaji} />
        <DetailRow label={t('detail.english')} value={entry.name.en} />
      </DetailSection>

      <DetailSection title={t('detail.description')}>
        <Text size="small" color="foreground" script={script}>
          {entry.editorial.description_en}
        </Text>
        <Text size="small" color="foreground" script="japanese">
          {entry.editorial.description_ja}
        </Text>
        <DetailRow
          label={t('detail.contemporary')}
          value={entry.editorial.contemporaryNote_en}
          reasonFor="editorial.contemporaryNote_en"
        />
        <DetailRow
          label={t('detail.fashionUse')}
          value={entry.editorial.fashionUse === null ? null : entry.editorial.fashionUse.join(', ')}
          reasonFor="editorial.fashionUse"
        />
      </DetailSection>

      <DetailSection title={t('detail.coordinates')}>
        <DetailRow label={t('coord.xyz')} value={triple(entry.color.xyz, 6)} />
        <DetailRow label={t('coord.lab')} value={triple(derived.lab)} />
        <DetailRow label={t('coord.lch')} value={triple(derived.lch)} />
        <DetailRow label={t('coord.oklch')} value={triple(derived.oklch)} />
        <DetailRow label={t('coord.rgb')} value={triple(derived.rgb)} />
        <DetailRow label={t('colour.hex')} value={derived.hex} />
        {/*
          ADR-0031: "closest digital reference" is only an honest phrase when a number stands
          behind it, so the number is here rather than the phrase alone.
        */}
        <DetailRow
          label={derived.inSrgbGamut ? t('coord.inGamut') : t('coord.outOfGamut')}
          value={`${t('coord.renderDifference')} ${t('colour.differenceUnit')} ${derived.renderDeltaE00.toFixed(2)}`}
        />
      </DetailSection>

      <DetailSection title={t('detail.taxonomy')}>
        <DetailRow label={t('filter.family')} value={familyLabel(entry.taxonomy.family, locale)} />
        <DetailRow
          label={t('filter.temperature')}
          value={t(TEMPERATURE_KEYS[entry.taxonomy.temperature])}
        />
        <DetailRow
          label={t('filter.lightness')}
          value={
            entry.taxonomy.lightnessBand === null
              ? null
              : t(LIGHTNESS_KEYS[entry.taxonomy.lightnessBand])
          }
          reasonFor="taxonomy.lightnessBand"
        />
        <DetailRow
          label={t('filter.chroma')}
          value={
            entry.taxonomy.chromaBand === null ? null : t(CHROMA_KEYS[entry.taxonomy.chromaBand])
          }
          reasonFor="taxonomy.chromaBand"
        />
        <DetailRow
          label={t('filter.season')}
          value={seasons === null ? null : seasons.map((s) => t(SEASON_KEYS[s])).join(', ')}
          reasonFor="taxonomy.season"
        />
      </DetailSection>

      <DetailSection title={t('detail.provenance')}>
        <DetailRow label={t('prov.source')} value={entry.provenance.source} />
        <DetailRow label={t('prov.sourceId')} value={entry.provenance.sourceId} />
        <DetailRow
          label={t('prov.sourceType')}
          value={t(SOURCE_TYPE_KEYS[entry.provenance.sourceType])}
        />
        <DetailRow label={t('prov.licence')} value={entry.provenance.sourceLicence} />
        <DetailRow
          label={t('prov.rightsHolder')}
          value={entry.provenance.rightsHolder}
          reasonFor="provenance.rightsHolder"
        />
        <DetailRow
          label={t('prov.publisher')}
          value={entry.provenance.publisher}
          reasonFor="provenance.publisher"
        />
        <DetailRow
          label={t('prov.publishedYear')}
          value={
            entry.provenance.publishedYear === null ? null : String(entry.provenance.publishedYear)
          }
          reasonFor="provenance.publishedYear"
        />
        <DetailRow
          label={t('prov.url')}
          value={entry.provenance.sourceUrl}
          reasonFor="provenance.sourceUrl"
        />
        <DetailRow label={t('prov.derivation')} value={entry.provenance.derivation} />
        <DetailRow label={t('prov.author')} value={entry.provenance.authoredBy} />
        <DetailRow label={t('prov.reviewer')} value={entry.provenance.verifiedBy} />
        <DetailRow label={t('prov.reviewedAt')} value={entry.provenance.verifiedAt} />
        {/*
          F-084's attested criterion, discharged. `self` is a weaker claim than `independent`
          and it is stated in words rather than as a code, because a reader deciding whether to
          trust an entry should not have to know our vocabulary.
        */}
        <DetailRow
          label={t('prov.independence')}
          value={
            entry.provenance.reviewIndependence === null
              ? null
              : t(INDEPENDENCE_KEYS[entry.provenance.reviewIndependence])
          }
        />
        <DetailRow label={t('detail.editorialNotes')} value={entry.provenance.editorialNotes} />
      </DetailSection>

      <DetailSection title={t('detail.relations')}>
        <RelatedList label={t('rel.related')} slugs={entry.relations.related} />
        <RelatedList label={t('rel.complementary')} slugs={entry.relations.complementary} />
        <RelatedList
          label={t('rel.historicalVariants')}
          slugs={entry.relations.historicalVariants}
        />
      </DetailSection>

      <DetailSection title={t('detail.palettes')}>
        {palettes.length === 0 ? (
          <Text size="small" color="foreground.2" script={script}>
            {t('rel.none')}
          </Text>
        ) : (
          palettes.map(({ palette, role }) => (
            <DetailRow
              key={palette.slug}
              label={palette.name.en}
              value={`${palette.name.ja} · ${t(ROLE_KEYS[role as keyof typeof ROLE_KEYS])}`}
            />
          ))
        )}
      </DetailSection>

      <DetailSection title={t('detail.colourVision')}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: nativeSpacing.md,
            paddingVertical: nativeSpacing.xs,
          }}
        >
          <Stack gap="xs" align="center">
            <Swatch name={entry.name.en} hex={derived.hex} color={colorFor(entry)} size={44} />
            <Text size="xs" color="foreground.2" script={script}>
              {t('cvd.normal')}
            </Text>
          </Stack>
          {cvd.map(({ kind, hex }) => (
            <View key={kind} style={{ alignItems: 'center', gap: nativeSpacing.xs }}>
              {/*
                The accessible name carries which deficiency this is, so the swatches are not
                distinguished by colour alone (golden rule 13) — which in a colour-vision block
                would be a particularly poor joke. The `Color` is still the corpus entry's,
                because provenance describes where the COLOUR came from and the simulation is a
                rendering of it, not a second measurement.
              */}
              <Swatch
                name={`${entry.name.en} — ${t(CVD_KEYS[kind])}`}
                hex={hex}
                color={colorFor(entry)}
                size={44}
              />
              <Text size="xs" color="foreground.2" script={script}>
                {t(CVD_KEYS[kind])}
              </Text>
            </View>
          ))}
        </View>
        <Text size="small" color="foreground.2" script={script}>
          {t('cvd.note')}
        </Text>
      </DetailSection>

      <Button
        label={t('detail.openCard')}
        variant="secondary"
        onPress={() => {
          onOpenCard?.(slug);
        }}
      />
    </Screen>
  );
}

export type { CorpusEntry };
