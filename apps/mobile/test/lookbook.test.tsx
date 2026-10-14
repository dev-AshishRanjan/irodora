/**
 * The lookbook, between the store and the screens (F-238, ADR-0136).
 *
 * The store's tests prove what is written; `lookbook-record.test` proves what a record holds. These
 * prove the screens show what was written: the list is read once, a change is written before it is
 * shown, a failed write shows nothing it did not store — and the routes carry the controls ADR-0136
 * places, so a rebuild of 11 or 13 that drops one fails here (E-205).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { parseWeightContent } from '@irodora/recommendation';
import type { NewOutfit, SavedColorRow, StoredGarment, StoredOutfit } from '@irodora/store';
import { ThemeProvider } from '@irodora/ui';
import { allEntries } from '../src/corpus';
import { t } from '../src/i18n';
import { ruleSet } from '../src/rules';
import { WEIGHTS_TEXT } from '../src/rules/generated/weights';
import { OutfitBuilder } from '../src/screens/OutfitBuilder';
import { colorOf } from '../src/wardrobe';
import type { OutfitDraft } from '../src/outfit/builder';
import {
  LookbookProvider,
  useLookbook,
  type LookbookStore,
  type LookbookValue,
} from '../src/lookbook';
import {
  compositionKey,
  draftKey,
  outfitRecord,
  scoreDraft,
  type ScoringContext,
} from '../src/outfit/lookbook';

const ENVELOPE = {
  engine: '0.1.0',
  scorer: '0.5.0',
  corpus: '2026.08.1',
  rules: '2026.08.4',
  occasion: 'default',
  profile: 'profile:1',
} as const;

const colour = {
  name: 'Ai-nezumi',
  xyz_x: 0.04,
  xyz_y: 0.04,
  xyz_z: 0.09,
  lab_l: 24,
  lab_a: 2,
  lab_b: -15,
  oklch_l: 0.34,
  oklch_c: 0.05,
  oklch_h: 262,
  hex: '#2F3B52',
  source: 'reference',
  confidence: 1,
  corpus_slug: 'ai-nezumi',
} as const;

/** A record for the garments given, one per slot. */
const record = (top: string, trouser: string, shoe: string): NewOutfit => ({
  overall: 70,
  countsThreshold: 60,
  envelope: ENVELOPE,
  items: [
    { slot: 'top', garmentId: top, garmentLabel: 'top', locked: false, color: colour },
    { slot: 'trouser', garmentId: trouser, garmentLabel: 'trouser', locked: false, color: colour },
    { slot: 'shoe', garmentId: shoe, garmentLabel: 'shoe', locked: false, color: colour },
  ],
  components: [
    { component: 'harmony', score: 70, direction: 'supports', weight: 1, contribution: 70 },
  ],
});

/** An in-memory store that counts what it was asked, so a test can tell a read from a write. */
function memoryStore(initial: readonly NewOutfit[] = []) {
  let n = 0;
  const live: StoredOutfit[] = [];
  const calls = { list: 0, saves: 0, removes: [] as string[] };
  const add = (o: NewOutfit, at: number): string => {
    const id = `outfit-${String(n++)}`;
    live.unshift({
      id,
      createdAt: at,
      overall: o.overall,
      countsThreshold: o.countsThreshold,
      envelope: o.envelope,
      items: o.items.map((item, position) => ({
        slot: item.slot,
        position,
        garmentId: item.garmentId,
        garmentLabel: item.garmentLabel,
        locked: item.locked,
        color: {
          ...item.color,
          id: `${id}:${item.slot}`,
          created_at: at,
          updated_at: at,
          deleted_at: null,
          capture_illuminant: null,
          capture_quality: null,
          capture_samples: null,
          capture_variance: null,
        },
      })),
      components: o.components.map((c, position) => ({ ...c, position })),
    });
    return id;
  };
  for (const o of initial) add(o, 1);
  const store: LookbookStore = {
    listOutfits: () => {
      calls.list += 1;
      return [...live];
    },
    saveOutfit: (o, now) => {
      calls.saves += 1;
      return { id: add(o, now), written: true };
    },
    removeOutfit: (id) => {
      calls.removes.push(id);
      const i = live.findIndex((o) => o.id === id);
      if (i >= 0) live.splice(i, 1);
    },
  };
  return { store, calls };
}

