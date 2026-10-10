/**
 * The colour-vision preview, as the app holds it (F-240, ADR-0131 §5).
 *
 * **In memory, at the root, and never written.** The provider takes no store, so there is no path
 * from a preview mode to a stored row, an archive or an export: criterion 2's *"never changes a
 * stored value or an exported file"* holds by construction, and `vision.test` holds it by test. A
 * preview is a check a person makes, not a preference — it is gone after a restart, so the app never
 * relaunches simulated behind a native splash that cannot be.
 *
 * It sits OUTSIDE `ThemeProvider` (`app/_layout.tsx`), and hands the mode to `@irodora/ui`'s
 * `VisionPreviewProvider`, so every theme below — the person's, a nested one, the launch overlay's —
 * paints through it.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { VisionPreviewProvider, type VisionMode } from '@irodora/ui';

export interface VisionValue {
  /** The mode in force: `standard` until a person chooses another. */
  readonly vision: VisionMode;
  /** Choose a mode. Held in memory only. */
  readonly choose: (mode: VisionMode) => void;
}

const VisionContext = createContext<VisionValue | undefined>(undefined);

export function VisionProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const [vision, choose] = useState<VisionMode>('standard');
  const value = useMemo(() => ({ vision, choose }), [vision]);
  return (
    <VisionContext.Provider value={value}>
      <VisionPreviewProvider mode={vision}>{children}</VisionPreviewProvider>
    </VisionContext.Provider>
  );
}

/** The preview and the way to change it. Throws outside a provider rather than guessing. */
export function useVision(): VisionValue {
  const value = useContext(VisionContext);
  if (value === undefined)
    throw new Error('useVision() outside a <VisionProvider>: the preview is held at the root.');
  return value;
}
