/**
 * Page dots — where a carousel is, among how many (F-235, criterion 3; mockup 25; ADR-0120, closing
 * OQ-52).
 *
 * `25` draws four dots under its hero: the current one dark, two grey, and a smaller fourth. Every
 * number is `25`'s, recomputed by `carousel.test`. What `25` leaves open, ADR-0120 decides:
 *
 * - **The current page is a capsule, not only a darker dot.** `25` marks it by ink alone, and golden
 *   rule 13 asks for a second channel (ACCESSIBILITY §4: text, icon, shape, pattern or position). The
 *   capsule is shape: twice the dot's length, in `25`'s ink.
 * - **The other dots take `foreground.3`.** `25`'s grey (#BFBFB9) is 1.69:1 on its ground, under the
 *   3:1 a graphic a person reads needs (WCAG 1.4.11, E3).
 * - **A small dot means the pages go on past it.** At most {@link PAGE_DOTS_WINDOW} dots show; the
 *   window slides to keep the current page off its edges, and a dot at an edge with pages beyond it
 *   is drawn small — the scrolling-dots convention (Instagram's, and the page controls built on it).
 *   `25`'s small fourth dot is the first window of a set of five or more.
 * - **One element, named by the caller**, whose words must print the page and the total.
 */

import { View } from 'react-native';
import { useTheme } from './theme.js';

/** An other page's dot, in dp. */
export const PAGE_DOT = 6.5;
/** The current page's capsule, in dp: as tall as `25`'s current dot, and twice as long. */
export const PAGE_DOT_CURRENT = 7.5;
/** A dot at a window's edge with pages beyond it, in dp. */
export const PAGE_DOT_SMALL = 3.5;
/** From one dot's centre to the next, in dp. */
export const PAGE_DOTS_PITCH = 14.5;
/** At most this many dots show at once: `25` draws four. */
export const PAGE_DOTS_WINDOW = 4;

export interface PageDotsProps {
  /** The current page, from 0. */
  readonly current: number;
  readonly total: number;
  /** The words a screen reader says, printing the page and the total: `Colour 1 of 6`. */
  readonly label: string;
  readonly testID?: string;
}

export type PageDot = 'current' | 'page' | 'more';

/** Which pages show, and how each is drawn. */
export function pageDots(
  current: number,
  total: number,
): readonly { readonly page: number; readonly dot: PageDot }[] {
  if (!Number.isInteger(total) || total < 1)
    throw new RangeError(`PageDots: total ${String(total)}`);
  if (!Number.isInteger(current) || current < 0 || current >= total) {
    throw new RangeError(`PageDots: page ${String(current)} of ${String(total)}`);
  }
  const shown = Math.min(PAGE_DOTS_WINDOW, total);
  // Keep the current page off the window's edges where the pages allow it.
  const start = Math.min(Math.max(current - (PAGE_DOTS_WINDOW - 2), 0), total - shown);
  return Array.from({ length: shown }, (_, i) => {
    const page = start + i;
    const beyond = (i === 0 && start > 0) || (i === shown - 1 && start + shown < total);
    return { page, dot: page === current ? 'current' : beyond ? 'more' : 'page' };
  });
}

const diameter = (dot: PageDot): number =>
  dot === 'current' ? PAGE_DOT_CURRENT : dot === 'more' ? PAGE_DOT_SMALL : PAGE_DOT;

/** Whether `text` prints `n` as a number of its own. */
function prints(text: string, n: number): boolean {
  return new RegExp(`(^|\\D)${String(n)}(\\D|$)`, 'u').test(text);
}

export function PageDots({ current, total, label, testID }: PageDotsProps): React.JSX.Element {
  const { colors } = useTheme();
  const dots = pageDots(current, total);
  if (!prints(label, current + 1) || !prints(label, total)) {
    throw new Error(
      `PageDots: "${label}" must print the page (${String(current + 1)}) and the total (${String(total)})`,
    );
  }
  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}
    >
      {dots.map(({ page, dot }, i) => {
        const next = dots[i + 1];
        return (
          <View
            key={String(page)}
            style={{
              width: dot === 'current' ? 2 * PAGE_DOT_CURRENT : diameter(dot),
              height: diameter(dot),
              borderRadius: diameter(dot) / 2,
              // Centres a pitch apart, as 25 draws them; the capsule's extra length runs on after it.
              marginRight:
                next === undefined ? 0 : PAGE_DOTS_PITCH - (diameter(dot) + diameter(next.dot)) / 2,
              backgroundColor: dot === 'current' ? colors.foreground : colors['foreground.3'],
            }}
          />
        );
      })}
    </View>
  );
}
