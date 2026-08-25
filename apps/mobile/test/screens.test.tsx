/**
 * Every screen, run through the **same** conformance suite the component library runs.
 *
 * Not a copy of it — `@irodora/ui/testing` is imported. A second implementation is a second
 * thing to keep in step, and the copy that drifts is always the one nobody is looking at.
 *
 * ## What this file is really for
 *
 * A component library can be perfectly conformant and reach no user. These assertions are over
 * the actual screens, which is where NFR-8 and NFR-9 either hold or do not
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import {
  checkAll,
  checkStatusAdjacency,
  formatFindings,
  type ConformanceSubject,
  type TestNode,
} from '@irodora/ui/testing';
import { Home } from '../src/screens/Home';
import { Atlas } from '../src/screens/Atlas';
import { ColourDetail } from '../src/screens/ColourDetail';
import { Compare } from '../src/screens/Compare';
import { PaletteStudio } from '../src/screens/PaletteStudio';
import { Finder } from '../src/screens/Finder';
import { ColourCard } from '../src/screens/ColourCard';
import { cardSvg } from '../src/card';
import { nativeColors } from '@irodora/design-tokens';
import { find } from '../src/finder';
import { toStoreWrite } from '../src/palette';
import { PALETTE_ROLES } from '@irodora/corpus';
import type { PaletteDraft, PaletteStore } from '../src/palette';
import type { StoredPalette } from '@irodora/store';
import { compare } from '../src/compare';
import { nativeNumericFeature } from '@irodora/design-tokens';
import { allEntries, CORPUS_ENTRY_COUNT, CORPUS_LABEL } from '../src/corpus';
import { simulateAnomalous, type Deficiency } from '@irodora/cvd-engine';
import { srgbToHex } from '@irodora/color-spaces';

function draw(node: React.JSX.Element, theme: 'light' | 'dark'): TestNode {
  const json = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>).toJSON();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

/**
 * THE SCREEN REGISTRY.
 *
 * A screen absent from here is a screen nothing checks. `a11y-scope.mjs` (increment 10) will
 * compare this list against the files under `app/` and fail on a screen that is missing.
 */
/**
 * Every swatch the Atlas and the detail screen draw is a corpus value.
 *
 * Read from the bundle rather than listed, because a hand-written list would go stale on the
 * next corpus publish and the failure would look like a colour-literal violation on a screen
 * nobody changed.
 */
const CORPUS_HEXES: readonly string[] = allEntries().map((e) => e.derived.hex);

/**
 * The colour-vision block draws SIMULATED colours, which are data as much as the corpus values
 * are — and are not in the bundle, so they cannot be read from it.
 *
 * Recomputed here with the same call the screen makes rather than pasted as literals: a pasted
 * list would go stale the moment the model or the corpus moved, and it would go stale silently,
 * because a wrong hex here reads as a colour-literal violation on a screen nobody touched.
 */
const CVD_HEXES: readonly string[] = allEntries().flatMap((e) =>
  (['protan', 'deutan', 'tritan'] as Deficiency[]).map((kind) =>
    srgbToHex(simulateAnomalous(e.derived.rgb, kind, 1)),
  ),
);

const SAMPLE_HEXES: readonly string[] = [...CORPUS_HEXES, ...CVD_HEXES];

/** An entry whose `complementary` is empty, so the empty branch is RENDERED, not skipped. */
const WITHOUT_COMPLEMENT = allEntries().find((e) => e.entry.relations.complementary.length === 0)!;

/**
 * The pair Compare opens on in these assertions.
 *
 * A near-white and the darkest entry in the corpus: far apart on every axis, so a row that
 * failed to render would not be hidden behind a delta that rounds to zero.
 */
const PAIR_A = 'usu-gami';
const PAIR_B = 'soko-zumi';

/** An entry that HAS a complementary, so the populated branch is rendered too. */
const WITH_COMPLEMENT = allEntries().find((e) => e.entry.relations.complementary.length > 0)!;

/**
 * An in-memory `PaletteStore`.
 *
 * The screen takes the port, not the repository: `expo-sqlite` needs a device, so a screen
 * that imported it could not be rendered here at all — and this file is where NFR-8 and NFR-9
 * are actually checked. The SQL behind the port is proven in `packages/store` against
 * `node:sqlite`, and the device driver against the same conformance suite on F-041.
 *
 * It is a real implementation rather than a stub of no-ops: `save then list` is the sequence
 * the screen depends on, and a store that accepted a write and returned nothing would make
 * every assertion about the saved list vacuously true.
 */
