/**
 * An offered colour is proposed, never written (F-199, criterion 2).
 *
 * The mailbox hands `AddGarment` a colour somebody chose from a combination or a slot ranking.
 * **Proposing is not storing.** A screen that mounted with an offer and wrote it would look
 * identical from the outside — the person would see the same form, with the same colour on it —
 * until they backed out and found a garment they never saved.
 *
 * Asserted of the NEW path rather than inherited from the reading one: the offer is a different
 * shape reaching a different branch of the initialiser, and "the old path did not write" is not
 * evidence about this one.
 */

import { fireEvent, render } from '@testing-library/react-native';

/*
 * Saving shows a confirmation (`useConfirm`), and HeroUI's toast reads the safe area, which jest has
 * no layout to measure. The library's own mock supplies the insets (F-240's stored-row check saves).
 */
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
import { ThemeProvider, VisionPreviewProvider, type VisionMode } from '@irodora/ui';
import { en } from '../src/i18n/en';
import { AddGarment } from '../src/screens/AddGarment';
import { allEntries } from '../src/corpus';
import type { WardrobeStore } from '../src/wardrobe';
import type { ImageSource } from '../src/wardrobe/source';
import type { NewGarment } from '@irodora/store';

/** A store that records every write and performs none. */
function recordingStore(): WardrobeStore & { readonly written: NewGarment[] } {
  const written: NewGarment[] = [];
  return {
    written,
    createGarment(garment) {
      written.push(garment);
    },
    enrichGarment() {
      /* Nothing here reads it back; the assertion is about `createGarment`. */
    },
    putGarmentImage() {
      /* Likewise. */
    },
    listGarments: () => [],
    getGarmentImageInfo: () => undefined,
    getGarmentImage: () => undefined,
  };
}

/** No pictures. This file is about the colour, and a picker would be a second variable. */
const noImages = (): ImageSource => ({
  pickFromLibrary: () => Promise.resolve(null),
  captureWithCamera: () => Promise.resolve(null),
});

const SLUG = allEntries()[0]!.entry.slug;

describe('a colour offered from a combination', () => {
  it('writes nothing when the screen opens with it', () => {
    const store = recordingStore();
    render(
      <ThemeProvider>
        <AddGarment
          store={store}
          imageSource={noImages()}
          offered={{ kind: 'corpus', slug: SLUG }}
        />
      </ThemeProvider>,
    );
    expect(store.written).toHaveLength(0);
  });

  it('writes nothing when the screen opens with a READING either', () => {
    /*
     * The decoy for the case above. If `createGarment` were never called by this fake at all —
     * a wiring mistake in the test rather than in the screen — both assertions would pass and
     * neither would mean anything. The next case is what makes them mean something.
     */
    const store = recordingStore();
    render(
      <ThemeProvider>
        <AddGarment store={store} imageSource={noImages()} offered={null} />
      </ThemeProvider>,
    );
    expect(store.written).toHaveLength(0);
  });

  it('DECOY — the recording store DOES record, so the zeroes above are not vacuous', () => {
    /*
     * A fake whose `createGarment` never pushed would make both assertions above pass while
     * checking nothing. The write goes through the real signature — `(garment, now)` — so a
     * change to it fails here rather than leaving a fake that silently stopped recording.
     */
    const store = recordingStore();
    const entry = allEntries()[0]!;
    store.createGarment(
      {
        id: 'g1',
        type: 'shirt',
        color: {
          id: 'c1',
          name: entry.entry.name.en,
          hex: entry.derived.hex,
          corpus_slug: entry.entry.slug,
        } as unknown as NewGarment['color'],
      },
      Date.now(),
    );
    expect(store.written).toHaveLength(1);
  });
});

describe('the wardrobe tally (F-236 review, S3)', () => {
  /** The recording store, holding `n` garments for the tally to count. */
  const holding = (n: number): WardrobeStore => ({
    ...recordingStore(),
    listGarments: () =>
      Array.from({ length: n }, () => ({}) as ReturnType<WardrobeStore['listGarments']>[number]),
  });
  const tally = (n: number) =>
    render(
      <ThemeProvider theme="light">
        <AddGarment store={holding(n)} imageSource={noImages()} offered={null} />
      </ThemeProvider>,
    );

  it('prints no figure for an empty wardrobe: an absence is not a zero', () => {
    const tree = tally(0);
    expect(tree.queryByText(/In your wardrobe/u)).toBeNull();
  });

  it('DECOY — a wardrobe with something in it is counted', () => {
    const tree = tally(2);
    expect(tree.getByText('In your wardrobe: 2')).toBeTruthy();
  });
});

/**
 * A colour-vision preview never reaches a stored row (F-240, ADR-0131 §5): the same garment, saved
 * in every mode, writes the same row — its ids aside, which every save makes anew. The decoy shows
 * the mode was on: the screen that saved it is painted differently.
 */
describe('a colour-vision preview never reaches a stored row (F-240)', () => {
  const MODES = ['protanopia', 'deuteranopia', 'tritanopia'] as const;
  const saveIn = (mode: VisionMode): { readonly row: string; readonly drawn: string } => {
    const store = recordingStore();
    const rendered = render(
      <VisionPreviewProvider mode={mode}>
        <ThemeProvider theme="light">
          <AddGarment
            store={store}
            imageSource={noImages()}
            offered={{ kind: 'corpus', slug: SLUG }}
          />
        </ThemeProvider>
      </VisionPreviewProvider>,
    );
    fireEvent.changeText(rendered.getByLabelText(en['wardrobe.type']), 'Shirt');
    const drawn = JSON.stringify(rendered.toJSON());
    fireEvent.press(rendered.getByLabelText(en['wardrobe.save']));
    rendered.unmount();
    expect(store.written).toHaveLength(1);
    const written = store.written[0];
    // Ids are made anew by every save; everything else is the garment.
    const row = JSON.stringify(written, (key, value: unknown) => (key === 'id' ? '·' : value));
    return { row, drawn };
  };

  it('saves the same row in every mode', () => {
    const standard = saveIn('standard');
    for (const mode of MODES)
      expect({ [mode]: saveIn(mode).row }).toStrictEqual({ [mode]: standard.row });
  });

  it('DECOY — the screen that saved it is painted differently, so the mode was on', () => {
    const standard = saveIn('standard');
    for (const mode of MODES) expect(saveIn(mode).drawn).not.toBe(standard.drawn);
  });
});
