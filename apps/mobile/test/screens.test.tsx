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
import { fireEvent, render } from '@testing-library/react-native';
import { writeFileSync } from 'node:fs';
import { AccessibilityInfo, SectionList, View } from 'react-native';

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

import {
  APP_BAR_RULE_TEST_ID,
  Appear,
  Arrival,
  BILINGUAL_SEPARATOR,
  EmptyState,
  Glyph,
  Illustration,
  STATE_TEST_IDS,
  TAB_INDICATOR_TEST_ID,
  TabBar,
  Text,
  TextureBadge,
  ThemeProvider,
  VisionPreviewProvider,
  swatchAccessibleName,
  type StateKind,
  type ThemeColors,
  type VisionMode,
  Wordmark,
} from '@irodora/ui';
import { colourOfTheDay, heroName, oklchLine, wardrobeCountLabel } from '../src/home';
import { AppTabBar } from '../src/tabBar';
import { TABS } from '../src/tabs';
import {
  brokenFlexChains,
  carriesFigure,
  checkAll,
  figureNodes,
  flattenStyle,
  checkStatusAdjacency,
  formatFindings,
  raggedFigures,
  renderedTexts,
  tabularNodes,
  previewMismatches,
  REQUIRED_STATES,
  type ConformanceSubject,
  type Observer,
  type TestNode,
} from '@irodora/ui/testing';
import { bannedIn, loadBanned } from './claims';
import {
  CONDITION_STATE,
  shownBy,
  type DataCondition,
  type ScreenStates,
  type ShownBy,
} from '../src/states';
import { Home, type HomeStore, STATES as HOME_STATES } from '../src/screens/Home';
import { Atlas, STATES as ATLAS_STATES } from '../src/screens/Atlas';
import {
  ColourDetail,
  type DerivedPanel,
  STATES as COLOUR_DETAIL_STATES,
} from '../src/screens/ColourDetail';
import { ColourBookmark } from '../src/bookmarks';
import { Compare, STATES as COMPARE_STATES } from '../src/screens/Compare';
import { Combinations, STATES as COMBINATIONS_STATES } from '../src/screens/Combinations';
import { Wear, STATES as WEAR_STATES } from '../src/screens/Wear';
import { TargetBar } from '../src/TargetBar';
import { VisionStrip } from '../src/VisionStrip';
import type { PersonalProfile } from '@irodora/recommendation';
import { combinationsFor } from '../src/combinations';
import { allCombinations } from '../src/corpus';
import { Contemporary, STATES as CONTEMPORARY_STATES } from '../src/screens/Contemporary';
import { PaletteStudio, STATES as PALETTE_STUDIO_STATES } from '../src/screens/PaletteStudio';
import {
  Preferences,
  type PreferenceStore,
  STATES as PREFERENCES_STATES,
} from '../src/screens/Preferences';
import { AddGarment, STATES as ADD_GARMENT_STATES } from '../src/screens/AddGarment';
import { Wardrobe, type BrowseStore, STATES as WARDROBE_STATES } from '../src/screens/Wardrobe';
import { Export, STATES as EXPORT_STATES } from '../src/screens/Export';
import type { FileSink } from '../src/export/sink';
import { OutfitBuilder, STATES as OUTFIT_BUILDER_STATES } from '../src/screens/OutfitBuilder';
import { Shopping, STATES as SHOPPING_STATES } from '../src/screens/Shopping';
import { Measure, type ReferenceLibrary, STATES as MEASURE_STATES } from '../src/screens/Measure';
import { parseMeasurement } from '../src/measure';
import { colorOf } from '../src/wardrobe';
import { groupByColour } from '../src/wardrobe/browse';
import { ruleSet } from '../src/rules';
import { WEIGHTS_TEXT } from '../src/rules/generated/weights';
import { engineProfile, type OutfitDraft } from '../src/outfit/builder';
import { draftKey } from '../src/outfit/lookbook';
import {
  outfitWeights,
  parseWeightContent,
  preferenceWeight,
  OUTFIT_COMPONENTS,
  OUTFIT_MESSAGE_KEYS,
} from '@irodora/recommendation';
import { familyLabel } from '../src/corpus';
import type { SavedColorRow, StoredGarment, StoredOutfit } from '@irodora/store';
import type { ExportSubject } from '@irodora/export';
import type { WardrobeStore } from '../src/wardrobe';
import type { WearStore } from '../src/wardrobe/cost';
import type { ImageSource } from '../src/wardrobe/source';
import type { NewGarment } from '@irodora/store';
import type { LensReading } from '../src/lens/reading';
import { Finder, STATES as FINDER_STATES } from '../src/screens/Finder';
import { ColourCard, STATES as COLOUR_CARD_STATES } from '../src/screens/ColourCard';
import {
  ProfileSetup,
  DIMENSION_KEYS,
  STATES as PROFILE_SETUP_STATES,
} from '../src/screens/ProfileSetup';
import { Lens, STATES as LENS_STATES } from '../src/screens/Lens';
import { refusalOf, refusalText } from '../src/lens/refusal';
import { Launch } from '../src/launch';
import { japaneseRun, t as message } from '../src/i18n';
import {
  elementFindings,
  loadInventories,
  scopeJson,
  scopeLive,
  snapshot,
  supersededFindings,
  surfacesOf,
  type LiveNodes,
  type Locator,
  type ReplacingConflict,
} from './inventory';
import { atlasOklch, atlasShown, capitalisedRomaji, NO_FILTERS, seasonLine } from '../src/atlas';
import { readingOklch } from '../src/profile/photo';
import { displayFromOklch } from '../src/engine';
import { cardSvg } from '../src/card';
import { nativeColors } from '@irodora/design-tokens';
import type { Mode, Theme } from '@irodora/design-tokens';
import { deviceTheme } from '../src/appearance';
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

/**
 * What `draw` renders under (F-240): Standard and the declared palette everywhere but the preview
 * sweep, which sets the mode — and for its device-palette pass, a seeded palette — around each
 * render and restores both.
 */
let drawVision: VisionMode = 'standard';
let drawPalette: {
  readonly name: string;
  readonly mode: Mode;
  readonly colors: ThemeColors;
} | null = null;

/**
 * A reader of the LIVE tree, called before `draw` unmounts it (F-266): the arrival registry reads
 * components — `Arrival` and `Appear` — which the JSON tree does not carry. Null everywhere else.
 */
let drawRoot: ((root: ReturnType<typeof render>['UNSAFE_root']) => void) | null = null;

function draw(node: React.JSX.Element, theme: Theme): TestNode {
  const rendered = render(
    <VisionPreviewProvider mode={drawVision}>
      {drawPalette === null ? (
        <ThemeProvider theme={theme}>{node}</ThemeProvider>
      ) : (
        <ThemeProvider palette={drawPalette}>{node}</ThemeProvider>
      )}
    </VisionPreviewProvider>,
  );
  const json = rendered.toJSON();
  drawRoot?.(rendered.UNSAFE_root);
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
 * The four cards 05 draws, as the Atlas draws them with *Autumn* chosen (F-246): a reachable state in
 * which every card prints its last line, as Home's fixture gives every garment a material. Computed
 * by the screen's own function, never named.
 */
const ATLAS_CARDS = atlasShown(allEntries(), '', { ...NO_FILTERS, season: 'autumn' }).slice(0, 4);
const atlasCard = (n: number) => {
  const card = ATLAS_CARDS[n];
  if (card === undefined) throw new Error(`fewer than ${String(n + 1)} autumn entries`);
  return card;
};

/** Three bookmarked colours (F-237): the Atlas subjects draw its toggle, on and off. */
const BOOKMARKED: ReadonlySet<string> = new Set(
  allEntries()
    .slice(0, 3)
    .map((e) => e.entry.slug),
);

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
  return { listGarments: () => (populated ? HOME_GARMENTS : []) };
}

/**
 * 01's WARDROBE PREVIEW, FILLED (F-242): five garments, so every tile and badge `01` draws is on the
 * tree. Four take a published colour and one a Lens reading (estimated, with its conditions), so the
 * preview carries both provenances. Each records a material, so each of 01's five badges is drawn
 * (ADR-0137); a garment with none, and its absent badge, is home-states.test's case. Home reads
 * garments and nothing else (ADR-0138), so there is no colour row here but a garment's own.
 */
const HOME_GARMENT_HEXES = ['#4E5D6C', '#E8E4DA', '#5E7A5A', '#A8503E', '#5C4A64'] as const;
const HOME_GARMENTS: readonly StoredGarment[] = HOME_GARMENT_HEXES.map((hex, i) => {
  const read = i === 0;
  return {
    id: `g${String(i + 1)}`,
    createdAt: 100 - i,
    updatedAt: 100 - i,
    deletedAt: null,
    type: 'shirt',
    name: null,
    material: ['Wool', 'Linen', 'Cotton', 'Denim', 'Silk'][i],
    color: {
      id: `c${String(i + 1)}`,
      created_at: 100 - i,
      updated_at: 100 - i,
      deleted_at: null,
      name: `Colour ${String(i + 1)}`,
      xyz_x: 0.1712,
      xyz_y: 0.1699,
      xyz_z: 0.2381,
      lab_l: 48.2,
      lab_a: -1.1,
      lab_b: -6.4,
      oklch_l: 0.52,
      oklch_c: 0.03,
      oklch_h: 264,
      hex,
      source: read ? 'estimated' : 'reference',
      confidence: read ? 0.81 : 1,
      corpus_slug: null,
      capture_illuminant: read ? 'daylight' : null,
      capture_quality: read ? 'good' : null,
      capture_samples: read ? 12 : null,
      capture_variance: read ? 0.4 : null,
    },
  } as unknown as StoredGarment;
});

/** The day the Home subjects are drawn on: 曇りガラス (#C5CFD4), fixed so it cannot rotate. */
const HOME_DAY = Date.UTC(2026, 8, 3, 12);

/** Every sample a Home subject draws: the day's colour and the five garments' — data, not tokens. */
const HOME_SAMPLES = ['#C5CFD4', ...HOME_GARMENT_HEXES];

/** The populated subjects' coverage: counted against a profile, at FR-42's threshold. */
const HOME_COVERAGE = { valid: 4, threshold: 60 } as const;

/** The day's entry the Home subjects draw — the screen's own selection, never restated. */
const homeToday = () => {
  const today = colourOfTheDay(HOME_DAY);
  if (today === null) throw new Error('the corpus is empty');
  return today;
};

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
  qualityFailures: [],
};

/**
 * A capture the engine calls poor (F-236, D1): three checks failed — which is what makes it poor —
 * the samples first, so the refusal names too little fabric. The Lens refuses it with 27's card.
 */
const REFUSED_READING: LensReading = {
  rgb: [0.4, 0.38, 0.36],
  space: 'srgb',
  usableSamples: 900,
  variance: 0.09,
  illumination: 'mixed',
  quality: 'poor',
  confidence: 0.21,
  instruction: 'Move closer and fill the marked area.',
  qualityFailures: ['samples', 'evenness', 'singleColour'],
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
  qualityFailures: [],
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

/** Every slot filled, the top locked: an outfit the Lab can save (F-238). */
const OUTFIT_COMPLETE: OutfitDraft = [
  { slot: 'top', garment: OUTFIT_WARDROBE[0]!, locked: true },
  { slot: 'trouser', garment: OUTFIT_WARDROBE[1]!, locked: false },
  { slot: 'shoe', garment: OUTFIT_WARDROBE[2]!, locked: false },
];

/** A save's versions, as a route would build them. Fixture values, not the build's. */
const LOOKBOOK_ENVELOPE = {
  engine: '0.1.0',
  scorer: '0.5.0',
  corpus: '2026.08.1',
  rules: '2026.08.4',
  occasion: 'default',
  profile: 'p:1',
} as const;

/**
 * A saved outfit from an older build (F-238): a locked slot, a Lens-captured colour with its four
 * conditions, all six components, and versions that are not this build's — so the subject renders
 * what a lookbook entry actually holds, not what today's scorer would say.
 */
const LOOKBOOK_OUTFIT: StoredOutfit = {
  id: 'lookbook-1',
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
      garmentId: 'o-1',
      garmentLabel: 'Linen shirt',
      locked: true,
      color: outfitRow(allEntries()[0]!.entry.slug),
    },
    {
      slot: 'trouser',
      position: 1,
      garmentId: 'o-2',
      garmentLabel: 'trousers',
      locked: false,
      color: outfitRow(allEntries()[1]!.entry.slug),
    },
    {
      slot: 'shoe',
      position: 2,
      garmentId: 'o-3',
      garmentLabel: 'shoes',
      locked: false,
      color: {
        ...outfitRow(allEntries()[2]!.entry.slug),
        source: 'estimated',
        confidence: 0.6,
        corpus_slug: null,
        capture_illuminant: 'D65',
        capture_quality: 'good',
        capture_samples: 48,
        capture_variance: 0.003,
      },
    },
  ],
  components: OUTFIT_COMPONENTS.map((component, position) => ({
    component,
    position,
    score: 50 + position * 4,
    direction: position === 2 ? 'opposes' : 'supports',
    weight: 1 / 6,
    contribution: (50 + position * 4) / 6,
  })),
};

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

/**
 * The states a subject renders (F-236, ADR-0129 §3), typed by its screen's own `STATES`: a subject
 * cannot claim a state its screen does not declare. Set on every subject of a screen that declares a
 * condition, with no states where this one renders none.
 */
const showing = <S extends ScreenStates>(
  _declared: S,
  ...shown: readonly ShownBy<S>[]
): readonly StateKind[] => shown;

