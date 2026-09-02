/**
 * The wardrobe screen, driven (FR-41, F-122).
 *
 * ## Why this file exists at all
 *
 * `browse.test.ts` proves `textPatch` writes `null` for an emptied field. It cannot prove the
 * **screen calls it** — a form that assigned `text[field.key]` directly would store `''` where
 * somebody meant *remove this*, and every assertion in `browse.test.ts` would still be green.
 * That is [[a-tested-module-nobody-wired-up-passes-every-test-it-has]] one level down: the unit
 * is correct and unused.
 *
 * `screens.test.tsx` cannot see it either. The conformance registry renders a tree and checks
 * what is in it; the patch handed to the store is produced by a tap it never performs.
 *
 * ## The first interaction test in this app, and that was the gap
 *
 * Every other screen test here is static. That is right for accessibility and contrast, which
 * are properties of a rendered tree — and wrong for a form, whose entire contract is what it
 * does when somebody changes a field and presses a button.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import { Wardrobe } from '../src/screens/Wardrobe';
import { allEntries } from '../src/corpus';
import { en } from '../src/i18n/en';
import type { GarmentEnrichment, SavedColorRow, StoredGarment } from '@irodora/store';

function rowOf(slug: string): SavedColorRow {
  const found = allEntries().find((e) => e.entry.slug === slug);
  if (found === undefined) throw new Error(`no entry ${slug}`);
  return {
    id: `c-${slug}`,
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    name: found.entry.name.en,
    xyz_x: found.entry.color.xyz[0],
    xyz_y: found.entry.color.xyz[1],
    xyz_z: found.entry.color.xyz[2],
    lab_l: found.derived.lab[0],
    lab_a: found.derived.lab[1],
    lab_b: found.derived.lab[2],
    oklch_l: found.derived.oklch[0],
    oklch_c: found.derived.oklch[1],
    oklch_h: found.derived.oklch[2],
    hex: found.derived.hex,
    source: 'reference',
    confidence: 1,
    corpus_slug: slug,
    capture_illuminant: null,
    capture_quality: null,
    capture_samples: null,
    capture_variance: null,
  };
}

/** A coat with a brand, a price in GBP, and nothing else filled in. */
const COAT: StoredGarment = {
  id: 'g-1',
  type: 'coat',
  color: rowOf(allEntries()[0]!.entry.slug),
  name: null,
  pattern: null,
  material: null,
  formality: null,
  brand: 'Kapital',
  size: null,
  purchaseDate: null,
  costMinor: 4550,
  currency: 'GBP',
  wearCount: 38,
  seasons: [],
  colors: [],
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
};

interface Written {
  readonly id: string;
  readonly patch: GarmentEnrichment;
}

function open(garment: StoredGarment = COAT): Written[] {
  const written: Written[] = [];
  const store = {
    enrichGarment: (id: string, patch: GarmentEnrichment) => {
      written.push({ id, patch });
    },
    listGarments: () => [garment],
  };

  render(
    <ThemeProvider theme="light">
      <Wardrobe store={store} initialSelected={garment.id} />
    </ThemeProvider>,
  );
  return written;
}

const save = (): void => {
  fireEvent.press(screen.getByLabelText(en['browse.save']));
};