function fakeStore(): PaletteStore {
  const rows = new Map<string, StoredPalette>();
  return {
    savePalette(palette, now) {
      rows.set(palette.id, {
        id: palette.id,
        nameEn: palette.nameEn,
        nameJa: palette.nameJa,
        classification: palette.classification,
        category: palette.category,
        versionId: palette.versionId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        members: palette.members.map((m) => ({
          colorId: m.color.id,
          slug: m.color.corpus_slug ?? '',
          role: m.role,
          rank: m.rank,
          weight: m.weight,
          color: { ...m.color, created_at: now, updated_at: now, deleted_at: null },
        })),
      });
    },
    listPalettes: () => [...rows.values()],
    deletePalette(id) {
      rows.delete(id);
    },
  };
}

/** Three real corpus entries, with one of them the anchor — a draft the schema accepts. */
const DRAFT: PaletteDraft = {
  name: 'Evening walk',
  members: [
    { slug: allEntries()[0]!.entry.slug, role: 'anchor' },
    { slug: allEntries()[1]!.entry.slug, role: 'neutral' },
    { slug: allEntries()[2]!.entry.slug, role: 'accent' },
  ],
};

const SCREENS: readonly ConformanceSubject[] = [
  {
    name: 'screens/Home',
    // A screen is `static` for now: it reads, it does not yet accept input. The Lens (F-040)
    // brings the next interactive screen.
    kind: 'static',
    // The two samples the screen renders are DATA — arbitrary colours, not tokens. Declared
    // here in the registry rather than marked on the screen, so forgetting is a failure.
    sampleValues: ['#334B7E', '#28324D'],
    render: (_state, theme) => draw(<Home />, theme),
  },
  {
    name: 'screens/Atlas',
    // `static`, like Home — and it took a rewrite to earn that. The screen's interactive parts
    // are Chip, SearchField and Swatch, each registered in packages/ui where the suite asks
    // them to render focus, active, disabled and loading differently. A SCREEN has none of
    // those states; its controls do.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Atlas />, theme),
  },
  {
    name: 'screens/ColourDetail',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<ColourDetail slug={WITH_COMPLEMENT.entry.slug} />, theme),
  },
  {
    name: 'screens/Compare',
    // `static` for the same reason the Atlas is: its interactive parts are SearchField and
    // Swatch, both registered in packages/ui where the suite makes them render their states.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Compare initialA={PAIR_A} initialB={PAIR_B} />, theme),
  },
  {
    name: 'screens/ColourCard',
    kind: 'static',
    // The card's own colours live in an SVG document, which the tree carries as a STRING prop
    // rather than as a style the suite can read. They are checked exhaustively in card.test.ts,
    // over every entry and both themes, against the token set and the entry's own hex.
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<ColourCard slug={allEntries()[0]!.entry.slug} />, theme),
  },
  {
    name: 'screens/Finder',
    // `static`, like the rest: its one interactive part is SearchField, registered in
    // packages/ui where the suite makes it render focus, active, disabled and loading.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Finder />, theme),
  },
  {
    /*
     * The SAME screen with an answer on it. Empty and answered render almost disjoint trees —
     * an empty Finder draws no swatch, no region and no result row, so registering only that
     * would check a screen nobody has used yet.
     */
    name: 'screens/Finder (with a phrase answer)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Finder initialQuery="dark muted green" />, theme),
  },
  {
    name: 'screens/PaletteStudio',
    // `static`, like the rest: its interactive parts are TextField, SearchField, Chip, Button
    // and Swatch, each registered in packages/ui where the suite makes them render focus,
    // active, disabled and loading differently.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<PaletteStudio store={fakeStore()} />, theme),
  },
  {
    /*
     * The SAME screen with a draft in it.
     *
     * The empty and populated branches of this screen render almost disjoint trees — an empty
     * Studio draws no swatch, no role chip and no reorder control, so a registry entry for it
     * alone would check the accessibility of a screen nobody has used yet.
     */
    name: 'screens/PaletteStudio (with a draft)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<PaletteStudio store={fakeStore()} initialDraft={DRAFT} />, theme),
  },
];

describe('every screen conforms', () => {
  it('has screens to check at all', () => {
    expect(SCREENS.length).toBeGreaterThan(0);
  });

  it('produces no findings, in either theme', () => {
    const findings = checkAll(SCREENS);
    expect(formatFindings(findings)).toBe('');
  });
});

/**
 * A11 — structure is announced.
 *
 * A screen reader navigates by heading. Without the role, this screen announced as a flat run
 * of text with nothing to move through, and no contrast or colour check could ever have
 * surfaced that: the colours were all correct.
 *
 * Asserted over the RENDERED tree rather than by reading `Home.tsx`, because "the prop is in
 * the source" and "the role reached the node" are different claims — and the second is the one
 * a screen reader acts on. Whether it is SPOKEN as a heading stays a device attestation (A8).
 */
