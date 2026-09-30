/**
 * The app bar — the header the mockups draw at the top of a screen (F-234, criterion 2; ADR-0118).
 *
 * ## What the mockups draw, and what this takes
 *
 * Twenty-one screens draw a header, recorded as `NN.header` (`ui:AppBar`) with its members. They are
 * arrangements of a few parts, so the parts are props and a screen passes the arrangement it draws:
 *
 * - **a back control** — a glyph and a word (`06 08 09 12 13 16 18–21 24 26`), or the glyph alone
 *   (`22`) — or **a lead** in its place, `23`'s avatar. Never both: the type refuses it;
 * - **a title**, centred on the bar (`02 08 09 11–13 16–24 26`) or leading (`05 15`), in the bar's row
 *   or on its own row below it (`10`), and bilingual in two ways: `English • 日本語` on one line
 *   (`02 05 08 09 11 12 13`), or English over Japanese (`22 23 24`). `06` draws none;
 * - **trailing** icons (one to three: `05 06 08 19–21 23 24 26`), one labelled button
 *   (`09 10 12 13 16 18`) or the mark (`15 22`). Four icons is refused by type;
 * - **a divider** between the back control and the title (`19`), **a row below** (`05`'s counts and
 *   links), **a fill** (`18 19 24`, `surface.1`) and **a rule** under the bar
 *   (`05 06 08 12 13 16 18 24 26`).
 *
 * ## A centred title is centred on the bar
 *
 * `08`'s title is centred on the frame, not on the space between its back control and its export
 * glyph. So the two sides are laid out at the width of the wider one: each side's content is
 * measured, and both sides take at least the larger width. A long title then truncates in the
 * middle rather than sliding off-centre or under a control. Before the first layout both are zero,
 * which is a flex row: the title is never drawn over a control, only briefly off-centre.
 *
 * ## The inset is the screen's
 *
 * `Screen` passes `topInset` — the status bar's height — and the bar pads by it, so a fill runs
 * behind the status bar as `18`, `19` and `24` draw it. A surface never passes it (E-084).
 *
 * ## Heights
 *
 * `height` is the element's drawn height below the status bar, and it is a minimum: at 200 % text the
 * bar grows rather than clipping its title (A7). The defaults are recomputed by `app-bar.test`:
 * {@link APP_BAR_HEIGHT} for a single line and {@link APP_BAR_STACKED} for English over Japanese.
 */

import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Mark, type MarkProps } from './brand.js';
import { Button, type ButtonProps } from './Button.js';
import type { GlyphName } from './Glyph.js';
import { IconButton } from './IconButton.js';
import type { Script } from './layout.js';
import { Text, type TextWeight, type TypeSize } from './Text.js';
import { useTheme } from './theme.js';

/**
 * A single-line bar's height below the status bar, in dp: the median, over the bars that draw a rule
 * (`08 12 13 16 18`), of the rule's top.
 */
export const APP_BAR_HEIGHT = 46.5;

/**
 * An English-over-Japanese bar's height below the status bar, in dp: `24`'s, the one stacked bar
 * whose extent is drawn (its fill), less the status bar drawn into it, snapped to half a dp.
 */
export const APP_BAR_STACKED = 57;

/**
 * The bar's side inset, in dp: the median, over the 17 bars that draw something in their left third,
 * of the left edge of the leftmost (a back control, a leading title or a lead). The right side takes
 * the same by default; a screen whose drawing differs passes its own.
 */
export const APP_BAR_INSET = 15.5;

/** The rule under the bar, and the divider in it, in dp: one dp of `border`, as the tab bar's. */
export const APP_BAR_RULE = 1;

interface TitleBase {
  readonly text: string;
  /** Centred on the bar, or after the leading control. */
  readonly align: 'centre' | 'leading';
  /** In the bar's row, or on its own row under it (`10`). */
  readonly placement: 'bar' | 'below';
  readonly size: TypeSize;
  readonly weight: TextWeight;
}

/**
 * The title. `inline` sets `English • 日本語` on one line; `stacked` sets the Japanese under the
 * English, in the subtitle element's own step and in `foreground.2`. Either way it is ONE heading
 * node holding both scripts, the Japanese run in the Japanese face.
 */
