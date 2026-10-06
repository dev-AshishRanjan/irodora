/**
 * The carousel — a row of items a person moves through, in the form its screen draws (F-235,
 * criterion 3; mockups 20, 22 and 23; ADR-0120).
 *
 * | form | screen | what it draws |
 * |---|---|---|
 * | `centred` | `20` | one item centred, its neighbours' edges peeking `CAROUSEL_PEEK` in from each side across `CAROUSEL_GAP` |
 * | `leading` | `22`, `23` | items from the screen's inset, `CAROUSEL_LEADING_GAP` apart, the last clipped at the edge |
 *
 * Every number is the drawing's, recomputed by `carousel.test`.
 *
 * - **The peek and the gap are held in dp**, so a wider phone widens the item, not the peeks.
 * - **A neighbour is drawn as `20` draws it: an outline**, the card's edge and corner with no fill
 *   and no content, as tall as the row. Only the current item draws its node.
 * - **A neighbour is a button** (`20` records each as `select:card.previous` and `.next`): swiping is a
 *   drag, and WCAG 2.2's 2.5.7 asks for a single-pointer way to do what a drag does. Its target is the
 *   peek and the gap beside it, `CAROUSEL_PEEK + CAROUSEL_GAP` dp, past the platform's tap target.
 *   The caller names it by what it shows, and says which one has focus, as `TabBar` is told.
 * - **Items no one can see say nothing**: only the current item and its two neighbours are reachable
 *   by a screen reader.
 * - **It comes to rest where the drawing is drawn** (ADR-0120): the centred form on an item's centre,
 *   the leading form on an item's start. No mockup draws motion; a rest the drawing does not show
 *   would be a composition nobody drew. That is a device attestation.
 */

import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { nativeRadius } from '@irodora/design-tokens';
import { CARD_EDGE } from './Card.js';
import { FocusRing } from './selection.js';
import { useTheme } from './theme.js';

/** How far each neighbour peeks in, in dp: the median of `20`'s two. */
export const CAROUSEL_PEEK = 39.25;
/** Between the centred item and each neighbour, in dp. */
export const CAROUSEL_GAP = 12.5;
/** Between leading items, in dp: the median of `22`'s and `23`'s gaps. */
export const CAROUSEL_LEADING_GAP = 7;

/** The centred item's width for a carousel this wide: the width less both peeks and gaps. */
export function centredWidth(width: number): number {
  return Math.max(0, width - 2 * (CAROUSEL_PEEK + CAROUSEL_GAP));
}

export interface CarouselItem {
  readonly key: string;
  /** Drawn while this is the current item; a neighbour is drawn as an outline. */
  readonly node: React.ReactNode;
  /** The neighbour button's name, when this item is a neighbour: what it shows, `Kuchiba`. */
  readonly name: string;
}

interface CentredProps {
  readonly form: 'centred';
  readonly items: readonly CarouselItem[];
  /** The item shown, from 0. */
  readonly index: number;
  readonly onIndexChange: (index: number) => void;
  /** The neighbour an external keyboard or Switch Control has focused. */
  readonly focused?: 'previous' | 'next';
  readonly inset?: never;
  readonly testID?: string;
}

interface LeadingProps {
  readonly form: 'leading';
  readonly items: readonly { readonly key: string; readonly node: React.ReactNode }[];
  /** Where the first item starts: the screen's own inset. */
  readonly inset: number;
  readonly index?: never;
  readonly onIndexChange?: never;
  readonly focused?: never;
  readonly testID?: string;
}

export type CarouselProps = CentredProps | LeadingProps;

export function Carousel(props: CarouselProps): React.JSX.Element {
  return props.form === 'centred' ? <Centred {...props} /> : <Leading {...props} />;
}

function Centred({
  items,
  index,
  onIndexChange,
  focused,
  testID,
}: CentredProps): React.JSX.Element {
  const { colors } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const item = centredWidth(width);
  const step = item + CAROUSEL_GAP;
  useEffect(() => {
    // Not before the row is measured: an item 0 wide would slide the first frame to the gap's offset.
    if (item > 0) scroller.current?.scrollTo({ x: index * step, animated: true });
  }, [index, item, step]);
  const outline = {
    width: item,
    borderWidth: CARD_EDGE,
    borderColor: colors.border,
    borderRadius: nativeRadius.md,
  } as const;
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    throw new RangeError(`Carousel: item ${String(index)} of ${String(items.length)}`);
  }
  return (
    <ScrollView
      ref={scroller}
      {...(testID === undefined ? {} : { testID })}
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      disableIntervalMomentum
      snapToOffsets={items.map((_, i) => i * step)}
      onLayout={(event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
      }}
      onMomentumScrollEnd={(event) => {
        if (step <= 0) return;
        const at = Math.round(event.nativeEvent.contentOffset.x / step);
        const clamped = Math.min(Math.max(at, 0), items.length - 1);
        if (clamped !== index) onIndexChange(clamped);
      }}
      contentContainerStyle={{ paddingHorizontal: CAROUSEL_PEEK + CAROUSEL_GAP, gap: CAROUSEL_GAP }}
    >
      {items.map((entry, i) => {
        if (i === index) {
          return (
            <View key={entry.key} style={{ width: item }}>
              {entry.node}
            </View>
          );
        }
        if (Math.abs(i - index) === 1) {
          // The neighbour's peek and the gap toward the centre are its target.
          const side = i < index ? 'previous' : 'next';
          return (
            <Pressable
              key={entry.key}
              accessibilityRole="button"
              accessibilityLabel={entry.name}
              hitSlop={side === 'previous' ? { right: CAROUSEL_GAP } : { left: CAROUSEL_GAP }}
              onPress={() => {
                onIndexChange(i);
              }}
              style={outline}
            >
              <FocusRing visible={focused === side} radius={nativeRadius.md} />
            </Pressable>
          );
        }
        return (
          <View
            key={entry.key}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={outline}
          />
        );
      })}
    </ScrollView>
  );
}

function Leading({ items, inset, testID }: LeadingProps): React.JSX.Element {
  const [starts, setStarts] = useState<Readonly<Record<string, number>>>({});
  const offsets = items
    .map((entry) => starts[entry.key])
    .filter((x): x is number => x !== undefined)
    .map((x) => Math.max(0, x - inset));
  return (
    <ScrollView
      {...(testID === undefined ? {} : { testID })}
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToOffsets={offsets}
      contentContainerStyle={{ paddingHorizontal: inset, gap: CAROUSEL_LEADING_GAP }}
    >
      {items.map((entry) => (
        <View
          key={entry.key}
          onLayout={(event: LayoutChangeEvent) => {
            const x = event.nativeEvent.layout.x;
            setStarts((current) =>
              current[entry.key] === x ? current : { ...current, [entry.key]: x },
            );
          }}
        >
          {entry.node}
        </View>
      ))}
    </ScrollView>
  );
}