describe('the home screen has structure a screen reader can navigate (A11)', () => {
  function roles(node: TestNode, out: string[] = []): string[] {
    const here = node.props['accessibilityRole'];
    if (typeof here === 'string') out.push(here);
    for (const child of node.children ?? []) {
      if (typeof child === 'string') continue;
      roles(child, out);
    }
    return out;
  }

  for (const theme of ['light', 'dark'] as const)
    it(`announces its title as a heading in ${theme}`, () => {
      expect(roles(draw(<Home />, theme))).toContain('header');
    });
});

/**
 * Criterion 1 — **every corpus entry reachable in 3 interactions or fewer**.
 *
 * Asserted by walking the RENDERED tree for all 120 slugs with no filter applied, rather than
 * by counting interactions by hand. The design is what makes the count checkable: the root
 * lists the whole corpus, so reaching any entry is scroll-and-tap, and "reachable" does not
 * depend on a filter set nobody enumerated.
 */
describe('the Atlas root reaches every colour (F-018 criterion 1)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  it('renders every entry in the corpus with no filter applied', () => {
    const text = textOf(draw(<Atlas />, 'light')).join('\u0000');
    const missing = allEntries()
      .map((e) => e.entry.name.en)
      .filter((name) => !text.includes(name));
    expect(missing).toEqual([]);
  });

  it('draws a swatch for every entry, not only its name', () => {
    const hexes = new Set(textOf(draw(<Atlas />, 'light')));
    const shown = allEntries().filter((e) => [...hexes].some((h) => h.includes(e.derived.hex)));
    expect(shown).toHaveLength(CORPUS_ENTRY_COUNT);
  });
});

/**
 * Criterion 4 — the detail screen shows **everything the record carries**.
 *
 * Asserted by content rather than by structure: what matters is that a reader can see the
 * provenance, not that it sits in a particular node. Both the populated and the EMPTY relation
 * branches are rendered, because an empty array rendering nothing at all would satisfy any
 * assertion written only against an entry that has relations.
 */
describe('colour detail shows what the record carries (F-018 criterion 4)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  const shown = (slug: string): string =>
    textOf(draw(<ColourDetail slug={slug} />, 'light')).join('\u0000');

  it('shows all four name forms', () => {
    const { entry } = WITH_COMPLEMENT;
    const text = shown(entry.slug);
    for (const form of [entry.name.kanji, entry.name.kana, entry.name.romaji, entry.name.en])
      expect(text).toContain(form);
  });

  it('shows every coordinate system, from the bundle', () => {
    const { entry, derived } = WITH_COMPLEMENT;
    const text = shown(entry.slug);
    expect(text).toContain(derived.hex);
    // One component of each triple is enough to prove the row rendered; asserting the whole
    // formatted string would be asserting the formatter.
    expect(text).toContain(derived.lab[0].toFixed(3));
    expect(text).toContain(derived.lch[1].toFixed(3));
    expect(text).toContain(derived.oklch[2].toFixed(3));
    expect(text).toContain(derived.rgb[0].toFixed(3));
    expect(text).toContain(entry.color.xyz[0].toFixed(6));
  });

  it('shows the provenance FR-24 names, on the colour surface', () => {
    const { entry } = WITH_COMPLEMENT;
    const text = shown(entry.slug);
    expect(text).toContain(entry.provenance.source);
    expect(text).toContain(entry.provenance.sourceId);
    expect(text).toContain(entry.provenance.sourceLicence);
    expect(text).toContain(entry.provenance.derivation);
    expect(text).toContain(entry.provenance.authoredBy);
  });

  /*
   * F-084's attested criterion. If this label never reaches a reader, ADR-0060's honesty is
   * confined to a JSON field and it bought nothing over dropping the author-reviewer rule.
   */
  it('says a self-reviewed entry was checked by its own author (F-084)', () => {
    expect(WITH_COMPLEMENT.entry.provenance.reviewIndependence).toBe('self');
    expect(shown(WITH_COMPLEMENT.entry.slug)).toContain('Checked by its own author');
  });

  /*
   * FR-23 in its negative form, on the SURFACE rather than in the data. The data assertion
   * lives in corpus.test.ts; the field being right and the screen showing it are two claims.
   */
  it('presents our own curation as ours, never as historical (FR-23)', () => {
    const nodes = textOf(draw(<ColourDetail slug={WITH_COMPLEMENT.entry.slug} />, 'light'));
    expect(nodes).toContain('Irodora original, Japanese-inspired');
    /*
     * Compared as WHOLE text nodes, not as a substring of the blob. The first draft asserted
     * `not.toContain('Historical')` and failed against the relation heading "Historical
     * variants" — which is a legitimate label for a field that is empty on every seed entry.
     * The classification renders as its own node, so an exact match is both stricter and
     * correct: it catches the failure FR-23 is about (a classification label that is not the
     * entry's own) without catching a word that happens to appear elsewhere.
     */
    for (const other of ['Historical', 'Traditional', 'Modern Japanese'])
      expect(nodes).not.toContain(other);
  });

  it('renders the FR-21 reason where a value is null, rather than a blank', () => {
    const { entry } = WITH_COMPLEMENT;
    const reason = entry.unknowns['taxonomy.era'];
    expect(reason).toBeDefined();
    // era has no row of its own; material and season do. Assert one that IS rendered.
    expect(shown(entry.slug)).toContain(entry.unknowns['taxonomy.season'] ?? 'MISSING');
  });

  it('renders relations, including the EMPTY case', () => {
    expect(WITHOUT_COMPLEMENT.entry.relations.complementary).toHaveLength(0);
    expect(shown(WITHOUT_COMPLEMENT.entry.slug)).toContain('None recorded');

    const withText = shown(WITH_COMPLEMENT.entry.slug);
    for (const slug of WITH_COMPLEMENT.entry.relations.related) {
      const related = allEntries().find((e) => e.entry.slug === slug)!;
      expect(withText).toContain(related.entry.name.en);
    }
  });

  it('shows the palettes a colour belongs to, with its role', () => {
    const anchored = allEntries().find((e) => e.entry.slug === 'soko-zumi');
    expect(anchored).toBeDefined();
    expect(shown('soko-zumi')).toContain('Quiet Neutrals');
  });

  it('shows a colour-vision block whose swatches are named, not colour-coded', () => {
    const text = shown(WITH_COMPLEMENT.entry.slug);
    for (const label of ['Red-weak (protan)', 'Green-weak (deutan)', 'Blue-weak (tritan)'])
      expect(text).toContain(label);
  });

  it('says a colour is not in this corpus version rather than throwing', () => {
    expect(shown('no-such-colour')).toContain('not in this corpus version');
  });
});

