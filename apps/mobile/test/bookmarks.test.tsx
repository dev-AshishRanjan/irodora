/**
 * The bookmarked set, between the store and the screens (F-237, ADR-0135).
 *
 * The store's own tests prove what is written. These prove the screen shows what was written:
 * the set is read once, a change is written before it is shown, and a write that fails shows
 * nothing it did not store. They also hold the two routes to the controls ADR-0135 places, so a
 * later rebuild of 05 or 06 that drops one fails here rather than in a person's hands (E-204).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '@irodora/ui';
import {
  BookmarksProvider,
  ColourBookmark,
  useBookmarks,
  type BookmarkStore,
  type BookmarksValue,
} from '../src/bookmarks';
import { allEntries } from '../src/corpus';
import { t } from '../src/i18n';

const slug = allEntries()[0]!.entry.slug;
const other = allEntries()[1]!.entry.slug;

/** An in-memory store that counts what it was asked, so a test can tell a read from a write. */
function memoryStore(initial: readonly string[] = []) {
  const live = new Set(initial);
  const calls = { list: 0, writes: [] as [string, string, number][] };
  const store: BookmarkStore = {
    listBookmarks: () => {
      calls.list += 1;
      return [...live].sort();
    },
    bookmarkColor: (s, now) => {
      calls.writes.push(['bookmark', s, now]);
      live.add(s);
    },
    unbookmarkColor: (s, now) => {
      calls.writes.push(['unbookmark', s, now]);
      live.delete(s);
    },
  };
  return { store, calls, live };
}

/** Captures the context value so a test can drive it, the way a route would. */
function harness(store: BookmarkStore): () => BookmarksValue {
  let captured: BookmarksValue | null = null;
  function Probe(): React.JSX.Element {
    captured = useBookmarks();
    return <Text>{[...captured.bookmarked].join(',')}</Text>;
  }
  render(
    <BookmarksProvider store={store} now={() => 1000}>
      <Probe />
    </BookmarksProvider>,
  );
  return () => {
    if (captured === null) throw new Error('the probe never rendered');
    return captured;
  };
}

describe('the provider', () => {
  it('reads the store once, at mount', () => {
    const { store, calls } = memoryStore([slug]);
    const read = harness(store);
    expect([...read().bookmarked]).toStrictEqual([slug]);
    expect(calls.list).toBe(1);
  });

  it('writes, then shows what was written', () => {
    const { store, calls } = memoryStore();
    const read = harness(store);
    act(() => {
      read().setBookmarked(slug, true);
    });
    expect(calls.writes).toStrictEqual([['bookmark', slug, 1000]]);
    expect(read().bookmarked.has(slug)).toBe(true);
    act(() => {
      read().setBookmarked(slug, false);
    });
    expect(calls.writes.at(-1)).toStrictEqual(['unbookmark', slug, 1000]);
    expect(read().bookmarked.has(slug)).toBe(false);
  });

  it('setting the state it already has writes nothing', () => {
    const { store, calls } = memoryStore([slug]);
    const read = harness(store);
    act(() => {
      read().setBookmarked(slug, true);
      read().setBookmarked(other, false);
    });
    expect(calls.writes).toHaveLength(0);
  });

  it('DECOY: a store that throws leaves the set as it was', () => {
    const { store } = memoryStore([slug]);
    const failing: BookmarkStore = {
      ...store,
      bookmarkColor: () => {
        throw new Error('the disk is full');
      },
    };
    const read = harness(failing);
    expect(() => {
      act(() => {
        read().setBookmarked(other, true);
      });
    }).toThrow('the disk is full');
    // Nothing the next launch would not show.
    expect([...read().bookmarked]).toStrictEqual([slug]);
  });

  it('throws outside its provider, rather than reading an empty set', () => {
    function Bare(): React.JSX.Element {
      useBookmarks();
      return <Text>never</Text>;
    }
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Bare />)).toThrow(/no BookmarksProvider/);
    jest.restoreAllMocks();
  });
});

describe("06's bookmark", () => {
  const draw = (on: boolean, s = slug, onChange = jest.fn()) => {
    render(
      <ThemeProvider theme="dark">
        <ColourBookmark slug={s} on={on} onChange={onChange} />
      </ThemeProvider>,
    );
    return onChange;
  };

  it('is a button named by what it does, announcing whether it is on', () => {
    for (const on of [false, true]) {
      draw(on);
      const button = screen.getByRole('button', { name: t('en', 'detail.bookmark') });
      expect((button.props['accessibilityState'] as { selected?: boolean }).selected).toBe(on);
      screen.unmount();
    }
  });

  it('asks for the opposite of its state when pressed', () => {
    const onChange = draw(false);
    fireEvent.press(screen.getByRole('button', { name: t('en', 'detail.bookmark') }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders nothing for a colour this corpus does not hold', () => {
    draw(false, 'not-a-corpus-slug');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('the routes carry the controls ADR-0135 places (E-204)', () => {
  const source = (path: string): string => readFileSync(join(__dirname, '..', path), 'utf8');

  it('the root layout mounts the provider with the device repository', () => {
    expect(source('app/_layout.tsx')).toMatch(/<BookmarksProvider store=\{deviceRepository\(\)\}>/);
  });

  it("a colour's page reads the set and draws the bookmark in its header", () => {
    const page = source('app/(tabs)/atlas/[slug].tsx');
    expect(page).toMatch(/useBookmarks\(\)/);
    expect(page).toMatch(/headerRight: \(\) => \(\s*<ColourBookmark/);
  });

  it('DECOY: a route that has nothing to do with bookmarks does not read them', () => {
    expect(source('app/(tabs)/atlas/compare.tsx')).not.toMatch(/useBookmarks/);
  });
});