describe('editing a garment', () => {
  it('opens with the stored values in the fields', () => {
    open();

    expect(screen.getByLabelText(en['wardrobe.brand']).props['value']).toBe('Kapital');
    // £45.50 — the MAJOR-unit rendering. `formatMinor` would put '4550.00' here, and saving it
    // unchanged would multiply the price by a hundred.
    expect(screen.getByLabelText(en['wardrobe.cost']).props['value']).toBe('45.50');
    expect(screen.getByLabelText(en['wardrobe.currency']).props['value']).toBe('GBP');
  });

  it('writes null for a field that was emptied, never an empty string', () => {
    const written = open();

    fireEvent.changeText(screen.getByLabelText(en['wardrobe.brand']), '');
    save();

    expect(written).toHaveLength(1);
    expect(written[0]!.id).toBe('g-1');
    expect(written[0]!.patch.brand).toBeNull();
  });

  /*
   * THE DECOY. Without it, `brand: null` would also be produced by a form that wrote `null` for
   * everything — which passes the assertion above and loses every value on the screen.
   */
  it('DECOY — a field with a value writes the value, trimmed', () => {
    const written = open();

    fireEvent.changeText(screen.getByLabelText(en['browse.material']), '  wool  ');
    save();

    expect(written[0]!.patch.material).toBe('wool');
    expect(written[0]!.patch.brand).toBe('Kapital');
  });

  it('round-trips a price it did not touch, rather than re-reading the field as minor units', () => {
    const written = open();

    save();

    // The field was seeded from 4550 and saved unchanged, so this is the whole minor→major→minor
    // path through the screen. A `formatMinor` seed would make this 455000.
    expect(written[0]!.patch.costMinor).toBe(4550);
    expect(written[0]!.patch.currency).toBe('GBP');
  });

  it('writes nothing for a price it cannot read, rather than a half or the old value', () => {
    const written = open();

    fireEvent.changeText(screen.getByLabelText(en['wardrobe.currency']), 'nonsense');
    save();

    // Neither key present: a cost with no currency is a number nobody can read back (E-052).
    expect(Object.hasOwn(written[0]!.patch, 'costMinor')).toBe(false);
    expect(Object.hasOwn(written[0]!.patch, 'currency')).toBe(false);
    expect(screen.getByText(en['wardrobe.costBadCurrency'])).toBeTruthy();
  });

  it('clears both halves of a price together when the fields are emptied', () => {
    const written = open();

    fireEvent.changeText(screen.getByLabelText(en['wardrobe.cost']), '');
    fireEvent.changeText(screen.getByLabelText(en['wardrobe.currency']), '');
    save();

    expect(written[0]!.patch.costMinor).toBeNull();
    expect(written[0]!.patch.currency).toBeNull();
  });

  it('says it saved, and only after it did', () => {
    open();

    expect(screen.queryByText(en['browse.saved'])).toBeNull();
    save();
    expect(screen.getByText(en['browse.saved'])).toBeTruthy();
  });
});

describe('the list', () => {
  it('leads to the editor, which is otherwise unreachable', () => {
    render(
      <ThemeProvider theme="light">
        <Wardrobe
          store={{
            enrichGarment: () => undefined,
            listGarments: () => [COAT],
          }}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByText(en['browse.editing'])).toBeNull();
    fireEvent.press(screen.getByLabelText(en['browse.edit']));
    expect(screen.getByText(en['browse.editing'])).toBeTruthy();
  });

  it('says the wardrobe is empty rather than drawing an empty list', () => {
    render(
      <ThemeProvider theme="light">
        <Wardrobe store={{ enrichGarment: () => undefined, listGarments: () => [] }} />
      </ThemeProvider>,
    );

    expect(screen.getByText(en['browse.empty'])).toBeTruthy();
    // And NOT the sentence explaining a grouping there is none of.
    expect(screen.queryByText(en['browse.grouping'])).toBeNull();
  });
});

/**
 * Narrowing the wardrobe, driven (FR-41, F-131).
 *
 * `browse.test.ts` proves the predicate. It cannot prove **the chips reach it** — a screen that
 * rendered three rows of controls and filtered nothing would leave every assertion there green,
 * and the conformance registry draws the controls without ever pressing one.
 */
