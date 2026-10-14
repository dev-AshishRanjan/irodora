/**
 * The lookbook as data (F-238; ADR-0136 D4, D5): the draft's score, the record a draft is saved
 * as, and a stored record read back.
 *
 * The claim that earns this file is FR-10's: a saved score can be replayed from what was stored.
 * Every complete outfit of a small wardrobe is recorded, read back through the same colour path the
 * app uses, and scored again from the snapshot alone; the numbers must be byte-identical. And the
 * opposite has to be shown too — that a different profile gives a different score — or "identical"
 * would be true of a scorer that ignored its inputs.
 */

import {
  OUTFIT_COMPONENTS,
  OUTFIT_MESSAGE_KEYS,
  outfitWeights,
  parseWeightContent,
  scoreOutfit,
} from '@irodora/recommendation';
import { COVERAGE_THRESHOLD } from '@irodora/optimization';
import type {
  NewSavedColor,
  SavedColorRow,
  StoredGarment,
  StoredPersonalProfile,
} from '@irodora/store';
import { allEntries, CORPUS_LABEL } from '../src/corpus';
import { ruleSet } from '../src/rules';
import { WEIGHTS_TEXT } from '../src/rules/generated/weights';
import { colorOf } from '../src/wardrobe';
import { engineProfile, regenerate, type OutfitDraft } from '../src/outfit/builder';
import {
  componentMessageKey,
  compositionKey,
  draftKey,
  isComplete,
  outfitEnvelope,
  outfitRecord,
  scoreDraft,
  shownScoreOf,
  type ScoringContext,
} from '../src/outfit/lookbook';
import type { Profile } from '../src/profile/dimensions';

const weights = parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.test.json');
const rules = ruleSet();