export type AppBarTitle = TitleBase &
  (
    | { readonly layout: 'inline'; readonly ja?: string; readonly jaSize?: never }
    | { readonly layout: 'stacked'; readonly ja: string; readonly jaSize: TypeSize }
  );

/**
 * The back control: a glyph and the word beside it, or the glyph alone, named. A drawn word is the
 * control's name; where none is drawn, `name` is.
 */
export type AppBarBack = {
  readonly glyph: 'back' | 'chevron-left';
  readonly onPress: () => void;
  /** The ink: `foreground`, or `foreground.2` where the drawing sets it secondary. */
  readonly ink?: 'foreground' | 'foreground.2';
  readonly testID?: string;
} & (
  | { readonly label: string; readonly name?: never }
  | { readonly name: string; readonly label?: never }
);

/** A trailing icon: a glyph, what it does, and its drawn size. */
export interface AppBarIcon {
  readonly glyph: GlyphName;
  readonly label: string;
  readonly onPress: () => void;
  /** The glyph's size in dp: the element's own. */
  readonly size?: number;
  readonly color?: 'foreground' | 'foreground.2';
  readonly testID?: string;
}

/** A labelled button: the forms `Button` draws with a word. */
type LabelledButton = Exclude<ButtonProps, { readonly icon: GlyphName }>;

/** What the bar ends with: one to three icons, one labelled button, or the mark. */
export type AppBarTrailing =
  | {
      readonly icons:
        | readonly [AppBarIcon]
        | readonly [AppBarIcon, AppBarIcon]
        | readonly [AppBarIcon, AppBarIcon, AppBarIcon];
      readonly button?: never;
      readonly mark?: never;
    }
  | { readonly button: LabelledButton; readonly icons?: never; readonly mark?: never }
  | {
      readonly mark: Pick<MarkProps, 'size' | 'color' | 'label'>;
      readonly icons?: never;
      readonly button?: never;
    };

/** A back control or a lead, never both. */
type Leading =
  | { readonly back?: AppBarBack; readonly lead?: never }
  | { readonly lead: ReactNode; readonly back?: never };

export type AppBarProps = Leading & {
  readonly title?: AppBarTitle;
  readonly trailing?: AppBarTrailing;
  /** `19`'s rule between the back control and the title: its drawn height in dp. */
  readonly divider?: number;
  /** A row under the bar's, above its rule: `05`'s counts and links. */
  readonly below?: ReactNode;
  readonly fill?: 'surface.1';
  /** A rule under the bar. */
  readonly rule?: boolean;
  /** The drawn height below the status bar, in dp: a minimum, so larger text grows the bar. */
  readonly height?: number;
  /** The side inset, in dp. */
  readonly inset?: number;
  /** Between the controls in the bar, and between its rows, in dp. */
  readonly gap?: number;
  /** The script the title's `text` is written in. `ja` is always Japanese. */
  readonly script?: Script;
  /** The status bar's height. Set by `Screen`, never by a surface. */
  readonly topInset?: number;
  readonly testID?: string;
};

