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

import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import { Home, type HomeStore } from '../src/screens/Home';
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
    const tree = draw(true);
    expect(tree.getByText('1')).toBeTruthy();
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