/** Captures the context value so a test can drive it, the way a route would. */
function harness(store: LookbookStore): () => LookbookValue {
  let captured: LookbookValue | null = null;
  function Probe(): React.JSX.Element {
    captured = useLookbook();
    return <Text>{captured.outfits.map((o) => o.id).join(',')}</Text>;
  }
  render(
    <LookbookProvider store={store} now={() => 5000}>
      <Probe />
    </LookbookProvider>,
  );
  return () => {
    if (captured === null) throw new Error('the probe never rendered');
    return captured;
  };
}

describe('the provider', () => {
  it('reads the store once, at mount', () => {
    const { store, calls } = memoryStore([record('a', 'b', 'c')]);
    const read = harness(store);
    expect(read().outfits).toHaveLength(1);
    expect(read().saved.has(compositionKey(record('a', 'b', 'c').items))).toBe(true);
    expect(calls.list).toBe(1);
  });

  it('saves, then shows what was written, newest first', () => {
    const { store, calls } = memoryStore([record('a', 'b', 'c')]);
    const read = harness(store);
    act(() => {
      read().save(record('x', 'y', 'z'));
    });
    expect(calls.saves).toBe(1);
    expect(read().outfits.map((o) => o.items[0]?.garmentId)).toStrictEqual(['x', 'a']);
    expect(read().outfits[0]?.createdAt).toBe(5000);
  });

  it('saving a composition already in the lookbook writes nothing', () => {
    const { store, calls } = memoryStore([record('a', 'b', 'c')]);
    const read = harness(store);
    act(() => {
      read().save(record('a', 'b', 'c'));
    });
    expect(calls.saves).toBe(0);
  });

  it('DECOY: a different composition is written', () => {
    const { store, calls } = memoryStore([record('a', 'b', 'c')]);
    const read = harness(store);
    act(() => {
      read().save(record('a', 'b', 'd'));
    });
    expect(calls.saves).toBe(1);
  });

  it('removes, then shows the list without it', () => {
    const { store, calls } = memoryStore([record('a', 'b', 'c'), record('x', 'y', 'z')]);
    const read = harness(store);
    const [first] = read().outfits;
    act(() => {
      read().remove(first?.id ?? '');
    });
    expect(calls.removes).toStrictEqual([first?.id]);
    expect(read().outfits).toHaveLength(1);
  });

  it('DECOY: a store that throws leaves the list as it was', () => {
    const { store } = memoryStore([record('a', 'b', 'c')]);
    const failing: LookbookStore = {
      ...store,
      saveOutfit: () => {
        throw new Error('the disk is full');
      },
    };
    const read = harness(failing);
    expect(() => {
      act(() => {
        read().save(record('x', 'y', 'z'));
      });
    }).toThrow('the disk is full');
    expect(read().outfits).toHaveLength(1);
  });

  it('throws outside its provider, rather than reading an empty lookbook', () => {
    function Bare(): React.JSX.Element {
      useLookbook();
      return <Text>never</Text>;
    }
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Bare />)).toThrow(/no LookbookProvider/);
    jest.restoreAllMocks();
  });
});

