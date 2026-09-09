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

/*
 * THE LOCALE THE SUITE RENDERS IN (F-152).
 *
 * `deviceLocale` reads `getLocales()` on every call, so a mutable tag is enough to render the
 * whole registry in either language — no override prop on every screen, and no second copy of
 * the registry in a second file.
 *
 * The name has to begin with `mock`: jest hoists `jest.mock` above everything, and its babel
 * plugin refuses a factory that closes over any other out-of-scope binding. There is no
 * temporal-dead-zone problem, because `getLocales` reads the tag when it is CALLED — at render
 * time — rather than when the factory is built.
 */
const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { Text, ThemeProvider, swatchAccessibleName } from '@irodora/ui';
import {
  checkAll,
  checkStatusAdjacency,
  formatFindings,
  type ConformanceSubject,
  type TestNode,
} from '@irodora/ui/testing';
import { Home, type HomeStore } from '../src/screens/Home';
import { Atlas } from '../src/screens/Atlas';
import { ColourDetail, type DerivedPanel } from '../src/screens/ColourDetail';
import { Compare } from '../src/screens/Compare';
import { Combinations } from '../src/screens/Combinations';
import { Wear } from '../src/screens/Wear';
import type { PersonalProfile } from '@irodora/recommendation';
import { combinationsFor } from '../src/combinations';
import { allCombinations } from '../src/corpus';
import { Contemporary } from '../src/screens/Contemporary';
import { PaletteStudio } from '../src/screens/PaletteStudio';
import { Preferences, type PreferenceStore } from '../src/screens/Preferences';
import { AddGarment } from '../src/screens/AddGarment';
import { Wardrobe, type BrowseStore } from '../src/screens/Wardrobe';
import { Export } from '../src/screens/Export';
import type { FileSink } from '../src/export/sink';
import { OutfitBuilder } from '../src/screens/OutfitBuilder';
import { Shopping } from '../src/screens/Shopping';
import { Measure, type ReferenceLibrary } from '../src/screens/Measure';
import { parseMeasurement } from '../src/measure';
import { colorOf } from '../src/wardrobe';
import { ruleSet } from '../src/rules';
import { WEIGHTS_TEXT } from '../src/rules/generated/weights';
import { engineProfile } from '../src/outfit/builder';
import {
  outfitWeights,
  parseWeightContent,
  preferenceWeight,
  OUTFIT_COMPONENTS,
  OUTFIT_MESSAGE_KEYS,
} from '@irodora/recommendation';
import { familyLabel } from '../src/corpus';
import type { SavedColorRow, StoredGarment } from '@irodora/store';
import type { ExportSubject } from '@irodora/export';
import type { WardrobeStore } from '../src/wardrobe';
import type { WearStore } from '../src/wardrobe/cost';
import type { ImageSource } from '../src/wardrobe/source';
import type { NewGarment } from '@irodora/store';
import type { LensReading } from '../src/lens/reading';
import { Finder } from '../src/screens/Finder';
import { ColourCard } from '../src/screens/ColourCard';
import { ProfileSetup, DIMENSION_KEYS } from '../src/screens/ProfileSetup';
import { Lens } from '../src/screens/Lens';
import { readingOklch } from '../src/profile/photo';
import { displayFromOklch } from '../src/engine';
import { cardSvg } from '../src/card';
import { nativeColors } from '@irodora/design-tokens';
import type { Theme } from '@irodora/design-tokens';
import { find } from '../src/finder';
import { deriveWeights, toStoreWrite } from '../src/palette';
import { equivalentsFor } from '../src/contemporary';
import { PALETTE_ROLES } from '@irodora/corpus';
import type { PaletteDraft, PaletteStore } from '../src/palette';
import type { NewPersonalProfile, StoredPalette, StoredPersonalProfile } from '@irodora/store';
import { TRIALS, type TrialAnswer } from '../src/profile/trials';
import { PROFILE_DIMENSIONS } from '@irodora/store';
import { en } from '../src/i18n/en';
import { isMessageKey, t } from '../src/i18n/index';
import type { ProfileStore } from '../src/profile/store';
import { compare } from '../src/compare';
import {
  nativeFamilies,
  nativeJudgeableSample,
  nativeNumericFeature,
} from '@irodora/design-tokens';
import { allEntries, colorFor, CORPUS_ENTRY_COUNT, CORPUS_LABEL, entryBySlug } from '../src/corpus';
import { simulateAnomalous, type Deficiency } from '@irodora/cvd-engine';
import { srgbToHex } from '@irodora/color-spaces';

/*
 * TIME IS HELD STILL, AND NEVER ADVANCED (F-158).
 *
 * These are questions about a RENDERED TREE — what colour is on a node, what a screen reader
 * would announce. None is about frame 4, and nothing here has ever advanced a timer.
 *
 * It became load-bearing when the Lens acquired a sheet. A gorhom sheet animates, so reanimated
 * installs a mapper, and when the mapper ticks `extractInputs` walks its plain-object inputs
 * with `Object.values`; under this harness that walk reaches React Native's module namespace,
 * trips its lazy native getters (`DevMenu`, `SettingsManager`, …) and then recurses through the
 * module graph until the stack is gone. It fires on a queued frame AFTER the render, so jest
 * attributes it to whichever test is running — which is how it presents as an unrelated failure.
 *
 * A harness artefact, not a defect in the sheet: on a device the same code runs through the
 * native worklets runtime, and if the mapper's input really were the RN namespace, every app
 * using this library would overflow on first open.
 */
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