/** A11 — both new screens announce structure a screen reader can navigate. */
describe('the Atlas and the detail screen have headings (A11)', () => {
  function roles(node: TestNode, out: string[] = []): string[] {
    const here = node.props['accessibilityRole'];
    if (typeof here === 'string') out.push(here);
    for (const child of node.children ?? []) {
      if (typeof child === 'string') continue;
      roles(child, out);
    }
    return out;
  }

  for (const theme of ['light', 'dark'] as const) {
    it(`the Atlas announces headings in ${theme}`, () => {
      expect(roles(draw(<Atlas />, theme))).toContain('header');
    });
    it(`colour detail announces headings in ${theme}`, () => {
      expect(roles(draw(<ColourDetail slug={WITH_COMPLEMENT.entry.slug} />, theme))).toContain(
        'header',
      );
    });
  }
});

/**
 * FR-48 criterion 1 — **every metric, with its unit and the space it was computed in**.
 *
 * Asserted by content over the rendered tree. What matters is that a reader can see the space a
 * number was computed in, not that it sits in a particular node: "ΔE00 4.2" without "CIELAB
 * (D65)" beside it is a different claim from the one the engine made.
 */
describe('compare shows every metric with its unit and its space (FR-48)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  const nodes = (): string[] =>
    textOf(draw(<Compare initialA={PAIR_A} initialB={PAIR_B} />, 'light'));
  const blob = (): string => nodes().join('\u0000');

  const A = allEntries().find((e) => e.entry.slug === PAIR_A)!;
  const B = allEntries().find((e) => e.entry.slug === PAIR_B)!;
  const m = compare(A, B);

  it('shows ΔE00, and the value the engine actually computed', () => {
    expect(nodes()).toContain(m.deltaE00.toFixed(2));
    expect(blob()).toContain('ΔE00');
  });

  it('names the space every metric was computed in', () => {
    const text = blob();
    for (const space of ['CIELAB (D65)', 'OKLCh', 'encoded sRGB']) expect(text).toContain(space);
  });

  it('shows the per-axis differences in both spaces', () => {
    const text = blob();
    for (const label of ['Lightness L*', 'Green–red a*', 'Blue–yellow b*'])
      expect(text).toContain(label);
    for (const label of ['Lightness L', 'Chroma C', 'Hue h']) expect(text).toContain(label);
    // The values, not only the labels.
    expect(nodes()).toContain(m.lab.l.a.toFixed(2));
    expect(nodes()).toContain(`${m.oklch.h.a.toFixed(1)}°`);
  });

  it('shows CVD separation WITH its decomposition, for all three deficiencies', () => {
    const text = blob();
    for (const label of ['Red-weak (protan)', 'Green-weak (deutan)', 'Blue-weak (tritan)'])
      expect(text).toContain(label);
    for (const s of m.separation) {
      expect(nodes()).toContain(`${s.score.toFixed(0)}/100`);
      expect(nodes()).toContain(s.deltaE00.toFixed(2));
      expect(nodes()).toContain(s.lightnessDifference.toFixed(2));
    }
  });

  it('shows the severity it simulated at rather than leaving it to be assumed', () => {
    expect(blob()).toContain('strongest tabulated severity');
  });

  it('shows contrast, in both APCA directions and as a WCAG ratio', () => {
    expect(nodes()).toContain(`${m.contrast.wcagRatio.toFixed(2)}:1`);
    expect(blob()).toContain('APCA — second on first');
    expect(blob()).toContain('APCA — first on second');
  });

  /*
   * The asymmetry stated rather than implied. Showing one APCA reading beside a WCAG ratio
   * invites the reading that all three behave the same way, and two of them do not.
   */
  it('says which of the contrast readings is directional', () => {
    expect(blob()).toContain('APCA is directional');
  });
});