export function AppBar({
  back,
  lead,
  title,
  trailing,
  divider,
  below,
  fill,
  rule = false,
  height,
  inset = APP_BAR_INSET,
  gap = nativeSpacing.sm,
  script = 'latin',
  topInset = 0,
  testID,
}: AppBarProps): React.JSX.Element {
  const { colors } = useTheme();
  const [side, setSide] = useState(0);
  const centred = title?.align === 'centre' && title.placement === 'bar';
  const measured: { onLayout?: (event: LayoutChangeEvent) => void } = centred
    ? {
        onLayout: (event) => {
          const width = event.nativeEvent.layout.width;
          setSide((was) => (width > was ? width : was));
        },
      }
    : {};

  const leading = back === undefined ? (lead ?? null) : <BackControl back={back} script={script} />;
  const heading = title === undefined ? null : <Title title={title} script={script} />;

  /** A side of the row: at least the wider side's width when the title is centred. */
  const sideOf = (end: boolean): ViewStyle =>
    centred
      ? {
          flexGrow: 1,
          flexBasis: 0,
          minWidth: side,
          flexDirection: 'row',
          justifyContent: end ? 'flex-end' : 'flex-start',
          alignItems: 'center',
        }
      : { flexDirection: 'row', alignItems: 'center' };

  const start =
    leading === null && divider === undefined && !centred ? null : (
      <View style={sideOf(false)}>
        <View {...measured} style={{ flexDirection: 'row', alignItems: 'center', gap }}>
          {leading}
          {divider === undefined || back === undefined ? null : (
            <View
              style={{ width: APP_BAR_RULE, height: divider, backgroundColor: colors.border }}
            />
          )}
        </View>
      </View>
    );

  const middle =
    title?.placement === 'bar' ? (
      <View style={centred ? { flexShrink: 1, alignItems: 'center' } : { flex: 1 }}>{heading}</View>
    ) : (
      <View style={{ flex: 1 }} />
    );

  const end =
    trailing === undefined && !centred ? null : (
      <View style={sideOf(true)}>
        <View {...measured} style={{ flexDirection: 'row', alignItems: 'center', gap }}>
          {trailing === undefined ? null : <TrailingControls trailing={trailing} gap={gap} />}
        </View>
      </View>
    );

  return (
    <View
      testID={testID}
      style={{
        paddingTop: topInset,
        ...(fill === undefined ? {} : { backgroundColor: colors[fill] }),
        ...(rule ? { borderBottomWidth: APP_BAR_RULE, borderBottomColor: colors.border } : {}),
      }}
    >
      <View
        style={{
          minHeight: height ?? (title?.layout === 'stacked' ? APP_BAR_STACKED : APP_BAR_HEIGHT),
          paddingHorizontal: inset,
          justifyContent: 'center',
          gap,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
          {start}
          {middle}
          {end}
        </View>
        {title?.placement === 'below' ? heading : null}
        {below ?? null}
      </View>
    </View>
  );
}

/** The title, as one heading node holding both scripts. */
function Title({
  title,
  script,
}: {
  readonly title: AppBarTitle;
  readonly script: Script;
}): React.JSX.Element {
  if (title.layout === 'stacked')
    return (
      <Text
        heading
        size={title.size}
        weight={title.weight}
        color="foreground"
        script={script}
        numberOfLines={2}
        {...(title.align === 'centre' ? { align: 'center' as const } : {})}
      >
        {title.text}
        {'\n'}
        <Text size={title.jaSize} color="foreground.2" script="japanese">
          {title.ja}
        </Text>
      </Text>
    );
  return (
    <Text
      heading
      size={title.size}
      weight={title.weight}
      color="foreground"
      script={script}
      numberOfLines={1}
    >
      {title.text}
      {title.ja === undefined ? null : (
        <Text size={title.size} weight={title.weight} color="foreground" script="japanese">
          {` • ${title.ja}`}
        </Text>
      )}
    </Text>
  );
}

function BackControl({
  back,
  script,
}: {
  readonly back: AppBarBack;
  readonly script: Script;
}): React.JSX.Element {
  const ink = back.ink ?? 'foreground';
  const id = back.testID === undefined ? {} : { testID: back.testID };
  return back.label === undefined ? (
    <IconButton name={back.glyph} label={back.name} color={ink} onPress={back.onPress} {...id} />
  ) : (
    <Button
      variant="plain"
      label={back.label}
      glyph={back.glyph}
      ink={ink}
      script={script}
      onPress={back.onPress}
      {...id}
    />
  );
}

function TrailingControls({
  trailing,
  gap,
}: {
  readonly trailing: AppBarTrailing;
  readonly gap: number;
}): React.JSX.Element {
  if (trailing.icons !== undefined)
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
        {trailing.icons.map((icon) => (
          <IconButton
            key={icon.label}
            name={icon.glyph}
            label={icon.label}
            onPress={icon.onPress}
            {...(icon.size === undefined ? {} : { size: icon.size })}
            {...(icon.color === undefined ? {} : { color: icon.color })}
            {...(icon.testID === undefined ? {} : { testID: icon.testID })}
          />
        ))}
      </View>
    );
  if (trailing.button !== undefined) return <Button {...trailing.button} />;
  return <Mark {...trailing.mark} />;
}