function rowOf(slug: string, id = `colour-${slug}`): SavedColorRow {
  const found = allEntries().find((e) => e.entry.slug === slug);
  if (found === undefined) throw new Error(`no entry ${slug}`);
  return {
    id,
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

const reference = allEntries().map((e) => ({
  id: e.entry.slug,
  color: colorOf(rowOf(e.entry.slug)),
}));

const garment = (
  id: string,
  type: string,
  slug: string,
  name: string | null = null,
): StoredGarment => ({
  id,
  type,
  color: rowOf(slug),
  name,
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

const SLUGS = allEntries()
  .slice(0, 6)
  .map((e) => e.entry.slug);

const PROFILE: Profile = {
  id: 'profile',
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
};

const STORED_PROFILE: StoredPersonalProfile = {
  ...PROFILE,
  createdAt: 1_760_000_000_000,
  updatedAt: 1_760_000_123_456,
  deletedAt: null,
};

const context: ScoringContext = { profile: PROFILE, rules, weights, reference };

const TOPS = [
  garment('g-01', 'jumper', SLUGS[0]!),
  garment('g-02', 'shirt', SLUGS[1]!, 'Linen shirt'),
];
const TROUSERS = [garment('g-03', 'trousers', SLUGS[2]!), garment('g-04', 'jeans', SLUGS[3]!)];
const SHOES = [garment('g-05', 'shoes', SLUGS[4]!), garment('g-06', 'boots', SLUGS[5]!)];

const drafted = (
  top: StoredGarment,
  trouser: StoredGarment,
  shoe: StoredGarment,
  locked = [false, false, false],
): OutfitDraft => [
  { slot: 'top', garment: top, locked: locked[0] ?? false },
  { slot: 'trouser', garment: trouser, locked: locked[1] ?? false },
  { slot: 'shoe', garment: shoe, locked: locked[2] ?? false },
];

/** Every complete outfit the fixture wardrobe makes: two of each, eight in all. */
const EVERY = TOPS.flatMap((top) =>
  TROUSERS.flatMap((trouser) => SHOES.map((shoe) => drafted(top, trouser, shoe))),
);

/** A snapshot read back as a colour row — what `listOutfits` hands the app. */
const readBack = (snapshot: Omit<NewSavedColor, 'id'>, id: string): SavedColorRow => ({
  id,
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
  name: snapshot.name,
  xyz_x: snapshot.xyz_x,
  xyz_y: snapshot.xyz_y,
  xyz_z: snapshot.xyz_z,
  lab_l: snapshot.lab_l,
  lab_a: snapshot.lab_a,
  lab_b: snapshot.lab_b,
  oklch_l: snapshot.oklch_l,
  oklch_c: snapshot.oklch_c,
  oklch_h: snapshot.oklch_h,
  hex: snapshot.hex,
  source: snapshot.source,
  confidence: snapshot.confidence,
  corpus_slug: snapshot.corpus_slug,
  capture_illuminant: snapshot.conditions?.illuminant ?? null,
  capture_quality: snapshot.conditions?.quality ?? null,
  capture_samples: snapshot.conditions?.sampleCount ?? null,
  capture_variance: snapshot.conditions?.variance ?? null,
});

const envelope = outfitEnvelope(STORED_PROFILE, rules);

describe('the draft is scored as composed', () => {
  it('is one engine call over every placed piece', () => {
    const draft = EVERY[0]!;
    const direct = scoreOutfit(
      draft.map((p) => ({ slot: p.slot, color: colorOf(p.garment.color) })),
      reference,
      engineProfile(PROFILE),
      rules,
      outfitWeights(weights),
    );
    expect(scoreDraft(draft, context)).toStrictEqual(direct);
  });

  it("DECOY: the Lab's proposal scores answer a different question", () => {
    // A proposal is the locked pieces plus one candidate; with an unlocked piece placed, it leaves
    // that piece out, so it is not the score of the outfit as composed.
    const draft = drafted(TOPS[0]!, TROUSERS[0]!, SHOES[0]!, [true, false, false]);
    const proposal = regenerate({ ...context, draft, wardrobe: [...TOPS, ...TROUSERS, ...SHOES] })
      .find((p) => p.slot === 'trouser')
      ?.ranked.find((r) => r.garment.id === TROUSERS[0]!.id);
    expect(proposal).toBeDefined();
    expect(proposal?.score.overall).not.toBe(scoreDraft(draft, context).overall);
  });
});

describe('an outfit is one garment per slot', () => {
  it('is complete only when every slot is filled', () => {
    const full = EVERY[0]!;
    expect([0, 1, 2, 3].map((k) => isComplete(full.slice(0, k)))).toStrictEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it('is identified by its slot→garment pairs, in any order', () => {
    const draft = EVERY[0]!;
    expect(draftKey([...draft].reverse())).toBe(draftKey(draft));
    expect(
      compositionKey([
        { slot: 'top', garmentId: 'a' },
        { slot: 'shoe', garmentId: 'b' },
      ]),
    ).toBe(
      compositionKey([
        { slot: 'shoe', garmentId: 'b' },
        { slot: 'top', garmentId: 'a' },
      ]),
    );
  });

  it('DECOY: the same garments in swapped slots are a different outfit', () => {
    expect(
      compositionKey([
        { slot: 'top', garmentId: 'a' },
        { slot: 'shoe', garmentId: 'b' },
      ]),
    ).not.toBe(
      compositionKey([
        { slot: 'top', garmentId: 'b' },
        { slot: 'shoe', garmentId: 'a' },
      ]),
    );
  });

  it('the locks are not part of what it is', () => {
    expect(draftKey(drafted(TOPS[0]!, TROUSERS[0]!, SHOES[0]!, [true, true, false]))).toBe(
      draftKey(EVERY[0]!),
    );
  });
});

describe('the record a draft is saved as', () => {
  const draft = drafted(TOPS[1]!, TROUSERS[0]!, SHOES[1]!, [true, false, false]);
  const score = scoreDraft(draft, context);
  const record = outfitRecord(draft, score, envelope);

  it('copies each scored colour from the garment row, value for value', () => {
    for (const [i, p] of draft.entries()) {
      const { color } = record.items[i]!;
      const row = p.garment.color;
      expect([
        color.hex,
        color.xyz_x,
        color.lab_l,
        color.oklch_h,
        color.source,
        color.corpus_slug,
      ]).toStrictEqual([row.hex, row.xyz_x, row.lab_l, row.oklch_h, row.source, row.corpus_slug]);
    }
  });

  it('keeps the slots in the engine order with the locks and the labels shown', () => {
    expect(record.items.map((i) => [i.slot, i.garmentId, i.locked, i.garmentLabel])).toStrictEqual([
      ['top', 'g-02', true, 'Linen shirt'],
      ['trouser', 'g-03', false, 'trousers'],
      ['shoe', 'g-06', false, 'boots'],
    ]);
  });

  it('keeps all six components with the weight and contribution the overall was built from', () => {
    expect(record.overall).toBe(score.overall);
    expect(record.components.map((c) => c.component)).toStrictEqual([...OUTFIT_COMPONENTS]);
    for (const c of record.components) {
      const factor = score.factors.find((f) => f.component === c.component);
      expect([c.weight, c.contribution]).toStrictEqual([factor?.weight, factor?.contribution]);
    }
  });

  it('records the threshold and the versions it was scored by', () => {
    expect(record.countsThreshold).toBe(COVERAGE_THRESHOLD);
    expect(record.envelope).toStrictEqual({
      engine: envelope.engine,
      scorer: envelope.scorer,
      corpus: CORPUS_LABEL,
      rules: rules.versionId,
      occasion: 'default',
      profile: 'profile:1760000123456',
    });
  });

  it('DECOY: the envelope is read from its inputs, not written here', () => {
    expect(outfitEnvelope(STORED_PROFILE, { ...rules, versionId: '2099.01.1' }).rules).toBe(
      '2099.01.1',
    );
  });

  it('refuses a draft with an empty slot', () => {
    expect(() => outfitRecord(draft.slice(0, 2), score, envelope)).toThrow(/one garment per slot/);
  });
});

describe('a saved score replays from its snapshot alone (FR-10)', () => {
  const replay = (draft: OutfitDraft, profile: Profile) => {
    const record = outfitRecord(draft, scoreDraft(draft, context), envelope);
    const again = scoreOutfit(
      record.items.map((item) => ({
        slot: item.slot as (typeof draft)[number]['slot'],
        color: colorOf(readBack(item.color, `${item.slot}-snapshot`)),
      })),
      reference,
      engineProfile(profile),
      rules,
      outfitWeights(weights),
    );
    return { record, again };
  };

  it('every complete outfit of the wardrobe scores byte-identically from what was stored', () => {
    for (const draft of EVERY) {
      const { record, again } = replay(draft, PROFILE);
      expect({ key: draftKey(draft), overall: again.overall }).toStrictEqual({
        key: draftKey(draft),
        overall: record.overall,
      });
      expect(
        again.components.map((c) => {
          const factor = again.factors.find((f) => f.component === c.component);
          return [c.component, c.score, c.direction, factor?.weight, factor?.contribution];
        }),
      ).toStrictEqual(
        record.components.map((c) => [c.component, c.score, c.direction, c.weight, c.contribution]),
      );
    }
  });

  it('DECOY: against a different profile, at least one outfit scores differently', () => {
    const other: Profile = {
      ...PROFILE,
      temperatureBias: -0.9,
      lightness: { min: 0.05, max: 0.25 },
    };
    const changed = EVERY.filter((draft) => {
      const { record, again } = replay(draft, other);
      return again.overall !== record.overall;
    });
    expect(changed.length).toBeGreaterThan(0);
  });
});

describe('a stored score is shown as stored', () => {
  it("rebuilds each component's sentence key in the engine's own format", () => {
    for (const draft of EVERY) {
      const score = scoreDraft(draft, context);
      for (const c of score.components)
        expect(componentMessageKey(c.component, c.direction)).toBe(c.messageKey);
    }
    for (const component of OUTFIT_COMPONENTS)
      for (const direction of ['supports', 'opposes', 'neutral'] as const)
        expect(OUTFIT_MESSAGE_KEYS).toContain(componentMessageKey(component, direction));
  });

  it('reads a stored outfit without the engine', () => {
    const shown = shownScoreOf({
      id: 'saved',
      createdAt: 1,
      overall: 58,
      countsThreshold: 60,
      envelope,
      items: [],
      components: [
        {
          component: 'harmony',
          position: 0,
          score: 41,
          direction: 'opposes',
          weight: 0.3,
          contribution: 12.3,
        },
      ],
    });
    expect(shown).toStrictEqual({
      overall: 58,
      components: [{ component: 'harmony', score: 41, messageKey: 'outfit.harmony.opposes' }],
    });
  });
});

describe('a captured colour keeps its conditions (rule 12)', () => {
  const capturedRow: SavedColorRow = {
    ...rowOf(SLUGS[0]!, 'captured'),
    source: 'estimated',
    confidence: 0.6,
    corpus_slug: null,
    capture_illuminant: 'D65',
    capture_quality: 'good',
    capture_samples: 48,
    capture_variance: 0.003,
  };
  const captured: StoredGarment = { ...garment('g-07', 'jumper', SLUGS[0]!), color: capturedRow };
  const record = outfitRecord(
    drafted(captured, TROUSERS[0]!, SHOES[0]!),
    scoreDraft(drafted(captured, TROUSERS[0]!, SHOES[0]!), context),
    envelope,
  );
  const snapshot = record.items[0]!.color;

  it('copies them into the snapshot, and the snapshot reads back as the same capture', () => {
    expect(snapshot.conditions).toStrictEqual({
      illuminant: 'D65',
      quality: 'good',
      sampleCount: 48,
      variance: 0.003,
    });
    expect(colorOf(readBack(snapshot, 'back')).provenance.source).toBe('estimated');
  });

  it('DECOY: the same snapshot without them is refused by name, never relabelled', () => {
    const bare = { ...snapshot };
    delete bare.conditions;
    expect(() => colorOf(readBack(bare, 'bare'))).toThrow();
  });
});
