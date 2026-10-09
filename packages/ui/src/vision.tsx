/**
 * Which colour-vision preview is in force (F-240, ADR-0131).
 *
 * Mockup `15` draws four modes — Standard, Protanopia, Deuteranopia, Tritanopia — and choosing one
 * repaints every token and every sample through the engine's simulation. The mode lives in its own
 * context, above every `ThemeProvider`, so a nested provider (the conformance suite forces palettes
 * by nesting) inherits it rather than resetting it, and `ThemeProvider` applies it to whichever
 * palette is painting — declared, derived or the runtime device palette.
 *
 * **Standard outside a provider**, as `useDisplaySettings` defaults to what is drawn: a component
 * rendered with no preview above it is rendered as declared, which is what every existing test and
 * every package outside the app already expects. The app holds the mode in memory and never
 * writes it (ADR-0131 §5).
 */

import { createContext, useContext, type ReactNode } from 'react';
import { PREVIEW_MODES, type PreviewMode } from '@irodora/design-tokens';

/** A preview mode: `standard`, or one of the three deficiencies `15` draws. */
export type VisionMode = PreviewMode;

/** The modes, in `15`'s order. */
export const VISION_MODES: readonly VisionMode[] = PREVIEW_MODES;

const VisionContext = createContext<VisionMode>('standard');

export interface VisionPreviewProviderProps {
  readonly mode: VisionMode;
  readonly children: ReactNode;
}

/** Puts every `ThemeProvider` below it into one preview mode. */
export function VisionPreviewProvider({
  mode,
  children,
}: VisionPreviewProviderProps): React.JSX.Element {
  return <VisionContext.Provider value={mode}>{children}</VisionContext.Provider>;
}

/** The preview mode in force: `standard` when none is set. */
export function useVisionPreview(): VisionMode {
  return useContext(VisionContext);
}
