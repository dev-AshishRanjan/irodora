/**
 * Every bundled face, keyed by the family name a component sets (F-226, ADR-0112).
 *
 * The names come from the manifest (`nativeFaces`), and this is the one place each name meets its
 * file. `satisfies` holds the two together at compile time: a face the manifest adds without an
 * asset here, or an asset here the manifest does not name, is a type error rather than a
 * `fontFamily` that silently resolves to the platform face on a device.
 *
 * The root layout hands this map to `useFonts` and holds the first frame until all of it has
 * loaded, so the launch hand-over keeps its no-gap order (criterion 4).
 */

import type { nativeFaces } from '@irodora/design-tokens';
import GelasioRegular from '../assets/fonts/Gelasio-Regular.ttf';
import NotoSansJP from '../assets/fonts/NotoSansJP-Subset.ttf';
import NotoSerifJPRegular from '../assets/fonts/NotoSerifJP-Subset.ttf';

type Family = (typeof nativeFaces)[keyof typeof nativeFaces]['family'];

export const FONT_ASSETS = {
  NotoSansJP,
  'Gelasio-Regular': GelasioRegular,
  'NotoSerifJP-Regular': NotoSerifJPRegular,
} as const satisfies Record<Family, number>;
