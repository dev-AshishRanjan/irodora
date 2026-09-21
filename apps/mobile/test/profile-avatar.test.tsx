/**
 * Choosing the profile's picture, and the three things that never happen (F-241, FR-26).
 *
 * ## What is answerable here
 *
 * The store's own suite proves the bytes round-trip and that forgetting the profile forgets the
 * face. This layer owns the path between a person's tap and that row: the LIBRARY is asked and
 * not the camera, a refused file is a result rather than a crash, cancelling changes nothing,
 * and the picture reaches the screen as something `<Image>` can render.
 *
 * ## The negative half is asserted on imports, not on prose
 *
 * `profile.test.ts` holds the scan that refuses a colour, vision or ML specifier on `avatar.ts`,
 * with a decoy on the pattern. Its first draft scanned the file's TEXT and went red on the
 * module's own docblock — [[a-comment-that-mentions-a-forbidden-import-is-not-one]].
 */

import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import { ingestImage, type SanitisedImage } from '@irodora/store';

import { avatarUri, chooseAvatar, type AvatarStore } from '../src/profile/avatar';
import type { ImageSource } from '../src/wardrobe/source';
import { ProfileSetup } from '../src/screens/ProfileSetup';
import type { ProfileStore } from '../src/profile/store';
import { en } from '../src/i18n/en';

const be32 = (v: number): number[] => [
  (v >>> 24) & 0xff,
  (v >>> 16) & 0xff,
  (v >>> 8) & 0xff,
  v & 0xff,
];
const ascii = (s: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 1) out.push(s.charCodeAt(i));
  return out;
};
const chunk = (type: string, body: number[]): number[] => [
  ...be32(body.length),
  ...ascii(type),
  ...body,
  0,
  0,
  0,
  0,
];
const png = (): Uint8Array =>
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk('IHDR', [...be32(64), ...be32(64), 0x08, 0x02, 0x00, 0x00, 0x00]),
    ...chunk('IDAT', [0x78, 0x9c, 0x63, 0x00]),
    ...chunk('IEND', []),
  ]);

/** An in-memory avatar store — the four methods, and a record of what was written. */
function fakeStore(): AvatarStore & { readonly rows: Map<string, SanitisedImage> } {
  const rows = new Map<string, SanitisedImage>();
  return {
    rows,
    putProfileAvatar: (id, image) => {
      rows.set(id, image);
    },
    getProfileAvatarInfo: (id) => {
      const row = rows.get(id);
      return row === undefined ? undefined : { format: row.format };
    },
    getProfileAvatar: (id) => rows.get(id)?.bytes,
    clearProfileAvatar: (id) => {
      rows.delete(id);
    },
  };
}

/** A picker that answers with whatever it was told to, and counts which half was asked. */
function fakePicker(answer: Uint8Array | null): ImageSource & {
  readonly library: () => number;
  readonly camera: () => number;
} {
  let library = 0;
  let camera = 0;
  return {
    pickFromLibrary: async () => {
      library += 1;
      return Promise.resolve(answer);
    },
    captureWithCamera: async () => {
      camera += 1;
      return Promise.resolve(answer);
    },
    library: () => library,
    camera: () => camera,
  };
}

const PROFILE = 'profile-1';

describe('choosing a picture', () => {
  it('asks the library and stores what comes back', async () => {
    const store = fakeStore();
    const picker = fakePicker(png());
    const result = await chooseAvatar(picker, store, PROFILE, 1000);

    expect(result).toStrictEqual({ kind: 'chosen' });
    expect(store.rows.has(PROFILE)).toBe(true);
  });

  it('NEVER asks the camera', () => {
    /*
     * `ImageSource` offers both halves and this feature uses one. A profile picture taken
     * through the camera would put a capture path beside a face and ask for a permission the
     * feature does not need — and the port being shared is exactly why the choice has to be
     * asserted rather than assumed from the module's name.
     */
    const picker = fakePicker(png());
    void chooseAvatar(picker, fakeStore(), PROFILE, 1000);
    expect(picker.camera()).toBe(0);
  });

  it('counts the library call, so "never the camera" is not "never anything"', async () => {
    // The decoy for the assertion above: a picker nobody called reports zero of both.
    const picker = fakePicker(png());
    await chooseAvatar(picker, fakeStore(), PROFILE, 1000);
    expect(picker.library()).toBe(1);
  });

  it('says nothing and stores nothing when the person changes their mind', async () => {
    const store = fakeStore();
    const result = await chooseAvatar(fakePicker(null), store, PROFILE, 1000);

    expect(result).toStrictEqual({ kind: 'cancelled' });
    expect(store.rows.size).toBe(0);
  });

  it('reports a file it cannot use as a result, not as a crash', async () => {
    /*
     * A screenshot in an unexpected format, a RAW export, a file too large — all things a
     * person does by accident, none of them a fault. A caller that had to catch an exception
     * for an ordinary choice would end up with a `try` around a tap.
     */
    const store = fakeStore();
    const result = await chooseAvatar(fakePicker(Uint8Array.from([1, 2, 3])), store, PROFILE, 1);

    expect(result).toStrictEqual({ kind: 'refused' });
    expect(store.rows.size).toBe(0);
  });

  it('lets anything that is NOT a refused picture through', async () => {
    // A database that cannot be written is not a refused photograph, and showing "that file
    // could not be used" for it would send somebody to fix the wrong thing.
    const store = fakeStore();
    const broken: AvatarStore = {
      ...store,
      putProfileAvatar: () => {
        throw new Error('database is read-only');
      },
    };
    await expect(chooseAvatar(fakePicker(png()), broken, PROFILE, 1)).rejects.toThrow('read-only');
  });
});