function draw(node: React.JSX.Element, theme: Theme): TestNode {
  const rendered = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
  const json = rendered.toJSON();
  /*
   * UNMOUNTED BEFORE THE NEXT SUBJECT, and this is not tidiness.
   *
   * A portalled component — a sheet, a dialog — renders into a SHARED host that outlives the
   * tree that put it there. Without this, the light render's sheet was still mounted when the
   * dark one was captured, so the dark subject reported `#F7F6F3` for its ground: the LIGHT
   * palette, on a dark tree. It reads as a theme bug in the component and it is a leak in the
   * harness. `packages/ui`'s `draw()` learned the same thing in F-143; this one had never
   * rendered anything portalled until now.
   */
  rendered.unmount();
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
/**
 * Two subjects for the contemporary screen, picked by what they ARE rather than by name.
 *
 * One that is itself in a contemporary palette and one that is not, resolved from the corpus so
 * a republished palette moves them rather than leaving a subject that no longer renders the
 * branch it was registered for.
 */
const CONTEMPORARY_MEMBER =
  allEntries().find((e) => equivalentsFor(e).membership.length > 0)?.entry.slug ?? '';
const CONTEMPORARY_NEAR =
  allEntries().find(
    (e) => equivalentsFor(e).membership.length === 0 && equivalentsFor(e).computed.length > 0,
  )?.entry.slug ?? '';

/**
 * A colour whose combinations render BOTH cost branches (F-194).
 *
 * Resolved by what it does rather than by name: the screen prints a ΔE00 for a relationship the
 * display had to shift and a different line for one it can show exactly, and a subject that
 * happened to produce only one of the two would leave the other measured by nothing. The
 * corpus is the input, so a republished corpus moves this subject rather than silently
 * un-covering a branch.
 *
 * The fallback is the first entry, and it is deliberately NOT a throw: a corpus in which no
 * colour maps is a legitimate corpus, and the assertion that both branches exist belongs in a
 * test that says so — not in a fixture that would take the whole suite down with it.
 */
const BOTH_COST_BRANCHES =
  allEntries().find((e) => {
    const { oklch } = e.derived;
    const shown = combinationsFor([oklch[0], oklch[1], oklch[2]]);
    return shown.some((c) => c.wasMapped) && shown.some((c) => !c.wasMapped);
  }) ?? allEntries()[0]!;

/**
 * The hexes the ENGINE produced for that subject.
 *
 * `sampleValues` is how a subject says *these colours are the subject matter, not the*
 * *chrome* — the suite otherwise requires every painted colour to resolve to a token, and a
 * generated companion resolves to none by construction. The corpus hexes are declared that
 * way already; these are the first that no corpus published.
 *
 * **Derived, never pasted.** A literal list would pass while the engine drifted underneath
 * it — the suite would go on measuring nine hexes that nothing renders, and report clean.
 */
function generatedHexes(slug: string): readonly string[] {
  const found = entryBySlug(slug);
  if (found === null) return [];
  const { oklch } = found.derived;
  return combinationsFor([oklch[0], oklch[1], oklch[2]]).flatMap((c) =>
    c.companions.map((x) => displayFromOklch([x.oklch[0], x.oklch[1], x.oklch[2]]).hex),
  );
}

/*
 * PER SUBJECT, because the subject decides them. A single list computed for one colour and
 * reused for another declares hexes that subject never paints and omits every one it does —
 * which the suite reports as unresolved literals, correctly.
 */
const GENERATED_HEXES: readonly string[] = generatedHexes(BOTH_COST_BRANCHES.entry.slug);

/**
 * Somebody the engine has something to go on about (F-195).
 *
 * Confidence on all four axes, so `Wear` draws the blended figure and the four explanation
 * lines. The subject WITHOUT this renders a different tree entirely — a different number under
 * a different label, no factors at all, and a card saying which half is missing — which is why
 * both are registered rather than one standing in for the other.
 */
const WEARER: PersonalProfile = {
  lightness: { min: 0.4, max: 0.75 },
  temperatureBias: 0.3,
  chroma: { min: 0.02, max: 0.14 },
  contrast: 'high',
  confidence: { temperature: 0.8, lightness: 0.8, chroma: 0.7, contrast: 0.6 },
};

/**
 * A colour that IS in a curated combination (F-196).
 *
 * Resolved from the shipped corpus rather than named, so a republished corpus moves the subject
 * instead of leaving one that no longer renders the branch it was registered for. The lead of
 * the first combination, because a lead renders one line the companions do not.
 */
const CURATED_LEAD =
  allCombinations()[0]?.combination.colors.find((c) => c.role === 'lead')?.slug ?? '';

/**
 * A garment-ish colour, not in the corpus (F-197).
 *
 * Mid-lightness and modest chroma, so every relationship generated from it stays inside the
 * display gamut and the subject renders the ordinary branch rather than an edge case.
 */
const GARMENT_COLOUR: readonly [number, number, number] = [0.42, 0.09, 24];

/** What that subject paints — the free colour itself, plus everything generated from it. */
const GARMENT_HEXES: readonly string[] = [
  displayFromOklch([...GARMENT_COLOUR]).hex,
  ...combinationsFor(GARMENT_COLOUR).flatMap((c) =>
    c.companions.map((x) => displayFromOklch([x.oklch[0], x.oklch[1], x.oklch[2]]).hex),
  ),
];

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
          /*
           * The four capture columns are mapped, not spread (F-108). `NewSavedColor` carries
           * the conditions as ONE optional object and the ROW carries them as four columns, so
           * a spread produces a shape that is neither. Doing it here the way the repository
           * does keeps this fake standing in for the real write path rather than for a
           * simplified idea of it.
           */
          color: {
            ...m.color,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            capture_illuminant: m.color.conditions?.illuminant ?? null,
            capture_quality: m.color.conditions?.quality ?? null,
            capture_samples: m.color.conditions?.sampleCount ?? null,
            capture_variance: m.color.conditions?.variance ?? null,
          },
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

/**
 * Home's port, in memory (F-146).
 *
 * Rows are REAL-SHAPED rather than partial: Home hands each one to `colorOf`, which reads the
 * XYZ triple, the source and the confidence. A partial row would throw at render, and the
 * failure would read as a bug in the component rather than in the fixture.
 *
 * `empty` is the state most people see on a first run, and it is the one a fixture is most
 * likely to skip — so it is the default here and the populated case is opt-in.
 */
function fakeHome(populated = false): HomeStore {
  const row = (id: string, created: number): SavedColorRow =>
    ({
      id,
      created_at: created,
      updated_at: created,
      deleted_at: null,
      name: id === 'r1' ? 'Ai-nezumi' : 'Kakishibu',
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

  const garment = (id: string, created: number): StoredGarment =>
    ({
      id,
      createdAt: created,
      updatedAt: created,
      deletedAt: null,
      type: 'shirt',
      color: row(`${id}-c`, created),
    }) as unknown as StoredGarment;

  return {
    listColors: () => (populated ? [row('r1', 100), row('r2', 900)] : []),
    listGarments: () => (populated ? [garment('g1', 10), garment('g2', 20)] : []),
  };
}

/**
 * The wardrobe port, in memory. Same reason as `fakeStore`: `expo-sqlite` needs a device.
 *
 * `createGarment` keeps only what the screen reads back — the count — because a full
 * `StoredGarment` here would be a second implementation of the repository's read path, in a
 * test file, disagreeing with the real one the first time a column moved.
 */
function fakeWardrobe(): WardrobeStore & { readonly written: NewGarment[] } {
  const written: NewGarment[] = [];
  return {
    written,
    createGarment(garment) {
      written.push(garment);
    },
    enrichGarment() {
      /* The screen calls this only when there is enrichment; nothing here reads it back. */
    },
    putGarmentImage() {
      /* Likewise. `garment-image.test.ts` is where the bytes are actually asserted. */
    },
    listGarments: () => [],
    /*
     * NO PHOTOGRAPHS, and that is a real state rather than a stub for one.
     *
     * A garment with no picture is the common case in a new wardrobe, and the gallery draws its
     * colour at cell scale for it. Returning `undefined` here means every screen test in this
     * file exercises that branch — the one where the product still has something to show.
     * `gallery.test.ts` covers the branch with bytes, where cost can be counted.
     */
    getGarmentImageInfo: () => undefined,
    getGarmentImage: () => undefined,
  };
}

/**
 * An image source that always yields the same valid PNG.
 *
 * The bytes matter: they go through `ingestImage`, so a source returning something malformed
 * would exercise the REJECTED branch while claiming to test the happy one. This is the
 * smallest thing the ingest accepts.
 */
function fakeImageSource(): ImageSource {
  const png = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 8,
    0, 0, 0, 8, 8, 0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63,
    0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0,
  ]);
  return {
    pickFromLibrary: () => Promise.resolve(png),
    captureWithCamera: () => Promise.resolve(png),
  };
}

/** The profile port, in memory. Same reason as `fakeStore`: `expo-sqlite` needs a device. */
function fakeProfileStore(): ProfileStore & { readonly saved: NewPersonalProfile[] } {
  const saved: NewPersonalProfile[] = [];
  const rows = new Map<string, StoredPersonalProfile>();
  return {
    saved,
    saveProfile(profile, now) {
      saved.push(profile);
      rows.set(profile.id, { ...profile, createdAt: now, updatedAt: now, deletedAt: null });
    },
    listProfiles: () => [...rows.values()],
  };
}

/** Every trial answered on the `a` pole — the summary branch, fully populated. */
const ALL_ANSWERS: readonly TrialAnswer[] = TRIALS.map((t) => ({ trialId: t.id, pole: 'a' }));

/** A good reading: sRGB, well lit, plenty of samples, nothing capped (F-027). */
const SAMPLE_READING: LensReading = {
  rgb: [0.78, 0.62, 0.5],
  space: 'srgb',
  usableSamples: 1800,
  variance: 0.01,
  illumination: 'daylight',
  quality: 'excellent',
  confidence: 1,
  instruction: '',
};

/** A reading the Lens might have left for the wardrobe. Values are a plausible mid navy. */
const OFFERED_READING: LensReading = {
  rgb: [0.29, 0.42, 0.55],
  space: 'srgb',
  usableSamples: 4096,
  variance: 0.004,
  illumination: 'daylight',
  quality: 'good',
  confidence: 0.82,
  instruction: '',
};

/** Everything `regenerate` needs that the screen does not own. Built from published content. */
const OUTFIT_CONTEXT = {
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
    .map((e) => ({ id: e.entry.slug, color: colorOf(outfitRow(e.entry.slug)) })),
} as const;

/**
 * What the shopping check needs (F-052).
 *
 * Derived from `OUTFIT_CONTEXT` rather than restated: they describe the same person and the
 * same published content, and two copies of a profile fixture drift the first time one is
 * edited. The shapes differ only in that coverage wants resolved component weights where the
 * builder wants the parsed content.
 */
const SHOPPING_CONTEXT = {
  profile: engineProfile(OUTFIT_CONTEXT.profile),
  rules: OUTFIT_CONTEXT.rules,
  weights: outfitWeights(OUTFIT_CONTEXT.weights),
  reference: OUTFIT_CONTEXT.reference,
} as const;

/**
 * One reference library, six entries (F-055).
 *
 * Small on purpose — the route offers the whole corpus, and a registry subject rendering 120
 * swatches would spend the suite's time proving something six already prove.
 */
const MEASURE_LIBRARIES: readonly ReferenceLibrary[] = [
  {
    id: 'corpus',
    name: 'Irodora 2026.08.1',
    entries: allEntries()
      .slice(0, 6)
      .map((e) => ({ id: e.entry.slug, name: e.entry.name.en, color: colorFor(e.entry) })),
  },
];

/** Two measurements, so the table branch has rows to draw. */
const MEASURE_SAMPLES = (() => {
  const one = parseMeasurement('lab', ['52.31', '-8.44', '2.07']);
  const two = parseMeasurement('lab', ['61.02', '4.10', '-12.55']);
  if (!one.ok || !two.ok) throw new Error('the fixture measurements must parse');
  return [
    { id: 'm-1', name: 'LAB 52.31 -8.44 2.07', color: one.color },
    { id: 'm-2', name: 'LAB 61.02 4.10 -12.55', color: two.color },
  ];
})();

/** A stored colour row for a published entry. Reference-sourced, so it owes no conditions. */
function outfitRow(slug: string): SavedColorRow {
  const e = allEntries().find((x) => x.entry.slug === slug);
  if (e === undefined) throw new Error(`no entry ${slug}`);
  return {
    id: `c-${slug}`,
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    name: e.entry.name.en,
    xyz_x: e.entry.color.xyz[0],
    xyz_y: e.entry.color.xyz[1],
    xyz_z: e.entry.color.xyz[2],
    lab_l: e.derived.lab[0],
    lab_a: e.derived.lab[1],
    lab_b: e.derived.lab[2],
    oklch_l: e.derived.oklch[0],
    oklch_c: e.derived.oklch[1],
    oklch_h: e.derived.oklch[2],
    hex: e.derived.hex,
    source: 'reference',
    confidence: 1,
    corpus_slug: slug,
    capture_illuminant: null,
    capture_quality: null,
    capture_samples: null,
    capture_variance: null,
  };
}

const outfitGarment = (id: string, type: string, slug: string): StoredGarment => ({
  id,
  type,
  color: outfitRow(slug),
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

const OUTFIT_WARDROBE = [
  outfitGarment('o-1', 'jumper', allEntries()[0]!.entry.slug),
  outfitGarment('o-2', 'trousers', allEntries()[1]!.entry.slug),
  outfitGarment('o-3', 'shoes', allEntries()[2]!.entry.slug),
];

/**
 * The same wardrobe with a price and a wear history on the top (F-051).
 *
 * A separate fixture because the two cost-per-wear branches draw different things: the
 * unpriced one draws a single grey sentence and the priced one draws two numeric lines. A
 * registry entry for only the first would check the accessibility of the case where the
 * feature has nothing to say.
 */
/**
 * Three priced, worn jumpers — enough for the investment signal to answer (F-123, ADR-0082).
 *
 * MINIMUM_COMPARABLES is 3, so a fixture of two would render the `tooFew` refusal and the
 * answered branch would go unchecked in both themes. The rates are 200, 350 and 300 per wear,
 * so the median is 300 and the numbers on screen are not all the same digit.
 */
const SHOPPING_PRICED: readonly StoredGarment[] = [
  {
    ...outfitGarment('s-1', 'jumper', allEntries()[0]!.entry.slug),
    costMinor: 6000,
    currency: 'GBP',
    wearCount: 30,
  },
  {
    ...outfitGarment('s-2', 'jumper', allEntries()[1]!.entry.slug),
    costMinor: 14000,
    currency: 'GBP',
    wearCount: 40,
  },
  {
    ...outfitGarment('s-3', 'jumper', allEntries()[2]!.entry.slug),
    costMinor: 9000,
    currency: 'GBP',
    wearCount: 30,
  },
];

/**
 * A subject to export, and a sink that records nothing (F-129).
 *
 * The registry never presses the button, so the sink's behaviour does not matter — what matters
 * is that the screen renders with something to export and with nothing, because those two draw
 * almost disjoint trees.
 */
const EXPORT_SUBJECT: ExportSubject = {
  title: 'Evening walk',
  envelope: { engine: '0.1.0', corpus: CORPUS_LABEL, rules: '2026.08.3' },
  colours: allEntries()
    .slice(0, 3)
    .map((e) => ({
      id: e.entry.slug,
      name: e.entry.name.en,
      hex: e.derived.hex,
      lab: e.derived.lab,
      lch: [e.derived.lab[0], Math.hypot(e.derived.lab[1], e.derived.lab[2]), 0] as const,
      oklch: e.derived.oklch,
      source: 'reference',
    })),
};

const noSink: FileSink = { save: () => Promise.resolve({ kind: 'cancelled' as const }) };

/** The same, one short — the `tooFew` branch, which draws two counts the other never does. */
const SHOPPING_TOO_FEW: readonly StoredGarment[] = SHOPPING_PRICED.slice(0, 2);

const OUTFIT_WARDROBE_PRICED = [
  { ...OUTFIT_WARDROBE[0]!, costMinor: 4550, currency: 'GBP', wearCount: 38 },
  ...OUTFIT_WARDROBE.slice(1),
];

/** A store that records wears in memory. Nothing here reads them back; `cost.test.ts` does. */
function fakeWearStore(garments: readonly StoredGarment[]): WearStore {
  return {
    enrichGarment() {
      /* The screen calls this on a tap the static registry never performs. */
    },
    listGarments: () => garments,
  };
}

/**
 * The same garments, as a store the WARDROBE screen accepts.
 *
 * `WearStore` is the outfit builder's port and its docblock is explicit that it *"cannot create
 * a garment or write an image"*. The Wardrobe gallery reads photographs, so its `BrowseStore`
 * asks for two more methods — and the honest way to satisfy both is to COMPOSE rather than to
 * widen `WearStore` until it satisfies everything. A port that grows a method for each new
 * caller stops being a statement about what a screen needs.
 *
 * No photographs: the registry's subjects are about layout and announcement, and the
 * no-picture branch is the one every new wardrobe is in. `gallery.test.ts` covers the branch
 * with bytes, where the cost can be counted.
 */
function fakeBrowseStore(garments: readonly StoredGarment[]): BrowseStore {
  return {
    ...fakeWearStore(garments),
    getGarmentImageInfo: () => undefined,
    getGarmentImage: () => undefined,
  };
}

/**
 * A preference store with a known shape, so the assertions below can name exact numbers.
 *
 * The rows are chosen to make the weight discriminating: green/warm-grey and ochre/mid-blue share a NET
 * of +3 with very different totals, which is the property `preferenceWeight` HAS — it is a pure
 * function of the net — and which "accepted over total" would not. A screen carrying its own
 * formula fails here rather than merely differing.
 */
const PREFERENCE_ROWS = [
  { familyA: 'deep-blue', familyB: 'brown', accepted: 5, rejected: 2 },
  { familyA: 'green', familyB: 'warm-grey', accepted: 12, rejected: 9 },
  { familyA: 'rust', familyB: 'violet-grey', accepted: 0, rejected: 4 },
  { familyA: 'ochre', familyB: 'mid-blue', accepted: 3, rejected: 0 },
] as const;

function preferenceStore(
  rows: readonly {
    readonly familyA: string;
    readonly familyB: string;
    readonly accepted: number;
    readonly rejected: number;
  }[] = PREFERENCE_ROWS,
): PreferenceStore & { readonly resets: number[] } {
  let live = [...rows];
  const resets: number[] = [];
  return {
    resets,
    listPreferences: () => live,
    resetPreferences(now: number) {
      resets.push(now);
      live = [];
    },
  };
}

const SCREENS: readonly ConformanceSubject[] = [
  {
    name: 'screens/Preferences',
    // `static`, like the rest: its interactive parts are Button, registered in packages/ui
    // where the suite makes it render focus, active, disabled and loading differently.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Preferences store={preferenceStore()} />, theme),
  },
  {
    // EMPTY — the state most people see first, and the one a blank list would fail silently.
    name: 'screens/Preferences (nothing learned)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Preferences store={preferenceStore([])} />, theme),
  },
  {
    /*
     * EMPTY, WITH SOMEWHERE TO GO. The hint says "keep or pass on an outfit and the pairing
     * appears here" — which happens on another screen, so the empty state offers the route when
     * the route exists. Both branches are registered, as the Wardrobe's two are, because
     * `EmptyState`'s union makes them genuinely different trees.
     */
    name: 'screens/Preferences (nothing learned, with somewhere to go)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Preferences store={preferenceStore([])} onBuildOutfit={() => undefined} />, theme),
  },
  {
    /*
     * MID-CONFIRMATION. The destructive path meets the same contrast and naming bar as the
     * rest — it is the state a person is least likely to be in and most likely to be harmed by.
     */
    name: 'screens/Preferences (confirming a reset)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Preferences store={preferenceStore()} initialConfirming />, theme),
  },
  {
    /*
     * WITH THE THEME LIST OPEN (F-156).
     *
     * The options — five of them, one refused — are inside a portal that renders nothing while
     * the list is shut, so the closed subject above checks a trigger. This is the tree a person
     * choosing a theme actually sees, including the scrim, and it is where the contrast gate
     * meets the panel's own ground.
     */
    name: 'screens/Preferences (theme list open)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Preferences store={preferenceStore()} initialThemeListOpen />, theme),
  },
  {
    name: 'screens/Home',
    /*
     * `static`, and F-146 tried `data` first — which was wrong for a reason worth recording.
     *
     * `data` requires default, loading, error and empty. Home has a first-run state and a
     * populated one, and it has NO loading and no error: `deviceRepository()` opens SQLite
     * synchronously and `listColors()` is a synchronous read, so there is no moment at which
     * this screen is waiting. Declaring `data` made the suite ask for a spinner that could never
     * appear, and the honest answer is not to invent one to satisfy a kind.
     *
     * The first-run/populated distinction is real and IS checked — by `home-states.test.tsx`,
     * which asserts the two render different trees and that the empty one offers its two
     * actions. The conformance kinds are a fixed vocabulary, and this screen does not fit one.
     */
    kind: 'static',
    /*
     * Two colours, both DATA rather than tokens, and both must be declared here in the registry
     * rather than marked on the screen — so forgetting one is a failure rather than an exemption
     * a component granted itself.
     *
     * `#6E7480` is the stored reading the fixture returns. `#C5CFD4` is 曇りガラス, the corpus
     * entry `colourOfTheDay` selects for the fixed date below — stable only BECAUSE the date is
     * fixed. A live clock would rotate it and this list would go stale overnight with no source
     * change, which is the whole reason `now` is injected.
     *
     * The two hexes that used to be here were F-017's hard-coded INDIGO and BLUE_BLACK. F-146
     * removed them: the screen shows what is actually stored now, and inventing two colours to
     * fill a front door was part of what made it read as a demo.
     */
    sampleValues: ['#6E7480', '#C5CFD4'],
    render: (_state, theme) =>
      draw(<Home store={fakeHome(true)} now={() => Date.UTC(2026, 8, 3, 12)} />, theme),
  },
  {
    name: 'screens/Atlas',
    // `static`, like Home — and it took a rewrite to earn that. The screen's interactive parts
    // are Chip, SearchField and Swatch, each registered in packages/ui where the suite asks
    // them to render focus, active, disabled and loading differently. A SCREEN has none of
    // those states; its controls do.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    /*
      ALL THREE AFFORDANCES RENDERED (F-181). A subject that omitted them would leave the three
      controls this feature adds outside every accessibility and contrast run — which is the
      shape ADR-0054 exists to prevent, one prop along.
    */
    render: (_state, theme) =>
      draw(
        <Atlas
          onOpenFinder={() => undefined}
          onOpenCompare={() => undefined}
          onOpenPalettes={() => undefined}
        />,
        theme,
      ),
  },
  {
    name: 'screens/ColourDetail',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    // The comparison entry is rendered, so it is measured (F-181). See the Atlas subject above.
    render: (_state, theme) =>
      draw(
        <ColourDetail
          slug={WITH_COMPLEMENT.entry.slug}
          onCompareWith={() => undefined}
          onOpenCombinations={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * WITH THE REFERENCE SECTIONS FOLDED AWAY (F-156).
     *
     * The accordion's second state, and it is a genuinely different tree: three chevrons point
     * the other way and three blocks of content are hidden. A subject that only ever rendered
     * the expanded form would check the state a person arrives in and never the one they leave
     * it in.
     *
     * PROVENANCE IS STILL HERE, because it is outside the accordion — which is F-018's
     * criterion 4 ("never a disclosure a person has to find"), and the content assertions
     * elsewhere in this file are what hold it there.
     */
    name: 'screens/ColourDetail (sections folded)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<ColourDetail slug={WITH_COMPLEMENT.entry.slug} initialSections={[]} />, theme),
  },
  {
    /*
     * WHAT GOES WITH THIS (F-194). The feature the release is for, and the first subject that
     * renders a colour the ENGINE generated rather than one the corpus published — so the
     * swatch announcement, the "generated" label and the gamut cost are all measured here or
     * nowhere.
     *
     * `static` like the rest: its interactive part is Swatch, registered in packages/ui where
     * the suite makes it render its states.
     */
    name: 'screens/Combinations',
    kind: 'static',
    sampleValues: [...SAMPLE_HEXES, ...GENERATED_HEXES],
    render: (_state, theme) =>
      draw(
        <Combinations subject={{ kind: 'entry', slug: BOTH_COST_BRANCHES.entry.slug }} />,
        theme,
      ),
  },
  {
    /*
     * A COLOUR IN A CURATED COMBINATION (F-196). A genuinely different tree from the subject
     * above: the curated section, its "Curated" and intent labels, the lead marker, and swatches
     * drawn from corpus entries rather than from engine output. Most colours are in no curated
     * combination, so without this subject the whole section would be measured by nothing.
     */
    name: 'screens/Combinations (curated)',
    kind: 'static',
    sampleValues: [...SAMPLE_HEXES, ...generatedHexes(CURATED_LEAD)],
    render: (_state, theme) =>
      draw(<Combinations subject={{ kind: 'entry', slug: CURATED_LEAD }} />, theme),
  },
  {
    /*
     * WEIGHTED BY A PROFILE (F-198). A different tree from every subject above: each card
     * carries a personal figure, the missing-profile line at the top is ABSENT, and the order
     * is the weighted one rather than the geometric default.
     */
    name: 'screens/Combinations (weighted by a profile)',
    kind: 'static',
    sampleValues: [...SAMPLE_HEXES, ...generatedHexes(BOTH_COST_BRANCHES.entry.slug)],
    render: (_state, theme) =>
      draw(
        <Combinations
          subject={{ kind: 'entry', slug: BOTH_COST_BRANCHES.entry.slug }}
          profile={WEARER}
          rules={ruleSet()}
        />,
        theme,
      ),
  },
  {
    /*
     * A COLOUR THAT IS NOT IN THE CORPUS (F-197) — a garment's own value, which is how the
     * Wardrobe asks. A genuinely different tree: no curated section, no "open this colour"
     * affordance on the subject swatch, no wear-it control, and a sentence saying WHY there are
     * no curated ones rather than a section that is silently missing.
     */
    name: 'screens/Combinations (a colour, not an entry)',
    kind: 'static',
    sampleValues: [...SAMPLE_HEXES, ...GARMENT_HEXES],
    render: (_state, theme) =>
      draw(
        <Combinations
          subject={{
            kind: 'colour',
            oklch: GARMENT_COLOUR,
            hex: displayFromOklch([...GARMENT_COLOUR]).hex,
            label: 'Wool coat',
          }}
        />,
        theme,
      ),
  },
  {
    /*
     * THE SLUG THAT RESOLVES TO NOTHING. A route parameter can be anything, and this screen
     * answers a miss with a sentence rather than a crash — a branch with its own tree, its own
     * announcement and its own contrast, none of which the subject above renders.
     */
    name: 'screens/Combinations (not in this corpus)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Combinations subject={{ kind: 'entry', slug: 'no-such-colour' }} />, theme),
  },
  {
    /*
     * WEAR IT, WITH A PROFILE (F-195). The blended figure, and the four explanation lines the
     * engine returns for every candidate.
     *
     * `static` like the rest: its interactive parts are Card, ChoiceGroup, Button and Swatch,
     * each registered in packages/ui where the suite makes them render their states.
     */
    name: 'screens/Wear',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Wear slug={BOTH_COST_BRANCHES.entry.slug} profile={WEARER} />, theme),
  },
  {
    /*
     * WEAR IT, WITH NO PROFILE — the branch criterion 3 is entirely about, and a genuinely
     * different tree: the pairing figure under a different label, NO explanation lines, and a
     * card naming the half that is missing with the way to fix it. A subject that rendered
     * only the profiled branch would leave all of that measured by nothing.
     */
    name: 'screens/Wear (no profile)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wear
          slug={BOTH_COST_BRANCHES.entry.slug}
          profile={null}
          onBuildProfile={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * A SLOT THAT IS NOT THE DEFAULT. `trouser` asks the engine for tops and shoes instead, so
     * this renders two slot headings the subjects above never draw — and proves the control
     * changes the answer rather than only the label.
     */
    name: 'screens/Wear (trouser)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wear slug={BOTH_COST_BRANCHES.entry.slug} profile={WEARER} initialSlot="trouser" />,
        theme,
      ),
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
    /*
     * WHAT YOU COULD BUY IN THIS (F-155). Rendered on a colour that is NOT itself in a
     * contemporary palette, so the computed branch draws — the membership branch is a different
     * tree and gets its own subject below.
     */
    name: 'screens/Contemporary',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Contemporary slug={CONTEMPORARY_NEAR} />, theme),
  },
  {
    /*
     * THE COLOUR THAT IS ALREADY IN ONE. It leads with "this colour is already in Quiet
     * Neutrals" rather than with a distance, and that is a different sentence and a different
     * tree — a registry that only had the first would be checking half a screen.
     */
    name: 'screens/Contemporary (already in a palette)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Contemporary slug={CONTEMPORARY_MEMBER} />, theme),
  },
  {
    /*
     * THE EDITORIAL BRANCH, which no published entry can reach.
     *
     * An editorial equivalent needs a note, a source and a reviewer that the content gate
     * enforces, and the shipped corpus carries none — so without a subject that supplies one,
     * this branch would be a tree nobody has ever rendered
     * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]. The provenance is what the
     * suite is checking: a judgement without a name on it is the corpus's authority lent to an
     * opinion.
     */
    name: 'screens/Contemporary (an editorial equivalent)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Contemporary
          slug={CONTEMPORARY_NEAR}
          initialEquivalents={{
            membership: [],
            computed: [],
            nothingNear: false,
            editorial: [
              {
                kind: 'editorial',
                entry: null,
                note: 'A recorded judgement about what this colour corresponds to today.',
                provenance: { source: 'Irodora editorial — fixture', verifiedBy: 'ed-002' },
              },
            ],
          }}
        />,
        theme,
      ),
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
    name: 'screens/OutfitBuilder',
    // `static`, like the rest: its interactive parts are Button and Swatch, each registered in
    // packages/ui where the suite makes them render focus, active, disabled and loading.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <OutfitBuilder
          wardrobe={OUTFIT_WARDROBE}
          context={OUTFIT_CONTEXT}
          store={fakeWearStore(OUTFIT_WARDROBE)}
        />,
        theme,
      ),
  },
  {
    /*
     * NOTHING WEARABLE, WITH THE WAY OUT (F-139).
     *
     * This branch had NO registry subject at all, so `outfit.empty` was a sentence the a11y and
     * contrast gates never rendered — and the control F-139 adds beside it would have been
     * unchecked for the same reason. An empty wardrobe is also the state a new person is in.
     */
    name: 'screens/OutfitBuilder (nothing wearable)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <OutfitBuilder
          wardrobe={[]}
          context={OUTFIT_CONTEXT}
          store={fakeWearStore([])}
          onAddGarment={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * The SAME screen with a slot locked and scores on it.
     *
     * The empty and composed branches are almost disjoint: an empty builder draws no swatch,
     * no lock control and no component scores, so a registry entry for it alone would check
     * the accessibility of a screen nobody has used. Same reasoning as the Studio's two.
     */
    name: 'screens/OutfitBuilder (a slot locked)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <OutfitBuilder
          wardrobe={OUTFIT_WARDROBE}
          context={OUTFIT_CONTEXT}
          initialDraft={[{ slot: 'top', garment: OUTFIT_WARDROBE[0]!, locked: true }]}
          store={fakeWearStore(OUTFIT_WARDROBE)}
        />,
        theme,
      ),
  },
  {
    /*
     * The SAME screen where cost per wear HAS an answer (F-051).
     *
     * The composed entry above draws the refusal — a grey sentence — because its fixture has
     * no price. This one draws the two numeric lines, which is a different set of tokens at a
     * different size, and the contrast gate can only measure what something rendered.
     */
    name: 'screens/OutfitBuilder (cost per wear)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <OutfitBuilder
          wardrobe={OUTFIT_WARDROBE_PRICED}
          context={OUTFIT_CONTEXT}
          initialDraft={[{ slot: 'top', garment: OUTFIT_WARDROBE_PRICED[0]!, locked: false }]}
          store={fakeWearStore(OUTFIT_WARDROBE_PRICED)}
        />,
        theme,
      ),
  },
  {
    /*
     * The shopping check with nothing chosen yet (F-052).
     *
     * Draws the picker and the two framing sentences and none of the three answers, which is
     * the state somebody arrives in. Its own entry because the answered screen draws three
     * Surfaces this one does not.
     */
    name: 'screens/Shopping',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Shopping wardrobe={OUTFIT_WARDROBE} context={SHOPPING_CONTEXT} />, theme),
  },
  {
    /*
     * NOTHING TO COMPARE AGAINST BECAUSE THERE IS NO WARDROBE (F-139).
     *
     * Distinct from "not enough to compare against", which HAS garments and too few comparable
     * ones. This branch had no registry subject, so `shopping.empty` was never rendered by the
     * a11y or contrast gates — and it is the first thing a new person sees on this screen.
     */
    name: 'screens/Shopping (no wardrobe at all)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Shopping wardrobe={[]} context={SHOPPING_CONTEXT} onAddGarment={() => undefined} />,
        theme,
      ),
  },
  {
    /*
     * The SAME screen with all three answers on it, including a duplicate.
     *
     * `initialType` is 'jumper' and the colour is the one `o-1` already carries, so the
     * duplicate branch draws its list with the measured difference beside it — a numeric line
     * at `small` that no other subject renders, and the contrast gate can only measure what
     * something drew.
     */
    name: 'screens/Shopping (answered, with a duplicate)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Shopping
          wardrobe={OUTFIT_WARDROBE}
          context={SHOPPING_CONTEXT}
          initialType="jumper"
          initialSlug={allEntries()[0]!.entry.slug}
        />,
        theme,
      ),
  },
  {
    /*
     * The SAME screen refusing to count outfits, and saying why.
     *
     * A scarf fills no slot, so the outfit answer is a sentence where the other subjects draw
     * numbers. That branch is the one FR-52 is most easily got wrong on — reporting zero — and
     * a registry that never rendered it would be checking the accessibility of the happy path.
     */
    name: 'screens/Shopping (no slot for this garment)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Shopping
          wardrobe={OUTFIT_WARDROBE}
          context={SHOPPING_CONTEXT}
          initialType="scarf"
          initialSlug={allEntries()[3]!.entry.slug}
        />,
        theme,
      ),
  },
  {
    /*
     * THE INVESTMENT SIGNAL, ANSWERED (F-123, ADR-0082).
     *
     * Draws four numeric lines the other Shopping subjects do not — the break-even, the typical
     * wears, and the basis with its currency — plus the sentence saying the judgement is the
     * reader's. `initialAmount` and `initialCurrency` are what make it reachable without the
     * typing the static registry never does.
     */
    name: 'screens/Shopping (the investment signal)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Shopping
          wardrobe={SHOPPING_PRICED}
          context={SHOPPING_CONTEXT}
          initialType="jumper"
          initialSlug={allEntries()[4]!.entry.slug}
          initialAmount="180.00"
          initialCurrency="GBP"
        />,
        theme,
      ),
  },
  {
    /*
     * THE SAME SCREEN ONE GARMENT SHORT.
     *
     * The refusal that carries a count, and the only subject that draws it. A registry entry for
     * the answered branch alone would check the accessibility of the case where somebody has
     * already done the recording — which is not the case most people are in.
     */
    name: 'screens/Shopping (not enough to compare against)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Shopping
          wardrobe={SHOPPING_TOO_FEW}
          context={SHOPPING_CONTEXT}
          initialType="jumper"
          initialSlug={allEntries()[4]!.entry.slug}
          initialAmount="180.00"
          initialCurrency="GBP"
        />,
        theme,
      ),
  },
  {
    /*
     * THE EXPORT SURFACE (F-129, FR-51).
     *
     * Six formats built in F-056 and reachable from nothing until now. The chosen format is a
     * radio row this screen draws itself rather than a registered component, so it is checked
     * here or nowhere.
     */
    name: 'screens/Export',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Export subject={EXPORT_SUBJECT} sink={noSink} />, theme),
  },
  {
    /*
     * THE WRITE FAILED, and until F-152 it read exactly like the write that succeeded — one
     * grey sentence for saved, cancelled and failed alike.
     */
    name: 'screens/Export (the write failed)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Export
          subject={EXPORT_SUBJECT}
          sink={noSink}
          initialOutcome={{ kind: 'failed', detail: 'the file could not be written' }}
        />,
        theme,
      ),
  },
  {
    /*
     * AND THE ONE THAT WORKED. The decoy for the case above: two states that must now look
     * different, asserted by rendering both rather than by trusting the branch.
     */
    name: 'screens/Export (saved)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Export
          subject={EXPORT_SUBJECT}
          sink={noSink}
          initialOutcome={{ kind: 'saved', filename: 'irodora-palette.json' }}
        />,
        theme,
      ),
  },
  {
    /*
     * THE SAME SCREEN WITH NOTHING TO EXPORT.
     *
     * One sentence where the other draws a palette, six format rows and a button — almost
     * disjoint trees, and the state a person is in before they have built anything.
     */
    name: 'screens/Export (nothing to export)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Export subject={null} sink={noSink} onBuildPalette={() => undefined} />, theme),
  },
  {
    /*
     * The same empty subject with NO route supplied — `EmptyState`'s other union member, which
     * renders the sentence and no control. Both branches are reachable, so both are drawn.
     */
    name: 'screens/Export (nothing to export, nowhere to go)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Export subject={null} sink={noSink} />, theme),
  },
  {
    /*
     * The professional surface with nothing chosen (F-055).
     *
     * Draws the library, the entry form and the empty table. Its own entry because the
     * answered screen draws numeric rows this one does not.
     */
    name: 'screens/Measure',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Measure libraries={MEASURE_LIBRARIES} />, theme),
  },
  {
    /*
     * The SAME screen with a reference and two measurements against it.
     *
     * This is the branch FR-61 is actually about: Lab, LCh and a ΔE00 per row, at `small`,
     * numeric, in a Surface — none of which the empty subject renders, and the contrast gate
     * can only measure what something drew.
     */
    name: 'screens/Measure (a table with rows)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Measure
          libraries={MEASURE_LIBRARIES}
          initialReferenceId={allEntries()[0]!.entry.slug}
          initialSamples={MEASURE_SAMPLES}
        />,
        theme,
      ),
  },
  {
    name: 'screens/AddGarment',
    // `static`, like the rest: its interactive parts are TextField, Button and Swatch, each
    // registered in packages/ui where the suite makes them render focus, active, disabled and
    // loading differently.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<AddGarment store={fakeWardrobe()} imageSource={fakeImageSource()} />, theme),
  },
  {
    /*
     * THE FILE WAS REFUSED. The ingest rejects for real reasons — too large, a format we do not
     * decode — and this drew in the same grey body text as "photograph attached" directly above
     * it, so the only thing separating the two was reading the sentence.
     */
    name: 'screens/AddGarment (the photograph was refused)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <AddGarment store={fakeWardrobe()} imageSource={fakeImageSource()} initialImageProblem />,
        theme,
      ),
  },
  {
    /*
     * The SAME screen arrived at from the Lens.
     *
     * The offered branch draws a control the empty one does not — "use the Lens reading" — and
     * a registry entry for the empty screen alone would check the accessibility of a path
     * nobody took. Same reasoning as the Studio's two entries.
     */
    name: 'screens/AddGarment (from the Lens)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <AddGarment
          store={fakeWardrobe()}
          imageSource={fakeImageSource()}
          offered={{ kind: 'reading', reading: OFFERED_READING }}
        />,
        theme,
      ),
  },
  {
    /*
     * FROM A COLOUR SOMEBODY CHOSE (F-199). A different tree from the Lens branch above: the
     * re-apply control is labelled "use the colour you chose" rather than "from the Lens",
     * because where a colour came from is a claim and the wrong one would be false.
     */
    name: 'screens/AddGarment (from a chosen colour)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <AddGarment
          store={fakeWardrobe()}
          imageSource={fakeImageSource()}
          offered={{ kind: 'corpus', slug: allEntries()[0]!.entry.slug }}
        />,
        theme,
      ),
  },
  {
    /*
     * A RANKED COLOUR WITH SOMEWHERE TO GO (F-199). The candidate cards carry three named
     * controls and are no longer a single target, so this renders a tree none of the Wear
     * subjects above does.
     */
    name: 'screens/Wear (with destinations)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wear
          slug={BOTH_COST_BRANCHES.entry.slug}
          profile={WEARER}
          onOpenColour={() => undefined}
          onShopFor={() => undefined}
          onAddToWardrobe={() => undefined}
        />,
        theme,
      ),
  },
  /*
   * THE WARDROBE, in its three states (F-122).
   *
   * Three subjects rather than one because they draw disjoint trees: the empty wardrobe has two
   * sentences and no group, the list has family headings and a row per garment, and the editor
   * has nine fields and none of the list. A registry entry for the list alone would leave the
   * editing branch — every text field on it — checked by nothing in either theme.
   *
   * `fakeWearStore` supplies the store: `BrowseStore` and `WearStore` are the same two methods,
   * so one fake satisfies both. The types stay separate for the reason `Wardrobe.tsx` gives.
   */
  {
    /* Carries the persistent add control (F-139), which is drawn whether or not it is empty. */
    name: 'screens/Wardrobe',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      /*
        THE TWO NEW DESTINATIONS ARE RENDERED (F-182). This subject has a NON-EMPTY wardrobe,
        which matters: both controls are drawn only when there is one to act on, so the empty
        subject below correctly shows neither and this is the only place they are checked.
      */
      draw(
        <Wardrobe
          store={fakeBrowseStore(OUTFIT_WARDROBE)}
          onAddGarment={() => undefined}
          onOpenOutfit={() => undefined}
          onOpenShopping={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * THE EMPTY WARDROBE, WITH THE WAY OUT (F-139). Draws the empty state's action, which is
     * the control the whole feature exists to add — and an unrendered control is one whose
     * contrast and accessibility nothing has checked.
     */
    name: 'screens/Wardrobe (nothing in it)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Wardrobe store={fakeBrowseStore([])} onAddGarment={() => undefined} />, theme),
  },
  {
    /*
     * The same screen with NO route supplied, which is the other member of `EmptyState`'s
     * union. It renders prose and no control; both branches are reachable, so both are drawn.
     */
    name: 'screens/Wardrobe (nothing in it, nowhere to go)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Wardrobe store={fakeBrowseStore([])} />, theme),
  },
  {
    /*
     * THE WARDROBE NARROWED (F-131). Draws three chip rows with one selected, the applied-filter
     * sentence and a clear control — none of which the unfiltered subject has.
     */
    name: 'screens/Wardrobe (narrowed)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wardrobe
          store={fakeBrowseStore(OUTFIT_WARDROBE)}
          initialFilter={{ type: 'jumper', season: null, formality: null }}
        />,
        theme,
      ),
  },
  {
    /*
     * AND NARROWED TO NOTHING. Two sentences where the others draw groups, and the controls are
     * still there — a filter bar that vanished with its result could not be cleared.
     */
    name: 'screens/Wardrobe (nothing matches)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wardrobe
          store={fakeBrowseStore(OUTFIT_WARDROBE)}
          initialFilter={{ type: 'kimono', season: null, formality: null }}
        />,
        theme,
      ),
  },
  {
    /*
     * A GARMENT OPEN, and priced — so the amount field is seeded from a stored `cost_minor`
     * rather than starting empty, which is the branch `minorToMajor` exists for.
     */
    name: 'screens/Wardrobe (a garment open)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wardrobe store={fakeBrowseStore(OUTFIT_WARDROBE_PRICED)} initialSelected="o-1" />,
        theme,
      ),
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
  {
    /*
     * The Studio with a pair CVD mode flags (F-032). It draws a sentence, a separation number,
     * a proposed swatch and an improvement that none of the other Studio entries draw — and it
     * is the branch where F-069 matters most, since a status colour beside a colour sample is
     * exactly what this panel would reach for if nobody had decided otherwise.
     */
    name: 'screens/PaletteStudio (CVD flag)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <PaletteStudio
          store={fakeStore()}
          initialDraft={{
            name: 'Hard to separate',
            members: [
              { slug: 'kawaki-suna', role: 'anchor' },
              { slug: 'usu-shiba', role: 'neutral' },
            ],
          }}
        />,
        theme,
      ),
  },
  {
    name: 'screens/ProfileSetup',
    // `static`, like the rest: its interactive parts are Button, Chip and Swatch, each
    // registered in packages/ui where the suite makes them render focus, active, disabled and
    // loading differently.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    /*
      THE SETTINGS AFFORDANCE IS RENDERED, which means it is CHECKED (F-180). It is absent
      without `onOpenSettings`, so a subject that omitted the prop would leave the one control
      this feature adds outside every accessibility and contrast run — the shape ADR-0054 exists
      to prevent, one prop along.
    */
    render: (_state, theme) =>
      draw(
        <ProfileSetup
          store={fakeProfileStore()}
          onOpenSettings={() => undefined}
          onOpenMeasure={() => undefined}
          onOpenExport={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * The SAME screen with every comparison answered.
     *
     * The two branches render almost disjoint trees — the comparison branch draws two option
     * cards and no summary; the summary branch draws seven dimension rows, four chip groups
     * and three list editors, and NONE of that is reachable from the first. Registering only
     * one would check the accessibility of half a screen.
     */
    name: 'screens/ProfileSetup (summary)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<ProfileSetup store={fakeProfileStore()} initialAnswers={ALL_ANSWERS} />, theme),
  },
  {
    /*
     * The THIRD branch (F-027): a photo estimate awaiting confirmation. It draws two controls
     * the other two never draw and an unanswered row none of them has, so registering the first
     * two would leave the confirmation gate unchecked in both themes.
     */
    name: 'screens/ProfileSetup (photo estimate)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<ProfileSetup store={fakeProfileStore()} reading={SAMPLE_READING} />, theme),
  },
  /*
   * THE LENS, IN ALL THREE PERMISSION STATES (F-097).
   *
   * The viewfinder is `null` here and that is the whole reason this screen is registrable at
   * all: `src/lens/viewfinder.tsx` imports react-native-vision-camera, which jest cannot
   * render, so the camera arrives as a NODE from the route and every pixel this screen is
   * responsible for stays checkable. `app/profile.tsx` set the precedent with the repository.
   *
   * Three entries rather than one because the three states draw disjoint trees: undetermined
   * has a request button, denied has none and different copy, and granted has the readout,
   * the nearest-colour list and the hand-off — none of which the other two reach.
   */
  {
    name: 'screens/Lens (undetermined)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Lens permission="undetermined" onRequestPermission={() => undefined} />, theme),
  },
  {
    name: 'screens/Lens (denied)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Lens permission="denied" />, theme),
  },
  {
    /*
     * GRANTED, AND STILL NOTHING TO SHOW — the state a person sees when the camera is live and
     * the frame output produces no reading. It exists as its own subject because the diagnostic
     * line is the only thing on this screen that is not the product's own voice, and it still
     * has to meet the same contrast and type rules as everything else.
     */
    name: 'screens/Lens (waiting, with a diagnostic)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          mode="live"
          diagnostic="the frame has no CPU pixel buffer"
          onCapture={() => undefined}
          onModeChange={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * AT REST, AND IT IS THE STATE MOST PEOPLE WILL SEE MOST OFTEN (F-160).
     *
     * Still mode with nothing captured: a preview, the shutter, the two mode chips and the
     * sentence that says what the chosen mode does. It has no readout of any kind, which is the
     * point — a Lens nobody has asked anything of has read nothing.
     */
    name: 'screens/Lens (still, at rest)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Lens permission="granted" onCapture={() => undefined} onModeChange={() => undefined} />,
        theme,
      ),
  },
  {
    /*
     * LIVE, WITH THE STRIP UP. FR-13's continuous pick draws a swatch, a hex, an OKLCh line and
     * a name — none of which the resting state has, and all of which have to meet the same
     * contrast and type rules as the sheet does.
     */
    name: 'screens/Lens (live)',
    kind: 'static',
    sampleValues: [...SAMPLE_HEXES, displayFromOklch(readingOklch(SAMPLE_READING)).hex],
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          mode="live"
          live={SAMPLE_READING}
          onCapture={() => undefined}
          onModeChange={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * MID-CAPTURE. The shutter is `loading`, which changes both its label and its fill, and a
     * busy control still has to clear contrast — the state where that is easiest to get wrong.
     */
    name: 'screens/Lens (awaiting a capture)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          awaiting
          onCapture={() => undefined}
          onModeChange={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * THE CAPTURE THAT NEVER CAME BACK. Its own subject because the sentence is drawn at
     * `foreground` rather than `foreground.2` — it is the one line on this screen reporting
     * that something the person did produced nothing, and it should not be quieter than the
     * hint above it.
     */
    name: 'screens/Lens (nothing was read)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          failed="capture"
          onCapture={() => undefined}
          onModeChange={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * THE CROSSHAIR MOVED (F-170). The reticle is drawn from `reticleBox` at whatever point the
     * person aimed at, so a subject with it away from the centre is the one that would catch a
     * marks-do-not-move regression — and it is the same component the photograph uses, which is
     * the whole reason the camera reticle came up here from `viewfinder.tsx`.
     */
    name: 'screens/Lens (aimed off centre)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          aim={{ x: 0.18, y: 0.76 }}
          onCapture={() => undefined}
          onModeChange={() => undefined}
          onPoint={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * A PHOTOGRAPH OPEN (F-166). A different tree from every subject above: no viewfinder, no
     * mode chips, a picture with a reticle over it, and a control that has become the way back
     * to the camera. The reticle's two tones are checked here for the reason they exist — the
     * other side of that line is an arbitrary photograph.
     */
    name: 'screens/Lens (a photograph open)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          photo={{
            // A 1×1 transparent GIF's worth of nothing, as a PNG. No pixels are read here —
            // this subject checks the chrome around the picture, not the picture.
            uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=',
            width: 1200,
            height: 900,
            at: { x: 0.4, y: 0.6 },
          }}
          onCapture={() => undefined}
          onUseCamera={() => undefined}
          onPoint={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * THE PHOTOGRAPH THAT COULD NOT BE READ, with the reason under it. The refusal sentence and
     * the diagnostic are drawn at different weights and both have to clear contrast — and this
     * is the one place a person sees a message written by a decoder rather than by us.
     */
    name: 'screens/Lens (a photograph refused)',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          failed="photo"
          diagnostic="this PNG stores 16 bits a channel, and the Lens reads 8"
          onCapture={() => undefined}
          onModeChange={() => undefined}
          onOpenPhoto={() => undefined}
        />,
        theme,
      ),
  },
  {
    name: 'screens/Lens (a capture on screen)',
    kind: 'static',
    /*
     * The reading's OWN colour is a declared sample value.
     *
     * The Lens paints a swatch of whatever the camera saw, which by definition resolves to no
     * token — that is the point of the screen. `sampleValues` is the mechanism for exactly this,
     * and the exemption is exact-match on the value rather than a pass for the component, so
     * chrome painted with a literal is still caught.
     *
     * DERIVED from SAMPLE_READING rather than typed as '#C79E7F': a literal here would silently
     * stop matching the moment the fixture changed, and the finding would come back looking like
     * a regression in the screen.
     */
    sampleValues: [...SAMPLE_HEXES, displayFromOklch(readingOklch(SAMPLE_READING)).hex],
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          capture={SAMPLE_READING}
          onCapture={() => undefined}
          onModeChange={() => undefined}
          onDismiss={() => undefined}
          onUseForProfile={() => undefined}
          /*
            BOTH OFFERS (F-125). The wardrobe hand-off draws a second Button and a second note,
            and a subject supplying only the profile handler would check the accessibility of a
            screen that no longer exists.
          */
          onUseForWardrobe={() => undefined}
          onOpenColour={() => undefined}
        />,
        theme,
      ),
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
 * THE SAME REGISTRY, IN THE OTHER LANGUAGE (F-152, criterion 4).
 *
 * Every subject above has been rendered in both themes and **one language** since the registry
 * existed. Half of this product's user-facing copy had never been through the checks that read
 * contrast, structure and accessible names — which is
 * [[the-claims-lint-only-speaks-english]]'s shape in a different gate, one week later.
 *
 * **Japanese is not a translation of the layout.** The type scale differs by script because
 * leading does, the strings are longer or shorter in ways nothing predicts, and a screen that
 * fits in English is not thereby a screen that fits.
 *
 * THE SAME SUBJECTS, NOT A COPY OF THEM. A second registry would be a second thing to drift,
 * and the one that drifted would be the one nobody was reading.
 */
/**
 * A TINTED THEME, THROUGH THE SAME SUITE (F-153).
 *
 * Eight palettes exist and gate 9 measures every declared pairing in all of them. What gate 9
 * cannot do is RENDER anything — so the question left over is whether a component still
 * resolves every colour it paints to a token when the palette is one nobody authored by hand.
 *
 * ONE TINTED THEME RATHER THAN SIX, and the reason is worth stating rather than assumed: the
 * suite checks structure and token resolution, and a hue cannot change either. Running all
 * eight would make this file four times slower to learn nothing the first one does not say.
 * Contrast across every theme is gate 9's job, and gate 9 is exhaustive.
 */
describe('a derived theme conforms too (F-153)', () => {
  it('produces no findings on a palette nobody authored', () => {
    expect(formatFindings(checkAll(SCREENS, ['aota.light', 'aota.dark']))).toBe('');
  });
});

describe('every screen conforms in Japanese too (F-152)', () => {
  beforeAll(() => {
    mockLanguageTag = 'ja-JP';
  });
  afterAll(() => {
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  });

  it('renders the Japanese CATALOGUE, which is what makes the run below mean anything', () => {
    /*
     * ASSERTED FIRST, AND ASSERTED ON THE RIGHT THING. A mock that failed to take would produce
     * an English render, no findings, and a green run claiming coverage of a language it never
     * drew — the exact failure this block exists to close, reproduced by the block itself.
     *
     * THE FIRST VERSION OF THIS ASSERTION WAS VACUOUS: it looked for CJK anywhere in the tree,
     * and every corpus entry carries `name.kanji`, which is rendered in **both** locales. It
     * would have passed on an English screen. So the check is now on a string that exists only
     * in the catalogue, and on both directions — the Japanese one present, the English one
     * absent — because a screen showing both would mean the locale changed halfway.
     */
    const subject = SCREENS.find((s) => s.name === 'screens/Wardrobe (nothing in it)');
    if (subject === undefined) throw new Error('the wardrobe empty subject is gone');

    const drawn = JSON.stringify(subject.render('default', 'light'));
    expect(drawn).toContain(t('ja', 'browse.empty'));
    expect(drawn).not.toContain(t('en', 'browse.empty'));
  });

  it('produces no findings, in either theme', () => {
    expect(formatFindings(checkAll(SCREENS))).toBe('');
  });

  /*
   * THE TYPE SCALE, WHICH THE RUN ABOVE CANNOT SEE (F-152 criterion 1).
   *
   * The conformance suite reads contrast, structure and accessible names. **None of those
   * changes when a screen draws Japanese at the Latin leading**, so the pass above was green
   * over four screens — AddGarment, Measure, OutfitBuilder and Shopping — that never
   * destructured `script` from `useMessages` at all. Sixty-six text nodes, drawing Japanese
   * copy with the platform font and the Latin line-height.
   *
   * `useMessages` returns `script` for exactly this reason, and a screen that ignores it is
   * indistinguishable from one that does not, to every gate in this repository.
   *
   * The check is the bundled face rather than the leading, because that is the property with a
   * failure mode: ADR-0057 §6 ships a Japanese subset precisely so a missing glyph cannot come
   * out as tofu, and Latin gets the platform font because Latin cannot fail that way.
   */
  it('draws Japanese copy with the bundled Japanese face, not the platform font', () => {
    const cjk = /[぀-ヿ㐀-䶿一-鿿]/u;

    const bare: string[] = [];
    const walk = (node: TestNode, subject: string): void => {
      const text = (node.children ?? []).filter((c): c is string => typeof c === 'string').join('');
      if (cjk.test(text)) {
        const style: unknown = node.props['style'];
        const flat =
          typeof style === 'object' && style !== null ? (style as Record<string, unknown>) : {};
        if (flat['fontFamily'] !== nativeFamilies.jp) bare.push(`${subject}: ${text.slice(0, 24)}`);
      }
      for (const child of node.children ?? []) if (typeof child !== 'string') walk(child, subject);
    };

    for (const s of SCREENS) {
      const tree = s.render('default', 'light');
      if (tree !== null) walk(tree, s.name);
    }

    expect(bare).toHaveLength(0);
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
      expect(roles(draw(<Home store={fakeHome(true)} />, theme))).toContain('header');
    });
});

/**
 * Criterion 1 — **every corpus entry reachable in 3 interactions or fewer**.
 *
 * ## The proxy changed in F-147, and the property did not
 *
 * This used to walk the RENDERED tree for all 120 names. That was a fair proxy while the Atlas
 * mounted every entry eagerly — and F-147 made it virtualise, because 120 eagerly-mounted
 * subtrees is exactly what criterion 4 ("smooth on a four-year-old mid-range Android") rules
 * out. Only a handful are in the tree at any moment now.
 *
 * **Reachable was never the same as simultaneously rendered.** The design that makes the
 * interaction count checkable is unchanged: the root lists the whole corpus with no filter, so
 * reaching any entry is scroll-and-tap. What changed is where that fact is legible — it is the
 * list's `data`, not the mounted subtree.
 *
 * So the first assertion reads the list's data, and the second keeps the original point — that
 * an entry is a SWATCH and not only a name — against the window that is actually rendered.
 * Weakening one and keeping the other would have left "it draws colours" unchecked.
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

  /** The list node, found by the prop only a virtualised list carries. */
  function listData(node: TestNode): readonly { entry: { slug: string } }[] | null {
    const data: unknown = node.props['data'];
    if (Array.isArray(data) && node.props['renderItem'] !== undefined)
      return data as readonly { entry: { slug: string } }[];
    for (const child of node.children ?? []) {
      if (typeof child === 'string') continue;
      const found = listData(child);
      if (found !== null) return found;
    }
    return null;
  }

  it('gives the list every entry in the corpus with no filter applied', () => {
    const data = listData(draw(<Atlas />, 'light'));
    expect(data).not.toBeNull();
    const slugs = new Set((data ?? []).map((e) => e.entry.slug));
    const missing = allEntries()
      .map((e) => e.entry.slug)
      .filter((slug) => !slugs.has(slug));
    expect(missing).toHaveLength(0);
    expect(slugs.size).toBe(CORPUS_ENTRY_COUNT);
  });

  it('draws a swatch for every entry it renders, not only its name', () => {
    /*
     * The RENDERED window rather than all 120, and the assertion is a correspondence rather than
     * a count: every entry whose NAME is in the tree must also have its HEX there. That is the
     * original point — an entry is a colour, not a label — and it survives virtualisation
     * because it compares the window against itself rather than against the corpus.
     */
    const text = textOf(draw(<Atlas />, 'light'));
    const joined = text.join('\u0000');
    const rendered = allEntries().filter((e) => joined.includes(e.entry.name.kanji));
    expect(rendered.length).toBeGreaterThan(0);
    const withoutSwatch = rendered.filter((e) => !joined.includes(e.derived.hex));
    expect(withoutSwatch).toHaveLength(0);
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

  /**
   * The page's text, with a derived panel optionally opened.
   *
   * F-148 put harmony, colour vision and neighbours behind tabs, so those three are REACHABLE
   * rather than always mounted — the same distinction E-064 records for the Atlas. A test that
   * asserts by content has to reach them, and `initialPanel` is how, exactly as `PaletteStudio`
   * takes `initialDraft`.
   *
   * Everything the RECORD asserts — the four name forms, the coordinates, the classification
   * and the whole provenance block — is still asserted with **no panel opened**, because none
   * of it is behind a tab. That is criterion 4 of F-148: provenance never becomes a disclosure.
   */
  const shown = (slug: string, panel?: DerivedPanel): string =>
    textOf(
      draw(
        // SPREAD RATHER THAN PASSED: `exactOptionalPropertyTypes` is on, so an explicit
        // `undefined` is not the same as omitting the prop — and omitting is what makes the
        // component fall back to its own default.
        <ColourDetail slug={slug} {...(panel === undefined ? {} : { initialPanel: panel })} />,
        'light',
      ),
    ).join('\u0000');

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
    expect(shown(WITHOUT_COMPLEMENT.entry.slug, 'related')).toContain('None recorded');

    const withText = shown(WITH_COMPLEMENT.entry.slug, 'related');
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
    const text = shown(WITH_COMPLEMENT.entry.slug, 'vision');
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
    /*
     * HOME IN ITS FIRST-RUN STATE, and the state matters since F-146.
     *
     * Home used to render no numbers at all, so any Home was a valid decoy. It now shows a hex
     * and a wardrobe count — both correctly `numeric` — so the POPULATED screen has two tabular
     * nodes and stopped being a screen that asks for none.
     *
     * The first-run state still asks for none: no reading, no count, and today's colour is a
     * kanji, a reading and an English gloss. That is a real screen rendering real text without
     * the prop, which is what this decoy needs to be worth anything.
     */
    expect(numericNodes(draw(<Home store={fakeHome(false)} />, 'light'))).toHaveLength(0);
  });

  /*
   * --- THE OTHER DIRECTION (F-151, criterion 4) -------------------------------------------
   *
   * Everything above asks *is what we marked as a figure treated like one*. Nothing asked *is
   * every figure marked*, and those are different questions: a `<Text>` rendering `4.23` with
   * no `numeric` passes every assertion in this file and renders with proportional digits, so
   * the column it sits in is ragged in exactly the way tabular figures exist to prevent.
   *
   * That is the shape recorded five times this month — a check thorough about its own subject
   * and silent one step outside it (E-086, E-087, E-089, E-090). It is worth stating that the
   * gap was found by re-reading a green test rather than by anything failing.
   */
  /** A string that is nothing but a quantity: a sign, digits, and the punctuation of figures. */
  const BARE_FIGURE = /^[+−-]?\d[\d\s.,:/%°–-]*$/u;

  function figureNodes(node: TestNode, out: TestNode[] = []): TestNode[] {
    // The node that OWNS the text, not the string itself — the `numeric` prop and the font
    // variant both live on the element, and a string has no props to check.
    if ((node.children ?? []).some((c) => typeof c === 'string' && BARE_FIGURE.test(c)))
      out.push(node);
    for (const child of node.children ?? []) if (typeof child !== 'string') figureNodes(child, out);
    return out;
  }

  /** Every bare figure on a screen that is NOT drawn with tabular digits. */
  const ragged = (screen: TestNode): readonly string[] => {
    const tabular = new Set(numericNodes(screen));
    return figureNodes(screen)
      .filter((n) => !tabular.has(n))
      .flatMap((n) => (n.children ?? []).filter((c): c is string => typeof c === 'string'));
  };

  it('marks every bare figure as tabular, on every surface that carries readings', () => {
    /*
     * The three instrument surfaces, because they are where a ragged column would actually
     * cost something — a professional scanning a list of deltas one row at a time is the exact
     * failure C9 exists for.
     */
    const finder = draw(<Finder initialQuery="dark muted green" />, 'light');
    const studio = draw(<PaletteStudio store={fakeStore()} initialDraft={DRAFT} />, 'light');

    /*
     * FOUND SOMETHING FIRST. "No ragged figures" and "no figures" print the same result, and
     * the second is what this whole block of assertions exists to prevent — a green run that
     * means less than it says. Asserted per screen rather than in total, because one screen
     * carrying thirty would hide another carrying none.
     *
     * THE STUDIO IS DELIBERATELY NOT IN THIS LIST, and finding that out is why the assertion
     * is here. A palette draft with no CVD finding carries no readings at all: the strip is
     * colour, the rows are names and hexes, and there is no number on the screen. Demanding one
     * would be demanding the fixture render something the product does not — so the Studio is
     * checked for RAGGED figures below and not for having any.
     */
    expect(figureNodes(tree()).length).toBeGreaterThan(20);
    expect(figureNodes(finder).length).toBeGreaterThan(0);

    expect(ragged(tree())).toHaveLength(0);
    expect(ragged(finder)).toHaveLength(0);
    expect(ragged(studio)).toHaveLength(0);
  });

  it('DECOY — the check finds a figure that forgot the prop', () => {
    /*
     * Without this, `ragged` could be returning nothing because `figureNodes` matches nothing,
     * and all three assertions above would be vacuous — which is the same failure they were
     * written to close, one level up [[a-decoy-that-is-not-broken-proves-nothing]].
     *
     * Home's first-run state renders no figures at all, so the plant is the smallest real
     * thing that does: one `Text` with a number in it and no `numeric`.
     */
    const planted = draw(
      <Text size="small" color="foreground">
        4.23
      </Text>,
      'light',
    );
    expect(ragged(planted)).toEqual(['4.23']);

    // And the same node, marked, is not reported — or the check would flag correct code.
    const marked = draw(
      <Text size="small" color="foreground" numeric>
        4.23
      </Text>,
      'light',
    );
    expect(ragged(marked)).toHaveLength(0);
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
      expect(checkStatusAdjacency(tree!, theme, subject.sampleValues ?? [])).toHaveLength(0);
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
  const route = readFileSync(join(process.cwd(), 'app', '(tabs)', 'atlas', 'palettes.tsx'), 'utf8');

  it('imports the device repository and hands it to the screen', () => {
    expect(route).toContain("from '../../../src/store/repository'");
    expect(route).toMatch(/store=\{deviceRepository\(\)\}/u);
  });

  it('does the same for guided setup, whose port is the other half of this seam', () => {
    // F-026. A profile the person spent twelve comparisons on, written to a fake, would be
    // gone on the next launch — and every assertion in this file would still be green.
    const profile = readFileSync(
      join(process.cwd(), 'app', '(tabs)', 'profile', 'index.tsx'),
      'utf8',
    );
    expect(profile).toContain("from '../../../src/store/repository'");
    expect(profile).toMatch(/store=\{deviceRepository\(\)\}/u);
  });

  it('does the same for the wardrobe, whose whole point is that edits survive (F-122)', () => {
    // A brand corrected into a fake would be gone on the next launch, and the browse screen
    // would show the old value with every gate green. Same seam, same failure, third route.
    const wardrobe = readFileSync(
      join(process.cwd(), 'app', '(tabs)', 'wardrobe', 'index.tsx'),
      'utf8',
    );
    /*
     * ASSEMBLED, not written out. `verify-app-imports.mjs` scans source for relative import
     * paths and resolves them, and the route's own path — two segments up — would be read as an
     * import made by THIS file, from a directory outside the app.
     *
     * The two assertions above are one segment shallower and resolve by coincidence rather than
     * by design. And the first version of this comment SPELLED THE PATH OUT to explain the
     * problem, which reproduced it exactly: the scanner reads comments too.
     */
    // THREE segments since F-145, not two: the route moved from `app/wardrobe/index.tsx` to
    // `app/(tabs)/wardrobe/index.tsx`, so everything under `app/` sits one level deeper. Still
    // assembled rather than written out, for the reason above — the scanner reads comments too.
    const up = '..';
    const importedFrom = `from '${up}/${up}/${up}/src/store/repository'`;
    expect(wardrobe).toContain(importedFrom);

    /*
     * THE REPOSITORY REACHES THE SCREEN — asserted as two facts rather than as one expression.
     *
     * This read `store={deviceRepository()}` as a literal, which was true while the route was
     * four lines long. F-150 gave the route a coverage computation that needs the same handle
     * twice, so it became `const repo = deviceRepository()` and `store={repo}` — and the
     * assertion broke on a refactor that changed nothing about what it was checking.
     *
     * The property is: this route calls the REAL repository, and hands it to the screen as
     * `store`. Both halves are still checked; neither is pinned to one way of writing it
     * [[virtualisation-breaks-a-rendered-tree-proxy-not-the-property]]. The decoy below is what
     * stops this weakening into "the file mentions a repository somewhere".
     */
    expect(wardrobe).toMatch(/deviceRepository\(\)/u);
    expect(wardrobe).toMatch(/store=\{(?:deviceRepository\(\)|repo)\}/u);
  });

  it('DECOY — the assertion above is not true of every route', () => {
    // Without this, "the file contains a string" would pass for any file at all, and the
    // check would be measuring that `readFileSync` works.
    const compare = readFileSync(
      join(process.cwd(), 'app', '(tabs)', 'atlas', 'compare.tsx'),
      'utf8',
    );
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
      colors: nativeColors.light,
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
/**
 * FR-26 and FR-30 on the screen, rather than in the module.
 *
 * The derivation, the confidence rule and the origin latch are asserted in `profile.test.ts`,
 * where they can be reached without rendering. What is left here is the half that file cannot
 * see: that the comparison is answerable without reading a colour, that all seven dimensions
 * reach the summary with their confidence as a SENTENCE, and that a correction is marked as
 * one on the surface a person is looking at.
 */
describe('guided setup asks, concludes, and can be corrected (FR-26, FR-30)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  const nodes = (
    answers?: readonly TrialAnswer[],
    store: ProfileStore = fakeProfileStore(),
  ): string[] =>
    textOf(
      draw(
        <ProfileSetup
          store={store}
          {...(answers === undefined ? {} : { initialAnswers: answers })}
        />,
        'light',
      ),
    );

  it('asks the first comparison, and says where in the run it is', () => {
    const text = nodes().join(' ');
    expect(text).toContain('Which would you rather wear?');
    expect(text).toContain(`1 / ${String(TRIALS.length)}`);
  });

  it('draws each option as a swatch AND names it, so the choice never needs colour alone', () => {
    /*
     * Golden rule 13, and here it is not an edge case: this screen is asking a question OF the
     * people the CVD work exists for. Two swatches somebody cannot separate must still be
     * answerable, which means the names have to be on screen.
     *
     * The value reaches the swatch's accessible name rather than the visible text — deliberate
     * on a screen asking about preference, where a row of hex codes is noise. It is asserted
     * through `swatchAccessibleName` rather than by reproducing its format, so the two cannot
     * drift.
     */
    const first = TRIALS[0]!;
    const shown = nodes();
    const text = shown.join(' ');
    for (const option of first.options)
      for (const slug of option.slugs) {
        const found = allEntries().find((e) => e.entry.slug === slug)!;
        expect(text).toContain(found.entry.name.kanji);
        expect(text).toContain(found.entry.name.en);
        expect(shown).toContain(
          swatchAccessibleName(found.entry.name.en, found.derived.hex, colorFor(found.entry)),
        );
      }
  });

  it('names each choose control by the colours it would pick', () => {
    // A screen reader otherwise hears "Choose" twice with nothing to tell the options apart.
    const labels = nodes();
    const [a, b] = TRIALS[0]!.options;
    const nameFor = (slugs: readonly string[]): string =>
      slugs.map((s) => allEntries().find((e) => e.entry.slug === s)!.entry.name.en).join(' + ');
    expect(labels).toContain(`Choose — ${nameFor(a.slugs)}`);
    expect(labels).toContain(`Choose — ${nameFor(b.slugs)}`);
  });

  it('says no camera is involved, on the screen rather than only in a document', () => {
    // ADR-0010 §2: the swatch path is the PRIMARY one, and its being camera-free is the
    // privacy and accessibility promise — which is worth nothing if only the ADR says it.
    expect(nodes().join(' ')).toContain('No camera');
  });

  it('DOES NOT say "no camera" when a camera reading is what it is showing (F-097)', () => {
    /*
     * THE CLAIM THAT WOULD HAVE QUIETLY STOPPED BEING TRUE.
     *
     * 'profile.privacy' — "No camera. Everything stays on this device." — was simply true
     * until F-097 gave the photo path a producer. Nothing would have failed when it stopped
     * being: the string still existed, still rendered, still read well, and the test above
     * would still have passed, because it asserts the guided path and the guided path is
     * unchanged.
     *
     * So the assertion is made from the OTHER side. The photo path must not claim it, and it
     * must say the thing that IS true of it — the same claim NSCameraUsageDescription makes at
     * the moment permission is requested.
     */
    const text = textOf(
      draw(<ProfileSetup store={fakeProfileStore()} reading={SAMPLE_READING} />, 'light'),
    ).join(' ');
    expect(text).not.toContain('No camera');
    expect(text).toContain('discarded');
  });

  it('reaches every one of the seven dimensions in the summary', () => {
    const text = nodes(ALL_ANSWERS).join(' ');
    // Read through the catalogue from the store's own dimension list, not from seven strings
    // typed here: an eighth dimension would otherwise be a row nobody renders and a test
    // nobody fails.
    for (const dimension of PROFILE_DIMENSIONS)
      expect(text).toContain(en[DIMENSION_KEYS[dimension]]);
  });

  it('states confidence as a sentence about the answers, never as a bare number', () => {
    const text = nodes(ALL_ANSWERS).join(' ');
    expect(text).toContain('Your answers agreed on this.');
    // 0.75 is a weight for F-028, not something to show a person: a number with no units and
    // no scale invites being read as a percentage of correctness.
    expect(text).not.toContain('0.75');
  });

  it('calls the result an estimate and invites the correction', () => {
    // ADR-0031 and ADR-0010 §6, on the surface. Twelve forced choices are not a measurement,
    // and the sentence that says so is the one a person actually reads.
    const text = nodes(ALL_ANSWERS).join(' ');
    expect(text).toContain('not a measurement');
    expect(text).toContain('a change you make is kept');
  });

  it('explains why an unfinished run cannot be saved rather than only disabling the control', () => {
    expect(nodes().join(' ')).toContain(
      'Every comparison needs an answer before this can be saved',
    );
  });

  it('DECOY — a finished run shows no such sentence', () => {
    // Without this, the assertion above would also pass on a screen that shows the sentence
    // permanently [[a-decoy-that-is-not-broken-proves-nothing]].
    expect(nodes(ALL_ANSWERS).join(' ')).not.toContain(
      'Every comparison needs an answer before this can be saved',
    );
  });

  it('marks a dimension the person set, and only that one', () => {
    /*
     * The screen half of acceptance criterion 4. A profile already on the device has
     * `contrast` corrected to `low`; the answers below derive `high`. The correction must
     * survive `applyDerivation` and be VISIBLE as a correction — a preserved value that looks
     * identical to a derived one leaves a person unable to tell what the app decided from
     * what they decided.
     */
    const store = fakeProfileStore();
    const derived = TRIALS.map((t) => ({ trialId: t.id, pole: 'a' as const }));
    store.saveProfile(
      {
        id: 'kept',
        method: 'guided',
        lightness: { min: 0.4, max: 0.8 },
        temperatureBias: 1,
        chroma: { min: 0, max: 0.1 },
        contrast: 'low',
        confidence: {
          lightness: 0.75,
          temperature: 0.75,
          chroma: 0.75,
          contrast: 1,
          neutrals: 0.75,
          accents: 0.75,
          avoid: 0.75,
        },
        origin: {
          lightness: 'derived',
          temperature: 'derived',
          chroma: 'derived',
          contrast: 'user',
          neutrals: 'derived',
          accents: 'derived',
          avoid: 'derived',
        },
        neutrals: [],
        accents: [],
        avoid: [],
      },
      1000,
    );

    const marked = nodes(derived, store).filter((line) => line === 'You set this.');
    expect(marked).toHaveLength(1);
    // The baseline, in the same test: with nothing corrected the marker is absent entirely.
    expect(nodes(derived)).not.toContain('You set this.');
  });
});

/**
 * FR-27 on the screen — **the estimate, and the gate in front of saving it**.
 *
 * The derivation is asserted in `profile.test.ts` without rendering. What is left here is the
 * half that file cannot see: that the estimate reaches the summary, that it says where it came
 * from, and that **nothing can be finalised until the person presses a control** — which is a
 * property of the screen and of nothing else.
 */
describe('a photo estimate is proposed, not finalised (FR-27)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  const READING = SAMPLE_READING;

  const nodes = (over: Partial<LensReading> | null = {}): string[] =>
    textOf(
      draw(
        <ProfileSetup
          store={fakeProfileStore()}
          {...(over === null ? {} : { reading: { ...READING, ...over } })}
        />,
        'light',
      ),
    );

  it('shows the summary straight away rather than starting the comparisons', () => {
    const text = nodes().join(' ');
    expect(text).toContain('What your answers suggest');
    // And NOT the comparison branch, which is what a person with a reading has skipped.
    expect(text).not.toContain('Which would you rather wear?');
  });

  it('says the estimate came from a camera, and why that makes it weaker', () => {
    // A lower confidence with no stated reason reads as arbitrary. ADR-0010 §2 gives the
    // reason, and the screen is where a person can actually read it.
    const text = nodes().join(' ');
    expect(text).toContain('one camera reading');
    expect(text).toContain('reads the light in the room');
  });

  it('refuses to save until the person confirms, and says so', () => {
    /*
     * FR-27's third criterion. The control is disabled AND the reason is on screen — a disabled
     * button with no sentence is the accessibility failure that looks like polish.
     */
    const text = nodes().join(' ');
    expect(text).toContain('Check the estimate and confirm it before saving.');
    expect(text).toContain('This looks right');
    // The alternative is offered in the same breath, so "confirm" is not the only way forward.
    expect(text).toContain('Answer the comparisons instead');
  });

  it('DECOY — the guided path is never asked to confirm a confirmation', () => {
    /*
     * Without this, "the confirmation gate exists" would be indistinguishable from "the gate is
     * always shown" [[a-decoy-that-is-not-broken-proves-nothing]]. A completed guided run
     * finalises by pressing save, which is already explicit.
     */
    const guided = textOf(
      draw(<ProfileSetup store={fakeProfileStore()} initialAnswers={ALL_ANSWERS} />, 'light'),
    ).join(' ');
    expect(guided).not.toContain('Check the estimate and confirm it before saving.');
    expect(guided).not.toContain('This looks right');
    expect(guided).not.toContain('one camera reading');
  });

  it('offers no estimate at all from a reading the capture assessment rejected', () => {
    // `worthOffering` is the reading's own verdict. An estimate built on nothing would spend a
    // person's correction on noise, and it would look exactly like a good one.
    const text = nodes({ confidence: 0, usableSamples: 0 }).join(' ');
    expect(text).toContain('Which would you rather wear?');
    expect(text).not.toContain('one camera reading');
  });

  it('shows the contrast row as unanswered rather than filling it in', () => {
    /*
     * The abstention, on the surface. One reading has no second colour to be contrasted with,
     * and the row says "Not asked yet." in the same words a guided run uses for a trial nobody
     * answered — while every other row IS answered, which is what makes it read as a decision.
     */
    const shown = nodes();
    expect(shown.filter((line) => line === 'Not asked yet.')).toHaveLength(1);
    expect(shown.join(' ')).toContain('Contrast');
  });

  it('never presents an estimate as more certain than a split guided answer', () => {
    // Every dimension the photo path answers is capped at PHOTO_CEILING, which is at most
    // CONFIDENCE_MAJORITY — so the summary must never show the "answers agreed" sentence.
    const text = nodes().join(' ');
    expect(text).toContain('less certain');
    expect(text).not.toContain('Your answers agreed on this.');
  });
});

/**
 * FR-35 on the surface — **the flag, and the swap that fixes it**.
 *
 * The computation is asserted in `cvd-mode.test.ts` without rendering. What is left here is what
 * that file cannot see: that the flag reaches a screen, that it names the pair, that the
 * improvement is on it as a number, and that nothing about it addresses the reader.
 *
 * The surface is Palette Studio rather than an outfit, and that is a recorded deviation: FR-35
 * says "outfit mode" and the outfit builder is F-033, R4. A palette is a set of colours somebody
 * assembled by hand, which is exactly this check's input.
 */
describe('CVD mode flags a hard pair and proposes a swap (FR-35)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  /** The hardest pair in the corpus by the model's own reckoning (0.68 of 100). */
  const HARD: PaletteDraft = {
    name: 'Hard to separate',
    members: [
      { slug: 'kawaki-suna', role: 'anchor' },
      { slug: 'usu-shiba', role: 'neutral' },
    ],
  };
  /** A near-black and a near-white: separable under every deficiency. */
  const EASY: PaletteDraft = {
    name: 'Easy to separate',
    members: [
      { slug: 'soko-zumi', role: 'anchor' },
      { slug: 'usu-gami', role: 'neutral' },
    ],
  };

  const nodes = (draft: PaletteDraft): string[] =>
    textOf(draw(<PaletteStudio store={fakeStore()} initialDraft={draft} />, 'light'));

  it('flags the pair, naming both colours', () => {
    const text = nodes(HARD).join(' ');
    expect(text).toContain('These two are hard to tell apart');
    expect(text).toContain('Dry Sand');
    expect(text).toContain('Thin Turf');
  });

  it('DECOY — a well-separated palette is not flagged, and says so', () => {
    // Without this, "it shows the flag" would be equally true of a screen that always shows it.
    const text = nodes(EASY).join(' ');
    expect(text).not.toContain('These two are hard to tell apart');
    expect(text).toContain('Every pair here stays distinguishable');
  });

  it('shows the improvement as a number, with the swap that earns it', () => {
    const text = nodes(HARD).join(' ');
    expect(text).toContain('Swapping the second for this raises it to');
    // A gain, signed, so the direction is legible without reading the sentence around it.
    expect(text).toMatch(/A gain of \+\d+/u);
  });

  it('states how the number was produced', () => {
    // ADR-0031: a measurement without its conditions is a claim.
    expect(nodes(HARD).join(' ')).toContain('strongest tabulated severity');
  });

  it('says nothing about the reader’s vision, on either palette', () => {
    // Criterion 3, on the surface rather than only in the catalogue.
    for (const draft of [HARD, EASY]) {
      const text = nodes(draft).join(' ');
      expect(text).not.toMatch(/\byour (?:eyes|vision)\b/iu);
      expect(text).not.toMatch(/\byou (?:may|might|cannot|can't) (?:not )?(?:be able to )?see\b/iu);
    }
  });
});

describe('guided setup has headings (A11)', () => {
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
      expect(roles(draw(<ProfileSetup store={fakeProfileStore()} />, theme))).toContain('header');
      expect(
        roles(
          draw(<ProfileSetup store={fakeProfileStore()} initialAnswers={ALL_ANSWERS} />, theme),
        ),
      ).toContain('header');
    });
});

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

/**
 * F-109 — the preference weights are inspectable and resettable (FR-37).
 *
 * The second criterion is what these exist for: the weight must be shown BESIDE the counts it
 * comes from, never instead of them. F-046 stored counts rather than a float so the number would
 * stay explicable, and a screen showing only the multiplier would undo that at the last step.
 */
describe('preferences are inspectable, with the counts the weight comes from (F-109)', () => {
  /**
   * VISIBLE TEXT ONLY — no accessibility labels.
   *
   * This distinction is the whole test. An earlier version collected `accessibilityLabel`
   * too, and a mutation that stripped the counts from the RENDERED row still passed, because
   * the label kept carrying them. The screen would have shown a bare `1.19×` to everybody
   * who can see it and the suite would have been green.
   */
  function visibleText(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else visibleText(child, out);
    }
    return out;
  }

  /** Labels only, for the assertion that screen-reader users get the same numbers. */
  function labelsOf(node: TestNode, out: string[] = []): string[] {
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    for (const child of node.children ?? []) if (typeof child !== 'string') labelsOf(child, out);
    return out;
  }

  const shown = (store = preferenceStore()): string =>
    visibleText(draw(<Preferences store={store} />, 'dark')).join('\u0000');

  it('lists every pairing the person has expressed something about', () => {
    const text = shown();
    // Four pairings in, four out. A screen rendering only the first would pass a "shows a
    // pairing" assertion and lose three.
    // Reported as a LIST of what is missing, the way the Atlas test does it: a per-row
    // assertion would stop at the first failure and hide the other three.
    const missing = PREFERENCE_ROWS.filter(
      (row) => !text.includes(familyLabel(row.familyA, 'en')),
    ).map((row) => `${row.familyA}/${row.familyB}`);
    expect(missing).toHaveLength(0);
  });

  it('shows BOTH counts, not only the weight', () => {
    /*
     * THE DECOY FOR CRITERION 2. A screen rendering only `1.19×` would satisfy "shows the
     * weight" and would be exactly the regression F-046's storage decision exists to prevent.
     * 12 and 9 appear on no other row, so finding them is finding that row's counts.
     */
    const text = shown();
    expect(text).toContain('12');
    expect(text).toContain('9');
  });

  it('shows the weight the ENGINE computes, not one the screen invented', () => {
    const text = shown();
    // Recomputed from the engine’s own function, per row. A hard-coded expectation would
    // pass even if the screen carried a private copy of the formula that agreed today.
    const wrong = PREFERENCE_ROWS.filter((row) => {
      const expected = preferenceWeight({ accepted: row.accepted, rejected: row.rejected });
      return !text.includes(expected.toFixed(2));
    }).map((row) => `${row.familyA}/${row.familyB}`);
    expect(wrong).toHaveLength(0);
  });

  it('gives a screen reader the pairing and both counts in one announcement', () => {
    /*
     * The row is one accessibility element on purpose: "Kept 5, Passed 2" announced without
     * its pairing is a number with no subject. So the label carries the name AND the counts,
     * and this asserts it independently of the visible text above — the two can drift, and
     * the sighted assertion above cannot see it.
     */
    const labels = labelsOf(draw(<Preferences store={preferenceStore()} />, 'dark'));
    /*
     * Matched on the pairing row's OWN vocabulary, not on the family name alone. F-153 put a
     * theme picker at the top of this screen whose themes are named after corpus colours, so
     * "Green Paddy" is now also a label containing "green" — and `find` returned the chip.
     * The counts are what make a row a pairing row.
     */
    const row = labels.find(
      (l) => l.includes(familyLabel('green', 'en')) && l.includes(en['preferences.accepted']),
    );
    expect(row).toBeDefined();
    expect(row).toContain('12');
    expect(row).toContain('9');
  });
  /*
   * THE THEME PICKER IS A SELECT NOW (F-156), and this is the wiring assertion.
   *
   * The control is checked exhaustively in `packages/ui` — every state, both themes, the
   * chosen option's tick and the disabled one's state. What that suite cannot see is whether
   * THIS screen handed it the right `value`, the right options, or the device row's
   * availability. A screen that passed a constant would look correct in every screenshot.
   */
  it('names the chosen theme on the trigger, not just the field', () => {
    const labels = labelsOf(
      draw(
        <Preferences store={preferenceStore()} appearance={{ family: 'yama', mode: 'system' }} />,
        'dark',
      ),
    );
    // The field AND the value. "Theme" does not say what is chosen; "Yamabuki" does not say
    // what it is.
    const trigger = labels.find((l) => l.startsWith(`${en['appearance.theme']}: `));
    expect(trigger).toBe(`${en['appearance.theme']}: ${en['appearance.family.yama']}`);
  });

  it("offers the phone's own colour as a DISABLED row rather than hiding it", () => {
    /*
     * F-154's call, kept: a control that is not there cannot explain itself. iOS offers no
     * device colour and never will, so somebody looking for the feature they read about gets a
     * row they can see and a sentence beneath it.
     *
     * Asserted on the rendered node's state rather than on the prop, because "the option
     * exists" and "the option is refused" are different facts and only the second is useful.
     */
    const tree = draw(
      <Preferences
        store={preferenceStore()}
        appearance={{ family: 'base', mode: 'system' }}
        initialThemeListOpen
      />,
      'dark',
    );
    const nodes: TestNode[] = [];
    const walk = (n: TestNode): void => {
      nodes.push(n);
      for (const c of n.children ?? []) if (typeof c !== 'string') walk(c);
    };
    walk(tree);
    const device = nodes.find(
      (n) => n.props['accessibilityLabel'] === en['appearance.family.device'],
    );
    expect(device).toBeDefined();
    expect((device?.props['accessibilityState'] as { disabled?: unknown }).disabled).toBe(true);
  });

  it('explains itself when nothing has been learned', () => {
    const text = visibleText(draw(<Preferences store={preferenceStore([])} />, 'dark')).join(
      '\u0000',
    );
    expect(text).toContain(en['preferences.empty']);
    expect(text).toContain(en['preferences.emptyHint']);
  });
});

describe('reset says what it removes before it removes it (F-109 criterion 3)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    return out;
  }

  it('names how many pairings go, and warns that it cannot be undone', () => {
    const text = textOf(
      draw(<Preferences store={preferenceStore()} initialConfirming />, 'dark'),
    ).join('\u0000');

    expect(text).toContain(en['preferences.resetCount']);
    expect(text).toContain(String(PREFERENCE_ROWS.length));
    expect(text).toContain(en['preferences.resetIrreversible']);
  });

  it('does NOT touch the store until the confirmation is accepted', () => {
    /*
     * THE ASSERTION THAT MATTERS. `resetPreferences` is a hard delete — the repository's only
     * one — so a reset firing on the first tap would satisfy "reachable" and lose somebody's
     * data. Rendering the confirmation must not be enough.
     */
    const store = preferenceStore();
    draw(<Preferences store={store} initialConfirming />, 'dark');
    expect(store.resets).toHaveLength(0);
    expect(store.listPreferences()).toHaveLength(PREFERENCE_ROWS.length);
  });
});

describe('the preferences route wires the real repository (F-109)', () => {
  it('imports the device repository and hands it to the screen', () => {
    const route = readFileSync(
      join(process.cwd(), 'app', '(tabs)', 'profile', 'preferences.tsx'),
      'utf8',
    );
    expect(route).toContain("from '../../../src/store/repository'");
    expect(route).toMatch(/store=\{deviceRepository\(\)\}/u);
  });
});

/**
 * F-119 — the Lens says why there is no reading.
 *
 * "Waiting" was the whole of what this screen could say about four different failures. A person
 * looking at a live preview that produces nothing cannot tell them apart, and neither could
 * anybody they reported it to.
 */
describe('the Lens readout carries what the engine classified (F-149, FR-17, FR-18)', () => {
  // Local, as every other block in this file keeps one. Reads the accessibility label as well
  // as the text, so a value announced but not printed still counts as shown.
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    const label: unknown = node.props['accessibilityLabel'];
    if (typeof label === 'string') out.push(label);
    return out;
  }

  /** A reading with something to say about itself: poor capture, mixed light, an instruction. */
  const POOR: LensReading = {
    rgb: [0.4, 0.38, 0.36],
    space: 'display-p3',
    usableSamples: 1100,
    variance: 0.09,
    illumination: 'mixed',
    quality: 'poor',
    confidence: 0.21,
    instruction: 'Move closer and fill the marked area.',
  };

  const shown = (reading: LensReading): string =>
    textOf(draw(<Lens permission="granted" capture={reading} />, 'light')).join(' \u0000 ');

  it('shows the quality band — the FR-18 word that reached no screen until now', () => {
    // The engine has classified every capture since R2 and nothing rendered it. What the
    // screen showed instead was `confidence.toFixed(2)`, whose own type says it is never a
    // probability. This is the assertion that the word arrives.
    expect(shown(POOR)).toContain(en['lens.quality.poor']);
    expect(shown(SAMPLE_READING)).toContain(en['lens.quality.excellent']);
  });

  it('names all three conditions, and the value after them (FR-17)', () => {
    const text = shown(POOR);
    for (const label of [en['lens.quality'], en['lens.light'], en['lens.space']])
      expect(text).toContain(label);
    expect(text).toContain(en['lens.light.mixed']);
    expect(text).toContain(en['lens.space.displayP3']);

    // ORDER, not merely presence. FR-17's requirement is that the classification is shown
    // BEFORE the result, "because a number shown first has already been read by the time its
    // qualifier arrives" — so a test that only checked presence would pass on the arrangement
    // the requirement exists to forbid.
    expect(text.indexOf(en['lens.quality.poor'])).toBeLessThan(text.indexOf('0.21'));
  });

  it('keeps the confidence figure, subordinate and with its scale stated', () => {
    const text = shown(POOR);
    // Kept rather than hidden: it is the honest ceiling FR-15 produces, and removing it would
    // conceal how far the engine is willing to go. The label is what stops a bare 0.21 reading
    // as a percentage.
    expect(text).toContain('0.21');
    expect(text).toContain(en['lens.confidence']);
  });

  it('gives the instruction as a next step, not as a warning (criterion 4)', () => {
    const text = shown(POOR);
    expect(text).toContain(en['lens.next']);
    expect(text).toContain(POOR.instruction);
  });

  it('says nothing about conditions when there is no reading', () => {
    const text = textOf(draw(<Lens permission="granted" />, 'light')).join(' \u0000 ');
    for (const label of [en['lens.quality'], en['lens.light'], en['lens.next']])
      expect(text).not.toContain(label);
  });
});