describe('the filter controls', () => {
  const coat = (id: string, season: 'winter' | 'summer'): StoredGarment => ({
    ...COAT,
    id,
    type: 'coat',
    formality: 'smart',
    seasons: [season],
    color: { ...COAT.color, id: `c-${id}` },
  });

  const WARDROBE: readonly StoredGarment[] = [
    coat('c-1', 'winter'),
    coat('c-2', 'summer'),
    { ...COAT, id: 'j-1', type: 'jumper', formality: 'everyday', seasons: ['winter'] },
  ];

  const browse = (): void => {
    render(
      <ThemeProvider theme="light">
        <Wardrobe store={{ enrichGarment: () => undefined, listGarments: () => WARDROBE }} />
      </ThemeProvider>,
    );
  };

  /** Every "Edit" control on screen — one per garment shown. */
  const shownCount = (): number => screen.queryAllByLabelText(en['browse.edit']).length;

  it('shows the whole wardrobe before anything is chosen', () => {
    browse();

    expect(shownCount()).toBe(WARDROBE.length);
  });

  it('narrows the list when a type is chosen', () => {
    browse();

    fireEvent.press(screen.getByLabelText('jumper'));

    expect(shownCount()).toBe(1);
  });

  it('narrows further when a second axis is chosen, never wider', () => {
    browse();

    fireEvent.press(screen.getByLabelText('coat'));
    const afterType = shownCount();
    fireEvent.press(screen.getByLabelText(en['season.winter']));

    expect(afterType).toBe(2);
    expect(shownCount()).toBe(1);
  });

  it('KEEPS THE GROUPING — a narrowed wardrobe is still grouped (criterion 3)', () => {
    browse();
    const headingBefore = screen.queryAllByText(en['browse.count'], { exact: false }).length;

    fireEvent.press(screen.getByLabelText('coat'));

    // A group heading and its count are still drawn. A screen that filtered by replacing the
    // grouped view with a flat list would lose them, and only this case would notice.
    expect(screen.queryAllByText(en['browse.count'], { exact: false }).length).toBeGreaterThan(0);
    expect(headingBefore).toBeGreaterThan(0);
  });

  it('says what is applied, in words', () => {
    browse();

    fireEvent.press(screen.getByLabelText('coat'));

    expect(screen.getByText(`${en['browse.filterApplied']}: coat`)).toBeTruthy();
  });

  it('says nothing matched — which is not the same as an empty wardrobe', () => {
    browse();

    fireEvent.press(screen.getByLabelText('jumper'));
    fireEvent.press(screen.getByLabelText(en['season.summer']));

    expect(screen.getByText(en['browse.filterNone'])).toBeTruthy();
    // THE DISTINCTION. One says "add a garment", the other says "clear a filter".
    expect(screen.queryByText(en['browse.empty'])).toBeNull();
  });

  it('leaves the controls on screen when nothing matches, so they can be cleared', () => {
    browse();

    fireEvent.press(screen.getByLabelText('jumper'));
    fireEvent.press(screen.getByLabelText(en['season.summer']));

    expect(screen.getByLabelText(en['atlas.clear'])).toBeTruthy();
  });

  /*
   * THE SELF-ERASING FILTER BAR. The options are derived from the WHOLE wardrobe, not from what
   * is currently shown — if they came from the shown list, choosing "coat" would remove "jumper"
   * from the row, and the filter could be narrowed but never changed without clearing first.
   *
   * A mutation doing exactly that survived every other case here, because they all check the
   * RESULT and none checked the controls.
   */
  it('leaves the other options on screen, so a filter can be changed rather than only cleared', () => {
    browse();

    fireEvent.press(screen.getByLabelText('coat'));

    expect(screen.getByLabelText('jumper')).toBeTruthy();
    expect(screen.getByLabelText(en['season.summer'])).toBeTruthy();
  });

  it('and choosing that other option moves the filter rather than adding to it', () => {
    browse();

    fireEvent.press(screen.getByLabelText('coat'));
    fireEvent.press(screen.getByLabelText('jumper'));

    expect(shownCount()).toBe(1);
    expect(screen.getByText(`${en['browse.filterApplied']}: jumper`)).toBeTruthy();
  });

  it('restores the whole wardrobe when cleared', () => {
    browse();

    fireEvent.press(screen.getByLabelText('coat'));
    fireEvent.press(screen.getByLabelText(en['atlas.clear']));

    expect(shownCount()).toBe(WARDROBE.length);
  });

  /*
   * THE DECOY. Without it, every case above passes for a screen whose chips are inert and whose
   * list happens to be short — and "it narrowed" would be a claim about the fixture.
   */
  it('DECOY — choosing a value nothing carries shows nothing, not everything', () => {
    browse();

    fireEvent.press(screen.getByLabelText(en['season.autumn']));

    expect(shownCount()).toBe(0);
  });
});