describe('the Lab saves the whole outfit (13, ADR-0136 D4)', () => {
  const rowOf = (slug: string): SavedColorRow => {
    const found = allEntries().find((e) => e.entry.slug === slug);
    if (found === undefined) throw new Error(`no entry ${slug}`);
    return {
      id: `colour-${slug}`,
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
  };
  const garment = (id: string, type: string, slug: string): StoredGarment => ({
    id,
    type,
    color: rowOf(slug),
    name: null,
    pattern: null,
    material: null,
    formality: null,
    brand: null,
    size: null,
    purchaseDate: null,
    costMinor: null,
    currency: null,
    wearCount: 0,
    seasons: [],
    colors: [],
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  });
  const slugs = allEntries()
    .slice(0, 4)
    .map((e) => e.entry.slug);
  const WARDROBE = [
    garment('o-1', 'jumper', slugs[0]!),
    garment('o-2', 'trousers', slugs[1]!),
    garment('o-3', 'shoes', slugs[2]!),
    garment('o-4', 'boots', slugs[3]!),
  ];
  const context: ScoringContext = {
    profile: {
      id: 'p',
      method: 'guided',
      lightness: { min: 0.3, max: 0.8 },
      temperatureBias: 0.2,
      chroma: { min: 0.02, max: 0.2 },
      contrast: 'medium',
      confidence: {
        lightness: 0.7,
        temperature: 0.7,
        chroma: 0.7,
        contrast: 0.7,
        neutrals: 0.7,
        accents: 0.7,
        avoid: 0.7,
      },
      origin: {
        lightness: 'derived',
        temperature: 'derived',
        chroma: 'derived',
        contrast: 'derived',
        neutrals: 'derived',
        accents: 'derived',
        avoid: 'derived',
      },
      neutrals: [],
      accents: [],
      avoid: [],
    },
    rules: ruleSet(),
    weights: parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.json'),
    reference: allEntries()
      .slice(0, 8)
      .map((e) => ({ id: e.entry.slug, color: colorOf(rowOf(e.entry.slug)) })),
  };
  const COMPLETE: OutfitDraft = [
    { slot: 'top', garment: WARDROBE[0]!, locked: true },
    { slot: 'trouser', garment: WARDROBE[1]!, locked: false },
    { slot: 'shoe', garment: WARDROBE[2]!, locked: false },
  ];
  const save = () => screen.getByRole('button', { name: t('en', 'lab.saveToLookbook') });
  const disabled = () =>
    (save().props['accessibilityState'] as { disabled?: boolean }).disabled === true;

  const lab = (
    draft: OutfitDraft,
    saved: ReadonlySet<string> = new Set(),
    onSave: (o: NewOutfit) => void = () => undefined,
  ) =>
    render(
      <ThemeProvider theme="dark">
        <OutfitBuilder
          wardrobe={WARDROBE}
          context={context}
          initialDraft={draft}
          store={{ enrichGarment: () => undefined, listGarments: () => WARDROBE }}
          lookbook={{ envelope: { ...ENVELOPE }, saved, onSave }}
        />
      </ThemeProvider>,
    );

  it('is disabled, with its reason, until every slot holds a garment', () => {
    lab(COMPLETE.slice(0, 2));
    expect(disabled()).toBe(true);
    expect(screen.getByText(t('en', 'lookbook.needsEverySlot'))).toBeTruthy();
  });

  it('DECOY: with every slot filled it is enabled, and the whole outfit is scored beside it', () => {
    lab(COMPLETE);
    expect(disabled()).toBe(false);
    expect(screen.queryByText(t('en', 'lookbook.needsEverySlot'))).toBeNull();
    expect(screen.getByText(t('en', 'lookbook.wholeOutfit'))).toBeTruthy();
    const overall = scoreDraft(COMPLETE, context).overall;
    expect(
      screen.getAllByText(`${t('en', 'outfit.overall')}: ${String(Math.round(overall))}`).length,
    ).toBeGreaterThan(0);
  });

  it('saves exactly the record of the outfit shown, once', () => {
    const onSave = jest.fn();
    lab(COMPLETE, new Set(), onSave);
    fireEvent.press(save());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      outfitRecord(COMPLETE, scoreDraft(COMPLETE, context), { ...ENVELOPE }),
    );
  });

  it('once saved, it is disabled and says where the outfit is', () => {
    lab(COMPLETE, new Set([draftKey(COMPLETE)]));
    expect(disabled()).toBe(true);
    expect(screen.getByText(t('en', 'lookbook.alreadySaved'))).toBeTruthy();
  });

  it('DECOY: a different garment in one slot is a different outfit, and can be saved', () => {
    const other: OutfitDraft = [
      ...COMPLETE.slice(0, 2),
      { slot: 'shoe', garment: WARDROBE[3]!, locked: false },
    ];
    lab(other, new Set([draftKey(COMPLETE)]));
    expect(disabled()).toBe(false);
  });

  it('draws no save at all when the route supplies no lookbook', () => {
    render(
      <ThemeProvider theme="dark">
        <OutfitBuilder
          wardrobe={WARDROBE}
          context={context}
          initialDraft={COMPLETE}
          store={{ enrichGarment: () => undefined, listGarments: () => WARDROBE }}
        />
      </ThemeProvider>,
    );
    expect(screen.queryByRole('button', { name: t('en', 'lab.saveToLookbook') })).toBeNull();
  });
});

describe('the routes carry the lookbook (E-205)', () => {
  const source = (path: string): string => readFileSync(join(__dirname, '..', path), 'utf8');

  it('the root layout mounts the provider with the device repository', () => {
    expect(source('app/_layout.tsx')).toMatch(/<LookbookProvider store=\{deviceRepository\(\)\}>/);
  });

  it('the Lab route reads the lookbook and hands the screen its envelope, saved set and save', () => {
    const route = source('app/(tabs)/wardrobe/outfit.tsx');
    expect(route).toMatch(/useLookbook\(\)/);
    expect(route).toMatch(
      /lookbook=\{\{ envelope, saved: lookbook\.saved, onSave: lookbook\.save \}\}/,
    );
  });

  it('DECOY: a route that has nothing to do with the lookbook does not read it', () => {
    expect(source('app/(tabs)/wardrobe/shopping.tsx')).not.toMatch(/useLookbook/);
  });
});