describe('the Lens says why there is no reading (F-119)', () => {
  function textOf(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else textOf(child, out);
    }
    return out;
  }
  const why = 'the frame has no CPU pixel buffer';

  it('shows the reason in the empty state', () => {
    // LIVE MODE, because that is the only state in which the app is waiting for a frame at all.
    // In still mode nothing has been asked for, so there is nothing to be waiting on — F-160.
    const text = textOf(
      draw(<Lens permission="granted" mode="live" diagnostic={why} />, 'dark'),
    ).join('\u0000');
    expect(text).toContain(why);
    expect(text).toContain(en['lens.waiting']);
  });

  it('never shows it beside a reading', () => {
    /*
     * THE DECOY. A stale reason under a live reading would contradict the thing next to it, and
     * the screen would be arguing with itself — which is worse than saying nothing.
     */
    const text = textOf(
      draw(<Lens permission="granted" capture={SAMPLE_READING} diagnostic={why} />, 'dark'),
    ).join('\u0000');
    expect(text).not.toContain(why);
  });

  it('never shows it when access was refused', () => {
    /*
     * A REAL SEQUENCE, not a hypothetical: grant access, frames fail, a diagnostic lands in
     * state, then somebody revokes the permission in Settings and comes back. The screen must
     * explain the refusal, not a frame problem from a camera that is no longer running.
     */
    const text = textOf(draw(<Lens permission="denied" diagnostic={why} />, 'dark')).join('\u0000');
    expect(text).not.toContain(why);
    expect(text).toContain(en['lens.noReading']);
  });
  it('shows nothing extra when there is no diagnostic', () => {
    const text = textOf(draw(<Lens permission="granted" mode="live" />, 'dark')).join('\u0000');
    expect(text).toContain(en['lens.waiting']);
  });

  it('says nothing at all while nothing has been asked for (F-160)', () => {
    /*
     * THE RESTING STATE, and it is the decoy for every assertion above. The old screen said
     * "Point the centre of the frame at a colour" the moment permission was granted, because it
     * WAS reading — continuously, whether or not anybody wanted it to. Still mode is the fix,
     * and a line telling somebody to wait for a reading nobody requested would be the old
     * behaviour surviving in the copy.
     */
    const text = textOf(draw(<Lens permission="granted" />, 'dark')).join('\u0000');
    expect(text).not.toContain(en['lens.waiting']);
    expect(text).toContain(en['lens.capture']);
    expect(text).toContain(en['lens.mode.stillHint']);
  });
});

