/**
 * The round picture mockup `23` draws at the head of a finished profile (F-241, FR-26).
 *
 * ## It is decoration, and the type is where that is enforced
 *
 * **There is no `Color` in this file and no way to put one in it.** Every other component here
 * that shows something visual takes a `Color` because ADR-0005 makes provenance unavoidable for a
 * colour a person might act on. An avatar is the opposite case: it is a picture somebody chose to
 * look at, nothing is measured from it, and a prop that accepted a colour would be the first place
 * *"no face or colour is read from it"* could quietly stop being true.
 *
 * ADR-0010's argument is that this product does not read a person's colouring off a photograph of
 * their face. This component is the visible half of that promise, so it takes a `uri`, a `size`
 * and a name, and returns nothing.
 *
 * ## The mark stands in, rather than a grey circle with initials
 *
 * A person with no picture gets **the product's own mark**, monochrome, at the same diameter.
 * Initials would need a name this product does not ask for (there is no account — ADR-0051), and
 * a silhouette of a head is a drawing of a person who is not there. The mark is the one image the
 * app already owns that means *this is yours*.
 *
 * ## Round, because `23` draws it round
 *
 * `Swatch`'s corners are a measured scale step and `C7` resolves a round SAMPLE to a rounded
 * square — neither reaches here. A photograph is not a colour a person judges, and `23` draws a
 * circle, so this is a circle (golden rule 14).
 */

import { Image, View } from 'react-native';
import { nativeRadius } from '@irodora/design-tokens';
import { Mark } from './brand.js';

/** `23.avatar` is 51 × 50 px on that render — 36.5 × 35.5 dp. The drawn size, rounded to the dp. */
export const AVATAR_SIZE = 36;

/**
 * How much of the circle the mark takes when there is no picture.
 *
 * The mark is a drawing with its own margins and a photograph is edge to edge, so rendering both
 * at the same number would make the mark look larger than the picture it replaces. Two thirds is
 * what puts the two at the same visual weight; it is a ratio rather than a second size constant
 * so the fallback follows any `size` a caller passes.
 */
const MARK_RATIO = 2 / 3;

export interface AvatarProps {
  /**
   * The picture, already read and encoded by the caller.
   *
   * A `uri` rather than bytes: this package has no device seam and is not growing one for an
   * image. `null` is *"there is no picture"*, which is the ordinary state and renders the mark.
   */
  readonly uri: string | null;
  /** Rendered diameter. Defaults to what `23` draws. */
  readonly size?: number;
  /**
   * What a screen reader announces.
   *
   * **Never the person's picture described**, because nothing here knows what is in it — this is
   * the name of the thing the avatar stands for, which the caller supplies from its own copy.
   * Omitting it makes the avatar decorative, which is right when the title beside it already
   * says what this is: a header that announced *"picture"* and then *"Personal Colour Profile"*
   * would be two stops for one thing.
   */
  readonly label?: string;
}

export function Avatar({ uri, size = AVATAR_SIZE, label }: AvatarProps): React.JSX.Element {
  return (
    <View
      {...(label === undefined
        ? // Decorative, hidden from both platforms rather than merely unlabelled — the same
          // distinction `Mark` draws, and for the same reason.
          {
            accessible: false,
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants' as const,
          }
        : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label })}
      style={{
        width: size,
        height: size,
        borderRadius: nativeRadius.pill,
        // CLIPPED, so a rectangular photograph is a circle rather than a rectangle with a round
        // shadow. `overflow: 'hidden'` on the parent is the only thing that rounds an `Image` on
        // Android; `borderRadius` on the image itself is honoured on iOS and ignored there.
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        /*
         * NO RING AND NO DISC, because `23.avatar` binds `"tokens": {}` — F-220 read no fill, no
         * border and no radius token for this element, and the pale edge in the image belongs to
         * the stock illustration inside the circle rather than to a border around it. A keyline
         * here would be a colour nothing drew, which is exactly what rule 14 refuses.
         *
         * So the empty state is the mark ON THE SURFACE BEHIND IT. `23` never draws that state —
         * it always draws a picture — and what the absent state IS comes from F-241's first
         * criterion, *"replaced by the mark when absent"*, rather than from an agent's idea of
         * what a placeholder looks like.
         */
      }}
    >
      {uri === null ? (
        <Mark size={Math.round(size * MARK_RATIO)} color="foreground.2" />
      ) : (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          // `cover`, so a portrait photograph fills the circle rather than being letterboxed
          // into it with bands of ground at the sides — the wardrobe cell's reasoning.
          resizeMode="cover"
          // The picture is decorative WITHIN the avatar: the wrapper above carries the name, if
          // there is one, and a second announcement of "image" adds nothing to act on.
          accessible={false}
        />
      )}
    </View>
  );
}