/**
 * FR-48 criterion 2 — **tabular numerals, aligned columns, copyable values**.
 *
 * `nativeNumericFeature` was emitted from the manifest and consumed by nothing for two
 * releases. This is the assertion that it reaches the nodes that carry numbers.
 */
describe('the numbers are tabular and copyable (FR-48)', () => {
  function styleOf(node: TestNode): Record<string, unknown> {
    const raw: unknown = node.props['style'];
    // `reduce` rather than `Object.assign({}, ...raw)`: the spread widens to `any`, and a
    // React Native style array legitimately contains `null` and `false` layers that
    // `Object.assign` would happily skip while the types pretended otherwise.
    if (Array.isArray(raw))
      return (raw as unknown[]).reduce<Record<string, unknown>>(
        (acc, layer) =>
          typeof layer === 'object' && layer !== null
            ? { ...acc, ...(layer as Record<string, unknown>) }
            : acc,
        {},
      );
    return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  }

  function numericNodes(node: TestNode, out: TestNode[] = []): TestNode[] {
    const v = styleOf(node)['fontVariant'];
    if (Array.isArray(v) && (v as unknown[]).includes(nativeNumericFeature)) out.push(node);
    for (const child of node.children ?? [])
      if (typeof child !== 'string') numericNodes(child, out);
    return out;
  }

  const tree = (): TestNode => draw(<Compare initialA={PAIR_A} initialB={PAIR_B} />, 'light');

  it('renders a substantial number of tabular figures, not one', () => {
    // A table of metrics. If this were 1 or 2, the prop would be on a heading somewhere and
    // the columns would still be ragged.
    expect(numericNodes(tree()).length).toBeGreaterThan(20);
  });

  it('makes every tabular value selectable, which is how a value is copied', () => {
    for (const n of numericNodes(tree())) expect(n.props['selectable']).toBe(true);
  });

  /*
   * THE DECOY. Every screen so far renders numbers WITHOUT the prop, so if the variant were
   * applied unconditionally by Text this would still be green — and the assertions above would
   * be measuring nothing.
   */
  it('DECOY — a screen that asks for no tabular figures has none', () => {
    expect(numericNodes(draw(<Home />, 'light'))).toHaveLength(0);
  });
});

/** A11 — Compare announces structure a screen reader can navigate. */
describe('compare has headings (A11)', () => {
  function roles(node: TestNode, out: string[] = []): string[] {
    const here = node.props['accessibilityRole'];
    if (typeof here === 'string') out.push(here);
    for (const child of node.children ?? []) {
      if (typeof child === 'string') continue;
      roles(child, out);
    }
    return out;
  }

  for (const theme of ['light', 'dark'] as const)
    it(`announces its sections as headings in ${theme}`, () => {
      expect(roles(draw(<Compare initialA={PAIR_A} initialB={PAIR_B} />, theme))).toContain(
        'header',
      );
    });
});

/**
 * FR-49 — **build, edit, reorder and save**, on the screen rather than in the module.
 *
 * The draft operations and the schema check are asserted in `palette.test.ts`, where they can
 * be reached without rendering anything. What is left for this file is the half that file
 * cannot see: that the controls reach the screen, that they are named individually, and that a
 * saved palette comes back through the port.
 */