/**
 * The investment signal reaches the screen (FR-52, F-123, ADR-0082).
 *
 * `investment.test.ts` owns the medians and `shopping.test.ts` owns the fourth answer. What is
 * left here is the half neither can see: that the **answered branch actually draws numbers**.
 *
 * The conformance registry would pass a subject that silently rendered the refusal instead — it
 * checks contrast and accessibility of whatever was drawn, and a refusal is a perfectly
 * accessible sentence. Without these assertions, "the answered branch is registered" would be a
 * claim about a fixture nobody read [[a-decoy-that-is-not-broken-proves-nothing]].
 */
describe('the investment panel draws what it claims to', () => {
  function allText(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else allText(child, out);
    }
    return out;
  }

  const shown = (wardrobe: readonly StoredGarment[]): string =>
    allText(
      draw(
        <Shopping
          wardrobe={wardrobe}
          context={SHOPPING_CONTEXT}
          initialType="jumper"
          initialSlug={allEntries()[4]!.entry.slug}
          initialAmount="180.00"
          initialCurrency="GBP"
        />,
        'light',
      ),
    ).join(' | ');

  it('shows the break-even and the typical wears, rounded for reading', () => {
    const text = shown(SHOPPING_PRICED);

    // 18000 / 300 = 60 wears; the comparables' median wear count is 30.
    expect(text).toContain(`${en['shopping.breakEven']}: 60`);
    expect(text).toContain(`${en['shopping.typical']}: 30`);
  });

  it('shows the basis beside the numbers, so they can be checked rather than believed', () => {
    const text = shown(SHOPPING_PRICED);

    expect(text).toContain(en['shopping.investmentBasis']);
    expect(text).toContain('3');
    expect(text).toContain('GBP');
  });

  it('offers no verdict, and says the judgement is the reader’s', () => {
    const text = shown(SHOPPING_PRICED);

    expect(text).toContain(en['shopping.investmentYours']);
    // ADR-0082 refuses a verdict. If one is ever added, the copy is where it would appear.
    for (const word of ['worth it?', 'good buy', 'bargain', 'overpriced'])
      expect(`${word}: ${String(text.toLowerCase().includes(word))}`).toBe(`${word}: false`);
  });

  /*
   * THE DECOY. Without it, every assertion above would be equally true of a screen that drew the
   * panel unconditionally — and the refusal branch is the one most people will actually see.
   */
  it('DECOY — one garment short, it refuses and says how many are needed', () => {
    const text = shown(SHOPPING_TOO_FEW);

    expect(text).toContain(en['shopping.investmentTooFew']);
    expect(text).toContain(`${en['shopping.investmentHave']}: 2`);
    expect(text).toContain(`${en['shopping.investmentNeed']}: 3`);
    expect(text).not.toContain(en['shopping.breakEven']);
  });
});

