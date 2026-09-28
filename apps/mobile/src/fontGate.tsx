/**
 * The first frame waits for every bundled face (F-226, criterion 4; ADR-0057, ADR-0112).
 *
 * The root layout wraps its whole tree in this. Until `useFonts` reports every face in
 * `FONT_ASSETS` loaded, it draws NOTHING — and that is correct rather than a gap, because the native
 * splash is still up (the layout holds it with `preventAutoHideAsync` at module scope, and only the
 * launch overlay's first frame hides it). A frame drawn before a face is ready falls back to the
 * platform font, which is the silent failure the bundled faces exist to avoid.
 *
 * In `src/` rather than inline in the route so it can be RENDERED by a test: a test may not import a
 * route (E-099), and a hold asserted by reading source text is a hold nobody has watched hold.
 *
 * A face that fails to load keeps this drawing nothing for ever, which leaves the splash up: F-302
 * and OQ-42 record that, because no mockup draws what should show instead.
 */

import type { ReactNode } from 'react';
import { useFonts } from 'expo-font';
import { FONT_ASSETS } from './fonts';

export function FontGate({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const [loaded] = useFonts(FONT_ASSETS);
  if (!loaded) return <></>;
  return <>{children}</>;
}