describe('Palette Studio builds, edits, reorders and saves (FR-49)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  const nodes = (draft?: PaletteDraft, store: PaletteStore = fakeStore()): string[] =>
    textOf(
      draw(
        // `exactOptionalPropertyTypes` is on: an optional prop is absent or present, never
        // explicitly `undefined`. Spreading is how "absent" is expressed.
        <PaletteStudio store={store} {...(draft === undefined ? {} : { initialDraft: draft })} />,
        'light',
      ),
    );

  it('offers a role control for every role the schema defines', () => {
    const text = nodes(DRAFT).join(' ').toLowerCase();
    // Read from the schema's own list, not from four strings typed here: a fifth role would
    // otherwise be a chip nobody renders and a test nobody fails.
    for (const role of PALETTE_ROLES) expect(text).toContain(role);
  });

  it('names each reorder and remove control by the colour it acts on', () => {
    const labels = nodes(DRAFT);
    const first = allEntries()[0]!.entry.name.en;
    // A screen reader moving down a member list otherwise hears "Move up" three times with
    // nothing to tell the rows apart.
    expect(labels).toContain(`Move up — ${first}`);
    expect(labels).toContain(`Move down — ${first}`);
    expect(labels).toContain(`Remove — ${first}`);
  });

  it('draws every member as a swatch, not only as a name', () => {
    const text = nodes(DRAFT).join(' ');
    for (const m of DRAFT.members) {
      const entry = allEntries().find((e) => e.entry.slug === m.slug)!;
      expect(text).toContain(entry.entry.name.en);
      expect(text).toContain(entry.derived.hex);
    }
  });

  it('says what the ordering DOES, rather than offering a reorder with no visible effect', () => {
    expect(nodes(DRAFT).join(' ')).toContain('order sets how much');
  });

  it('explains why an empty draft cannot be saved rather than only disabling the control', () => {
    // A disabled control with no stated reason is the accessibility failure that looks like
    // polish. The sentence comes from the schema's verdict via `draftProblem`.
    expect(nodes().join(' ')).toContain('Add at least one colour before saving');
  });

  it('explains the anchor rule when the anchor is gone', () => {
    const noAnchor: PaletteDraft = {
      ...DRAFT,
      members: DRAFT.members.map((m) => ({ ...m, role: 'neutral' as const })),
    };
    expect(nodes(noAnchor).join(' ')).toContain('must be the anchor');
  });

  /*
   * THE DECOY. Without it every assertion above is equally true of a screen that shows every
   * sentence at once [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
   */
  it('DECOY — a valid draft shows no problem sentence at all', () => {
    const text = nodes(DRAFT).join(' ');
    expect(text).not.toContain('Add at least one colour before saving');
    expect(text).not.toContain('must be the anchor');
    expect(text).not.toContain('Give the palette a name');
  });

  /*
   * FR-23's negative form, applied to a palette the person made.
   *
   * A device-built palette is `classification: "editorial"` — the honest field — and that
   * token's label reads "Irodora original", which is untrue of somebody else's work. Compared
   * as WHOLE text nodes rather than as a substring, because "original" appears legitimately
   * elsewhere and a substring assertion would fail on the wrong thing.
   */
  it('never presents a palette the person made as Irodora own work (ADR-0067)', () => {
    const shown = nodes(DRAFT);
    for (const label of ['Irodora original', 'Irodora original, Japanese-inspired'])
      expect(shown).not.toContain(label);
    expect(shown.join(' ')).toContain('Made by you, on this device');
  });

  it('shows a saved palette in the list, having written it through the port', () => {
    const store = fakeStore();
    // Written the way the screen writes it, so this exercises `toStoreWrite` end to end
    // rather than a shape invented here.
    let n = 0;
    store.savePalette(
      toStoreWrite(
        DRAFT,
        { id: '0198e2f1-4c3a-7b21-9d54-6e0a1b2c3d4e', today: '2026-08-25' },
        () => `color-${String(n++)}`,
      ),
      1000,
    );
    expect(nodes(undefined, store).join(' ')).toContain('Evening walk');
  });

  it('says nothing is saved when nothing is, rather than showing an empty list', () => {
    expect(nodes().join(' ')).toContain('Nothing saved yet');
  });
});

/** A11 — the Studio announces structure a screen reader can navigate. */
describe('Palette Studio has headings (A11)', () => {
  function roles(node: TestNode, out: string[] = []): string[] {
    const here = node.props['accessibilityRole'];
    if (typeof here === 'string') out.push(here);
    for (const child of node.children ?? []) {
      if (typeof child === 'string') continue;
      roles(child, out);
    }
    return out;
  }

  for (const theme of ['light', 'dark'] as const)
    it(`announces its sections as headings in ${theme}`, () => {
      const tree = draw(<PaletteStudio store={fakeStore()} initialDraft={DRAFT} />, theme);
      expect(roles(tree)).toContain('header');
    });
});

/**
 * Golden rule 13, at screen scale (F-069).
 *
 * A status colour beside a colour sample changes how the sample reads — simultaneous contrast
 * — so the manifest requires a `swatch.well` between them. `checkStatusAdjacency` has been
 * asserted against fixtures in `packages/ui` since F-069 and had never been run over a SCREEN,
 * which is where samples and statuses actually meet.
 *
 * It finds nothing today, because no screen paints a status token: the Studio deliberately
 * shows its save confirmation and its refusal as plain prose. That is the check being in place
 * BEFORE the first one arrives rather than after — and the mechanism itself is proven by the
 * `StatusBesideSample` fixtures, not by this run.
 */
describe('no screen puts a status colour beside a colour sample (F-069)', () => {
  it.each(SCREENS.map((s) => [s.name, s] as const))('%s', (_name, subject) => {
    for (const theme of ['light', 'dark'] as const) {
      const tree = subject.render('default', theme);
      expect(tree).not.toBeNull();
      expect(checkStatusAdjacency(tree!, theme, subject.sampleValues ?? [])).toEqual([]);
    }
  });
});

