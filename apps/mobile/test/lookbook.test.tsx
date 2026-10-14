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
import { AccessibilityInfo, Text } from 'react-native';
import { ENGINE_VERSION } from '@irodora/color-spaces';
import type { Coverage } from '@irodora/optimization';
import { parseWeightContent, RECOMMENDATION_VERSION } from '@irodora/recommendation';
import type { NewOutfit, SavedColorRow, StoredGarment, StoredOutfit } from '@irodora/store';
import { ThemeProvider } from '@irodora/ui';
import { allEntries, CORPUS_LABEL } from '../src/corpus';
import { t } from '../src/i18n';
import { ruleSet } from '../src/rules';
import { WEIGHTS_TEXT } from '../src/rules/generated/weights';
import { OutfitBuilder } from '../src/screens/OutfitBuilder';
import { Wardrobe } from '../src/screens/Wardrobe';
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

  it('says, aloud, that the outfit was saved', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    lab(COMPLETE);
    // DECOY: drawing the Lab announces nothing.
    expect(announce).not.toHaveBeenCalled();
    fireEvent.press(save());
    expect(announce).toHaveBeenCalledWith(t('en', 'lookbook.alreadySaved'));
    announce.mockRestore();
  });

  it('re-renders identically: the saved entry reads exactly as the Lab showed it, whatever changes after', () => {
    // Save from the Lab, keeping the lines it showed for the whole outfit.
    const saves: NewOutfit[] = [];
    lab(COMPLETE, new Set(), (o) => {
      saves.push(o);
    });
    const scoreLines = () =>
      screen
        .getAllByText(new RegExp(` — \\d+$|^${t('en', 'outfit.overall')}: `))
        .map((n) => String(n.props['children']));
    const shown = scoreLines().slice(-7);
    fireEvent.press(save());
    screen.unmount();
    const [record] = saves;
    if (record === undefined) throw new Error('nothing was saved');

    // The entry, from the stored record alone.
    const stored: StoredOutfit = {
      id: 'saved',
      createdAt: 1,
      overall: record.overall,
      countsThreshold: record.countsThreshold,
      envelope: record.envelope,
      items: record.items.map((item, position) => ({
        slot: item.slot,
        position,
        garmentId: item.garmentId,
        garmentLabel: item.garmentLabel,
        locked: item.locked,
        color: {
          ...item.color,
          id: `saved:${item.slot}`,
          created_at: 1,
          updated_at: 1,
          deleted_at: null,
          capture_illuminant: null,
          capture_quality: null,
          capture_samples: null,
          capture_variance: null,
        },
      })),
      components: record.components.map((c, position) => ({ ...c, position })),
    };
    render(
      <ThemeProvider theme="dark">
        <Wardrobe
          store={{
            enrichGarment: () => undefined,
            listGarments: () => WARDROBE,
            getGarmentImageInfo: () => undefined,
            getGarmentImage: () => undefined,
          }}
          lookbook={{ outfits: [stored], onRemove: () => undefined }}
          initialView="lookbook"
        />
      </ThemeProvider>,
    );
    expect(scoreLines()).toStrictEqual(shown);
    screen.unmount();

    // DECOY: the Lab, for the same garments against a different profile, shows different lines —
    // so the entry's agreement is with what was saved, not with whatever the Lab would say now.
    render(
      <ThemeProvider theme="dark">
        <OutfitBuilder
          wardrobe={WARDROBE}
          context={{
            ...context,
            profile: {
              ...context.profile,
              temperatureBias: -0.9,
              lightness: { min: 0.05, max: 0.25 },
            },
          }}
          initialDraft={COMPLETE}
          store={{ enrichGarment: () => undefined, listGarments: () => WARDROBE }}
          lookbook={{ envelope: { ...ENVELOPE }, saved: new Set(), onSave: () => undefined }}
        />
      </ThemeProvider>,
    );
    expect(scoreLines().slice(-7)).not.toStrictEqual(shown);
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

describe('the Wardrobe reads the lookbook back (11, ADR-0136 D1–D3)', () => {
  const row = (slug: string, overrides: Partial<SavedColorRow> = {}): SavedColorRow => {
    const found = allEntries().find((e) => e.entry.slug === slug);
    if (found === undefined) throw new Error(`no entry ${slug}`);
    return {
      id: `snap-${slug}`,
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
      ...overrides,
    };
  };
  const slugs = allEntries()
    .slice(0, 3)
    .map((e) => e.entry.slug);

  /** A saved outfit from an OLDER build: its versions are not this build's (rule 11 is what reads them). */
  const historical: StoredOutfit = {
    id: 'saved-old',
    createdAt: 1_750_000_000_000,
    overall: 63,
    countsThreshold: 60,
    envelope: {
      engine: '0.0.9',
      scorer: '0.4.0',
      corpus: '2026.06.2',
      rules: '2026.07.1',
      occasion: 'default',
      profile: 'p:1',
    },
    items: [
      {
        slot: 'top',
        position: 0,
        garmentId: 'g-top',
        garmentLabel: 'Linen shirt',
        locked: true,
        color: row(slugs[0]!),
      },
      {
        slot: 'trouser',
        position: 1,
        garmentId: 'g-trouser',
        garmentLabel: 'trousers',
        locked: false,
        color: row(slugs[1]!),
      },
      {
        slot: 'shoe',
        position: 2,
        garmentId: 'g-shoe',
        garmentLabel: 'Loafers',
        locked: false,
        // A Lens capture, with its conditions: drawn from its stored provenance (rule 12).
        color: row(slugs[2]!, {
          source: 'estimated',
          confidence: 0.6,
          corpus_slug: null,
          capture_illuminant: 'D65',
          capture_quality: 'good',
          capture_samples: 48,
          capture_variance: 0.003,
        }),
      },
    ],
    components: (
      [
        'harmony',
        'personalFit',
        'contrast',
        'corpusAffinity',
        'versatility',
        'cvdAccessibility',
      ] as const
    ).map((component, position) => ({
      component,
      position,
      score: 50 + position * 4,
      direction: position === 2 ? 'opposes' : 'supports',
      weight: 1 / 6,
      contribution: (50 + position * 4) / 6,
    })),
  };
  const newer: StoredOutfit = {
    ...historical,
    id: 'saved-new',
    createdAt: 1_760_000_000_000,
    overall: 71,
  };

  const garment = (id: string, type: string, slug: string): StoredGarment => ({
    id,
    type,
    color: row(slug),
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
  const GARMENTS = [garment('w-1', 'jumper', slugs[0]!)];
  const browse = (garments: readonly StoredGarment[]) => ({
    enrichGarment: () => undefined,
    listGarments: () => garments,
    getGarmentImageInfo: () => undefined,
    getGarmentImage: () => undefined,
  });

  const open = (
    outfits: readonly StoredOutfit[] | undefined,
    options: {
      garments?: readonly StoredGarment[];
      view?: 'garments' | 'lookbook';
      onRemove?: (id: string) => void;
      coverage?: Coverage;
    } = {},
  ) =>
    render(
      <ThemeProvider theme="dark">
        <Wardrobe
          store={browse(options.garments ?? GARMENTS)}
          onAddGarment={() => undefined}
          onOpenOutfit={() => undefined}
          {...(outfits === undefined
            ? {}
            : { lookbook: { outfits, onRemove: options.onRemove ?? (() => undefined) } })}
          {...(options.view === undefined ? {} : { initialView: options.view })}
          {...(options.coverage === undefined ? {} : { coverage: options.coverage })}
        />
      </ThemeProvider>,
    );
  const choice = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) });

  it('draws the choice, Garments chosen, and switching it changes only the region below', () => {
    const coverage: Coverage = {
      valid: 0,
      perGarment: new Map([['w-1', 0]]),
      threshold: 60,
      combinations: new Set(),
    };
    open([historical], { coverage });
    expect(screen.getByText(t('en', 'browse.coverage'))).toBeTruthy();
    expect(
      (
        choice(t('en', 'wardrobe.view.garments')).props['accessibilityState'] as {
          selected?: boolean;
        }
      ).selected,
    ).toBe(true);
    expect(screen.queryByText('Linen shirt')).toBeNull();
    fireEvent.press(choice(t('en', 'wardrobe.view.lookbook')));
    expect(
      (
        choice(t('en', 'wardrobe.view.lookbook')).props['accessibilityState'] as {
          selected?: boolean;
        }
      ).selected,
    ).toBe(true);
    expect(screen.getByText('Linen shirt')).toBeTruthy();
    // What is above the choice stays: the add, the Outfit Lab, and the coverage card.
    expect(screen.getByText(t('en', 'browse.coverage'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t('en', 'browse.add') })).toBeTruthy();
    expect(screen.getByRole('button', { name: t('en', 'browse.openOutfit') })).toBeTruthy();
  });

  it('lists the outfits in the order the store gives them: newest first', () => {
    open([newer, historical], { view: 'lookbook' });
    const overalls = screen
      .getAllByText(new RegExp(`^${t('en', 'outfit.overall')}: `))
      .map((n) => String(n.props['children']));
    expect(overalls).toStrictEqual([
      `${t('en', 'outfit.overall')}: 71`,
      `${t('en', 'outfit.overall')}: 63`,
    ]);
  });

  it('shows each slot as stored: its colour, its hex and its label, in stored order', () => {
    open([historical], { view: 'lookbook' });
    const labels = screen
      .getAllByText(/^(Linen shirt|trousers|Loafers)$/)
      .map((n) => String(n.props['children']));
    expect(labels).toStrictEqual(['Linen shirt', 'trousers', 'Loafers']);
    for (const item of historical.items)
      expect(screen.getAllByText(item.color.hex).length).toBeGreaterThan(0);
  });

  it('marks the locked slot, and only that one', () => {
    open([historical], { view: 'lookbook' });
    expect(screen.getAllByText(t('en', 'lab.locked'))).toHaveLength(1);
  });

  it('DECOY: an outfit saved with no lock shows no Locked badge', () => {
    open([{ ...historical, items: historical.items.map((i) => ({ ...i, locked: false })) }], {
      view: 'lookbook',
    });
    expect(screen.queryByText(t('en', 'lab.locked'))).toBeNull();
  });

  it('shows the stored overall beside all six components, and says it was not recomputed', () => {
    open([historical], { view: 'lookbook' });
    expect(screen.getByText(`${t('en', 'outfit.overall')}: 63`)).toBeTruthy();
    for (const c of historical.components)
      expect(screen.getByText(new RegExp(` — ${String(Math.round(c.score))}$`))).toBeTruthy();
    expect(screen.getByText(t('en', 'lookbook.scoredWhenSaved'))).toBeTruthy();
  });

  it('prints the versions that scored it, not this build’s', () => {
    open([historical], { view: 'lookbook' });
    const versions = screen.getByText(new RegExp(`^${t('en', 'lookbook.versions')}: `));
    const text = String(versions.props['children']);
    // Each stored version beside its own label — four different values, so a renderer that printed
    // one in another's place, or the build's own, fails here.
    expect(text).toContain(`${t('en', 'lookbook.versionRules')} 2026.07.1`);
    expect(text).toContain(`${t('en', 'lookbook.versionCorpus')} 2026.06.2`);
    expect(text).toContain(`${t('en', 'lookbook.versionEngine')} 0.0.9`);
    expect(text).toContain(`${t('en', 'lookbook.versionScorer')} 0.4.0`);
    // DECOY: none of this build's versions is what it prints.
    for (const current of [
      RECOMMENDATION_VERSION,
      ENGINE_VERSION,
      CORPUS_LABEL,
      ruleSet().versionId,
    ])
      expect({ current, printed: text.includes(current) }).toStrictEqual({
        current,
        printed: false,
      });
  });

  it('names each slot to a screen reader: the slot, the garment, its colour, and Locked', () => {
    open([historical], { view: 'lookbook' });
    const top = screen.getByLabelText(new RegExp(`^${t('en', 'outfit.top')}: Linen shirt, `));
    expect(String(top.props['accessibilityLabel'])).toMatch(
      new RegExp(`, ${t('en', 'lab.locked')}$`),
    );
    // DECOY: an unlocked slot's name does not say Locked.
    const shoe = screen.getByLabelText(new RegExp(`^${t('en', 'outfit.shoe')}: Loafers, `));
    expect(String(shoe.props['accessibilityLabel'])).not.toContain(t('en', 'lab.locked'));
  });

  it('renders a component this build does not know, visibly, rather than dropping it (E-206)', () => {
    // An entry saved by a build with a component since renamed: its line stays, with the raw key,
    // so a reader sees something is wrong instead of a score with a part missing.
    const renamed: StoredOutfit = {
      ...historical,
      components: [
        ...historical.components.slice(0, 5),
        { ...historical.components[5]!, component: 'legacyBalance' },
      ],
    };
    open([renamed], { view: 'lookbook' });
    expect(screen.getByText(/^outfit\.legacyBalance\.supports — \d+$/)).toBeTruthy();
    // The known ones still read as the catalogue's sentences, not as keys.
    expect(screen.queryByText(/^outfit\.harmony\./)).toBeNull();
  });

  it('removes by id, from a control that names what it removes', () => {
    const onRemove = jest.fn();
    open([historical], { view: 'lookbook', onRemove });
    fireEvent.press(
      screen.getByRole('button', {
        name: `${t('en', 'lookbook.remove')}: Linen shirt, trousers, Loafers`,
      }),
    );
    expect(onRemove).toHaveBeenCalledWith('saved-old');
  });

  it("with nothing saved, the lookbook is 00's caption", () => {
    open([], { view: 'lookbook' });
    expect(
      screen.getByText(`${t('en', 'lookbook.empty')} ${t('en', 'lookbook.emptyHint')}`),
    ).toBeTruthy();
  });

  it('DECOY: with an outfit saved, there is no caption', () => {
    open([historical], { view: 'lookbook' });
    expect(screen.queryByText(t('en', 'lookbook.empty'), { exact: false })).toBeNull();
  });

  it('stays reachable with an empty wardrobe and one saved outfit', () => {
    open([historical], { garments: [] });
    fireEvent.press(choice(t('en', 'wardrobe.view.lookbook')));
    expect(screen.getByText('Linen shirt')).toBeTruthy();
  });

  it('DECOY: with no garment and no outfit, there is no choice — the empty wardrobe as it was', () => {
    open([], { garments: [] });
    expect(
      screen.queryByRole('radio', { name: new RegExp(`^${t('en', 'wardrobe.view.lookbook')}`) }),
    ).toBeNull();
  });

  /*
   * NO PHOTOGRAPH IS READ FOR THE LOOKBOOK (E-073). An entry draws each slot from its stored colour
   * snapshot; the garment's photograph is a BLOB read and an encode, and a list of saved outfits
   * has no reason to ask for one.
   */
  it('reads no garment photograph with Lookbook chosen', () => {
    const calls = { info: 0, bytes: 0 };
    const counting = {
      ...browse(GARMENTS),
      getGarmentImageInfo: () => {
        calls.info += 1;
        return undefined;
      },
      getGarmentImage: () => {
        calls.bytes += 1;
        return undefined;
      },
    };
    render(
      <ThemeProvider theme="dark">
        <Wardrobe
          store={counting}
          lookbook={{ outfits: [historical], onRemove: () => undefined }}
          initialView="lookbook"
        />
      </ThemeProvider>,
    );
    expect(calls).toStrictEqual({ info: 0, bytes: 0 });
  });

  it('DECOY: with Garments chosen, the gallery does ask', () => {
    const calls = { info: 0 };
    const counting = {
      ...browse(GARMENTS),
      getGarmentImageInfo: () => {
        calls.info += 1;
        return undefined;
      },
    };
    render(
      <ThemeProvider theme="dark">
        <Wardrobe
          store={counting}
          lookbook={{ outfits: [historical], onRemove: () => undefined }}
        />
      </ThemeProvider>,
    );
    expect(calls.info).toBeGreaterThan(0);
  });

  it('draws no choice when the route supplies no lookbook', () => {
    open(undefined);
    expect(
      screen.queryByRole('radio', { name: new RegExp(`^${t('en', 'wardrobe.view.lookbook')}`) }),
    ).toBeNull();
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

  it('the Wardrobe route reads the lookbook and hands the screen its outfits and removal', () => {
    const route = source('app/(tabs)/wardrobe/index.tsx');
    expect(route).toMatch(/useLookbook\(\)/);
    expect(route).toMatch(
      /lookbook=\{\{ outfits: lookbook\.outfits, onRemove: lookbook\.remove \}\}/,
    );
  });

  it('DECOY: a route that has nothing to do with the lookbook does not read it', () => {
    expect(source('app/(tabs)/wardrobe/shopping.tsx')).not.toMatch(/useLookbook/);
  });
});
