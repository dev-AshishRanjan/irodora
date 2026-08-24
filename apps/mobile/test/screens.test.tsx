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

import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import {
  checkAll,
  formatFindings,
  type ConformanceSubject,
  type TestNode,
} from '@irodora/ui/testing';
import { Home } from '../src/screens/Home';
import { Atlas } from '../src/screens/Atlas';
import { ColourDetail } from '../src/screens/ColourDetail';
import { allEntries, CORPUS_ENTRY_COUNT } from '../src/corpus';
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

/** An entry that HAS a complementary, so the populated branch is rendered too. */
const WITH_COMPLEMENT = allEntries().find((e) => e.entry.relations.complementary.length > 0)!;

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