const SCREENS: readonly ConformanceSubject[] = [
  {
    name: 'screens/Preferences',
    shows: showing(PREFERENCES_STATES),
    // `static`, like the rest: its interactive parts are Button, registered in packages/ui
    // where the suite makes it render focus, active, disabled and loading differently.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Preferences store={preferenceStore()} />, theme),
  },
  {
    // EMPTY — the state most people see first, and the one a blank list would fail silently.
    name: 'screens/Preferences (nothing learned)',
    shows: showing(PREFERENCES_STATES, 'empty'),
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
    shows: showing(PREFERENCES_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Preferences store={preferenceStore([])} onBuildOutfit={() => undefined} />, theme),
  },
  {
    /*
     * THE DISPLAY SWITCHES, WITH ONE OF THEM OFF (F-239).
     *
     * Every other subject renders the three rows in their drawn state — all on — so the sweep
     * never saw an OFF row at all: not its track, not its thumb at the near edge, and not the
     * gutter dot's absence. F-239's review found that, and this is the tree that fixes it. The
     * middle one is off because it is the row whose off state a person is most likely to choose.
     */
    name: 'screens/Preferences (a display switch off)',
    shows: showing(PREFERENCES_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Preferences
          store={preferenceStore()}
          display={{ tabularNumerals: true, hapticOnSelection: false, provenanceBadges: true }}
          onChangeDisplaySetting={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * MID-CONFIRMATION. The destructive path meets the same contrast and naming bar as the
     * rest — it is the state a person is least likely to be in and most likely to be harmed by.
     */
    name: 'screens/Preferences (confirming a reset)',
    shows: showing(PREFERENCES_STATES),
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
    shows: showing(PREFERENCES_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Preferences store={preferenceStore()} initialThemeListOpen />, theme),
  },
  {
    name: 'screens/Home',
    shows: showing(HOME_STATES),
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
     * The colours are DATA rather than tokens, and each is declared here in the registry rather
     * than marked on the screen — so forgetting one is a failure rather than an exemption a
     * component granted itself. `#C5CFD4` is 曇りガラス, the entry `colourOfTheDay` selects for
     * the fixed date — stable only BECAUSE the date is fixed, which is why `now` is injected.
     *
     * 01 AS DRAWN (F-242): five garments, the pill counted against a profile, every action wired —
     * the CTA is the page's one primary pill, and a subject omitting it would leave it unmeasured.
     */
    sampleValues: HOME_SAMPLES,
    render: (_state, theme) =>
      draw(
        <Home
          store={fakeHome(true)}
          now={() => HOME_DAY}
          coverage={HOME_COVERAGE}
          onOpenCombinations={() => undefined}
          onOpenGarment={() => undefined}
          onOpenLens={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * A WARDROBE WITH NO PROFILE (F-242, R9 §4 E2): the pill says the garment count alone, which
     * is a different tree from the one above and the state every new wardrobe is in.
     */
    name: 'screens/Home (a wardrobe, no profile)',
    shows: showing(HOME_STATES),
    kind: 'static',
    sampleValues: HOME_SAMPLES,
    render: (_state, theme) =>
      draw(
        <Home
          store={fakeHome(true)}
          now={() => HOME_DAY}
          onOpenCombinations={() => undefined}
          onOpenGarment={() => undefined}
          onOpenLens={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * THE FIRST-RUN FRONT DOOR (F-202): the day's colour and its card, and 27's empty-wardrobe card
     * in the preview's place. Registered because "unprofessional" was reported about THIS state —
     * a new install — and it was measured by nothing.
     */
    name: 'screens/Home (first run)',
    shows: showing(HOME_STATES, 'empty'),
    kind: 'static',
    sampleValues: HOME_SAMPLES,
    render: (_state, theme) =>
      draw(
        <Home
          store={fakeHome(false)}
          now={() => HOME_DAY}
          onOpenCombinations={() => undefined}
          onOpenLens={() => undefined}
        />,
        theme,
      ),
  },
  {
    name: 'screens/Atlas',
    shows: showing(ATLAS_STATES),
    // `static`, like Home — and it took a rewrite to earn that. The screen's interactive parts
    // are Card, Chip, ChoiceGroup, Button, SearchField and Swatch, each registered in packages/ui
    // where the suite asks
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
          // Each card a control (ADR-0143 D8), so its name and target are inside every run.
          onSelect={() => undefined}
          onOpenFinder={() => undefined}
          onOpenCompare={() => undefined}
          onOpenPalettes={() => undefined}
          // The bookmark toggle in the search field, off (F-237).
          bookmarked={BOOKMARKED}
        />,
        theme,
      ),
  },
  {
    /*
     * THE BOOKMARKED COLOURS, READ BACK (F-237, ADR-0135 D1): the toggle on, the list narrowed to
     * the set, the count line with it.
     */
    name: 'screens/Atlas (bookmarked only)',
    shows: showing(ATLAS_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Atlas bookmarked={BOOKMARKED} initialBookmarkedOnly />, theme),
  },
  {
    /*
     * A SEASON CHOSEN (F-246, ADR-0141): the chosen pill filled in `accent` and led by its dot, the
     * list narrowed, and *Showing* and *Clear* on the heading row (ADR-0143 D6).
     */
    name: 'screens/Atlas (a season chosen)',
    shows: showing(ATLAS_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Atlas initialSeason="autumn" />, theme),
  },
  {
    /*
     * MORE FILTERS OPEN (F-246, ADR-0143 D5): the overflow's sheet, its three facets in the season
     * row's form, so every one of them is inside the accessibility and contrast runs.
     */
    name: 'screens/Atlas (more filters open)',
    shows: showing(ATLAS_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Atlas initialFacetsOpen />, theme),
  },
  {
    /*
     * NOTHING BOOKMARKED (F-237, ADR-0135 D3): 00's caption, saying so and how to change it — the
     * way out is the toggle on this screen.
     */
    name: 'screens/Atlas (bookmarked only, none bookmarked)',
    shows: showing(ATLAS_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Atlas bookmarked={new Set()} initialBookmarkedOnly />, theme),
  },
  {
    name: 'screens/ColourDetail',
    shows: showing(COLOUR_DETAIL_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    // The comparison entry is rendered, so it is measured (F-181). See the Atlas subject above.
    render: (_state, theme) =>
      draw(
        <ColourDetail
          slug={WITH_COMPLEMENT.entry.slug}
          onCompareWith={() => undefined}
          onOpenCombinations={() => undefined}
          onArmTarget={() => undefined}
        />,
        theme,
      ),
  },
  ...([false, true] as const).map((on): ConformanceSubject => ({
    /*
     * 06's BOOKMARK, AS THE APP COMPOSES IT (F-237, ADR-0135 D2): the catalogue's name in both
     * locales, 06's glyph and ink, off and on. `static`, like every screen here: the toggle's
     * own states — the fill appearing on `active`, the announcement — are the ui registry's
     * `IconButton (bookmark toggle)`, where the `glyph` treatment holds them.
     */
    name: `screens/ColourDetail (06's bookmark, ${on ? 'on' : 'off'})`,
    shows: showing(COLOUR_DETAIL_STATES),
    kind: 'static',
    forbiddenNames: ['bookmark', 'icon'],
    render: (_state, theme) =>
      draw(
        <ColourBookmark slug={WITH_COMPLEMENT.entry.slug} on={on} onChange={() => undefined} />,
        theme,
      ),
  })),
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
    shows: showing(COLOUR_DETAIL_STATES),
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
    shows: showing(COMBINATIONS_STATES),
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
    shows: showing(COMBINATIONS_STATES),
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
    shows: showing(COMBINATIONS_STATES),
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
    shows: showing(COMBINATIONS_STATES),
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
    shows: showing(COMBINATIONS_STATES, 'empty'),
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
    shows: showing(WEAR_STATES),
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
    shows: showing(WEAR_STATES),
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
    shows: showing(WEAR_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wear slug={BOTH_COST_BRANCHES.entry.slug} profile={WEARER} initialSlot="trouser" />,
        theme,
      ),
  },
  {
    /*
     * THE TARGET BAR (F-200). Not a screen — it is the root chrome, and it is registered here
     * because it renders above EVERY screen while a target is armed. A surface the conformance
     * suite never saw would be the one piece of persistent UI whose contrast and announcement
     * nothing had checked.
     */
    name: 'screens/TargetBar',
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <TargetBar
          target={{
            hex: BOTH_COST_BRANCHES.derived.hex,
            oklch: [
              BOTH_COST_BRANCHES.derived.oklch[0],
              BOTH_COST_BRANCHES.derived.oklch[1],
              BOTH_COST_BRANCHES.derived.oklch[2],
            ],
            color: colorFor(BOTH_COST_BRANCHES.entry),
            label: BOTH_COST_BRANCHES.entry.name.en,
            slug: BOTH_COST_BRANCHES.entry.slug,
          }}
          onDisarm={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * THE COLOUR-VISION PREVIEW’S LABEL (F-240, ADR-0131 §5), in its longest form — Tritanopia, with
     * its qualification — in the declared palette, so the rules read its tokens. The preview sweep
     * renders it simulated, as the person sees it above the tab bar.
     */
    name: 'screens/VisionStrip',
    kind: 'static',
    render: (_state, theme) => draw(<VisionStrip mode="tritanopia" />, theme),
  },
  {
    name: 'screens/Compare',
    shows: showing(COMPARE_STATES),
    // `static` for the same reason the Atlas is: its interactive parts are SearchField and
    // Swatch, both registered in packages/ui where the suite makes them render their states.
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Compare initialA={PAIR_A} initialB={PAIR_B} />, theme),
  },
  {
    name: 'screens/ColourCard',
    shows: showing(COLOUR_CARD_STATES),
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
    shows: showing(CONTEMPORARY_STATES),
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
    shows: showing(CONTEMPORARY_STATES),
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
    shows: showing(CONTEMPORARY_STATES),
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
    shows: showing(FINDER_STATES),
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
    shows: showing(FINDER_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Finder initialQuery="dark muted green" />, theme),
  },
  {
    name: 'screens/OutfitBuilder',
    shows: showing(OUTFIT_BUILDER_STATES),
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
    shows: showing(OUTFIT_BUILDER_STATES, 'empty'),
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
    shows: showing(OUTFIT_BUILDER_STATES),
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
  ...(['every slot filled', 'in your lookbook'] as const).map((state): ConformanceSubject => ({
    /*
     * SAVE OUTFIT TO LOOKBOOK (F-238, ADR-0136 D4): every slot filled, so the whole outfit's
     * score is drawn beside the save — enabled, or disabled with its reason once it is saved.
     * Two trees, each measured in every condition.
     */
    name: `screens/OutfitBuilder (${state})`,
    shows: showing(OUTFIT_BUILDER_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <OutfitBuilder
          wardrobe={OUTFIT_WARDROBE}
          context={OUTFIT_CONTEXT}
          initialDraft={OUTFIT_COMPLETE}
          store={fakeWearStore(OUTFIT_WARDROBE)}
          lookbook={{
            envelope: LOOKBOOK_ENVELOPE,
            saved: new Set(state === 'in your lookbook' ? [draftKey(OUTFIT_COMPLETE)] : []),
            onSave: () => undefined,
          }}
        />,
        theme,
      ),
  })),
  {
    /*
     * The SAME screen where cost per wear HAS an answer (F-051).
     *
     * The composed entry above draws the refusal — a grey sentence — because its fixture has
     * no price. This one draws the two numeric lines, which is a different set of tokens at a
     * different size, and the contrast gate can only measure what something rendered.
     */
    name: 'screens/OutfitBuilder (cost per wear)',
    shows: showing(OUTFIT_BUILDER_STATES),
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
    shows: showing(SHOPPING_STATES),
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
    shows: showing(SHOPPING_STATES, 'empty'),
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
    shows: showing(SHOPPING_STATES),
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
    shows: showing(SHOPPING_STATES),
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
    shows: showing(SHOPPING_STATES),
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
    shows: showing(SHOPPING_STATES),
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
    shows: showing(EXPORT_STATES),
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
    shows: showing(EXPORT_STATES),
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
    shows: showing(EXPORT_STATES),
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
    shows: showing(EXPORT_STATES, 'empty'),
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
    shows: showing(EXPORT_STATES, 'empty'),
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
    shows: showing(MEASURE_STATES, 'empty'),
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
    shows: showing(MEASURE_STATES),
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
    shows: showing(WEAR_STATES),
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
    shows: showing(WARDROBE_STATES),
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
     *
     * WITH THE ROUTE'S OWN PROPS (F-221). The route passes `onScan` as well as `onAddGarment`, so
     * an empty wardrobe shows 27's card: its body and Scan First Garment, which opens the Lens.
     * Given `onAddGarment` alone, this drew the older add-a-garment branch, which the app never
     * shows when it is empty, and 27's card went unswept. The inventory sweep found it.
     */
    name: 'screens/Wardrobe (nothing in it)',
    shows: showing(WARDROBE_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wardrobe
          store={fakeBrowseStore([])}
          onAddGarment={() => undefined}
          onScan={() => undefined}
        />,
        theme,
      ),
  },
  {
    /*
     * THE LOOKBOOK CHOICE, GARMENTS CHOSEN (F-238, ADR-0136 D1): `10.source`'s pill with its dot,
     * directly above the grid, and the grid as it was. The choice is the one new thing here.
     */
    name: 'screens/Wardrobe (the lookbook choice)',
    shows: showing(WARDROBE_STATES),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wardrobe
          store={fakeBrowseStore(OUTFIT_WARDROBE)}
          onAddGarment={() => undefined}
          onOpenOutfit={() => undefined}
          onOpenShopping={() => undefined}
          lookbook={{ outfits: [LOOKBOOK_OUTFIT], onRemove: () => undefined }}
        />,
        theme,
      ),
  },
  {
    /*
     * THE LOOKBOOK (F-238, ADR-0136 D2): a saved outfit read back — a locked slot with 13's badge,
     * a Lens-captured colour drawn from its stored provenance, the stored score with the words that
     * say it was not recomputed, and the versions of an older build.
     */
    name: 'screens/Wardrobe (lookbook)',
    shows: showing(WARDROBE_STATES),
    kind: 'static',
    sampleValues: [...SAMPLE_HEXES, ...LOOKBOOK_OUTFIT.items.map((i) => i.color.hex)],
    render: (_state, theme) =>
      draw(
        <Wardrobe
          store={fakeBrowseStore(OUTFIT_WARDROBE)}
          onAddGarment={() => undefined}
          onOpenOutfit={() => undefined}
          lookbook={{ outfits: [LOOKBOOK_OUTFIT], onRemove: () => undefined }}
          initialView="lookbook"
        />,
        theme,
      ),
  },
  {
    /* NOTHING SAVED (F-238, ADR-0136 D3): 00's caption; the Outfit Lab button is on the screen. */
    name: 'screens/Wardrobe (lookbook, none saved)',
    shows: showing(WARDROBE_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wardrobe
          store={fakeBrowseStore(OUTFIT_WARDROBE)}
          onAddGarment={() => undefined}
          onOpenOutfit={() => undefined}
          lookbook={{ outfits: [], onRemove: () => undefined }}
          initialView="lookbook"
        />,
        theme,
      ),
  },
  {
    /*
     * AN EMPTY WARDROBE WITH A SAVED OUTFIT (F-238, ADR-0136 D3): the choice is drawn above 27's
     * card, so the outfit stays reachable — and removable — with every garment gone.
     */
    name: 'screens/Wardrobe (nothing in it, a lookbook)',
    shows: showing(WARDROBE_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Wardrobe
          store={fakeBrowseStore([])}
          onAddGarment={() => undefined}
          onScan={() => undefined}
          lookbook={{ outfits: [LOOKBOOK_OUTFIT], onRemove: () => undefined }}
        />,
        theme,
      ),
  },
  {
    /*
     * The same screen with NO route supplied, which is the other member of `EmptyState`'s
     * union. It renders prose and no control; both branches are reachable, so both are drawn.
     */
    name: 'screens/Wardrobe (nothing in it, nowhere to go)',
    shows: showing(WARDROBE_STATES, 'empty'),
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
    shows: showing(WARDROBE_STATES),
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
    shows: showing(WARDROBE_STATES, 'empty'),
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
    shows: showing(WARDROBE_STATES),
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
    shows: showing(PALETTE_STUDIO_STATES, 'empty'),
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
    shows: showing(PALETTE_STUDIO_STATES),
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
    shows: showing(PALETTE_STUDIO_STATES),
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
    shows: showing(LENS_STATES, 'denied'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(<Lens permission="undetermined" onRequestPermission={() => undefined} />, theme),
  },
  {
    name: 'screens/Lens (denied)',
    shows: showing(LENS_STATES, 'denied'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    // With the way out the route always gives (F-236's review, S1): the card's action is checked
    // in both themes and both locales, its hint included.
    render: (_state, theme) =>
      draw(<Lens permission="denied" onOpenSettings={() => undefined} />, theme),
  },
  {
    /*
     * GRANTED, AND STILL NOTHING TO SHOW — the state a person sees when the camera is live and
     * the frame output produces no reading. It exists as its own subject because the diagnostic
     * line is the only thing on this screen that is not the product's own voice, and it still
     * has to meet the same contrast and type rules as everything else.
     */
    name: 'screens/Lens (waiting, with a diagnostic)',
    shows: showing(LENS_STATES),
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
    shows: showing(LENS_STATES),
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
     * A READING AGAINST AN ARMED TARGET (F-201). A tree none of the other Lens subjects draws:
     * the distance with its unit and space, three axes each with a word AND a number, and the
     * hue arc. Without it the whole panel would be measured by nothing.
     */
    name: 'screens/Lens (against a target)',
    shows: showing(LENS_STATES),
    kind: 'static',
    sampleValues: [...SAMPLE_HEXES, displayFromOklch(readingOklch(SAMPLE_READING)).hex],
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          capture={SAMPLE_READING}
          target={{
            hex: BOTH_COST_BRANCHES.derived.hex,
            oklch: [
              BOTH_COST_BRANCHES.derived.oklch[0],
              BOTH_COST_BRANCHES.derived.oklch[1],
              BOTH_COST_BRANCHES.derived.oklch[2],
            ],
            color: colorFor(BOTH_COST_BRANCHES.entry),
            label: BOTH_COST_BRANCHES.entry.name.en,
            slug: BOTH_COST_BRANCHES.entry.slug,
          }}
          poles={ruleSet().poles}
          onCapture={() => undefined}
          onModeChange={() => undefined}
        />,
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
    shows: showing(LENS_STATES),
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
    shows: showing(LENS_STATES, 'working'),
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
    shows: showing(LENS_STATES),
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
    shows: showing(LENS_STATES),
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
    shows: showing(LENS_STATES),
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
    shows: showing(LENS_STATES),
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
    shows: showing(LENS_STATES),
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
  {
    /*
     * NOTHING MATCHES THE SEARCH (F-236): 00's caption with its hint, the field that would change
     * it on the same screen.
     */
    name: 'screens/Atlas (nothing matches)',
    shows: showing(ATLAS_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Atlas initialQuery="zzqx" />, theme),
  },
  {
    /*
     * THE PHRASE FOUND NOTHING (F-236): 00's caption with the reason, under the field that would
     * change it.
     */
    name: 'screens/Finder (the phrase found nothing)',
    shows: showing(FINDER_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Finder initialQuery="zzqx" />, theme),
  },
  {
    /*
     * A COLOUR THIS CORPUS DOES NOT HOLD (F-236): 00's caption, the way out the header's back. The
     * witness ADR-0129 asks for: the screen declares the condition, so a subject draws it.
     */
    name: 'screens/Compare (not in this corpus)',
    shows: showing(COMPARE_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Compare initialA="no-such-colour" initialB={PAIR_B} />, theme),
  },
  {
    /*
     * A COLOUR THIS CORPUS DOES NOT HOLD (F-236): 00's caption, the way out the header's back. The
     * witness ADR-0129 asks for: the screen declares the condition, so a subject draws it.
     */
    name: 'screens/ColourCard (not in this corpus)',
    shows: showing(COLOUR_CARD_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<ColourCard slug="no-such-colour" />, theme),
  },
  {
    /*
     * A COLOUR THIS CORPUS DOES NOT HOLD (F-236): 00's caption, the way out the header's back. The
     * witness ADR-0129 asks for: the screen declares the condition, so a subject draws it.
     */
    name: 'screens/ColourDetail (not in this corpus)',
    shows: showing(COLOUR_DETAIL_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<ColourDetail slug="no-such-colour" />, theme),
  },
  {
    /*
     * A COLOUR THIS CORPUS DOES NOT HOLD (F-236): 00's caption, the way out the header's back. The
     * witness ADR-0129 asks for: the screen declares the condition, so a subject draws it.
     */
    name: 'screens/Contemporary (not in this corpus)',
    shows: showing(CONTEMPORARY_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Contemporary slug="no-such-colour" />, theme),
  },
  {
    /*
     * A COLOUR THIS CORPUS DOES NOT HOLD (F-236): 00's caption, the way out the header's back. The
     * witness ADR-0129 asks for: the screen declares the condition, so a subject draws it.
     */
    name: 'screens/Wear (not in this corpus)',
    shows: showing(WEAR_STATES, 'empty'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) => draw(<Wear slug="no-such-colour" profile={WEARER} />, theme),
  },
  {
    /*
     * A POOR CAPTURE, REFUSED (F-236, D1): 27's refused card — the check, its threshold and the fix —
     * with the result sheet shut, so no band, no conditions and no confidence.
     */
    name: 'screens/Lens (a capture refused)',
    shows: showing(LENS_STATES, 'refused'),
    kind: 'static',
    sampleValues: SAMPLE_HEXES,
    render: (_state, theme) =>
      draw(
        <Lens
          permission="granted"
          capture={REFUSED_READING}
          onCapture={() => undefined}
          onModeChange={() => undefined}
          onDismiss={() => undefined}
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
 * EVERY SCREEN DECLARES WHAT IT SHOWS, AND THE REGISTRY HOLDS IT TO THAT (F-236, ADR-0129 §3).
 *
 * Both directions: every condition a screen declares has a subject rendering its state, and every
 * subject rendering a state declares it. And every module in `src/screens/` is in `DECLARED` — so a
 * new screen is named here until it says what it shows, even when the answer is "none".
 */

/**
 * THE CVD PREVIEW, OVER EVERY SCREEN (F-240, ADR-0131 D10).
 *
 * Each subject is rendered in Standard and then in each preview mode, and the two trees walked
 * together: every painted value must be the engine's simulation of the Standard one, and nothing
 * else may change — no printed hex, no name, no layout. Sumi for every subject; a handful again on a
 * palette SEEDED from a device accent, which no build-time name refers to and which the preview has
 * to reach all the same (F-225's note on this feature).
 */
describe('the CVD preview paints every screen through the engine, and changes nothing else (F-240)', () => {
  const MODES = ['protanopia', 'deuteranopia', 'tritanopia'] as const;

  afterEach(() => {
    drawVision = 'standard';
    drawPalette = null;
  });

  const mismatches = (subject: ConformanceSubject, theme: Theme): string[] => {
    const out: string[] = [];
    for (const state of REQUIRED_STATES[subject.kind]) {
      drawVision = 'standard';
      const standard = subject.render(state, theme);
      if (standard === null) continue;
      for (const mode of MODES) {
        drawVision = mode;
        const preview = subject.render(state, theme);
        drawVision = 'standard';
        if (preview === null) {
          out.push(`${state}/${mode}: renders nothing`);
          continue;
        }
        for (const finding of previewMismatches(standard, preview, mode))
          out.push(`${state}/${mode}: ${finding}`);
      }
    }
    return out;
  };

  it.each(SCREENS.map((s) => [s.name, s] as const))(
    '%s, in Sumi',
    (_name, subject) => {
      expect(mismatches(subject, 'dark')).toStrictEqual([]);
    },
    60_000,
  );

  it('reaches a palette seeded from a device accent, which no build-time name refers to', () => {
    const seeded = deviceTheme({ read: () => ({ l: 0.55, c: 0.09, h: 258 }) }, 'dark');
    expect(seeded.kind).toBe('applied');
    if (seeded.kind !== 'applied') return;
    drawPalette = { name: seeded.name, mode: seeded.mode, colors: seeded.colors };
    const subjects = SCREENS.filter((s) =>
      ['screens/Home', 'screens/Wardrobe', 'screens/ColourDetail', 'screens/VisionStrip'].includes(
        s.name,
      ),
    );
    expect(subjects).toHaveLength(4);
    for (const subject of subjects)
      expect({ [subject.name]: mismatches(subject, 'dark') }).toStrictEqual({ [subject.name]: [] });
  }, 120_000);
});

describe('every screen declares its data conditions', () => {
  /** Each screen module's declaration, by file name. Read from the modules, never restated. */
  const DECLARED: Readonly<Record<string, ScreenStates | undefined>> = {
    Home: HOME_STATES,
    Atlas: ATLAS_STATES,
    ColourDetail: COLOUR_DETAIL_STATES,
    Compare: COMPARE_STATES,
    Combinations: COMBINATIONS_STATES,
    Wear: WEAR_STATES,
    Contemporary: CONTEMPORARY_STATES,
    PaletteStudio: PALETTE_STUDIO_STATES,
    Preferences: PREFERENCES_STATES,
    AddGarment: ADD_GARMENT_STATES,
    Wardrobe: WARDROBE_STATES,
    Export: EXPORT_STATES,
    OutfitBuilder: OUTFIT_BUILDER_STATES,
    Shopping: SHOPPING_STATES,
    Measure: MEASURE_STATES,
    Finder: FINDER_STATES,
    ColourCard: COLOUR_CARD_STATES,
    ProfileSetup: PROFILE_SETUP_STATES,
    Lens: LENS_STATES,
  };

  /** The state roots a tree renders, found by the fixed `testID`s every state carries. */
  const ROOT_KIND = new Map<string, StateKind>(
    (Object.entries(STATE_TEST_IDS) as [StateKind, string][]).map(([kind, id]) => [id, kind]),
  );
  const rootsIn = (node: TestNode, out = new Set<StateKind>()): Set<StateKind> => {
    const testID = node.props['testID'];
    const kind = typeof testID === 'string' ? ROOT_KIND.get(testID) : undefined;
    if (kind !== undefined) out.add(kind);
    for (const child of node.children ?? []) if (typeof child !== 'string') rootsIn(child, out);
    return out;
  };

  /** A subject's screen module: `screens/Home (first run)` → `Home`. */
  const screenOf = (name: string): string => name.replace(/^screens\//u, '').replace(/ \(.*$/u, '');

  interface Rendered {
    readonly name: string;
    readonly shows: readonly StateKind[] | undefined;
    readonly renders: ReadonlySet<StateKind>;
  }

  /** Every way the registry and the declarations disagree, in words that name the screen. */
  function disagreements(
    files: readonly string[],
    declared: Readonly<Record<string, ScreenStates | undefined>>,
    subjects: readonly Rendered[],
  ): string[] {
    const out: string[] = [];
    for (const file of files)
      if (declared[file] === undefined) out.push(`${file}: exports no STATES`);
    for (const subject of subjects) {
      const screen = screenOf(subject.name);
      const states = declared[screen] ?? {};
      const declares = shownBy(states);
      if (declares.length > 0 && subject.shows === undefined)
        out.push(
          `${subject.name}: its screen declares a condition, and it does not say what it shows`,
        );
      const shows = subject.shows ?? [];
      for (const kind of subject.renders)
        if (!shows.includes(kind))
          out.push(`${subject.name}: renders ${kind}, and does not declare it`);
      for (const kind of shows) {
        if (!subject.renders.has(kind))
          out.push(`${subject.name}: claims ${kind}, and does not render it`);
        if (!declares.includes(kind))
          out.push(`${subject.name}: shows ${kind}, which ${screen} does not declare`);
      }
    }
    for (const [screen, states] of Object.entries(declared))
      for (const condition of Object.keys(CONDITION_STATE) as DataCondition[]) {
        const kind = states?.[condition];
        if (kind === undefined) continue;
        const witnessed = subjects.some(
          (sub) =>
            screenOf(sub.name) === screen &&
            (sub.shows ?? []).includes(kind) &&
            sub.renders.has(kind),
        );
        if (!witnessed)
          out.push(`${screen}: declares ${condition} (${kind}), and no subject renders it`);
      }
    return out;
  }

  const files = readdirSync(join(__dirname, '../src/screens'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => f.replace(/\.tsx$/u, ''));

  /** Each subject in its first required state, light: where a screen's data condition is drawn. */
  const rendered = (): Rendered[] =>
    SCREENS.map((subject) => {
      const state = REQUIRED_STATES[subject.kind][0] ?? 'default';
      const tree = subject.render(state, 'light');
      return {
        name: subject.name,
        shows: subject.shows,
        renders: tree === null ? new Set() : rootsIn(tree),
      };
    });

  it('agrees with the registry, in both directions, for every screen', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(disagreements(files, DECLARED, rendered())).toStrictEqual([]);
  });

  it('witnesses every state at least once, so the agreement is not over nothing', () => {
    const all = rendered();
    for (const kind of ['empty', 'working', 'refused', 'denied'] as const)
      expect({ [kind]: all.some((r) => r.renders.has(kind)) }).toStrictEqual({ [kind]: true });
  });

  it('DECOY — a module without the export is named', () => {
    expect(disagreements([...files, 'Ghost'], DECLARED, rendered())).toContain(
      'Ghost: exports no STATES',
    );
  });

  it('DECOY — a declared condition with no subject is named', () => {
    expect(disagreements(['Ghost'], { Ghost: { pending: 'working' } }, [])).toStrictEqual([
      'Ghost: declares pending (working), and no subject renders it',
    ]);
  });

  it('DECOY — a subject that renders a state it does not declare is named', () => {
    const tree = render(
      <ThemeProvider theme="light">
        <EmptyState message="Nothing here." resolvedHere />
      </ThemeProvider>,
    ).toJSON() as TestNode;
    const subject: Rendered = { name: 'screens/Ghost', shows: [], renders: rootsIn(tree) };
    expect(disagreements(['Ghost'], { Ghost: { absent: 'empty' } }, [subject])).toContain(
      'screens/Ghost: renders empty, and does not declare it',
    );
  });

  it('DECOY — a subject that claims a state it does not render is named', () => {
    const subject: Rendered = { name: 'screens/Ghost', shows: ['empty'], renders: new Set() };
    expect(disagreements(['Ghost'], { Ghost: { absent: 'empty' } }, [subject])).toContain(
      'screens/Ghost: claims empty, and does not render it',
    );
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
    // F-236: an empty wardrobe with a way out is 27's card, so its heading is the catalogue's own.
    expect(drawn).toContain(t('ja', 'wardrobe.empty.title'));
    expect(drawn).not.toContain(t('en', 'wardrobe.empty.title'));
  });

  it('produces no findings, in either theme', () => {
    expect(formatFindings(checkAll(SCREENS))).toBe('');
  });

  // The two themes 15 draws as one swatch each (F-225, ADR-0107): every screen, rendered on them.
  it('produces no findings on the derived themes, Slate and Obsidian', () => {
    expect(formatFindings(checkAll(SCREENS, ['slate.dark', 'obsidian.dark']))).toBe('');
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
  // The scan lives in @irodora/ui/testing since F-235, where the conformance suite reads it too.
  const numericNodes = (node: TestNode): TestNode[] => tabularNodes(node, nativeNumericFeature);

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
     * THE EMPTY WARDROBE (27's card), since F-242. Home was this decoy until its first run began
     * printing 01's OKLCh line, which is correctly `numeric`. The empty wardrobe prints a heading,
     * a sentence and an action and no figure — a real screen rendering real text without the
     * prop, which is what this decoy needs to be worth anything. Its text is asserted first, so a
     * tree that rendered nothing could not pass.
     */
    const subject = SCREENS.find((s) => s.name === 'screens/Wardrobe (nothing in it)');
    if (subject === undefined) throw new Error('the wardrobe empty subject is gone');
    const tree = subject.render('default', 'light');
    if (tree === null) throw new Error('the wardrobe empty subject rendered nothing');
    expect(renderedTexts(tree).length).toBeGreaterThan(2);
    expect(numericNodes(tree)).toHaveLength(0);
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
  /**
   * A string that CARRIES a figure: any digit at all.
   *
   * It matched only a string that was nothing but a quantity until F-226's review, which found the
   * counts on Preferences ("Kept 3 · Passed 1 · Net +2 · Weight ×1.2", stacked row under row — C9's
   * column case exactly), the Atlas's "Showing 12 / 480" and four more set in proportional digits,
   * because each figure sat inside a sentence. Tabular digits change only the digits' widths, so a
   * mixed string loses nothing by being marked, and "every number" means every number.
   */
  //
  // Two things a digit can be that are NOT a figure, each excluded by rule rather than by string:
  //   - part of a NAME or an identifier: a standard space or unit (D65, ΔE00, WCAG 2.2, sRGB,
  //     Display-P3) or a hyphenated id (IRO-ED-001, ed-002, F-019). Nobody reads "65" in D65 as a
  //     quantity.
  //   - inside running PROSE: eight or more words. A figure in a sentence is read, not scanned down
  //     a column, which is the case C9 is about — and a translation that happens to contain a
  //     digit ("Android 12 and later") must not make its Text a column of figures.
  // The definitions above live in @irodora/ui/testing since F-235 (carriesFigure, figureNodes),
  // shared with the conformance suite's `ragged-figure` rule.
  /** Every bare figure on a screen that is NOT drawn with tabular digits. */
  const ragged = (screen: TestNode): readonly string[] =>
    raggedFigures(screen, nativeNumericFeature);

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

  /*
   * EVERY REGISTERED SCREEN AND STATE, IN BOTH THEMES (F-226, criterion 3). The block above
   * checks the three instrument surfaces; "every number renders in tabular figures" is a claim
   * about all of them, so it is checked over the registry the conformance sweep renders.
   */
  it('marks every bare figure as tabular on every registered screen and state, in both themes', () => {
    const found: string[] = [];
    let figures = 0;
    for (const subject of SCREENS)
      for (const theme of ['light', 'dark'] as const) {
        const screen = subject.render('default', theme);
        if (screen === null) continue;
        figures += figureNodes(screen).length;
        for (const f of ragged(screen)) found.push(`${subject.name} (${theme}): ${f}`);
      }
    // Found something first: a sweep over no figures agrees with anything.
    expect(figures).toBeGreaterThan(SCREENS.length);
    expect(found).toStrictEqual([]);
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
      <Text size="label" color="foreground">
        4.23
      </Text>,
      'light',
    );
    expect(ragged(planted)).toEqual(['4.23']);

    // And the same node, marked, is not reported — or the check would flag correct code.
    const marked = draw(
      <Text size="label" color="foreground" numeric>
        4.23
      </Text>,
      'light',
    );
    expect(ragged(marked)).toHaveLength(0);

    // And a figure inside a sentence, which the matcher missed until F-226's review.
    const mixed = draw(
      <Text size="label" color="foreground">
        Showing 12 / 480
      </Text>,
      'light',
    );
    expect(ragged(mixed)).toEqual(['Showing 12 / 480']);

    // And the two exclusions are rules that DISCRIMINATE: a name's digits and a sentence's are not
    // figures, but a count beside either one still is.
    expect(carriesFigure('CIELAB (D65)')).toBe(false);
    expect(carriesFigure('IRO-ED-001')).toBe(false);
    expect(carriesFigure('This phone does not offer a colour; Android 12 and later do.')).toBe(
      false,
    );
    expect(carriesFigure('ΔE00 0.42')).toBe(true);
    expect(carriesFigure('Reviewed by ed-002 on 2026-08-24')).toBe(true);

    // And a hex, which the matcher reads as a figure since F-226.
    const hex = draw(
      <Text size="label" color="foreground">
        #5B6B78
      </Text>,
      'light',
    );
    expect(ragged(hex)).toEqual(['#5B6B78']);
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
      draw(<Preferences store={preferenceStore()} appearance="washi" />, 'dark'),
    );
    // The field AND the value. "Theme" does not say what is chosen; "Washi Minimal" does not
    // say what it is.
    const trigger = labels.find((l) => l.startsWith(`${en['appearance.theme']}: `));
    expect(trigger).toBe(`${en['appearance.theme']}: ${en['appearance.theme.washi']}`);
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
      <Preferences store={preferenceStore()} appearance="system" initialThemeListOpen />,
      'dark',
    );
    const nodes: TestNode[] = [];
    const walk = (n: TestNode): void => {
      nodes.push(n);
      for (const c of n.children ?? []) if (typeof c !== 'string') walk(c);
    };
    walk(tree);
    const device = nodes.find((n) => n.props['accessibilityLabel'] === en['appearance.device']);
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

  /**
   * A reading with something to say about itself: a fair capture, mixed light, an instruction.
   * FAIR rather than poor since F-236: a poor capture is refused and never reaches the readout.
   */
  const FAIR: LensReading = {
    rgb: [0.4, 0.38, 0.36],
    space: 'display-p3',
    usableSamples: 1100,
    variance: 0.09,
    illumination: 'mixed',
    quality: 'fair',
    confidence: 0.42,
    instruction: 'Move closer and fill the marked area.',
    // Two checks failed — which is what makes it fair — the samples first, whose instruction this is.
    qualityFailures: ['samples', 'evenness'],
  };
  /** The same capture with a third check failed: poor, so refused (F-236, D1). */
  const POOR: LensReading = {
    ...FAIR,
    quality: 'poor',
    confidence: 0.21,
    qualityFailures: ['samples', 'evenness', 'singleColour'],
  };

  const shown = (reading: LensReading): string =>
    textOf(draw(<Lens permission="granted" capture={reading} />, 'light')).join(' \u0000 ');

  it('shows the quality band — the FR-18 word that reached no screen until now', () => {
    // The engine has classified every capture since R2 and nothing rendered it. What the
    // screen showed instead was `confidence.toFixed(2)`, whose own type says it is never a
    // probability. This is the assertion that the word arrives.
    expect(shown(FAIR)).toContain(en['lens.quality.fair']);
    expect(shown(SAMPLE_READING)).toContain(en['lens.quality.excellent']);
  });

  it('refuses a poor capture: 27’s refused card, the check, its threshold and the fix — and no readout (F-236)', () => {
    // With a shutter to retry through, as the route always gives one.
    const text = textOf(
      draw(<Lens permission="granted" capture={POOR} onCapture={() => undefined} />, 'light'),
    ).join(' \u0000 ');
    const { title, body } = refusalText('samples', (key) => en[key], 'latin');
    expect(text).toContain(title);
    expect(text).toContain(body);
    expect(text).toContain(en['lens.refused.retry']);
    // The sheet stays shut: no band, no conditions, and no confidence in any format (D10).
    expect(text).not.toContain(en['lens.quality.poor']);
    // (Not the quality label itself, which is the word Capture, as in Retry Capture.)
    // The closed sheet keeps its title in the tree; what it never builds is its contents.
    for (const label of [en['lens.light'], en['lens.space']]) expect(text).not.toContain(label);
    expect(text).not.toMatch(/\d+% Confidence|0\.21/u);
    // A reading refused, never a measurement (E2).
    expect(title).toBe('Reading Refused: Too Little Fabric');
  });

  it('prints no confidence on a refused capture in Japanese either (D10, F-236 review M9)', () => {
    mockLanguageTag = 'ja-JP';
    try {
      const text = textOf(
        draw(<Lens permission="granted" capture={POOR} onCapture={() => undefined} />, 'light'),
      ).join(' ');
      // The refusal is drawn in Japanese, so a missing confidence is not a missing render.
      expect(text).toContain(t('ja', 'lens.refused.retry'));
      expect(text).not.toContain(t('ja', 'confidence.word'));
      expect(text).not.toMatch(/\d+%|0\.21/u);
    } finally {
      mockLanguageTag = DEFAULT_LANGUAGE_TAG;
    }
  });

  it('shows no working card while the photo picker is open: the button is busy, nothing is analysed (F-236 review, B1)', () => {
    const text = textOf(
      draw(<Lens permission="granted" opening onOpenPhoto={() => undefined} />, 'light'),
    ).join(' ');
    expect(text).toContain(en['lens.opening']);
    for (const claim of [
      en['lens.working.title'],
      en['lens.working.body'],
      en['lens.pipeline.frame'],
      en['lens.pipeline.convert'],
    ])
      expect(text).not.toContain(claim);
  });

  it('asks before the first request and opens settings once denied, each to its own handler (F-236 review, S1)', () => {
    const asks: string[] = [];
    const lens = (permission: 'undetermined' | 'denied') =>
      render(
        <ThemeProvider theme="light">
          <Lens
            permission={permission}
            onRequestPermission={() => asks.push('allow')}
            onOpenSettings={() => asks.push('settings')}
          />
        </ThemeProvider>,
      );

    const undetermined = lens('undetermined');
    fireEvent.press(undetermined.getByLabelText(en['lens.permission.allow']));
    // DECOY — not swapped: nothing in settings to open before the first ask.
    expect(undetermined.queryByLabelText(en['lens.permission.openSettings'])).toBeNull();
    undetermined.unmount();

    const denied = lens('denied');
    const open = denied.getByLabelText(en['lens.permission.openSettings']);
    expect(open.props['accessibilityHint']).toBe(en['lens.permission.openSettingsHint']);
    fireEvent.press(open);
    // DECOY — and once denied, asking again would do nothing the platform allows.
    expect(denied.queryByLabelText(en['lens.permission.allow'])).toBeNull();
    denied.unmount();

    expect(asks).toStrictEqual(['allow', 'settings']);
  });

  it('DECOY — the camera waiting for a frame does show the working card', () => {
    const text = textOf(
      draw(<Lens permission="granted" awaiting onCapture={() => undefined} />, 'light'),
    ).join(' ');
    expect(text).toContain(en['lens.working.title']);
    expect(text).toContain(en['lens.pipeline.frame']);
  });

  it('says what Retry Capture does: a camera reads again, a photo stays open for another tap (F-236)', () => {
    const PHOTO = {
      uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=',
      width: 1200,
      height: 900,
      at: { x: 0.4, y: 0.6 },
    };
    const hintOf = (tree: ReturnType<typeof render>): unknown =>
      tree.getByLabelText(en['lens.refused.retry']).props['accessibilityHint'];
    const camera = render(
      <ThemeProvider theme="light">
        <Lens permission="granted" capture={POOR} onCapture={() => undefined} />
      </ThemeProvider>,
    );
    expect(hintOf(camera)).toBe(en['lens.refused.retryHint']);
    camera.unmount();
    const photo = render(
      <ThemeProvider theme="light">
        <Lens
          permission="granted"
          capture={POOR}
          photo={PHOTO}
          onCapture={() => undefined}
          onDismiss={() => undefined}
        />
      </ThemeProvider>,
    );
    // DECOY: the camera's hint would be wrong here — the photo is not taken again.
    expect(hintOf(photo)).toBe(en['lens.refused.retryPhotoHint']);
    expect(hintOf(photo)).not.toBe(en['lens.refused.retryHint']);
    photo.unmount();
  });

  it('names all three conditions, and the value after them (FR-17)', () => {
    const text = shown(FAIR);
    for (const label of [en['lens.quality'], en['lens.light'], en['lens.space']])
      expect(text).toContain(label);
    expect(text).toContain(en['lens.light.mixed']);
    expect(text).toContain(en['lens.space.displayP3']);

    // ORDER, not merely presence. FR-17's requirement is that the classification is shown
    // BEFORE the result, "because a number shown first has already been read by the time its
    // qualifier arrives" — so a test that only checked presence would pass on the arrangement
    // the requirement exists to forbid.
    expect(text.indexOf(en['lens.quality.fair'])).toBeLessThan(text.indexOf('42% Confidence'));
  });

  it('keeps the confidence figure in its one format, with what the number is (F-222)', () => {
    const text = shown(FAIR);
    // Kept rather than hidden: it is the honest ceiling FR-15 produces, and removing it would
    // conceal how far the engine is willing to go. ADR-0124 gives it one format — the percentage
    // 03 draws, floored — and the sentence under it says it is not the chance the colour is right.
    expect(text).toContain('42% Confidence');
    expect(text).toContain(en['confidence.meaning']);
    // DECOY: the old bare figure is gone, so a second format cannot survive beside the first.
    expect(text).not.toContain('0.42');
  });

  it('gives the instruction as a next step, not as a warning (criterion 4)', () => {
    const text = shown(FAIR);
    expect(text).toContain(en['lens.next']);
    expect(text).toContain(FAIR.instruction);
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
    // 27's denied card says why (F-236).
    expect(text).toContain(en['lens.permission.title']);
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

/**
 * THE CONFORMANCE SWEEP (F-204, NFR-25).
 *
 * The release built a design system and adopted it across twenty-one routes. This produces the
 * **evidence** that it holds — an artefact somebody can read, at
 * `.harness/verification/conformance-sweep.json`, rather than an assertion in a commit message.
 *
 * ## It lives here, in the file that owns the registry
 *
 * A separate file would have to import `SCREENS`, and importing a test file EXECUTES it — the
 * first draft ran 209 tests as a side effect of asking how many subjects there were. Extracting
 * a 1400-line registry and its fixtures to make the import clean is a large mechanical change to
 * the file every screen guarantee runs through, for the sake of a filename.
 *
 * ## Eight conditions
 *
 * `{light, dark} × {en, ja} × {motion, reduced}`.
 *
 * Reduced motion is drivable at all because `useMotion` reads `AccessibilityInfo` rather than
 * reanimated's `useReducedMotion` — F-144's docblock says why: *"reduced motion is asserted
 * rather than described, so the mechanism has to be one a test can turn on and off."* That
 * decision, two releases ago, is what makes this criterion checkable.
 *
 * ## CVD is CITED, not re-simulated
 *
 * Gate 9 runs every declared pairing through WCAG, APCA and **eleven CVD severities** in every
 * declared palette. A second simulation here would be a second answer to one question (E-005).
 */
/**
 * THE INSET OF EVERY BOX ON EVERY SCREEN, PINNED (F-210).
 *
 * `Surface` defaults its padding to `md` and `Card` defaults to `lg`, so converting one to the
 * other without an explicit prop moves a screen by 4pt in silence. Twenty-four sites converted
 * at once, on a workstation with no device, is exactly the change that needs a number rather
 * than a look.
 *
 * **THE FIXTURE WAS CAPTURED BEFORE THE CONVERSION.** That ordering is the assertion: one
 * written afterwards would agree with whatever the edit did
 * [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]]. It covers every subject,
 * not only the converted screens, so an inset moved anywhere else fails here too.
 *
 * WHAT IT DOES NOT SEE: rhythm. `Card` draws a header box, a hairline and a body box where a
 * `Surface` drew one box with a `Stack` gap. The insets are equal and the screen is not the
 * same [[a-test-tree-has-no-height]]. That is an attestation, not a claim.
 */
/**
 * NO SUBJECT ASKS FOR A SHARE OF A HEIGHT ITS PARENT DOES NOT HAVE (F-213, NFR-25).
 *
 * F-211 shipped a blank Atlas past every gate here — sixteen of them, and a conformance sweep
 * over 72 subjects in 8 conditions reporting zero findings. jest has no layout engine, so the
 * zero-height list rendered all 120 of its rows into the tree and every assertion about them
 * passed [[a-test-tree-has-no-height]].
 *
 * `brokenFlexChains` is a STATIC READING of a rendered tree, and its limits are in its own
 * docblock: a height that arrives at runtime, overflow, the frame of anything a native list
 * draws, and any screen absent from this registry. It catches the common shape, which is not
 * the same claim as "layout is checked".
 */
describe('no subject asks for a share of a height its parent does not have (F-213)', () => {
  it('has subjects, so a clean result cannot mean an empty registry', () => {
    expect(SCREENS.length).toBeGreaterThan(0);
  });

  it('finds no broken flex chain in any registered subject', () => {
    const findings: string[] = [];
    for (const subject of SCREENS)
      for (const theme of ['light', 'dark'] as const) {
        const node = subject.render('default', theme);
        if (node === null) continue;
        for (const found of brokenFlexChains(node))
          findings.push(
            `${subject.name} [${theme}] ${found.path.join(' > ')} asks flex ${String(found.flex)} of <${found.parent}>, which has no height of its own`,
          );
      }

    expect(findings.join(String.fromCharCode(10))).toBe('');
  });

  it('DECOY — the registry actually CONTAINS flex nodes, so zero findings means something', () => {
    /*
     * "No broken chain" and "no chain examined" produce the same verdict. This counts the
     * nodes the rule reasons about — a `flex` or `flexGrow` above zero — so a green run is a
     * statement about screens rather than about an empty walk.
     */
    let flexNodes = 0;
    const count = (n: TestNode | string): void => {
      if (typeof n === 'string') return;
      const style = flattenStyle(n.props['style']);
      const flex = style['flex'] ?? style['flexGrow'];
      if (typeof flex === 'number' && flex > 0) flexNodes += 1;
      for (const child of n.children ?? []) count(child);
    };
    for (const subject of SCREENS) {
      const node = subject.render('default', 'light');
      if (node !== null) count(node);
    }

    expect(flexNodes).toBeGreaterThan(SCREENS.length);
  });
  it('DECOY — the check fires on the shape F-211 shipped, rendered here rather than described', () => {
    /*
     * The registry passing proves nothing about the check unless the check can fail. This is
     * the F-211 tree, built in this file so the assertion above cannot be green because
     * `brokenFlexChains` returns nothing to anybody.
     */
    const planted = {
      type: 'View',
      props: { style: { flex: 1 } },
      children: [
        {
          type: 'Animated.View',
          props: {},
          children: [{ type: 'FlatList', props: { style: { flex: 1 } }, children: null }],
        },
      ],
    };

    expect(brokenFlexChains(planted)).toHaveLength(1);
  });
});
describe('every box keeps the inset it had (F-210)', () => {
  const FIXTURE = `${__dirname}/../../../.harness/verification/screen-insets.json`;

  /** Every `padding` value in a rendered tree, sorted, as a multiset. */
  const insetsOf = (node: TestNode): number[] => {
    const found: number[] = [];
    const visit = (n: TestNode | string): void => {
      // A tree carries TEXT children, which are strings with no props. Reaching for `.props`
      // on one throws, and the throw is what proved the walker was reaching real nodes.
      if (typeof n !== 'object') return;
      const style: unknown = (n.props as { style?: unknown }).style;
      for (const layer of Array.isArray(style) ? style : [style]) {
        if (layer === null || typeof layer !== 'object') continue;
        const pad: unknown = (layer as Record<string, unknown>)['padding'];
        if (typeof pad === 'number') found.push(pad);
      }
      for (const child of n.children ?? []) visit(child);
    };
    visit(node);
    return found.sort((a, b) => a - b);
  };

  const capture = (): Record<string, number[]> => {
    const out: Record<string, number[]> = {};
    for (const subject of SCREENS) {
      const node = subject.render('default', 'light');
      if (node !== null) out[subject.name] = insetsOf(node);
    }
    return out;
  };

  it('has subjects, so an empty capture cannot pass as agreement', () => {
    expect(Object.keys(capture()).length).toBeGreaterThan(0);
  });

  const before = (): Record<string, number[]> =>
    (JSON.parse(readFileSync(FIXTURE, 'utf8')) as { insets: Record<string, number[]> }).insets;

  it('introduces no inset value, and loses none', () => {
    /*
     * NOT THE MULTISET, AND THE FIRST VERSION OF THIS GOT IT WRONG. A `Card` draws a header
     * box AND a body box where a `Surface` drew one, so the NUMBER of padded boxes necessarily
     * grows — pinning the count fired on a conversion that had changed no spacing at all.
     *
     * What criterion 3 asks is that the VALUE each site renders is unchanged. So: the set of
     * distinct insets must be identical, and every value must still occur at least as often as
     * it did. Together those refuse the two things that can go wrong — a new inset appearing
     * (the `md` → `lg` default drift, which is the whole risk) and a box losing its padding.
     */
    const now = capture();
    const expected = before();

    for (const [name, was] of Object.entries(expected)) {
      const is = now[name] ?? [];
      // PER SUBJECT, so a failure names the screen rather than reporting "objects differ".
      expect({ [name]: [...new Set(is)].sort((a, b) => a - b) }).toStrictEqual({
        [name]: [...new Set(was)].sort((a, b) => a - b),
      });
      const count = (xs: readonly number[], v: number): number => xs.filter((x) => x === v).length;
      for (const v of new Set(was))
        expect({ [`${name} @${String(v)}`]: count(is, v) >= count(was, v) }).toStrictEqual({
          [`${name} @${String(v)}`]: true,
        });
    }
    expect(Object.keys(now).sort()).toStrictEqual(Object.keys(expected).sort());
  });

  it('DECOY — the comparison can FAIL, asserted against a mutated expectation', () => {
    /*
     * THIS REPLACED A DECOY THAT HAD DONE ITS JOB, and the replacement is recorded rather than
     * done quietly. F-210's version asserted that at least one subject now carried MORE padded
     * boxes than the fixture — which proved the Surface-to-Card conversion had actually
     * happened, and stopped the pin passing on a branch where nothing was converted.
     *
     * F-214 re-captured the fixture, so the tree and the expectation now agree exactly and
     * nothing can have grown. Keeping that assertion would have meant keeping a check that can
     * only fail, and deleting it would have left the pin with no evidence it can fail at all.
     *
     * So the question changes to the one that is still live: **can this comparison go red?** A
     * fixture regenerated to make a red test green is the failure mode now, and a comparison
     * that agrees with everything is what that looks like from the inside.
     */
    const now = capture();
    const expected = before();
    const [name, was] = Object.entries(expected).find(([, v]) => v.length > 0) ?? [];
    expect(name).toBeDefined();
    expect(was).toBeDefined();

    // The same subject with one inset removed must not satisfy the relation the pin asserts.
    const mutated = (was ?? []).slice(1);
    const is = now[name ?? ''] ?? [];
    const countOf = (xs: readonly number[], v: number): number => xs.filter((x) => x === v).length;
    const removed = (was ?? [])[0] ?? 0;
    expect(countOf(is, removed)).toBeGreaterThan(countOf(mutated, removed));
  });

  it('DECOY — the capture reads real numbers, not an empty tree everywhere', () => {
    // Without this, a walker that found nothing would match a fixture of empty arrays and
    // report perfect agreement about no padding at all.
    const now = capture();
    const total = Object.values(now).reduce((sum, v) => sum + v.length, 0);
    expect(total).toBeGreaterThan(SCREENS.length);
  });
});
/**
 * EVERY ELEMENT AN ENROLLED SURFACE'S INVENTORY RECORDS IS DRAWN (F-221 criterion 4, ADR-0134 D1, D7).
 *
 * The sweep below measures how screens are drawn; this asks whether what the mockup draws is there
 * at all. F-221 enrolls the surfaces whose features are done (14's splash, 27's four cards); every
 * other surface is owed by the feature that builds it, and `verify-mockups` refuses the day that
 * feature closes without enrolling it (it reads the feature list, which a cached test may not).
 * The table both read is `.harness/verification/inventory-surfaces.json`. Presence only: order and
 * proportion are each surface feature's first criterion.
 */
const INVENTORIES = loadInventories();
const SURFACES = surfacesOf(INVENTORIES);
/** Which surfaces are enrolled, and which are not whole, with why: shared with verify-mockups. */
const TABLE = JSON.parse(
  readFileSync(join(__dirname, '../../../.harness/verification/inventory-surfaces.json'), 'utf8'),
) as { readonly enrolled: readonly string[]; readonly notWhole: Readonly<Record<string, string>> };

/** Read in both locales: the catalogue's words, and the script the refusal is set in. */
const SWEPT_LOCALES = [
  { tag: 'en-GB', locale: 'en', script: 'latin' },
  { tag: 'ja-JP', locale: 'ja', script: 'japanese' },
] as const;

const subjectNamed = (name: string): ConformanceSubject => {
  const found = SCREENS.find((s) => s.name === name);
  if (found === undefined) throw new Error(`no subject named ${name}`);
  return found;
};

/** Render one subject's first state, keeping the live tree, which carries components. */
const drawLive = (
  renderIt: (theme: Theme) => TestNode | null,
  theme: Theme,
): { json: TestNode; live: LiveNodes } => {
  // A box, because the hook fills it during the render, where the compiler cannot follow.
  const box: { live: LiveNodes | null } = { live: null };
  drawRoot = (root) => {
    box.live = snapshot(root);
  };
  try {
    const json = renderIt(theme);
    if (json === null || box.live === null) throw new Error('rendered nothing');
    return { json, live: box.live };
  } finally {
    drawRoot = null;
  }
};

const fromSubject =
  (name: string) =>
  (theme: Theme): TestNode | null => {
    const subject = subjectNamed(name);
    return subject.render(REQUIRED_STATES[subject.kind][0] ?? 'default', theme);
  };

interface Enrolled {
  readonly surface: string;
  /** The test id of the surface's own root: every element is counted inside it (B1). */
  readonly root: string;
  readonly render: (theme: Theme) => TestNode | null;
  readonly locators: Readonly<Record<string, Locator>>;
  /**
   * Elements a §6 conflict replaces, each with the conflict's id (ADR-0144): not counted, and held to
   * the inventory's own `conflicts`, so only an element listed under that conflict can be declared.
   */
  readonly superseded?: Readonly<Record<string, ReplacingConflict>>;
}

const ENROLLED: readonly Enrolled[] = [
  {
    surface: '14.splash',
    root: 'launch',
    render: (theme) => draw(<Launch onShown={() => undefined} onDone={() => undefined} />, theme),
    locators: {
      // An app component (a masked image), found by the id it carries and by drawing a tint.
      '14.splash.glow': { by: 'testID', id: 'launch.glow' },
      // The product's name, which the Wordmark sets in Latin in both locales (ADR-0112).
      '14.splash.wordmark': { by: 'value', text: () => 'Irodora' },
    },
  },
  {
    /*
     * 01, HOME (F-242), drawn as a person sees it: the screen over the tab bar its layout puts
     * under it, so 01's tab elements are found on the same tree. The wardrobe is five garments with
     * a material each, the pill counted against a profile, every action wired — 01 as drawn.
     */
    surface: '01.screen',
    root: 'home.surface',
    render: (theme) =>
      draw(
        <View testID="home.surface">
          <Home
            store={fakeHome(true)}
            now={() => HOME_DAY}
            coverage={HOME_COVERAGE}
            onOpenCombinations={() => undefined}
            onOpenGarment={() => undefined}
            onOpenLens={() => undefined}
          />
          <AppTabBar
            state={{ index: 0, routes: TABS.map((tab) => ({ key: tab.name, name: tab.name })) }}
            navigation={{ emit: () => ({ type: 'tabPress' }), navigate: () => undefined }}
            insets={{ bottom: 0 }}
          />
        </View>,
        theme,
      ),
    locators: {
      // The product's name, which the Wordmark sets in Latin in both locales (ADR-0112).
      '01.header.wordmark': { by: 'value', text: () => 'Irodora' },
      // 01's three lines are one heading (ADR-0138 D7): the inventory's `home.tagline` is their join.
      '01.header.tagline': {
        by: 'value',
        text: (locale) =>
          (['home.what1', 'home.what2', 'home.what3'] as const)
            .map((key) => message(locale, key))
            .join('\n'),
      },
      // The cards are generic components, so each is found by its own id.
      '01.hero': { by: 'testID', id: 'home.hero' },
      '01.wardrobe': { by: 'testID', id: 'home.wardrobe' },
      '01.colour-card': { by: 'testID', id: 'home.colourCard' },
      // The hero's names and figures: the day's entry, through the screen's own functions.
      '01.hero.sample.kanji': { by: 'value', text: () => homeToday().entry.name.kanji },
      '01.hero.sample.kana': { by: 'value', text: () => homeToday().entry.name.kana },
      '01.hero.sample.name': { by: 'value', text: () => heroName(homeToday().entry.name) },
      '01.hero.sample.oklch': {
        by: 'value',
        text: (locale) => oklchLine(homeToday().derived.oklch, message(locale, 'coord.oklch')),
      },
      '01.wardrobe.count': {
        by: 'value',
        text: (locale) =>
          wardrobeCountLabel(
            HOME_GARMENTS.length,
            HOME_COVERAGE,
            (key) => message(locale, key),
            locale === 'ja' ? 'japanese' : 'latin',
          ),
      },
      '01.colour-card.note': { by: 'value', text: () => homeToday().entry.provenance.source },
      // The indicator binds nothing and is no component: the bar names the active one (F-242).
      '01.tabs.indicator': { by: 'testID', id: TAB_INDICATOR_TEST_ID },
      // The inventory read the keys as `tabs.*`; the catalogue's are `tab.*` (F-145).
      '01.tabs.home.label': { by: 'text', key: 'tab.home' },
      '01.tabs.atlas.label': { by: 'text', key: 'tab.atlas' },
      '01.tabs.lens.label': { by: 'text', key: 'tab.lens' },
      '01.tabs.wardrobe.label': { by: 'text', key: 'tab.wardrobe' },
      '01.tabs.profile.label': { by: 'text', key: 'tab.profile' },
    },
  },
  {
    /*
     * 05, THE ATLAS (F-246), over the tab bar its layout puts under it (C1: 01's five tabs, the Atlas
     * active), so 05's tab elements are found on the same tree. *Autumn* chosen, so every card prints
     * its season (ADR-0140); every action wired and the bookmark toggle drawn — 05 as drawn.
     */
    surface: '05.screen',
    root: 'atlas.surface',
    render: (theme) =>
      draw(
        <View testID="atlas.surface">
          <Atlas
            bookmarked={BOOKMARKED}
            initialSeason="autumn"
            onSelect={() => undefined}
            onOpenFinder={() => undefined}
            onOpenCompare={() => undefined}
            onOpenPalettes={() => undefined}
          />
          <AppTabBar
            state={{ index: 1, routes: TABS.map((tab) => ({ key: tab.name, name: tab.name })) }}
            navigation={{ emit: () => ({ type: 'tabPress' }), navigate: () => undefined }}
            insets={{ bottom: 0 }}
          />
        </View>,
        theme,
      ),
    locators: {
      // One heading holding both scripts (ADR-0142): the English, the separator, the Japanese run.
      '05.title': {
        by: 'value',
        text: (locale) =>
          `${message(locale, 'atlas.title')}${BILINGUAL_SEPARATOR}${japaneseRun('atlas.titleJa')}`,
      },
      '05.header-rule': { by: 'testID', id: APP_BAR_RULE_TEST_ID },
      // A family chip is a generic Chip, so each is found by its own id, and its dot by the dot's.
      '05.filters.family.ao': { by: 'testID', id: 'atlas.family.ao' },
      '05.filters.family.aka': { by: 'testID', id: 'atlas.family.aka' },
      '05.filters.family.midori': { by: 'testID', id: 'atlas.family.midori' },
      '05.filters.family.murasaki': { by: 'testID', id: 'atlas.family.murasaki' },
      '05.filters.family.cha': { by: 'testID', id: 'atlas.family.cha' },
      '05.filters.family.kuro': { by: 'testID', id: 'atlas.family.kuro' },
      '05.filters.family.ao.dot': { by: 'testID', id: 'atlas.family.ao.dot' },
      '05.filters.family.aka.dot': { by: 'testID', id: 'atlas.family.aka.dot' },
      '05.filters.family.midori.dot': { by: 'testID', id: 'atlas.family.midori.dot' },
      '05.filters.family.murasaki.dot': { by: 'testID', id: 'atlas.family.murasaki.dot' },
      '05.filters.family.cha.dot': { by: 'testID', id: 'atlas.family.cha.dot' },
      '05.filters.family.kuro.dot': { by: 'testID', id: 'atlas.family.kuro.dot' },
      '05.filters-rule': { by: 'testID', id: 'atlas.filters.rule' },
      // The cards are generic components, so each is found by its own id; their words are the
      // entry's, through the screen's own functions. Card 4 draws no OKLCh in 05 (E1 adds it).
      '05.card-1': { by: 'testID', id: 'atlas.card.0' },
      '05.card-1.kanji': { by: 'value', text: () => atlasCard(0).entry.name.kanji },
      '05.card-1.hex': { by: 'value', text: () => atlasCard(0).derived.hex },
      '05.card-1.romaji': {
        by: 'value',
        text: () => capitalisedRomaji(atlasCard(0).entry.name.romaji),
      },
      '05.card-1.oklch': {
        by: 'value',
        text: (locale) => atlasOklch(atlasCard(0).derived.oklch, message(locale, 'coord.oklch')),
      },
      '05.card-1.era': { by: 'value', text: (locale) => atlasSeason(0, locale) },
      '05.card-2': { by: 'testID', id: 'atlas.card.1' },
      '05.card-2.kanji': { by: 'value', text: () => atlasCard(1).entry.name.kanji },
      '05.card-2.hex': { by: 'value', text: () => atlasCard(1).derived.hex },
      '05.card-2.romaji': {
        by: 'value',
        text: () => capitalisedRomaji(atlasCard(1).entry.name.romaji),
      },
      '05.card-2.oklch': {
        by: 'value',
        text: (locale) => atlasOklch(atlasCard(1).derived.oklch, message(locale, 'coord.oklch')),
      },
      '05.card-2.era': { by: 'value', text: (locale) => atlasSeason(1, locale) },
      '05.card-3': { by: 'testID', id: 'atlas.card.2' },
      '05.card-3.kanji': { by: 'value', text: () => atlasCard(2).entry.name.kanji },
      '05.card-3.hex': { by: 'value', text: () => atlasCard(2).derived.hex },
      '05.card-3.romaji': {
        by: 'value',
        text: () => capitalisedRomaji(atlasCard(2).entry.name.romaji),
      },
      '05.card-3.oklch': {
        by: 'value',
        text: (locale) => atlasOklch(atlasCard(2).derived.oklch, message(locale, 'coord.oklch')),
      },
      '05.card-3.era': { by: 'value', text: (locale) => atlasSeason(2, locale) },
      '05.card-4': { by: 'testID', id: 'atlas.card.3' },
      '05.card-4.kanji': { by: 'value', text: () => atlasCard(3).entry.name.kanji },
      '05.card-4.hex': { by: 'value', text: () => atlasCard(3).derived.hex },
      '05.card-4.romaji': {
        by: 'value',
        text: () => capitalisedRomaji(atlasCard(3).entry.name.romaji),
      },
      '05.card-4.era': { by: 'value', text: (locale) => atlasSeason(3, locale) },
      // The indicator binds nothing and is no component: the bar names the active one (F-242).
      '05.tabs.indicator': { by: 'testID', id: TAB_INDICATOR_TEST_ID },
    },
    // 05 draws a four-item bar; C1 makes it 01's five, so these two glyphs are no tab's (ADR-0144).
    superseded: { '05.tabs.compass.icon': 'C1', '05.tabs.search.icon': 'C1' },
  },
  {
    surface: '27.wardrobe-empty',
    root: STATE_TEST_IDS.empty,
    render: fromSubject('screens/Wardrobe (nothing in it)'),
    // The card is the surface's own root; its component wraps it, so it is found by its id.
    locators: { '27.wardrobe-empty': { by: 'testID', id: STATE_TEST_IDS.empty } },
  },
  {
    surface: '27.lens-working',
    root: STATE_TEST_IDS.working,
    render: fromSubject('screens/Lens (awaiting a capture)'),
    locators: {
      '27.lens-working': { by: 'testID', id: STATE_TEST_IDS.working },
      // The inventory records the whole card's component for the glow and a generic Chip for each
      // step; each part carries its own id, so each is found as itself (F-221's review, B1).
      '27.lens-working.glow': { by: 'testID', id: `${STATE_TEST_IDS.working}.glow` },
      '27.lens-working.step-1': { by: 'testID', id: `${STATE_TEST_IDS.working}.step-1` },
      '27.lens-working.step-2': { by: 'testID', id: `${STATE_TEST_IDS.working}.step-2` },
    },
  },
  {
    surface: '27.lens-refused',
    root: STATE_TEST_IDS.refused,
    render: fromSubject('screens/Lens (a capture refused)'),
    locators: {
      '27.lens-refused': { by: 'testID', id: STATE_TEST_IDS.refused },
      // ADR-0128: the title is 27's *Reading Refused* and the failed check's name, composed by
      // the screen's own function from the same capture.
      '27.lens-refused.title': {
        by: 'value',
        text: (locale) => {
          const check = refusalOf(REFUSED_READING);
          if (check === null) throw new Error('REFUSED_READING is not refused');
          const script = locale === 'ja' ? 'japanese' : 'latin';
          return refusalText(check, (key) => message(locale, key), script).title;
        },
      },
      // The reason is the engine's: the refusal the screen computes from the same capture.
      '27.lens-refused.body': {
        by: 'value',
        text: (locale) => {
          const check = refusalOf(REFUSED_READING);
          if (check === null) throw new Error('REFUSED_READING is not refused');
          const script = locale === 'ja' ? 'japanese' : 'latin';
          return refusalText(check, (key) => message(locale, key), script).body;
        },
      },
    },
  },
  {
    surface: '27.lens-permission',
    root: STATE_TEST_IDS.denied,
    render: fromSubject('screens/Lens (denied)'),
    locators: { '27.lens-permission': { by: 'testID', id: STATE_TEST_IDS.denied } },
  },
];

/**
 * One enrolled surface, drawn and cut to its own root, its hidden branches left out (B1). A root that
 * is not drawn at all is returned as null, for the case to report.
 */
const drawSurface = (
  enrolled: Enrolled,
  theme: Theme,
): { json: TestNode; live: LiveNodes } | null => {
  const { json, live } = drawLive(enrolled.render, theme);
  const scoped = scopeJson(json, enrolled.root);
  return scoped === null ? null : { json: scoped, live: scopeLive(live, enrolled.root) };
};

/** Counted for the sweep's evidence, below. */
const inventorySwept = { surfaces: 0, elements: 0, renders: 0, superseded: 0 };

/** The inventory a surface comes from. */
const inventoryOf = (enrolled: Enrolled) => {
  const mockup = SURFACES.get(enrolled.surface)?.mockup;
  const found = INVENTORIES.find((i) => i.mockup === mockup);
  if (found === undefined) throw new Error(`no inventory for ${enrolled.surface}`);
  return found;
};

/** A surface's elements less those a conflict replaces (ADR-0144 D2): the ones the sweep finds. */
const elementsSwept = (enrolled: Enrolled) =>
  (SURFACES.get(enrolled.surface)?.elements ?? []).filter(
    (e) => !Object.hasOwn(enrolled.superseded ?? {}, e.id),
  );

/** A card's season line, in the locale's words and script: the screen's own function. */
const atlasSeason = (n: number, locale: 'en' | 'ja'): string => {
  const line = seasonLine(
    atlasCard(n),
    (key) => message(locale, key),
    locale === 'ja' ? 'japanese' : 'latin',
  );
  if (line === null) throw new Error(`autumn card ${String(n)} has no season`);
  return line;
};

describe('every element an enrolled surface records is drawn (F-221)', () => {
  // Each case reads the words in the locale it draws in; a case left in Japanese misreads the next.
  beforeEach(() => {
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  });
  afterAll(() => {
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  });

  it('renders exactly the surfaces the table enrolls, and every row names a surface', () => {
    // Both directions: an enrollment the table claims and nothing renders, or the other way round,
    // would let verify-mockups count a surface as swept that is not (or miss one that is).
    expect(ENROLLED.map((e) => e.surface).sort()).toStrictEqual([...TABLE.enrolled].sort());
    const unknown = [...TABLE.enrolled, ...Object.keys(TABLE.notWhole)].filter(
      (surface) => !SURFACES.has(surface),
    );
    expect(unknown).toStrictEqual([]);
  });

  it.each(ENROLLED.map((e) => [e.surface, e] as const))(
    'draws every %s element, in both themes and both languages',
    (_name, enrolled) => {
      const superseded = enrolled.superseded ?? {};
      const elements = elementsSwept(enrolled);
      expect(elements.length).toBeGreaterThan(0);
      const findings: string[] = [...supersededFindings(inventoryOf(enrolled), superseded)];
      for (const { tag, locale } of SWEPT_LOCALES)
        for (const theme of ['light', 'dark'] as const) {
          mockLanguageTag = tag;
          const drawn = drawSurface(enrolled, theme);
          if (drawn === null)
            findings.push(`[${locale}/${theme}] the root ${enrolled.root} is not drawn`);
          else
            for (const f of elementFindings(
              drawn.live,
              drawn.json,
              elements,
              enrolled.locators,
              locale,
            ))
              findings.push(`[${locale}/${theme}] ${f}`);
          inventorySwept.renders += 1;
        }
      inventorySwept.surfaces += 1;
      inventorySwept.elements += elements.length;
      inventorySwept.superseded += Object.keys(superseded).length;
      expect(findings).toStrictEqual([]);
    },
  );

  describe('DECOYS — each rule fires on what it is for, one per kind of locator (B1)', () => {
    const enrolledAs = (surface: string): Enrolled => {
      const found = ENROLLED.find((e) => e.surface === surface);
      if (found === undefined) throw new Error(`${surface} is not enrolled`);
      return found;
    };
    const elementsOf = (surface: string) => elementsSwept(enrolledAs(surface));
    const drawnAs = (surface: string): { json: TestNode; live: LiveNodes } => {
      const drawn = drawSurface(enrolledAs(surface), 'dark');
      if (drawn === null) throw new Error(`${surface}'s root is not drawn`);
      return drawn;
    };
    const findingsFor = (surface: string, json: TestNode, live: LiveNodes): readonly string[] =>
      elementFindings(live, json, elementsOf(surface), enrolledAs(surface).locators, 'en');

    /** The tree with every node carrying one id taken out. */
    const without = (node: TestNode, id: string): TestNode => ({
      ...node,
      children: (node.children ?? [])
        .filter((c) => typeof c === 'string' || c.props['testID'] !== id)
        .map((c) => (typeof c === 'string' ? c : without(c, id))),
    });
    /** The tree with every Text whose words are these taken out. */
    const withoutText = (node: TestNode, text: string): TestNode => ({
      ...node,
      children: (node.children ?? [])
        .filter(
          (c) =>
            typeof c === 'string' ||
            !(
              c.type === 'Text' &&
              (c.children ?? [])
                .filter((part): part is string => typeof part === 'string')
                .join('')
                .trim() === text
            ),
        )
        .map((c) => (typeof c === 'string' ? c : withoutText(c, text))),
    });
    /** Exactly one finding, about exactly this element. */
    const expectOnly = (found: readonly string[], id: string): void => {
      expect(found).toHaveLength(1);
      expect(found[0]?.startsWith(`${id}: not drawn`)).toBe(true);
    };

    it('the real surfaces are clean as drawn, so each decoy below changes one thing', () => {
      for (const surface of [
        '01.screen',
        '05.screen',
        '14.splash',
        '27.lens-working',
        '27.lens-refused',
      ]) {
        const { json, live } = drawnAs(surface);
        expect({ [surface]: findingsFor(surface, json, live) }).toStrictEqual({ [surface]: [] });
      }
    });

    it('testID: names the element whose node is gone', () => {
      const { json, live } = drawnAs('14.splash');
      expectOnly(findingsFor('14.splash', without(json, 'launch.glow'), live), '14.splash.glow');
    });

    it('testID: names a node that carries the id and draws nothing', () => {
      const { live } = drawnAs('14.splash');
      const empty: TestNode = { type: 'View', props: { testID: 'launch.glow' }, children: null };
      expect(
        findingsFor('14.splash', empty, live).some(
          (f) => f.startsWith('14.splash.glow') && f.includes('draw nothing'),
        ),
      ).toBe(true);
    });

    it('text: names the element whose words are gone', () => {
      const { json, live } = drawnAs('14.splash');
      const subline = message('en', 'brand.splashSubline');
      expectOnly(findingsFor('14.splash', withoutText(json, subline), live), '14.splash.subline');
    });

    it('component: names the element whose component is gone', () => {
      const { json, live } = drawnAs('14.splash');
      expectOnly(
        findingsFor(
          '14.splash',
          json,
          live.filter((n) => n.type !== Wordmark),
        ),
        '14.splash.lockup',
      );
    });

    it('component: a mark withheld at opacity 0 does not stand in for the visible one', () => {
      // At mount the lockup's own mark is withheld and the travelling mark is the one seen
      // (F-231): take the travelling one away and the hidden one must not satisfy the element.
      const { json, live } = drawnAs('14.splash');
      expectOnly(
        findingsFor(
          '14.splash',
          json,
          live.filter((n) => !n.ids.includes('launch.handover')),
        ),
        '14.splash.mark',
      );
    });

    it('illustration: names the element whose illustration is gone', () => {
      const { json, live } = drawnAs('14.splash');
      expectOnly(
        findingsFor(
          '14.splash',
          json,
          live.filter((n) => !(n.type === Illustration && n.name === 'silk-wave')),
        ),
        '14.splash.wave',
      );
    });

    it('glyph: names the element whose glyph is gone', () => {
      const { json, live } = drawnAs('27.lens-refused');
      expectOnly(
        findingsFor(
          '27.lens-refused',
          json,
          live.filter((n) => !(n.type === Glyph && n.name === 'glare')),
        ),
        '27.lens-refused.icon',
      );
    });

    it('01: one badge gone is a finding naming all five, found four times of five (F-242)', () => {
      const { json, live } = drawnAs('01.screen');
      const first = live.findIndex((n) => n.type === TextureBadge);
      expect(first).toBeGreaterThanOrEqual(0);
      const found = findingsFor(
        '01.screen',
        json,
        live.filter((_, i) => i !== first),
      );
      expect(found).toHaveLength(1);
      expect(found[0]).toContain('01.wardrobe.tile-1.badge');
      expect(found[0]).toContain('01.wardrobe.tile-5.badge');
      expect(found[0]).toContain('found 4 time(s), needed 5');
    });

    it('01: the hero’s kanji is found by what it says, and the tab bar as itself (F-242)', () => {
      const { json, live } = drawnAs('01.screen');
      expectOnly(
        findingsFor('01.screen', withoutText(json, homeToday().entry.name.kanji), live),
        '01.hero.sample.kanji',
      );
      // A tab's word is also its accessible name, so it is the bar that is taken away here.
      expectOnly(
        findingsFor(
          '01.screen',
          json,
          live.filter((n) => n.type !== TabBar),
        ),
        '01.tabs',
      );
    });

    /** The tree with `change` applied to every subtree whose id passes `which`. */
    const within = (
      node: TestNode,
      which: (id: string) => boolean,
      change: (n: TestNode) => TestNode,
    ): TestNode => {
      const id: unknown = node.props['testID'];
      return typeof id === 'string' && which(id)
        ? change(node)
        : {
            ...node,
            children: (node.children ?? []).map((c) =>
              typeof c === 'string' ? c : within(c, which, change),
            ),
          };
    };

    it('05: the cards’ seasons gone is a finding naming them and the pill that shares their words (F-246)', () => {
      const { json, live } = drawnAs('05.screen');
      const autumn = message('en', 'season.autumn');
      // Each card's line is the chosen pill's word, so one signature needs all five.
      expect([0, 1, 2, 3].map((n) => atlasSeason(n, 'en'))).toStrictEqual([
        autumn,
        autumn,
        autumn,
        autumn,
      ]);
      // The grid draws more autumn cards than 05's four, so every card's line is taken: the pill's
      // word is left once, and a pill alone cannot stand in for the four lines.
      const found = findingsFor(
        '05.screen',
        within(
          json,
          (id) => id.startsWith('atlas.card.'),
          (card) => withoutText(card, autumn),
        ),
        live,
      );
      expect(found).toHaveLength(1);
      for (const id of [
        '05.filters.season.autumn',
        '05.card-1.era',
        '05.card-2.era',
        '05.card-3.era',
        '05.card-4.era',
      ])
        expect(found[0]).toContain(id);
      expect(found[0]).toContain('found 1 time(s), needed 5');
    });

    it('05: the bar’s rule and a family’s dot are each found as themselves (F-246)', () => {
      const { json, live } = drawnAs('05.screen');
      expectOnly(
        findingsFor('05.screen', without(json, APP_BAR_RULE_TEST_ID), live),
        '05.header-rule',
      );
      expectOnly(
        findingsFor('05.screen', without(json, 'atlas.family.ao.dot'), live),
        '05.filters.family.ao.dot',
      );
    });

    it('05: a supersession counts only where the inventory lists it under its conflict (ADR-0144)', () => {
      const enrolled = enrolledAs('05.screen');
      const inventory = inventoryOf(enrolled);
      expect(supersededFindings(inventory, enrolled.superseded ?? {})).toStrictEqual([]);
      // DECOY: the search field is under no C1, so calling it superseded is the finding.
      const found = supersededFindings(inventory, { '05.search': 'C1' });
      expect(found).toHaveLength(1);
      expect(found[0]?.startsWith('05.search: declared superseded by C1')).toBe(true);
      /*
       * DECOY: C11 lists 05's samples, and they are KEPT — drawn on the tinted card as 05 draws them.
       * A conflict that settles how an element is drawn replaces nothing, so it cannot hide one: the
       * type refuses it, and so does the check when a cast gets it past the type (S3).
       */
      // @ts-expect-error — C11 is not a conflict that replaces elements.
      const kept = supersededFindings(inventory, { '05.card-1.swatch': 'C11' });
      expect(kept).toStrictEqual([
        '05.card-1.swatch: declared superseded by C11, which replaces nothing — it settles how its elements are drawn',
      ]);
      /*
       * DECOY: undeclared, the compass is reported missing — and the tab's search glyph is NOT, because
       * the field's own glyph satisfies the count. That is why a conflict's replacement is declared
       * against the inventory rather than left to a presence count that a different element can pass.
       */
      const { json, live } = drawnAs('05.screen');
      const undeclared = elementFindings(
        live,
        json,
        SURFACES.get('05.screen')?.elements ?? [],
        enrolled.locators,
        'en',
      );
      expect(undeclared.some((f) => f.startsWith('05.tabs.compass.icon: not drawn'))).toBe(true);
      expect(undeclared.some((f) => f.startsWith('05.tabs.search.icon'))).toBe(false);
      // DECOY: a superseded element is never also located — given a locator, it is the finding.
      const located = elementFindings(
        live,
        json,
        elementsOf('05.screen'),
        { ...enrolled.locators, '05.tabs.compass.icon': { by: 'glyph', name: 'compass' } },
        'en',
      );
      expect(located).toStrictEqual([
        '05.tabs.compass.icon: a locator for an element this surface does not sweep (unrecorded, or superseded)',
      ]);
    });

    it("a part found by its own id: the working card's step chip and glow, not the screen's other chips", () => {
      // The Lens also draws mode chips. Counted anywhere, they stood in for 27's step chips.
      const { json, live } = drawnAs('27.lens-working');
      const id = STATE_TEST_IDS.working;
      expectOnly(
        findingsFor('27.lens-working', without(json, `${id}.step-1`), live),
        '27.lens-working.step-1',
      );
      expectOnly(
        findingsFor('27.lens-working', without(json, `${id}.glow`), live),
        '27.lens-working.glow',
      );
    });

    it('names a locator for an element the inventory does not record, and an element with none', () => {
      const { json, live } = drawnAs('14.splash');
      const stray = {
        ...enrolledAs('14.splash').locators,
        '14.splash.nothing': { by: 'testID', id: 'x' } as const,
      };
      const unlocated = [
        ...elementsOf('14.splash'),
        {
          id: '14.splash.extra',
          component: 'app:Nothing',
          icon: null,
          illustration: null,
          binding: null,
        },
      ];
      const found = elementFindings(live, json, unlocated, stray, 'en');
      expect(found.some((f) => f.startsWith('14.splash.nothing: a locator for an element'))).toBe(
        true,
      );
      expect(found.some((f) => f.startsWith('14.splash.extra: no locator'))).toBe(true);
    });
  });
});

describe('the conformance sweep, with evidence (F-204)', () => {
  const SWEEP_THEMES: readonly Theme[] = ['light', 'dark'];
  const SWEEP_LOCALES = ['en-GB', 'ja-JP'] as const;
  const SWEEP_MOTION = [false, true] as const;

  const problems: string[] = [];
  let conditions = 0;

  /*
   * THE CLAIMS, READ OFF WHAT RENDERS (F-221, ADR-0134 D3). The claims lint reads source lines, so a
   * figure and a label written in two `Text`s are invisible to it until a screen sets them side by
   * side. Every tree this sweep renders is read through `observe`, with no second render, as
   * paragraphs, visual lines and accessible names, against the lint's own patterns.
   */
  const banned = loadBanned();
  // By kind, so "no finding" cannot mean "no line was ever read": the registry must yield lines.
  const textsRead = { paragraph: 0, line: 0, name: 0 };
  let claimFindings = 0;
  const claimsIn =
    (out: string[]): Observer =>
    (subject, state, theme, tree) => {
      for (const t of renderedTexts(tree)) {
        textsRead[t.kind] += 1;
        for (const b of bannedIn(t.text, banned))
          out.push(`  ${subject.name} [${theme}/${state}] claims ${b.id} (${t.kind}): "${t.text}"`);
      }
    };

  afterAll(() => {
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  });

  it('has subjects to sweep, so a clean result cannot mean an empty registry', () => {
    expect(SCREENS.length).toBeGreaterThan(0);
  });

  it('renders every subject in both themes, both languages, with motion and without', () => {
    for (const locale of SWEEP_LOCALES)
      for (const reduced of SWEEP_MOTION) {
        /*
         * Both switches are the ones the APP reads — the locale mock `useMessages` resolves
         * through, and the platform API `useMotion` subscribes to. A sweep driving flags it
         * invented would be checking a condition that does not exist on a device.
         */
        mockLanguageTag = locale;
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduced);

        const claims: string[] = [];
        const result = [
          formatFindings(checkAll(SCREENS, SWEEP_THEMES, claimsIn(claims))),
          ...claims,
        ]
          .filter((part) => part !== '')
          .join('\n');
        conditions += SWEEP_THEMES.length;
        claimFindings += claims.length;
        if (result !== '') problems.push(`[${locale}, reduced=${String(reduced)}]\n${result}`);
      }

    expect(problems.join('\n')).toBe('');
  });

  /**
   * THE DECOY FOR THE FOURTH AXIS.
   *
   * A loop over `[false, true]` that changed nothing would make the sweep look twice as
   * thorough as it is. The switch must actually move.
   */
  it('DECOY — the reduced-motion switch actually moves', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await expect(AccessibilityInfo.isReduceMotionEnabled()).resolves.toBe(true);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await expect(AccessibilityInfo.isReduceMotionEnabled()).resolves.toBe(false);
  });

  it('DECOY — a claim composed from two paragraphs side by side fails the sweep', () => {
    // The real subjects passing proves nothing unless the same reading refuses the shape it is for.
    // The figure and the label are held apart here as a screen holds them, so the claims lint,
    // which reads source lines, never reads the claim this decoy plants.
    const figure = '97%';
    const label = 'Match';
    const composed: ConformanceSubject = {
      name: 'a figure and a label, side by side',
      kind: 'static',
      render: () => ({
        type: 'View',
        props: { style: { flexDirection: 'row' } },
        children: [
          { type: 'Text', props: {}, children: [figure] },
          { type: 'Text', props: {}, children: [label] },
        ],
      }),
    };
    const found: string[] = [];
    checkAll([composed], SWEEP_THEMES, claimsIn(found));
    expect(found).toHaveLength(SWEEP_THEMES.length);
    expect(found[0]).toContain(`"${figure} ${label}"`);
  });

  it('DECOY — and so does the locale, which the Japanese suite depends on too', () => {
    mockLanguageTag = 'ja-JP';
    expect(mockLanguageTag).not.toBe(DEFAULT_LANGUAGE_TAG);
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  });

  it('records the evidence, with the counts that make the verdict readable', () => {
    const evidence = {
      $comment:
        'Written by the sweep in apps/mobile/test/screens.test.tsx (F-204). A verdict without a ' +
        'count is not evidence: "no findings" and "nothing ran" produce the same word, so the ' +
        'subject and condition counts are part of the record. Regenerated by `pnpm test`.',
      subjects: SCREENS.length,
      themes: SWEEP_THEMES.length,
      locales: SWEEP_LOCALES.length,
      motionSettings: SWEEP_MOTION.length,
      conditions,
      findings: problems.length,
      claims: {
        $comment:
          'F-221 (ADR-0134 D3): every tree rendered in every condition, read as paragraphs, visual ' +
          'lines (paragraphs side by side in a row) and accessible names, against the claims lint ' +
          'patterns. pnpm fidelity:capture reads a device capture the same way.',
        textsRead,
        patterns: banned.length,
        findings: claimFindings,
      },
      inventory: {
        $comment:
          'F-221 (ADR-0134 D1, D7): the surfaces enrolled, each rendered in both themes and both ' +
          'languages with every inventory element found by what it draws; the rest owed to the ' +
          'feature that builds each, or not a whole surface, with why.',
        enrolled: ENROLLED.map((e) => e.surface),
        elementsAsserted: inventorySwept.elements,
        renders: inventorySwept.renders,
        // Elements a §6 conflict replaces, declared against the inventory's own list (ADR-0144).
        superseded: inventorySwept.superseded,
        owed: SURFACES.size - TABLE.enrolled.length - Object.keys(TABLE.notWhole).length,
        notWhole: TABLE.notWhole,
      },
      cited: {
        cvd:
          'NOT re-simulated here. Gate 9 (pnpm test:contrast) runs every declared pairing ' +
          'through WCAG, APCA and eleven CVD severities across every declared palette. A second ' +
          'simulation would be a second answer to one question (E-005).',
        tokenReach:
          'NOT checked here. scripts/verify-token-reach.mjs (F-092) checks both directions — a ' +
          'token no component reads, and an exemption a component does read — and prints the ' +
          'whole exemption list on every run. 86 names: 67 read, 19 declared unreached with a ' +
          'reason.',
      },
      notCovered:
        'That any of it LOOKS right. This sweep renders trees and measures structure, naming, ' +
        'tap targets, token resolution and selection treatment. It cannot see a layout that is ' +
        'cramped or unbalanced — and every "unprofessional" report in this project has been ' +
        'about something that was green here at the time. That is what pnpm fidelity:capture is ' +
        'for (F-221, ADR-0134): every route from the running app beside its mockup, compared by a ' +
        'person.',
    };
    writeFileSync(
      `${__dirname}/../../../.harness/verification/conformance-sweep.json`,
      `${JSON.stringify(evidence, null, 2)}\n`,
    );

    // Asserted against the registry rather than hard-coded: a number typed here goes stale the
    // first time a subject is added, and is then evidence about a smaller sweep than the one
    // that ran.
    expect(evidence.conditions).toBe(
      SWEEP_THEMES.length * SWEEP_LOCALES.length * SWEEP_MOTION.length,
    );
    expect(evidence.subjects).toBe(SCREENS.length);
    // Every kind was actually read off real screens, so zero findings is about screens.
    for (const kind of ['paragraph', 'line', 'name'] as const)
      expect({ [kind]: evidence.claims.textsRead[kind] > 0 }).toStrictEqual({ [kind]: true });
  });
});

/**
 * EVERY LIST SURFACE ARRIVES ONCE (F-266, ADR-0133 §7, E-199).
 *
 * A route whose governing mockup's main content is a sequence of numbered records draws those
 * records inside ONE `Arrival`, each in an `Appear` indexed in reading order, 0…n−1: the rows the
 * first frame draws stagger in, and a row scrolled, windowed or re-keyed in later is simply there.
 * Read off the live tree each subject renders — components, which the JSON tree does not carry —
 * through `drawRoot`; time is never advanced. A rebuilt surface (F-246 onward) keeps its entry here.
 * **The limit, stated:** a NEW list surface added without one is not detected.
 */
describe('every list surface arrives once (F-266)', () => {
  type Root = ReturnType<typeof render>['UNSAFE_root'];
  interface Arrived {
    readonly scopes: number;
    readonly indices: readonly number[];
  }
  /** Each surface: the subject that draws it with records, its mockup, and the records it draws. */
  const LIST_SURFACES = [
    { subject: 'screens/Atlas', mockup: '05', records: ['05.card-1', '05.card-4'] },
    {
      subject: 'screens/Finder (with a phrase answer)',
      mockup: '09',
      records: ['09.results.result-1', '09.results.result-4'],
    },
    { subject: 'screens/Combinations', mockup: '19', records: ['19.rows.row-1', '19.rows.row-5'] },
    {
      subject: 'screens/Combinations (a colour, not an entry)',
      mockup: '24',
      records: ['24.rows.row-1', '24.rows.row-4'],
    },
  ] as const;

  const arrivalOf = (root: Root): Arrived => {
    const scopes = root.findAllByType(Arrival);
    return {
      scopes: scopes.length,
      indices: scopes.flatMap((scope) =>
        scope.findAllByType(Appear).map((row) => row.props['index'] as number),
      ),
    };
  };
  /** Everything wrong with how a tree's list arrives; empty when it arrives once, in order. */
  const findings = (arrived: Arrived): string[] => [
    ...(arrived.scopes === 1
      ? []
      : [`${String(arrived.scopes)} Arrival scopes where a list has one`]),
    ...(arrived.indices.length >= 2 ? [] : ['fewer than two rows arrive']),
    ...arrived.indices.flatMap((index, i) =>
      index === i ? [] : [`row ${String(i)} is indexed ${String(index)}`],
    ),
  ];
  const capture = (drawIt: () => unknown): Arrived => {
    const read: { arrived: Arrived | null } = { arrived: null };
    drawRoot = (root) => {
      read.arrived = arrivalOf(root);
    };
    try {
      drawIt();
    } finally {
      drawRoot = null;
    }
    if (read.arrived === null) throw new Error('nothing was drawn');
    return read.arrived;
  };

  it.each(LIST_SURFACES.map((s) => [s.subject, s] as const))(
    '%s arrives once, its records in reading order',
    (_name, surface) => {
      const subject = SCREENS.find((s) => s.name === surface.subject);
      if (subject === undefined) throw new Error(`${surface.subject} is not registered`);
      const state = REQUIRED_STATES[subject.kind][0];
      if (state === undefined) throw new Error(`${subject.kind} has no states`);
      expect(findings(capture(() => subject.render(state, 'dark')))).toStrictEqual([]);
    },
  );

  /*
   * TWO SURFACES WHOSE REGISTRY SUBJECTS DRAW ONE RECORD: a wardrobe of three garments makes one
   * row, and the near colour has one equivalent. So each is drawn here with several, or the reading
   * order this checks would be one index long.
   *
   * THE WARDROBE TWICE. Under jest its `SectionList` renders its first four items, and a section's
   * header is one of them, so a second section's rows are never drawn here. Its order is read
   * within one family of several garments. Its offset across sections — a row counts the rows of
   * the sections above it — is read off the list's own `renderItem`, called for the second
   * section's first row: the code that runs on a device, without relying on what jest windows in.
   */
  const corpusWardrobe = allEntries().map((e, i) =>
    outfitGarment(`arrive-${String(i)}`, 'jumper', e.entry.slug),
  );
  const wardrobe = (garments: readonly StoredGarment[]) => (
    <Wardrobe
      store={fakeBrowseStore(garments)}
      onAddGarment={() => undefined}
      onOpenOutfit={() => undefined}
      onOpenShopping={() => undefined}
    />
  );

  it('the Wardrobe’s rows arrive once, in reading order (11)', () => {
    const family = groupByColour(corpusWardrobe).find((g) => g.garments.length >= 4);
    expect(family).toBeDefined();
    if (family === undefined) return;
    const arrived = capture(() => draw(wardrobe(family.garments.slice(0, 4)), 'dark'));
    expect(findings(arrived)).toStrictEqual([]);
  });

  it('counts the rows of the sections above a Wardrobe row, so its order runs across them (11)', () => {
    const read: { first: number; index: unknown } = { first: NaN, index: undefined };
    drawRoot = (root) => {
      const list = root.findByType(SectionList);
      const sections = list.props['sections'] as readonly {
        readonly title: string;
        readonly data: readonly unknown[];
      }[];
      const [first, second] = sections;
      if (first === undefined || second === undefined) return;
      const renderItem = list.props['renderItem'] as (info: unknown) => React.ReactElement<{
        readonly index?: number;
      }>;
      read.first = first.data.length;
      read.index = renderItem({ item: second.data[0], index: 0, section: second }).props.index;
    };
    try {
      draw(wardrobe(corpusWardrobe.slice(0, 12)), 'dark');
    } finally {
      drawRoot = null;
    }
    expect(read.first).toBeGreaterThan(0);
    expect(read.index).toBe(read.first);
    // DECOY: the row's index within its own section is 0, which is not its place in the list.
    expect(read.index).not.toBe(0);
  });

  it('Contemporary’s equivalents arrive once, in reading order (21)', () => {
    const several = allEntries().find(
      (e) => equivalentsFor(e).membership.length === 0 && equivalentsFor(e).computed.length >= 2,
    );
    expect(several).toBeDefined();
    if (several === undefined) return;
    const arrived = capture(() => draw(<Contemporary slug={several.entry.slug} />, 'dark'));
    expect(findings(arrived)).toStrictEqual([]);
  });

  it('Palette Studio’s saved palettes arrive once, in order', () => {
    const store = fakeStore();
    let n = 0;
    for (const id of [
      '0198e2f1-4c3a-7b21-9d54-6e0a1b2c3d4e',
      '0198e2f1-4c3a-7b21-9d54-6e0a1b2c3d4f',
    ])
      store.savePalette(
        toStoreWrite(DRAFT, { id, today: '2026-10-12' }, () => `color-${String(n++)}`),
        1000,
      );
    expect(findings(capture(() => draw(<PaletteStudio store={store} />, 'dark')))).toStrictEqual(
      [],
    );
  });

  it('the Wardrobe’s lookbook arrives once, in order (F-238)', () => {
    // A list of its own, undrawn by any mockup (ADR-0136): two saved outfits, under Lookbook.
    const arrived = capture(() =>
      draw(
        <Wardrobe
          store={fakeBrowseStore(OUTFIT_WARDROBE)}
          lookbook={{
            outfits: [{ ...LOOKBOOK_OUTFIT, id: 'lookbook-2' }, LOOKBOOK_OUTFIT],
            onRemove: () => undefined,
          }}
          initialView="lookbook"
        />,
        'dark',
      ),
    );
    expect(findings(arrived)).toStrictEqual([]);
  });

  it('DECOY — a list whose rows enter without an Arrival is named', () => {
    const arrived = capture(() =>
      draw(
        <View>
          {['one', 'two'].map((row, index) => (
            <Appear key={row} index={index}>
              <Text size="body" color="foreground">
                {row}
              </Text>
            </Appear>
          ))}
        </View>,
        'dark',
      ),
    );
    expect(findings(arrived)).toContain('0 Arrival scopes where a list has one');
  });

  it('DECOY — names two scopes, a single row, and a row out of order', () => {
    expect(findings({ scopes: 2, indices: [0, 1] })).toContain(
      '2 Arrival scopes where a list has one',
    );
    expect(findings({ scopes: 1, indices: [0] })).toContain('fewer than two rows arrive');
    expect(findings({ scopes: 1, indices: [0, 2, 1] })).toStrictEqual([
      'row 1 is indexed 2',
      'row 2 is indexed 1',
    ]);
    // And a list that arrives in order is not named.
    expect(findings({ scopes: 1, indices: [0, 1, 2] })).toHaveLength(0);
  });

  it('cites records its governing mockup draws', () => {
    for (const surface of [
      ...LIST_SURFACES,
      {
        subject: 'screens/Wardrobe',
        mockup: '11',
        records: ['11.grid.garment-1', '11.grid.garment-6'],
      },
      {
        subject: 'screens/Contemporary',
        mockup: '21',
        records: ['21.results.row-1', '21.results.row-5'],
      },
      { subject: 'screens/PaletteStudio', mockup: '10', records: ['10.palette-1', '10.palette-2'] },
    ]) {
      const inventory = JSON.parse(
        readFileSync(
          join(__dirname, '..', '..', '..', 'mockups', 'inventory', `${surface.mockup}.json`),
          'utf8',
        ),
      ) as { readonly elements: readonly { readonly id: string }[] };
      const ids = new Set(inventory.elements.map((e) => e.id));
      for (const record of surface.records) expect(ids.has(record)).toBe(true);
    }
  });
});
