/**
 * What 10's and 16's controls do (F-251, ADR-0165), pressed on the rendered screens.
 *
 * `palette.test` holds the draft's rules and `palette-readout.test` its words and figures, without
 * rendering. This holds the half they cannot see: that each control on the page calls what ADR-0165
 * says it calls, with what it should carry, and that a control that cannot act says why.
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
const mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, TextInput, type StyleProp, type ViewStyle } from 'react-native';
import { Tategaki, ThemeProvider } from '@irodora/ui';
import type { StoredPalette } from '@irodora/store';
import { allEntries, colorFor, entryBySlug } from '../src/corpus';
import { t as message, type MessageKey } from '../src/i18n';
import { findSeparationProblems } from '../src/outfit/cvd';
import type { PaletteDraft, PaletteStore } from '../src/palette';
import {
  curatedOrder,
  curatedShown,
  exportHref,
  labHandOff,
  pageOf,
  trayPages,
} from '../src/palette-readout';
import { PaletteBuilder } from '../src/screens/PaletteBuilder';
import { PaletteStudio } from '../src/screens/PaletteStudio';
import { storedPalette } from './stored-palettes';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const say = (key: MessageKey): string => message('en', key);
const SLUGS = allEntries().map((e) => e.entry.slug);

/** A store that writes, lists and deletes in memory, and remembers each write. */
function memoryStore(initial: readonly StoredPalette[] = []): PaletteStore & {
  readonly written: string[];
} {
  const rows = [...initial];
  const written: string[] = [];
  return {
    written,
    savePalette(palette, now) {
      written.push(palette.id);
      const at = rows.findIndex((p) => p.id === palette.id);
      const row: StoredPalette = {
        id: palette.id,
        nameEn: palette.nameEn,
        nameJa: palette.nameJa,
        classification: palette.classification,
        category: palette.category,
        versionId: palette.versionId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        members: [],
      };
      if (at >= 0) rows[at] = row;
      else rows.push(row);
    },
    listPalettes: () => [...rows],
    deletePalette(id) {
      const at = rows.findIndex((p) => p.id === id);
      if (at >= 0) rows.splice(at, 1);
    },
  };
}

const drawStudio = (props: Partial<Parameters<typeof PaletteStudio>[0]> = {}) =>
  render(
    <ThemeProvider theme="dark">
      <PaletteStudio store={props.store ?? memoryStore()} {...props} />
    </ThemeProvider>,
  );

const drawBuilder = (props: Partial<Parameters<typeof PaletteBuilder>[0]> = {}) =>
  render(
    <ThemeProvider theme="dark">
      <PaletteBuilder store={props.store ?? memoryStore()} today="2026-11-02" {...props} />
    </ThemeProvider>,
  );

const press = (id: string): void => {
  fireEvent.press(screen.getByTestId(id, { includeHiddenElements: true }));
};

const FIRST = curatedShown(curatedOrder()[0]!);

/* ------------------------------------------------------------------------- 10 */

