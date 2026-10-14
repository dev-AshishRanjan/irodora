/**
 * The lookbook (F-238, FR-33; ADR-0136).
 *
 * The Outfit Lab (`13`) saves an outfit to it; the Wardrobe (`11`) reads it back under its
 * *Lookbook* choice. Both read one list, and this is where it lives — the shape `bookmarks.tsx`
 * established for the bookmarked colours, for the reason it gives: written on one route, read on
 * another, with expo-router owning everything in between. **Screens still take props.** A route
 * reads the hook and hands plain values down, so every screen renders in jest with no provider.
 *
 * ## Read once, written through, and read back
 *
 * The list is read from the store once, at mount — there is no second writer on this device. A
 * change is WRITTEN FIRST, then the list is read back, so what the screen shows is what is stored:
 * a write that throws leaves the list as it was, and nothing appears that the next launch would
 * not show. An in-app restore or erase would change the store underneath; neither exists yet, and
 * F-263 must make this read again when one does (E-205).
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { NewOutfit, Repository, StoredOutfit } from '@irodora/store';
import { compositionKey, storedKey } from './outfit/lookbook';

/** The three methods this needs. `Repository` satisfies it; a test passes a fake. */
export type LookbookStore = Pick<Repository, 'saveOutfit' | 'listOutfits' | 'removeOutfit'>;

export interface LookbookValue {
  /** The saved outfits, newest first. */
  readonly outfits: readonly StoredOutfit[];
  /** The compositions already saved, so the Lab can say an outfit is in the lookbook. */
  readonly saved: ReadonlySet<string>;
  /** Save a record. A composition already saved writes nothing (ADR-0136 D6). */
  readonly save: (outfit: NewOutfit) => void;
  /** Remove a saved outfit. It is never revived. */
  readonly remove: (id: string) => void;
}

const LookbookContext = createContext<LookbookValue | undefined>(undefined);

export interface LookbookProviderProps {
  readonly children: ReactNode;
  readonly store: LookbookStore;
  /** Injected so a test can write at a chosen time rather than reading a clock. */
  readonly now?: () => number;
}

export function LookbookProvider({
  children,
  store,
  now = () => Date.now(),
}: LookbookProviderProps): React.JSX.Element {
  const [outfits, setOutfits] = useState<readonly StoredOutfit[]>(() => store.listOutfits());
  const saved = useMemo(() => new Set(outfits.map(storedKey)), [outfits]);

  const save = useCallback(
    (outfit: NewOutfit): void => {
      // Already saved: nothing to write and nothing to read back. The store would refuse the
      // duplicate as well; asking it is a database round trip to learn what the screen knows.
      if (saved.has(compositionKey(outfit.items))) return;
      store.saveOutfit(outfit, now());
      setOutfits(store.listOutfits());
    },
    [saved, store, now],
  );

  const remove = useCallback(
    (id: string): void => {
      store.removeOutfit(id, now());
      setOutfits(store.listOutfits());
    },
    [store, now],
  );

  const value = useMemo<LookbookValue>(
    () => ({ outfits, saved, save, remove }),
    [outfits, saved, save, remove],
  );
  return <LookbookContext.Provider value={value}>{children}</LookbookContext.Provider>;
}

/**
 * The lookbook, for a **route**.
 *
 * Throws outside its provider, like `useBookmarks`: a screen that silently read an empty list would
 * show every saved outfit as gone, which looks like data loss.
 */
export function useLookbook(): LookbookValue {
  const value = useContext(LookbookContext);
  if (value === undefined)
    throw new Error(
      'useLookbook: no LookbookProvider above this component. The root layout mounts one with the ' +
        'device repository; a screen takes the lookbook as props so the conformance suite can ' +
        'render it.',
    );
  return value;
}