/**
 * The outfit component scores say what they mean (FR-32, F-124).
 *
 * `i18n.test.ts` proves every key the engine emits has a sentence in both catalogues. It cannot
 * prove the **screen renders the sentence** — the builder read `c.component` for six features,
 * and a catalogue full of correct copy nothing looks up would satisfy every assertion there.
 *
 * The conformance registry cannot see it either: `harmony — 78` and `harmony: 78` are both
 * perfectly accessible strings, and a subject still rendering the identifier would pass gates 8
 * and 9 exactly as it did before this feature [[a-decoy-that-is-not-broken-proves-nothing]].
 */
describe('the outfit builder renders sentences, not identifiers', () => {
  function allText(node: TestNode, out: string[] = []): string[] {
    for (const child of node.children ?? []) {
      if (typeof child === 'string') out.push(child);
      else allText(child, out);
    }
    return out;
  }

  const built = (): string =>
    allText(
      draw(
        <OutfitBuilder
          wardrobe={OUTFIT_WARDROBE}
          context={OUTFIT_CONTEXT}
          initialDraft={[{ slot: 'top', garment: OUTFIT_WARDROBE[0]!, locked: true }]}
          store={fakeWearStore(OUTFIT_WARDROBE)}
        />,
        'light',
      ),
    ).join(' | ');

  it('shows a sentence for a component the engine scored', () => {
    const text = built();
    const sentences = OUTFIT_MESSAGE_KEYS.filter((k) => isMessageKey(k) && text.includes(en[k]));

    // At least one of the eighteen is on screen — the outfit has six components and each emits
    // exactly one key, so a builder rendering sentences at all shows six of these.
    expect(sentences.length).toBeGreaterThan(0);
  });

  /*
   * THE DECOY, and it is the whole assertion. Every component identifier is a substring of its
   * own key, so a screen still rendering `corpusAffinity: 78` would pass the check above the
   * moment any ONE sentence happened to appear elsewhere. This is what says the identifiers are
   * gone.
   */
  it('shows no raw component identifier beside a score', () => {
    const text = built();

    for (const component of OUTFIT_COMPONENTS)
      expect(`${component}: ${String(text.includes(`${component}: `))}`).toBe(
        `${component}: false`,
      );
  });

  it('keeps the number beside the sentence, because FR-32 asks for the scores', () => {
    const text = built();

    // The em-dash separator, with a number after it — the shape the builder writes.
    expect(text).toMatch(/ — \d+/u);
  });
});