describe('10: the catalogue’s controls (ADR-0165 D2)', () => {
  it('Create New Palette opens 16, an empty draft', () => {
    const onCreate = jest.fn();
    drawStudio({ onCreate });
    press('studio.create');
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('the choice switches to My Custom Palettes, and says so when there are none', () => {
    drawStudio();
    expect(screen.queryByText(say('studio.none'), { exact: false })).toBeNull();
    press('studio.view.custom');
    expect(screen.getByText(say('studio.none'), { exact: false })).toBeTruthy();
  });

  it('Apply to Outfit Lab hands the Lab the palette’s combination', () => {
    const onApply = jest.fn();
    drawStudio({ hasProfile: true, onApply });
    press(`studio.palette.${FIRST.key}.apply`);
    expect(onApply).toHaveBeenCalledWith(labHandOff(FIRST.members));
  });

  it('Apply is disabled without a profile, and the card says why', () => {
    const onApply = jest.fn();
    drawStudio({ hasProfile: false, onApply });
    expect(screen.getAllByText(say('palettes.applyNeedsProfile')).length).toBeGreaterThan(0);
    press(`studio.palette.${FIRST.key}.apply`);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('Export Tokens opens the export with this palette and the tokens format', () => {
    const hrefs: string[] = [];
    drawStudio({ onExport: (href) => hrefs.push(href) });
    press(`studio.palette.${FIRST.key}.export`);
    expect(hrefs).toStrictEqual([exportHref(FIRST, 'tokens')]);
    expect(hrefs[0]).toContain(`palette=${FIRST.id}`);
  });

  it('Export Selected opens the chooser; a choice opens the export with that palette and no format', () => {
    const hrefs: string[] = [];
    drawStudio({ onExport: (href) => hrefs.push(href) });
    press('studio.exportSelected');
    const second = curatedShown(curatedOrder()[1]!);
    press(`studio.chooser.${second.key}`);
    expect(hrefs).toStrictEqual([exportHref(second)]);
    expect(hrefs[0]).not.toContain('format=');
  });

  it('a personal palette’s overflow edits it, or deletes it', () => {
    const fits = storedPalette('p-fits', 'Fits', [
      [SLUGS[0]!, 'anchor'],
      [SLUGS[1]!, 'light'],
    ]);
    const onEdit = jest.fn();
    const store = memoryStore([fits]);
    drawStudio({ store, initialView: 'custom', onEdit });
    press('studio.palette.personal:p-fits.more');
    press('studio.more.edit');
    expect(onEdit).toHaveBeenCalledWith('p-fits');

    press('studio.palette.personal:p-fits.more');
    press('studio.more.delete');
    expect(store.listPalettes()).toHaveLength(0);
    expect(screen.getByText(say('studio.none'), { exact: false })).toBeTruthy();
  });

  it('Edit is disabled with its reason for a palette the four slots cannot hold', () => {
    const two = storedPalette('p-two', 'Two neutrals', [
      [SLUGS[0]!, 'anchor'],
      [SLUGS[1]!, 'neutral'],
      [SLUGS[2]!, 'neutral'],
    ]);
    const onEdit = jest.fn();
    drawStudio({ store: memoryStore([two]), initialView: 'custom', onEdit });
    press('studio.palette.personal:p-two.more');
    expect(screen.getByText(say('palettes.editUnfit'))).toBeTruthy();
    press('studio.more.edit');
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('DECOY — a curated palette has no overflow: it is not the person’s to edit or delete', () => {
    drawStudio({ onEdit: jest.fn() });
    expect(screen.queryByTestId(`studio.palette.${FIRST.key}.more`)).toBeNull();
  });
});

/* ------------------------------------------------------------------------- 16 */

const PAGES = trayPages(allEntries());
/** The slug the n-th tile of the tray's open page shows. */
const tileSlug = (page: number, n: number): string => PAGES[page]![n]!.entry.slug;

describe('16: the slots, the tray and the saves (ADR-0165)', () => {
  it('an empty draft takes the first tile into slot 1, then brings slot 2 in hand', () => {
    drawBuilder();
    press('builder.tray.tile.0');
    expect(screen.getByTestId('builder.slot.anchor.hex')).toBeTruthy();
    press('builder.tray.tile.1');
    expect(screen.getByTestId('builder.slot.light.hex')).toBeTruthy();
  });

  it('Replace puts its slot in hand; the tile its colour holds, chosen again, empties it', () => {
    const draft: PaletteDraft = {
      name: 'x',
      members: [
        { slug: tileSlug(0, 0), role: 'anchor' },
        { slug: tileSlug(0, 1), role: 'light' },
      ],
    };
    drawBuilder({ initialDraft: draft });
    press('builder.slot.light.replace');
    press('builder.tray.tile.1');
    expect(screen.queryByTestId('builder.slot.light.hex')).toBeNull();
    expect(screen.getByTestId('builder.slot.light.empty')).toBeTruthy();
  });

  it('a locked slot keeps its colour and draws no Replace; Locked unlocks it', () => {
    const draft: PaletteDraft = {
      name: 'x',
      members: [{ slug: tileSlug(0, 0), role: 'anchor' }],
      locked: new Set(['anchor']),
    };
    drawBuilder({ initialDraft: draft });
    expect(screen.queryByTestId('builder.slot.anchor.replace')).toBeNull();
    press('builder.slot.anchor.locked');
    expect(screen.getByTestId('builder.slot.anchor.replace')).toBeTruthy();
  });

  it('the chevrons step the tray a page, and stop at its ends', () => {
    drawBuilder();
    const first = screen.getByTestId('builder.tray.tile.0');
    expect(first.props['accessibilityLabel']).toContain(PAGES[0]![0]!.entry.name.en);
    press('builder.tray.next');
    expect(screen.getByTestId('builder.tray.tile.0').props['accessibilityLabel']).toContain(
      PAGES[1]![0]!.entry.name.en,
    );
    press('builder.tray.previous');
    press('builder.tray.previous');
    expect(screen.getByTestId('builder.tray.tile.0').props['accessibilityLabel']).toContain(
      PAGES[0]![0]!.entry.name.en,
    );
  });

  it('opens the tray on the page holding the draft’s first colour', () => {
    const slug = SLUGS[30]!;
    drawBuilder({ initialDraft: { name: 'x', members: [{ slug, role: 'anchor' }] } });
    const page = pageOf(PAGES, slug)!;
    expect(page).toBeGreaterThan(0);
    expect(screen.getByTestId('builder.tray.tile.0').props['accessibilityLabel']).toContain(
      PAGES[page]![0]!.entry.name.en,
    );
  });

  it('Save writes through the schema and stays; a second save updates the same record', () => {
    const store = memoryStore();
    drawBuilder({
      store,
      initialDraft: {
        name: 'Evening walk',
        category: 'kasane',
        members: [
          { slug: SLUGS[0]!, role: 'anchor' },
          { slug: SLUGS[1]!, role: 'light' },
        ],
      },
    });
    press('builder.save');
    expect(store.listPalettes()).toHaveLength(1);
    expect(store.listPalettes()[0]?.category).toBe('kasane');
    expect(screen.getByText(say('studio.saved'))).toBeTruthy();
    press('builder.save');
    expect(store.written).toHaveLength(2);
    expect(new Set(store.written).size).toBe(1);
    expect(store.listPalettes()).toHaveLength(1);
  });

  it('Create & Save saves and returns to My Custom Palettes', () => {
    const onSaved = jest.fn();
    const store = memoryStore();
    drawBuilder({
      store,
      onSaved,
      initialDraft: { name: 'Evening walk', members: [{ slug: SLUGS[0]!, role: 'anchor' }] },
    });
    press('builder.create');
    expect(store.listPalettes()).toHaveLength(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('both saves refuse a draft the schema refuses, and the bar says why', () => {
    const onSaved = jest.fn();
    const store = memoryStore();
    drawBuilder({ store, onSaved });
    expect(screen.getByText(say('studio.problem.empty'))).toBeTruthy();
    press('builder.save');
    press('builder.create');
    expect(store.listPalettes()).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('naming the draft clears the reason; a type chip sets the category the record carries', () => {
    const store = memoryStore();
    drawBuilder({
      store,
      initialDraft: { name: '', members: [{ slug: SLUGS[0]!, role: 'anchor' }] },
    });
    expect(screen.getByText(say('studio.problem.noName'))).toBeTruthy();
    act(() => {
      fireEvent.changeText(screen.UNSAFE_getByType(TextInput), 'Evening walk');
    });
    expect(screen.queryByText(say('studio.problem.noName'))).toBeNull();
    press('builder.type.seasonal');
    press('builder.save');
    expect(store.listPalettes()[0]?.category).toBe('seasonal');
  });

  it('FR-35’s Replace puts the proposed colour in the slot it names', () => {
    const draft: PaletteDraft = {
      name: 'Hard to separate',
      members: [
        { slug: 'kawaki-suna', role: 'anchor' },
        { slug: 'usu-shiba', role: 'light' },
      ],
    };
    const [finding] = findSeparationProblems(
      draft.members.map((m) => ({
        id: m.role,
        label: entryBySlug(m.slug)!.entry.name.en,
        color: colorFor(entryBySlug(m.slug)!.entry),
      })),
    );
    const proposed = entryBySlug(finding!.alternative!.slug)!;
    drawBuilder({ initialDraft: draft });
    press('builder.cvd.swap.light');
    // Slot 2 now holds the proposed colour.
    expect(screen.getByTestId('builder.slot.light.hex').props['children']).toBe(
      proposed.derived.hex,
    );
  });

  it('DECOY — FR-35’s swap refuses a locked slot', () => {
    const draft: PaletteDraft = {
      name: 'Hard to separate',
      members: [
        { slug: 'kawaki-suna', role: 'anchor' },
        { slug: 'usu-shiba', role: 'light' },
      ],
      locked: new Set(['light']),
    };
    drawBuilder({ initialDraft: draft });
    press('builder.cvd.swap.light');
    expect(screen.getByTestId('builder.slot.light.hex').props['children']).toBe(
      entryBySlug('usu-shiba')!.derived.hex,
    );
  });
});

/* ------------------------------------------------------------------------- the seams (E-235, E-237) */

describe('the seams F-251’s effects name', () => {
  /** Every source file under a directory, recursively. */
  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory()
        ? sources(join(dir, d.name))
        : /\.tsx?$/u.test(d.name)
          ? [join(dir, d.name)]
          : [],
    );

  it('declares a strip not judged only on 10’s band, as ADR-0162 says (E-235)', () => {
    // Any way of passing it — a literal, an expression, a spread of props that names it — is found,
    // and only 10's band's literal `false` is declared (the review, L5).
    const src = join(__dirname, '..', 'src');
    const declared = sources(src).flatMap((f) =>
      (readFileSync(f, 'utf8').match(/\bjudged\s*[=:][^,\n}]*/gu) ?? []).map(
        (use) => `${relative(src, f).split(sep).join('/')} ${use.replace(/\s+/gu, '')}`,
      ),
    );
    expect(declared).toStrictEqual(['screens/PaletteStudio.tsx judged={false']);
  });

  it('the export route reads the palette and the saved id it is sent (E-237)', () => {
    const route = readFileSync(
      join(__dirname, '..', 'app', '(tabs)', 'profile', 'export.tsx'),
      'utf8',
    );
    expect(route).toContain('first(params.palette)');
    expect(route).toContain('first(params.saved)');
    expect(route).toContain(
      'exportSubjectFor(slug, deviceRepository().listPalettes(), colours, pair, palette, saved)',
    );
  });
});

/* ------------------------------------------------------------------------- the review's fixes */

describe('the review’s fixes (F-251)', () => {
  it('10 reads the store again when it comes back into view, and shows a palette just saved (S1)', () => {
    const store = memoryStore();
    const view = (revision: number) => (
      <ThemeProvider theme="dark">
        <PaletteStudio store={store} revision={revision} />
      </ThemeProvider>
    );
    const { rerender } = render(view(0));
    store.savePalette(
      {
        id: 'p-new',
        nameEn: 'Just saved',
        nameJa: 'Just saved',
        classification: 'editorial',
        category: 'contemporary',
        versionId: '2026.09.3',
        members: [],
      },
      1,
    );
    // DECOY: until the route says the page is shown again, nothing re-reads.
    expect(screen.queryByText('Just saved')).toBeNull();
    rerender(view(1));
    expect(screen.getAllByText('Just saved').length).toBeGreaterThan(0);
  });

  it('16’s slot names its colour in kanji, romaji and English, as 16 does (S2)', () => {
    const slug = SLUGS[0]!;
    const entry = entryBySlug(slug)!;
    drawBuilder({ initialDraft: { name: 'x', members: [{ slug, role: 'anchor' }] } });
    const line = String(screen.getByTestId('builder.slot.anchor.name').props['children']);
    expect(line).toContain(entry.entry.name.kanji);
    expect(line.toLowerCase()).toContain(entry.entry.name.romaji.toLowerCase());
    expect(line).toContain(entry.entry.name.en);
  });

  it('a locked slot draws the on-state dot before its padlock; an unlocked one none (S3)', () => {
    const draft: PaletteDraft = {
      name: 'x',
      members: [
        { slug: SLUGS[0]!, role: 'anchor' },
        { slug: SLUGS[1]!, role: 'light' },
      ],
      locked: new Set(['anchor']),
    };
    drawBuilder({ initialDraft: draft });
    expect(
      screen.getByTestId('builder.slot.anchor.locked.dot', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.queryByTestId('builder.slot.light.locked.dot', { includeHiddenElements: true }),
    ).toBeNull();
    // The Locked control names its slot (L2).
    expect(screen.getByTestId('builder.slot.anchor.locked').props['accessibilityLabel']).toContain(
      'Slot 1',
    );
  });

  it('on a full draft the first slot not locked is in hand: a tile fills it, and it says so (M2)', () => {
    const draft: PaletteDraft = {
      name: 'x',
      members: [
        { slug: tileSlug(0, 0), role: 'anchor' },
        { slug: tileSlug(0, 1), role: 'light' },
        { slug: tileSlug(0, 2), role: 'neutral' },
        { slug: tileSlug(0, 3), role: 'accent' },
      ],
      locked: new Set(['anchor']),
    };
    drawBuilder({ initialDraft: draft });
    // Slot 2 is in hand on opening, shown as 16 draws it — by its framed tile — its word still Replace.
    expect(screen.getByTestId('builder.slot.light.replace').props['accessibilityLabel']).toContain(
      say('palettes.replace'),
    );
    expect(screen.getByTestId('builder.tray.tile.1').props['accessibilityState']).toMatchObject({
      selected: true,
    });
    // A tile says which slot it fills.
    expect(screen.getByTestId('builder.tray.tile.5').props['accessibilityHint']).toContain(
      'Slot 2',
    );
    press('builder.tray.tile.5');
    expect(screen.getByTestId('builder.slot.light.hex').props['children']).toBe(
      entryBySlug(tileSlug(0, 5))!.derived.hex,
    );
    // Pressing Replace says so in words: slot 3 reads Choosing, announced as selected.
    press('builder.slot.neutral.replace');
    const replace = screen.getByTestId('builder.slot.neutral.replace');
    expect(replace.props['accessibilityLabel']).toContain(say('palettes.choosing'));
    expect(replace.props['accessibilityState']).toMatchObject({ selected: true });
    expect(screen.getByTestId('builder.tray.tile.6').props['accessibilityHint']).toContain(
      'Slot 3',
    );
  });

  it('Replace brings the tray to the page holding its slot’s colour (M2)', () => {
    const far = PAGES[2]![0]!.entry.slug;
    drawBuilder({
      initialDraft: {
        name: 'x',
        members: [
          { slug: tileSlug(0, 0), role: 'anchor' },
          { slug: far, role: 'light' },
        ],
      },
    });
    // It opens on the first colour's page.
    expect(screen.getByTestId('builder.tray.tile.0').props['accessibilityLabel']).toContain(
      PAGES[0]![0]!.entry.name.en,
    );
    press('builder.slot.light.replace');
    expect(screen.getByTestId('builder.tray.tile.0').props['accessibilityLabel']).toContain(
      PAGES[2]![0]!.entry.name.en,
    );
  });

  it('a tile’s name is cut at its edge at large text, never drawn on the tray (M3)', () => {
    drawBuilder();
    const names = screen.UNSAFE_getAllByType(Tategaki);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      let clipped = false;
      for (let at = name.parent; at !== null && !clipped; at = at.parent) {
        const style = StyleSheet.flatten((at.props as { style?: StyleProp<ViewStyle> }).style);
        clipped = style.overflow === 'hidden';
      }
      expect(clipped).toBe(true);
    }
  });

  it('Edit is refused with its reason for a palette built against another corpus version (M4)', () => {
    const older = {
      ...storedPalette('p-old', 'Older', [[SLUGS[0]!, 'anchor']]),
      versionId: '2025.01.1',
    };
    const onEdit = jest.fn();
    drawStudio({ store: memoryStore([older]), initialView: 'custom', onEdit });
    press('studio.palette.personal:p-old.more');
    expect(screen.getByText(say('palettes.editOtherVersion'))).toBeTruthy();
    press('studio.more.edit');
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('the export bar says why it is idle on a view with nothing to export (L9)', () => {
    drawStudio({ initialView: 'custom', onExport: jest.fn() });
    expect(screen.getByText(say('palettes.exportNone'))).toBeTruthy();
  });

  it('16’s edit state draws its own title and action words (M7)', () => {
    drawBuilder({
      editingId: 'p-1',
      initialDraft: { name: 'Evening walk', members: [{ slug: SLUGS[0]!, role: 'anchor' }] },
    });
    expect(screen.getByText(say('palettes.editTitle'))).toBeTruthy();
    expect(screen.getByText(say('palettes.saveAndReturn'))).toBeTruthy();
    expect(screen.queryByText(say('palettes.createTitle'))).toBeNull();
  });
});