/**
 * The seam nothing else can see.
 *
 * The Studio takes a `PaletteStore`; the conformance suite passes an in-memory one. That is
 * what lets the screen be rendered at all — `expo-sqlite` needs a device — and it is also a
 * hole: every assertion above would pass on an app whose route wired a fake, and the person
 * would find out when they reopened it.
 *
 * `typecheck` proves `Repository` satisfies the port. This proves the ROUTE reaches for the
 * real one. It is a source assertion, which is weak, and it is stated as weak: what it cannot
 * see is whether a row survives on a device, and nothing off-device can
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 */
describe('the route wires the real repository, not a fake', () => {
  const route = readFileSync(join(process.cwd(), 'app', 'palettes.tsx'), 'utf8');

  it('imports the device repository and hands it to the screen', () => {
    expect(route).toContain("from '../src/store/repository'");
    expect(route).toMatch(/store=\{deviceRepository\(\)\}/u);
  });

  it('DECOY — the assertion above is not true of every route', () => {
    // Without this, "the file contains a string" would pass for any file at all, and the
    // check would be measuring that `readFileSync` works.
    const compare = readFileSync(join(process.cwd(), 'app', 'compare.tsx'), 'utf8');
    expect(compare).not.toContain('deviceRepository');
  });

  /*
   * `expo-sqlite` must not be reachable from a SCREEN. A screen that imported it could not be
   * rendered by jest, and this file is where the accessibility guarantees are checked — so the
   * failure would present as "the conformance suite lost a screen" rather than as an import.
   */
  it('keeps expo-sqlite out of every screen', () => {
    const dir = join(process.cwd(), 'src', 'screens');
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), 'utf8');
      expect(`${file}: ${String(source.includes('expo-sqlite'))}`).toBe(`${file}: false`);
      expect(`${file}: ${String(source.includes('store/repository'))}`).toBe(`${file}: false`);
    }
  });
});

/**
 * FR-47 on the screen — **which question did it answer?**
 *
 * The routing and the searching are asserted in `finder.test.ts`, without rendering. What is
 * left here is the half that file cannot see: that a person is told which of three questions
 * the app decided to answer, and that a phrase answer shows the region and the vocabulary
 * behind it.
 */
describe('the Finder says which question it answered (FR-47)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  const nodes = (query?: string): string[] =>
    textOf(draw(<Finder {...(query === undefined ? {} : { initialQuery: query })} />, 'light'));

  it.each([
    ['#526A6B', 'Nearest colours to that hex'],
    ['dark muted green', 'Colours in the region that phrase describes'],
    ['ai', 'Colours whose name matches'],
  ])('names the question for %s', (query, sentence) => {
    expect(nodes(query).join(' ')).toContain(sentence);
  });

  /*
   * THE DECOY. Without it, "the sentence is present" would be equally true of a screen that
   * renders all three at once, and every case above would be measuring nothing.
   */
  it('DECOY — only one of the three sentences is shown at a time', () => {
    const shown = nodes('dark muted green').join(' ');
    expect(shown).toContain('Colours in the region that phrase describes');
    expect(shown).not.toContain('Nearest colours to that hex');
    expect(shown).not.toContain('Colours whose name matches');
  });

  it('shows the region a phrase resolved to, with the space it is measured in', () => {
    const shown = nodes('dark muted green').join(' ');
    expect(shown).toContain('That phrase means');
    // The axes, by the same labels the Atlas filters use — one word, one name.
    for (const axis of ['Lightness', 'Chroma', 'Hue']) expect(shown).toContain(axis);
    expect(shown).toContain('OKLCh');
  });

  it('names the vocabulary version behind a phrase answer', () => {
    // An answer that cannot say what produced it cannot be reproduced once the lexicon moves.
    expect(nodes('dark muted green').join(' ')).toContain('2026.08.1');
  });

  it('shows a distance with its unit on a hex answer, and none on a phrase answer', () => {
    // ΔE00 is what makes "nearest" checkable rather than an order to be trusted. It has no
    // meaning for a region, so showing one there would be a number with no question behind it.
    expect(nodes('#526A6B').join(' ')).toContain('ΔE00');
    expect(nodes('dark muted green').join(' ')).not.toContain('ΔE00');
  });

  it('draws every result as a swatch, not only as a name', () => {
    const shown = nodes('#526A6B').join(' ');
    const first = find('#526A6B').entries[0]!;
    expect(shown).toContain(first.entry.name.en);
    expect(shown).toContain(first.derived.hex);
  });

  it('invites a query rather than listing the whole corpus when empty', () => {
    const shown = nodes().join(' ');
    expect(shown).toContain('Type something to search');
    expect(shown).not.toContain('Colours whose name matches');
  });

  it('says nothing matched, and why, rather than showing an empty list', () => {
    const shown = nodes('zzzzzznotacolour').join(' ');
    expect(shown).toContain('Nothing matches that');
    expect(shown).toContain('No name, reading or slug contains that');
  });
});

