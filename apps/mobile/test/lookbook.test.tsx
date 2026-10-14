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
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { NewOutfit, StoredOutfit } from '@irodora/store';
import {
  LookbookProvider,
  useLookbook,
  type LookbookStore,
  type LookbookValue,
} from '../src/lookbook';
import { compositionKey } from '../src/outfit/lookbook';

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

describe('the routes carry the lookbook (E-205)', () => {
  const source = (path: string): string => readFileSync(join(__dirname, '..', path), 'utf8');

  it('the root layout mounts the provider with the device repository', () => {
    expect(source('app/_layout.tsx')).toMatch(/<LookbookProvider store=\{deviceRepository\(\)\}>/);
  });

  it('DECOY: a route that has nothing to do with the lookbook does not read it', () => {
    expect(source('app/(tabs)/wardrobe/shopping.tsx')).not.toMatch(/useLookbook/);
  });
});
