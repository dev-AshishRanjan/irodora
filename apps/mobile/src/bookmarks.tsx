/**
 * The bookmarked colours (F-237, FR-56; ADR-0135).
 *
 * `06` bookmarks a colour from its app bar; the Atlas (`05`) reads the set back through a toggle in
 * its search field. Both read one set, and this is where it lives.
 *
 * ## A context, for the reason `target.tsx` gives
 *
 * The set is written on one route and read on another, with expo-router owning everything in
 * between, so every surface that shows it has to re-render when it changes. **Screens still take
 * props**: a route reads the hook and passes the value down, so a screen never reaches for it and
 * the conformance suite can render every screen without a provider around it.
 *
 * ## Read once, written through, and read back
 *
 * The set is read from the store once, at mount — there is no second writer on this device. A
 * change is WRITTEN FIRST, then the set is read back from the store. So what the screen shows is
 * what is stored: a write that throws leaves the set as it was, and the person never sees a
 * bookmark the next launch would not.
 *
 * ## Persisted, unlike the target
 *
 * The target is something a person is doing now, and a restart forgets it on purpose. A bookmark
 * is something they kept, so it goes through the store port, into the database, and into their
 * backup.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Repository } from '@irodora/store';

/** The three methods this needs. `Repository` satisfies it; a test passes a fake. */
export type BookmarkStore = Pick<Repository, 'bookmarkColor' | 'unbookmarkColor' | 'listBookmarks'>;

export interface BookmarksValue {
  /** The bookmarked slugs. Membership is read from this one set. */
  readonly bookmarked: ReadonlySet<string>;
  /** Bookmark, or remove one. Writes first; the set shown is the one read back. */
  readonly setBookmarked: (slug: string, on: boolean) => void;
}

const BookmarksContext = createContext<BookmarksValue | undefined>(undefined);

export interface BookmarksProviderProps {
  readonly children: ReactNode;
  readonly store: BookmarkStore;
  /** Injected so a test can write at a chosen time rather than reading a clock. */
  readonly now?: () => number;
}

export function BookmarksProvider({
  children,
  store,
  now = () => Date.now(),
}: BookmarksProviderProps): React.JSX.Element {
  const [bookmarked, setSet] = useState<ReadonlySet<string>>(() => new Set(store.listBookmarks()));

  const setBookmarked = useCallback(
    (slug: string, on: boolean): void => {
      // Already so: nothing to write, and nothing to read back.
      if (bookmarked.has(slug) === on) return;
      // The write first. If it throws, nothing below runs and the set stays what is stored.
      if (on) store.bookmarkColor(slug, now());
      else store.unbookmarkColor(slug, now());
      setSet(new Set(store.listBookmarks()));
    },
    [bookmarked, store, now],
  );

  const value = useMemo<BookmarksValue>(
    () => ({ bookmarked, setBookmarked }),
    [bookmarked, setBookmarked],
  );
  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

/**
 * The bookmarked set, for a **route**.
 *
 * Throws outside its provider, like `useTarget`: a screen that silently read an empty set would
 * show every bookmark as missing, which looks like data loss.
 */
export function useBookmarks(): BookmarksValue {
  const value = useContext(BookmarksContext);
  if (value === undefined)
    throw new Error(
      'useBookmarks: no BookmarksProvider above this component. The root layout mounts one with ' +
        'the device repository; a screen takes the set as a prop so the conformance suite can ' +
        'render it.',
    );
  return value;
}