/** A11 — the Finder announces structure a screen reader can navigate. */
describe('the Finder has headings (A11)', () => {
  function roles(node: TestNode, out: string[] = []): string[] {
    const here = node.props['accessibilityRole'];
    if (typeof here === 'string') out.push(here);
    for (const child of node.children ?? []) {
      if (typeof child === 'string') continue;
      roles(child, out);
    }
    return out;
  }

  for (const theme of ['light', 'dark'] as const)
    it(`announces its sections as headings in ${theme}`, () => {
      expect(roles(draw(<Finder initialQuery="dark muted green" />, theme))).toContain('header');
    });
});

/**
 * FR-50 on the screen.
 *
 * The document and its determinism are asserted in `card.test.ts`, without rendering. What is
 * left here is the half that file cannot see: that the card a person looks at is the SAME
 * document, drawn in the theme they are in, and that the thumbnail claim is shown rather than
 * only calculated.
 */
describe('the colour card screen shows the document it generated (FR-50)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  const CARD_ENTRY = allEntries()[0]!;

  it('renders the same string cardSvg produced, not a re-drawn copy', () => {
    // The whole determinism claim rests on ONE document. A screen that rebuilt the card from
    // the same data would be a second implementation, and the two could differ without either
    // being wrong on its own.
    const expected = cardSvg(CARD_ENTRY, {
      theme: 'light',
      corpusVersion: CORPUS_LABEL,
      labels: {
        classification: 'Irodora original, Japanese-inspired',
        attribution: 'Irodora',
      },
    });
    const tree = draw(<ColourCard slug={CARD_ENTRY.entry.slug} />, 'light');
    const xml = JSON.stringify(tree);
    // The SVG reaches the tree as the `xml` prop of SvgXml, escaped into the JSON.
    expect(xml).toContain(JSON.stringify(expected).slice(1, 120));
  });

  it('draws the card in the theme the person is in', () => {
    // F-017's defect was a screen deciding its own theme, which made it uncheckable in the
    // other one. The card a person shares must match the card they were looking at.
    const light = JSON.stringify(draw(<ColourCard slug={CARD_ENTRY.entry.slug} />, 'light'));
    const dark = JSON.stringify(draw(<ColourCard slug={CARD_ENTRY.entry.slug} />, 'dark'));
    expect(light).not.toBe(dark);
    expect(light).toContain(nativeColors.light.background);
    expect(dark).toContain(nativeColors.dark.background);
  });

  it('shows the thumbnail beside the full card, rather than only asserting it', () => {
    const tree = draw(<ColourCard slug={CARD_ENTRY.entry.slug} />, 'light');
    expect(textOf(tree).join(' ')).toContain('At thumbnail size');
    // Two renderings of one document: the claim is visible, not just calculated.
    const occurrences = JSON.stringify(tree).split('viewBox=').length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('says where the file export is, rather than leaving the gap implicit', () => {
    // FR-51 owns getting bytes out of the app, and it is R5. A boundary, not an omission.
    expect(textOf(draw(<ColourCard slug={CARD_ENTRY.entry.slug} />, 'light')).join(' ')).toContain(
      'export',
    );
  });

  it('says a colour is not in this corpus version rather than throwing', () => {
    expect(textOf(draw(<ColourCard slug="no-such-colour" />, 'light')).join(' ')).toContain(
      'not in this corpus version',
    );
  });

  /*
   * FR-23 travels with the artefact that leaves the app. A card read with none of its context
   * must still not present our coinage as attested history.
   */
  it('carries the entry’s own classification onto the card', () => {
    const xml = JSON.stringify(draw(<ColourCard slug={CARD_ENTRY.entry.slug} />, 'light'));
    expect(xml).toContain('Irodora original, Japanese-inspired');
    for (const other of ['Historical', 'Traditional', 'Modern Japanese'])
      expect(xml).not.toContain(`>${other}<`);
  });
});

/** A11 — the card screen announces structure a screen reader can navigate. */
describe('the colour card has headings (A11)', () => {
  function roles(node: TestNode, out: string[] = []): string[] {
    const here = node.props['accessibilityRole'];
    if (typeof here === 'string') out.push(here);
    for (const child of node.children ?? []) {
      if (typeof child === 'string') continue;
      roles(child, out);
    }
    return out;
  }

  for (const theme of ['light', 'dark'] as const)
    it(`announces its sections as headings in ${theme}`, () => {
      expect(roles(draw(<ColourCard slug={allEntries()[0]!.entry.slug} />, theme))).toContain(
        'header',
      );
    });
});