describe('the picture, on its way to the screen', () => {
  it('comes back as something <Image> can render', () => {
    const store = fakeStore();
    store.putProfileAvatar(PROFILE, ingestImage(png()), 1000);

    const uri = avatarUri(store, PROFILE);
    // A `data:` URI is the ONLY kind a BLOB in SQLCipher can have — the photograph is
    // deliberately not a file on disk, so there is no path to hand to `<Image>`.
    expect(uri).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/u);
  });

  it('is null when there is none, which is the ordinary state', () => {
    expect(avatarUri(fakeStore(), PROFILE)).toBeNull();
  });
});

describe('the screen', () => {
  const profileStore: ProfileStore = {
    saveProfile: () => {
      /* nothing is written in this file */
    },
    listProfiles: () => [],
  };

  const screen = (props: Partial<Parameters<typeof ProfileSetup>[0]> = {}) =>
    render(
      <ThemeProvider>
        <ProfileSetup store={profileStore} {...props} />
      </ThemeProvider>,
    );

  it('offers no picture controls when nobody wired them', () => {
    // A button that picks nothing is worse than no button — the call F-154 made about the
    // device colour, and what the conformance suite renders.
    const tree = screen();
    expect(tree.queryByText(en['profile.avatar.choose'])).toBeNull();
    expect(tree.queryByText(en['profile.avatar.remove'])).toBeNull();
  });

  it('asks to add one when there is none, and to change it when there is', () => {
    const without = screen({ onChooseAvatar: () => undefined });
    expect(without.queryByText(en['profile.avatar.choose'])).not.toBeNull();
    expect(without.queryByText(en['profile.avatar.replace'])).toBeNull();

    const with_ = screen({ onChooseAvatar: () => undefined, avatarUri: 'data:image/png;base64,x' });
    expect(with_.queryByText(en['profile.avatar.replace'])).not.toBeNull();
    expect(with_.queryByText(en['profile.avatar.choose'])).toBeNull();
  });

  it('offers removal only when there is something to remove', () => {
    const empty = screen({ onChooseAvatar: () => undefined, onRemoveAvatar: () => undefined });
    expect(empty.queryByText(en['profile.avatar.remove'])).toBeNull();

    const full = screen({
      onChooseAvatar: () => undefined,
      onRemoveAvatar: () => undefined,
      avatarUri: 'data:image/png;base64,x',
    });
    expect(full.queryByText(en['profile.avatar.remove'])).not.toBeNull();
  });

  it('says what the picture is NOT used for, every time it offers one', () => {
    /*
     * A colour app asking somebody for a photograph of themselves has to say plainly that
     * nothing reads it, because reading colour off an image is what the rest of this product
     * does. This is the sentence ADR-0010's promise is made of on the screen.
     */
    expect(
      screen({ onChooseAvatar: () => undefined }).queryByText(en['profile.avatar.hint']),
    ).not.toBeNull();
  });

  it('shows the refusal when the route reports one, and not before', () => {
    expect(
      screen({ onChooseAvatar: () => undefined }).queryByText(en['profile.avatar.refused']),
    ).toBeNull();
    expect(
      screen({ onChooseAvatar: () => undefined, avatarRefused: true }).queryByText(
        en['profile.avatar.refused'],
      ),
    ).not.toBeNull();
  });

  it('calls back when the button is pressed', () => {
    let asked = 0;
    const tree = screen({
      onChooseAvatar: () => {
        asked += 1;
      },
    });
    fireEvent.press(tree.getByText(en['profile.avatar.choose']));
    expect(asked).toBe(1);
  });
});
