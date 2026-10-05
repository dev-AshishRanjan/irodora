/**
 * Figures — every number a data display prints (F-235, criterion 4; FR-61).
 *
 * ## What a figure owes
 *
 * FR-61: *"Numeric values are shown by default … with the space each was computed in named beside
 * it."* A figure therefore carries what it is and where it was computed, not only its digits:
 *
 * - a **measure** names its `quantity` (ΔE00, ΔL*, L*, h) and its `space` (CIEDE2000, CIELAB,
 *   OKLCh), and may print a `unit` symbol (°);
 * - a **share** is a fraction printed as a percentage;
 * - a **count** names what it counts.
 *
 * The type requires each name, and an empty one is refused at render: a figure whose space is `''`
 * satisfies the type and tells nobody anything.
 *
 * ## Visible and spoken
 *
 * {@link figureText} is what the drawing prints — `−0.4°`, `48.2`, `84%` — because the mockups print
 * the quantity and the space in the display's own label, not beside each digit. {@link figureName}
 * is what a screen reader says, and it **always** carries the quantity, the value, the unit and the
 * space: a person who cannot see the row's label still hears what the number is.
 *
 * ## Typeset
 *
 * {@link FigureValue} sets a figure in tabular digits (`Text numeric`, governed by 15's switch) and
 * selectable (FR-48: a value a person may want to copy), with its spoken name as the accessible name.
 * The conformance rule `ragged-figure` reports any figure on a rendered tree that is not tabular.
 */

import { Text, type TextWeight, type TypeSize, type ColorFor } from './Text.js';
import type { Script } from './layout.js';

/** U+2212 MINUS SIGN: a delta's sign at the width of its plus, not a hyphen. */
export const MINUS = '−';

/** A signed number, its sign shown: a delta without its direction is half a fact. */
export function signed(n: number, places = 2): string {
  return `${n > 0 ? '+' : n < 0 ? MINUS : ''}${Math.abs(n).toFixed(places)}`;
}

/** A colour measurement: a value, what it is, and the space it was computed in. */
export interface MeasureFigure {
  readonly kind: 'measure';
  readonly value: number;
  readonly places: number;
  /** Print the sign, `+` or U+2212 (a delta). */
  readonly signed?: boolean;
  /** What the value is: `ΔE00`, `ΔL*`, `L*`, `h`. */
  readonly quantity: string;
  /** A unit symbol printed after the digits: `°`. Most colour quantities have none. */
  readonly unit?: string;
  /** Where it was computed: `CIEDE2000`, `CIELAB`, `OKLCh`. */
  readonly space: string;
}

/** A fraction of a whole, printed as a percentage. */
export interface ShareFigure {
  readonly kind: 'share';
  /** 0–1. */
  readonly fraction: number;
  /** What it is a share of, for a screen reader: `wardrobe coverage`. */
  readonly of: string;
}

/** A count of things. */
export interface CountFigure {
  readonly kind: 'count';
  readonly value: number;
  readonly signed?: boolean;
  /** What is counted, for a screen reader: `pairings`. */
  readonly noun: string;
}

export type Figure = MeasureFigure | ShareFigure | CountFigure;

function required(field: string, value: string): string {
  if (value.trim() === '')
    throw new TypeError(`Figure: ${field} is empty — a figure names what it is (FR-61)`);
  return value;
}

/** The digits as printed: a share rounds to a whole percent. */
function digits(figure: Figure): string {
  switch (figure.kind) {
    case 'measure':
      return figure.signed === true
        ? signed(figure.value, figure.places)
        : figure.value < 0
          ? `${MINUS}${Math.abs(figure.value).toFixed(figure.places)}`
          : figure.value.toFixed(figure.places);
    case 'share':
      if (!(figure.fraction >= 0 && figure.fraction <= 1))
        throw new RangeError(
          `Figure: a share is a fraction in [0, 1], not ${String(figure.fraction)}`,
        );
      return `${String(Math.round(figure.fraction * 100))}%`;
    case 'count':
      return figure.signed === true ? signed(figure.value, 0) : String(figure.value);
  }
}

/** What the drawing prints: the digits and a measure's unit symbol. */
export function figureText(figure: Figure): string {
  if (figure.kind === 'measure') {
    required('quantity', figure.quantity);
    required('space', figure.space);
    return `${digits(figure)}${figure.unit ?? ''}`;
  }
  if (figure.kind === 'share') required('of', figure.of);
  else required('noun', figure.noun);
  return digits(figure);
}

/**
 * What a screen reader says: always the quantity, the value, its unit and the space — `ΔE00 2.40,
 * CIEDE2000` — or the share and what of, or the count and its noun.
 */
export function figureName(figure: Figure): string {
  const text = figureText(figure);
  switch (figure.kind) {
    case 'measure':
      return `${figure.quantity} ${text}, ${figure.space}`;
    case 'share':
      return `${figure.of} ${text}`;
    case 'count':
      return `${text} ${figure.noun}`;
  }
}

export interface FigureValueProps<S extends TypeSize> {
  readonly figure: Figure;
  readonly size: S;
  readonly color: ColorFor<S>;
  readonly weight?: TextWeight;
  readonly script?: Script;
  readonly testID?: string;
}

/** A figure set in tabular digits, selectable, and named in full for a screen reader. */
export function FigureValue<S extends TypeSize>({
  figure,
  size,
  color,
  weight,
  script = 'latin',
  testID,
}: FigureValueProps<S>): React.JSX.Element {
  return (
    <Text
      size={size}
      color={color}
      script={script}
      numeric
      selectable
      accessibilityLabel={figureName(figure)}
      {...(weight === undefined ? {} : { weight })}
      {...(testID === undefined ? {} : { testID })}
    >
      {figureText(figure)}
    </Text>
  );
}

/**
 * The spoken name of several figures read together — a readout row's components. Measures that
 * share a space name it once, at the end (`L 0.490, C 0.035, h 240.2°, OKLCh`), rather than after
 * every value; anything else is each figure's own name.
 */
export function figuresName(figures: readonly Figure[]): string {
  const measures = figures.filter((f): f is MeasureFigure => f.kind === 'measure');
  const spaces = new Set(measures.map((f) => f.space));
  if (measures.length === figures.length && spaces.size === 1)
    return `${measures.map((f) => `${f.quantity} ${figureText(f)}`).join(', ')}, ${measures[0]?.space ?? ''}`;
  return figures.map(figureName).join('; ');
}
