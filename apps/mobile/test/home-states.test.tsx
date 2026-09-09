/**
 * Home's two states (F-146).
 *
 * ## Why this is here and not in the conformance registry
 *
 * The conformance kinds are a fixed vocabulary: `static` requires one state, `data` requires
 * default, loading, error and empty. Home has **first-run and populated**, and it has no loading
 * and no error — `deviceRepository()` opens SQLite synchronously and `listColors()` is a
 * synchronous read, so there is no moment at which this screen is waiting.
 *
 * Registering it as `data` made the suite ask for a spinner that could never appear. The honest
 * answer is not to invent one, so the kind stayed `static` and the distinction that IS real is
 * asserted here instead.
 *
 * **The first-run state is the one most people see**, and it is the one a screen most often
 * leaves undesigned — so it gets the same weight here as the populated one.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import { Home, type HomeStore } from '../src/screens/Home';
import { en } from '../src/i18n/en';
import type { SavedColorRow, StoredGarment } from '@irodora/store';

/** A date the corpus rotation is fixed at, so today's colour cannot change under the test. */
const FIXED = Date.UTC(2026, 8, 3, 12);

/**
 * A stored reading.
 *
 * `name` is a parameter because the reading and the garment colour must be DIFFERENT: with both
 * called "Ai-nezumi", `getByText` matched two elements and the assertion could not say which one
 * it had found. An ambiguous fixture hides exactly the thing a query is asked to prove.
 */
const row = (id: string, created: number, name = 'Ai-nezumi'): SavedColorRow =>
  ({
    id,
    created_at: created,
    updated_at: created,
    deleted_at: null,
    name,
    xyz_x: 0.1712,
    xyz_y: 0.1699,
    xyz_z: 0.2381,
    lab_l: 48.2,
    lab_a: -1.1,
    lab_b: -6.4,
    oklch_l: 0.52,
    oklch_c: 0.03,
    oklch_h: 264,
    hex: '#6E7480',
    source: 'declared',
    confidence: 1,
    corpus_slug: null,
  }) as unknown as SavedColorRow;

const garment = (id: string): StoredGarment =>
  ({
    id,
    createdAt: 10,
    updatedAt: 10,
    deletedAt: null,
    type: 'shirt',
    color: row(`${id}-c`, 10, 'Kakishibu'),
  }) as unknown as StoredGarment;

const store = (populated: boolean): HomeStore => ({
  listColors: () => (populated ? [row('r1', 100)] : []),
  listGarments: () => (populated ? [garment('g1')] : []),
});

/**
 * Every string in a rendered tree, in document order.
 *
 * Order rather than presence: both Home states render both colour blocks, and what F-164 changed
 * is which one comes FIRST. A test that only checked presence would have passed before it.
 */
function textOf(node: unknown, out: string[] = []): string[] {
  const n = node as { children?: unknown[] } | null;
  for (const child of n?.children ?? []) {
    if (typeof child === 'string') out.push(child);
    else textOf(child, out);
  }
  return out;
}

const draw = (populated: boolean) =>
  render(
    <ThemeProvider theme="light">
      <Home store={store(populated)} now={() => FIXED} />
    </ThemeProvider>,
  );

describe('the first-run state', () => {
  it('says there are no readings, and offers the Lens', () => {
    const tree = draw(false);
    expect(tree.getByText('No readings yet')).toBeTruthy();
    expect(tree.getByLabelText('Open the Lens')).toBeTruthy();
  });

  it('says the wardrobe is empty, and offers to add', () => {
    const tree = draw(false);
    expect(tree.getByText('Nothing added yet')).toBeTruthy();
    expect(tree.getByLabelText('Add a garment')).toBeTruthy();
  });

  it("still shows today's colour, because the corpus is not empty on a new install", () => {
    // The state most people see is not an empty page. A first run has 120 colours in it, and
    // the front door has something to be about before anybody has done anything.
    expect(draw(false).getByText('Today')).toBeTruthy();
  });
});

describe('the populated state', () => {
  it('shows the last reading rather than the invitation', () => {
    const tree = draw(true);
    // The HEX rather than the name: the name appears twice in this block — as the heading and
    // inside the swatch's own label — and an assertion that cannot say which node it matched is
    // not asserting what it claims to.
    expect(tree.getByText('#6E7480')).toBeTruthy();
    expect(tree.queryByText('No readings yet')).toBeNull();
  });

  it('shows a wardrobe count rather than the invitation', () => {
    /*
     * The count moved from a bare `display.2` integer to a label beside its swatches (F-164):
     * the second-largest thing on the page was the NUMBER of garments while the colours it was
     * about sat at 44px, and `visual-taste` allows the page one bold move.
     */
    const tree = draw(true);
    expect(tree.getByText('1 pieces')).toBeTruthy();
    expect(tree.queryByText('Nothing added yet')).toBeNull();
  });
});

describe('the two states are actually different', () => {
  /*
   * THE ASSERTION THAT EARNS THE OTHERS. Everything above can be satisfied by a screen that
   * renders both branches at once — showing the invitation AND the reading — which would look
   * obviously wrong and pass every `getByText` in this file.
   */
  it('renders different trees', () => {
    expect(JSON.stringify(draw(false).toJSON())).not.toBe(JSON.stringify(draw(true).toJSON()));
  });
});