/**
 * F-151 — **a list ranks, a pair judges** (ADR-0095).
 *
 * The three instrument surfaces failed the same way: a colour drawn at a size for identifying
 * it, on a screen whose job is judging it. Everything asserted here is STRUCTURAL, because what
 * changed is arrangement — and arrangement is the one thing gate 9, gate 10 and the conformance
 * suite all read straight past.
 */
describe('the pair leads Compare, and nothing sits between the two colours (F-151)', () => {
  const HEXES = [entryBySlug(PAIR_A)!.derived.hex, entryBySlug(PAIR_B)!.derived.hex];

  function styleOf(node: TestNode): Record<string, unknown> {
    const raw: unknown = node.props['style'];
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

  /** Every node in render order, so a position can be compared against a position. */
  function inOrder(node: TestNode, out: TestNode[] = []): TestNode[] {
    out.push(node);
    for (const child of node.children ?? []) if (typeof child !== 'string') inOrder(child, out);
    return out;
  }

  const tree = (): TestNode => draw(<Compare initialA={PAIR_A} initialB={PAIR_B} />, 'light');

  const sampleNodes = (): TestNode[] =>
    inOrder(tree()).filter((n) => HEXES.includes(String(styleOf(n)['backgroundColor'])));

  it('draws the two samples touching — no line and no corner where they meet', () => {
    /*
     * THE ASSERTION THE FEATURE TURNS ON. "How different are these two" is answered at the
     * boundary, and anything drawn there is an induced edge sitting exactly where the judgement
     * happens. `Pair` owns the rule and `packages/ui` proves it in isolation; this proves the
     * SCREEN is using it rather than two swatches in a row.
     */
    const samples = sampleNodes();
    expect(samples).toHaveLength(2);
    expect(styleOf(samples[0]!)['borderRightWidth']).toBe(0);
    expect(styleOf(samples[1]!)['borderLeftWidth']).toBe(0);
  });

  it('puts both samples before every figure, so the numbers are beneath and not beside', () => {
    // The criterion as tree order. Each colour used to sit in its own card with its own
    // metadata, which is the arrangement in which the two are never adjacent to each other.
    const nodes = inOrder(tree());
    const lastSample = nodes.findLastIndex((n) =>
      HEXES.includes(String(styleOf(n)['backgroundColor'])),
    );
    // A rendered `Text` carries its content as a string CHILD, not as a `children` prop —
    // which is why every other reader in this file walks `node.children`.
    const firstFigure = nodes.findIndex((n) =>
      (n.children ?? []).some((c) => typeof c === 'string' && /^[+−-]?\d+\.\d\d$/u.test(c)),
    );

    expect(lastSample).toBeGreaterThan(-1);
    expect(firstFigure).toBeGreaterThan(lastSample);
  });

  it('draws each sample at the judgeable size (ADR-0095)', () => {
    // Not a style preference. ΔE00 is parameterised for the CIE 2° standard observer — the
    // observer this product's colorimetry uses everywhere — and a sample smaller than that is
    // being judged under conditions its own number was not fit for.
    for (const n of sampleNodes()) expect(styleOf(n)['height']).toBe(nativeJudgeableSample);
  });

  it('DECOY — a Finder result is still a thumbnail, because ranking is not judging', () => {
    /*
     * Without this the feature could have raised every sample on every surface, which turns a
     * scannable list into four results a screen and is worse at the job a list has.
     *
     * THE DECOY IS ON THE FINDER RATHER THAN ON COMPARE, and the first draft of it was on
     * Compare and passed vacuously: the pickers render no rows until something is typed, so
     * there were no small samples to find and "some sample is small" was false for the wrong
     * reason. The Finder ranks by ΔE00 in a list you scan, which is the case the line is about.
     */
    const heights = inOrder(draw(<Finder initialQuery="ai" />, 'light'))
      .map((n) => styleOf(n)['height'])
      .filter((h): h is number => typeof h === 'number');

    expect(heights.length).toBeGreaterThan(0);
    expect(heights.every((h) => h < nativeJudgeableSample)).toBe(true);
  });
});

describe('the Studio shows the palette as one thing (F-151)', () => {
  function styleOf(node: TestNode): Record<string, unknown> {
    const raw: unknown = node.props['style'];
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

  /** The strip's segments, found by the testID rather than by guessing at the tree shape. */
  function segments(draft: PaletteDraft): readonly Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const collect = (n: TestNode): void => {
      const s = styleOf(n);
      if (typeof s['flex'] === 'number' && typeof s['height'] === 'number') found.push(s);
      for (const c of n.children ?? []) if (typeof c !== 'string') collect(c);
    };
    const walk = (n: TestNode): void => {
      if (n.props['testID'] === 'studio-strip') collect(n);
      for (const c of n.children ?? []) if (typeof c !== 'string') walk(c);
    };
    walk(draw(<PaletteStudio store={fakeStore()} initialDraft={draft} />, 'light'));
    return found;
  }

  it('draws one segment per member, at the weights the SAVED RECORD will carry', () => {
    /*
     * `studio.order` has said "order is proportion" since F-049 and nothing has ever shown it.
     * The widths are `deriveWeights` — the same function that writes the stored record — so the
     * strip cannot become a second opinion about proportion. It is the record, seen.
     */
    const found = segments(DRAFT);
    expect(found).toHaveLength(DRAFT.members.length);
    expect(found.map((s) => s['flex'])).toEqual([...deriveWeights(DRAFT.members.length)]);
  });

  it('changes when the palette does, which is the only reason a reorder control is worth having', () => {
    // The decoy for the case above: equal widths would satisfy "one segment per member" and say
    // nothing at all about proportion.
    const shorter: PaletteDraft = { ...DRAFT, members: DRAFT.members.slice(1) };
    expect(segments(shorter).map((s) => s['flex'])).not.toEqual(
      segments(DRAFT).map((s) => s['flex']),
    );
  });

  it('draws the strip at the judgeable height', () => {
    for (const s of segments(DRAFT)) expect(s['height']).toBe(nativeJudgeableSample);
  });
});

describe('the Finder results do not move (F-151)', () => {
  /**
   * Where the answer line sits, as the number of nodes rendered before it.
   *
   * A layout jump is a position changing between two states, and this is the only position a
   * rendered tree can be asked about without a layout engine. It is a real proxy rather than a
   * convenient one: the region panel used to sit above the list, so a phrase answer put a whole
   * Surface in front of the results and one more typed word took it away again.
   */
  function answerAt(query?: string): number {
    const nodes: TestNode[] = [];
    const walk = (n: TestNode): void => {
      nodes.push(n);
      for (const c of n.children ?? []) if (typeof c !== 'string') walk(c);
    };
    walk(draw(<Finder {...(query === undefined ? {} : { initialQuery: query })} />, 'light'));

    const index = nodes.findIndex((n) =>
      (n.children ?? []).some(
        (c) =>
          typeof c === 'string' &&
          /^(Nearest colours|Colours in the region|Colours whose name|Type something)/u.test(c),
      ),
    );
    if (index < 0) throw new Error('no answer line rendered');
    return index;
  }

  it('holds the answer line in one place across every kind of answer', () => {
    // Four states, one position — the empty one included, because the answer used to be a small
    // grey sentence where the heading later went, so the list moved on the FIRST keystroke,
    // under the thumb that had just typed it.
    const positions = [
      answerAt(),
      answerAt('#526A6B'),
      answerAt('dark muted green'),
      answerAt('ai'),
    ];
    expect(new Set(positions).size).toBe(1);
  });

  it('puts the region beneath the results, where it is provenance rather than a gate', () => {
    /*
     * The region panel appears for a phrase answer and for nothing else. Above the list it was
     * the jump: one more word, the words stop resolving, and forty rows slide up the screen.
     * Below it costs nothing — and it reads better, because it says what produced the answer.
     */
    const texts: string[] = [];
    const walk = (n: TestNode): void => {
      for (const c of n.children ?? []) {
        if (typeof c === 'string') texts.push(c);
        else walk(c);
      }
    };
    walk(draw(<Finder initialQuery="dark muted green" />, 'light'));

    const showing = texts.findIndex((x) => x.startsWith('Showing'));
    const region = texts.indexOf('That phrase means');
    expect(showing).toBeGreaterThan(-1);
    expect(region).toBeGreaterThan(showing);
  });
});