describe('the navigation is the tab bar now', () => {
  /*
   * F-145 gave the ten buttons a tab bar to be replaced by, and F-146 removed them. A negative
   * assertion needs a positive one beside it or it passes on an empty screen — so the populated
   * tree is asserted to contain the reading, and then asserted NOT to contain the list.
   */
  it('renders no destination buttons in the populated state', () => {
    const tree = draw(true);
    // The HEX rather than the name: the name appears twice in this block — as the heading and
    // inside the swatch's own label — and an assertion that cannot say which node it matched is
    // not asserting what it claims to.
    expect(tree.getByText('#6E7480')).toBeTruthy();
    for (const gone of ['Open the Atlas', 'Compare', 'Palette Studio', 'Colour Finder'])
      expect(tree.queryByLabelText(gone)).toBeNull();
  });
});

/**
 * F-164 — the first screen says what the product is for.
 *
 * The wordmark reads *Irodora*, which is a name nobody knows. The only sentence about the product
 * used to sit at the FOOT of the page in `xs` grey — *"The engine is running on this device"* —
 * which is developer copy in a footnote slot, and it is why the screen could be reported as
 * unprofessional while every gate was green.
 *
 * Three fragments is not a paragraph, and it is the one criterion on this feature a test can
 * actually hold.
 */
describe('the front door states what the product is for (F-164)', () => {
  it('leads with the three questions the product answers, in both states', () => {
    for (const populated of [false, true]) {
      const tree = draw(populated);
      for (const key of ['home.what1', 'home.what2', 'home.what3'] as const)
        expect(
          `${String(populated)}: ${tree.queryByText(en[key]) === null ? 'missing' : 'shown'}`,
        ).toBe(`${String(populated)}: shown`);
    }
  });

  it('says the work happens on the phone, near the proposition rather than in a footnote', () => {
    // The one thing in this category nobody else can say. It was two lines of `xs` grey at the
    // foot; it is one line under the proposition now.
    expect(draw(false).queryByText(en['home.onDevice'])).not.toBeNull();
  });

  it('leads with a COLOUR rather than an absence on a new install', () => {
    /*
     * THE ONE THAT MATTERS. Home led with the last reading unconditionally, so a new install
     * opened on an empty state with a second one under it — two apologies and a footnote. The
     * corpus is never empty, so today's colour leads instead, and the invitation to open the Lens
     * drops below the wardrobe.
     *
     * Asserted by ORDER, because both states render both blocks: what changed is which one comes
     * first, and a test that only checked presence would have passed before the change.
     */
    const tree = draw(false);
    const text = textOf(tree.toJSON()).join(' ');
    expect(text.indexOf(en['home.today'])).toBeGreaterThan(-1);
    expect(text.indexOf(en['home.today'])).toBeLessThan(text.indexOf(en['home.lastReading']));
  });

  it('DECOY — with a reading, the reading leads and today drops below it', () => {
    // Without this the case above would pass for a screen that always put today first, which is
    // the same mistake in the other direction.
    const text = textOf(draw(true).toJSON()).join(' ');
    expect(text.indexOf(en['home.lastReading'])).toBeLessThan(text.indexOf(en['home.today']));
  });
});

/**
 * THE LEAD HAS SOMEWHERE TO GO (F-202, criterion 3).
 *
 * *"It offers the combination of the colour it is leading with."* Both install states are
 * asserted, because the lead is a different KIND of colour in each — today's colour carries a
 * slug, a reading does not and never will — and a slug-only implementation would satisfy this
 * on a new install and fail on every phone that had ever been used.
 */
describe('the lead offers what goes with it', () => {
  it('carries the entry slug when today\u2019s colour leads', () => {
    const seen: unknown[] = [];
    const tree = render(
      <ThemeProvider>
        <Home
          store={store(false)}
          now={() => FIXED}
          onOpenCombinations={(subject) => {
            seen.push(subject);
          }}
        />
      </ThemeProvider>,
    );
    fireEvent.press(tree.getByText(en['home.whatGoesWith']));
    expect(seen).toHaveLength(1);
    expect((seen[0] as { kind: string }).kind).toBe('entry');
  });

  it('carries the ROW ID when a reading leads, because a reading has no slug', () => {
    const seen: unknown[] = [];
    const tree = render(
      <ThemeProvider>
        <Home
          store={store(true)}
          now={() => FIXED}
          onOpenCombinations={(subject) => {
            seen.push(subject);
          }}
        />
      </ThemeProvider>,
    );
    fireEvent.press(tree.getByText(en['home.whatGoesWith']));
    expect(seen).toHaveLength(1);
    expect((seen[0] as { kind: string }).kind).toBe('reading');
  });

  it('DECOY — the control is absent when nothing is wired, rather than present and inert', () => {
    /*
     * A button that does nothing looks broken; one that is not there looks like a state. And
     * without this, both assertions above could pass on a screen that rendered the control
     * unconditionally and simply never called anything in the third case.
     */
    const tree = render(
      <ThemeProvider>
        <Home store={store(true)} now={() => FIXED} />
      </ThemeProvider>,
    );
    expect(tree.queryByText(en['home.whatGoesWith'])).toBeNull();
  });
});
