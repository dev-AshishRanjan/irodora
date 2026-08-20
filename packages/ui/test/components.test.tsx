/**
 * `ThemeProvider`, `Text`, `Icon` and `Status`.
 *
 * The negative type assertions use `@ts-expect-error`, which makes **`tsc` itself** the
 * check: if the line under it ever starts compiling, `pnpm typecheck` goes red on the unused
 * directive rather than quietly passing. That is the same mechanism
 * `packages/design-tokens/test/status-types.test.ts` uses, and it is why the restriction
 * cannot rot into a comment.
 */

import { render, screen } from '@testing-library/react-native';
import {
  nativeColors,
  nativeDefaultTheme,
  nativeLargeTextSizes,
  nativeSmallTextSizes,
  nativeType,
  STATUS_PAIRING,
} from '@irodora/design-tokens';
import { useColorScheme as rnUseColorScheme } from 'react-native';
import {
  Icon,
  ICON_TOKENS,
  resolveThemeName,
  Status,
  Text,
  type ColorFor,
  type TypeSize,
  ThemeProvider,
  useTheme,
} from '../src/index.js';
import { resolveTextNodes, type TestNode } from '../src/testing/index.js';

function tree(element: React.JSX.Element): TestNode {
  const json = render(element).toJSON();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

const wrap = (node: React.JSX.Element, theme?: 'light' | 'dark'): React.JSX.Element =>
  theme === undefined ? (
    <ThemeProvider>{node}</ThemeProvider>
  ) : (
    <ThemeProvider theme={theme}>{node}</ThemeProvider>
  );

describe('the icon registry closes the gap NFR-9 had left open', () => {
  it('covers every icon token the manifest declares', () => {
    const declared = Object.values(STATUS_PAIRING).map((s) => s.iconToken);
    expect(declared.length).toBeGreaterThan(0);
    for (const token of declared) expect(ICON_TOKENS).toContain(token);
  });

  it('declares no glyph the manifest does not name — the other direction', () => {
    // One direction alone lets the registry grow names nothing declares, or lets a declared
    // token quietly lose its glyph. Until this feature, `icon.check`, `icon.alert` and
    // `icon.cross` resolved to NOTHING: three strings in a JSON file.
    const declared = new Set(Object.values(STATUS_PAIRING).map((s) => s.iconToken));
    for (const token of ICON_TOKENS) expect(declared.has(token)).toBe(true);
    expect(ICON_TOKENS).toHaveLength(declared.size);
  });

  it('renders a DIFFERENT SHAPE per status, not the same shape in three colours', () => {
    // NFR-9 is about the channel, not the presence of an icon. Three dots that differ only
    // by hue would satisfy every "has an icon" assertion and fail the person the rule is for.
    // Compared with colour stripped out, so a shape difference is what has to carry it.
    const shapeOf = (token: (typeof ICON_TOKENS)[number]): string =>
      JSON.stringify(tree(wrap(<Icon token={token} color="foreground" />))).replace(
        /"#[0-9a-fA-F]{6}"/gu,
        '"COLOUR"',
      );
    const shapes = ICON_TOKENS.map(shapeOf);
    expect(new Set(shapes).size).toBe(ICON_TOKENS.length);
  });
});

describe('Status carries all three channels', () => {
  it('renders the visible text, not only an accessibility label', () => {
    // A label only assistive technology can reach still leaves a sighted person with CVD
    // looking at two marks that differ by hue.
    render(wrap(<Status kind="bad" text="Could not read this colour" />));
    expect(screen.getByText('Could not read this colour')).toBeTruthy();
  });

  it('throws on a whitespace label — the violation reached through the front door', () => {
    // `text: '   '` satisfies `string`. statusPresentation refuses it, and Status composes
    // that function rather than re-deriving the rule.
    expect(() => render(wrap(<Status kind="ok" text="   " />))).toThrow(/visible text label/u);
  });

  it('renders an icon alongside, for every status kind', () => {
    for (const kind of ['ok', 'warn', 'bad'] as const) {
      const json = JSON.stringify(tree(wrap(<Status kind={kind} text="Checked" />)));
      // The icon's own colour token is present, which is only true if a glyph rendered.
      expect(json).toContain(nativeColors.light[STATUS_PAIRING[kind].colorToken]);
    }
  });
});

describe('the theme comes from the manifest, not from a guess in a screen', () => {
  it('falls back to the manifest defaultTheme when the platform states no preference', () => {
    // apps/mobile/app/_layout.tsx falls back to 'light' in a `??` nobody recorded, while the
    // manifest says dark and DESIGN-SYSTEM.md lists the question as still open. Three answers.
    //
    // NOTE ON HOW THIS IS TESTED: the first version rendered the provider and expected 'dark'.
    // It failed — jest-expo's useColorScheme returns 'light', which is a STATED preference,
    // so the fallback correctly did not fire. Mocking the hook would have tested the mock, so
    // the decision was extracted instead and is checked at all four inputs.
    expect(nativeDefaultTheme).toBe('dark');
    expect(resolveThemeName(null)).toBe(nativeDefaultTheme);
    expect(resolveThemeName(undefined)).toBe(nativeDefaultTheme);
    // 'unspecified' is a real ColorSchemeName value and is NOT a preference for light. A
    // resolver written as `=== 'dark' ? dark : light` treats it as one, silently.
    expect(resolveThemeName('unspecified')).toBe(nativeDefaultTheme);
    // A stated preference is honoured — including when it disagrees with the default, which
    // is the case a "always return the default" implementation would pass the line above on.
    expect(resolveThemeName('light')).toBe('light');
    expect(resolveThemeName('dark')).toBe('dark');
    // An explicit override wins over both.
    expect(resolveThemeName('light', 'dark')).toBe('dark');
  });

  it('honours the platform preference through the provider', () => {
    function Probe(): React.JSX.Element {
      const { name } = useTheme();
      return (
        <Text size="body" color="foreground">
          {name}
        </Text>
      );
    }
    render(wrap(<Probe />));
    // Whatever the platform reports, the provider must agree with the pure resolver rather
    // than deciding separately.
    expect(screen.getByText(resolveThemeName(rnUseColorScheme()))).toBeTruthy();
  });

  it('throws outside a provider rather than rendering plausible wrong colours', () => {
    function Orphan(): React.JSX.Element {
      useTheme();
      return <></>;
    }
    expect(() => render(<Orphan />)).toThrow(/outside a <ThemeProvider>/u);
  });

  it('resolves the same token to different values in the two themes', () => {
    // Guards against a provider that ignores its theme prop — which would pass every other
    // assertion here while making the dark theme cosmetic.
    const read = (theme: 'light' | 'dark'): string | undefined =>
      resolveTextNodes(
        tree(
          wrap(
            <Text size="body" color="foreground">
              x
            </Text>,
            theme,
          ),
        ),
        theme,
      )[0]?.color;
    expect(read('light')).not.toBe(read('dark'));
  });
});

describe('Text applies the scale and cannot express the pairing that fails AA', () => {
  it('applies the emitted absolute metrics, not the manifest ratios', () => {
    const node = resolveTextNodes(
      tree(
        wrap(
          <Text size="body" color="foreground">
            Ai-nezumi
          </Text>,
          'light',
        ),
      ),
      'light',
    )[0];
    expect(node?.fontSize).toBe(nativeType.latin.body.fontSize);
    expect(node?.color).toBe(nativeColors.light.foreground);
  });

  it('uses the Japanese leading when the script says so', () => {
    const json = JSON.stringify(
      tree(
        wrap(
          <Text size="body" color="foreground" script="japanese">
            藍鼠
          </Text>,
          'light',
        ),
      ),
    );
    expect(json).toContain(String(nativeType.japanese.body.lineHeight));
    expect(nativeType.japanese.body.lineHeight).toBeGreaterThan(nativeType.latin.body.lineHeight);
  });

  it('never disables font scaling, and permits at least 200 percent', () => {
    const node = resolveTextNodes(
      tree(
        wrap(
          <Text size="body" color="foreground">
            x
          </Text>,
          'light',
        ),
      ),
      'light',
    )[0];
    expect(node?.allowFontScaling).toBe(true);
    expect(node?.maxFontSizeMultiplier ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('splits the scale at the floor, with both sides non-empty', () => {
    // A split with an empty side would make the type constraint below vacuous — it would
    // compile everything, or nothing, and either way prove nothing.
    expect(nativeLargeTextSizes.length).toBeGreaterThan(0);
    expect(nativeSmallTextSizes.length).toBeGreaterThan(0);
  });

  it('ACCEPTS a largeText-only token at a large size', () => {
    // The positive half. Without it, a constraint that simply banned foreground.3 everywhere
    // would pass every negative assertion below while being wrong.
    const ok = (
      <Text size="title" color="foreground.3">
        Ai-nezumi
      </Text>
    );
    expect(() => render(wrap(ok, 'light'))).not.toThrow();
  });

  it('DOES NOT COMPILE for a largeText-only token below the floor', () => {
    // Asserted at the TYPE, not through JSX. `@ts-expect-error` binds to the next LINE, and
    // prettier splits a multi-attribute element across several — so the directive ended up
    // above a line that does not error while the real error sat four lines down, reported as
    // an unused directive. A single-line type assertion cannot drift that way.
    //
    // Every legal colour at a large size:
    const large: ColorFor<'title'> = 'foreground.3';
    void large;

    // @ts-expect-error — `foreground.3` is usage: "largeText"; `small` is 13px, under the
    // manifest's 18.66px floor. If this ever starts compiling, tsc fails on the UNUSED
    // directive rather than letting the restriction rot into a comment.
    const small: ColorFor<'small'> = 'foreground.3';
    void small;
  });

  it('DOES NOT COMPILE for a size outside the scale', () => {
    // @ts-expect-error — 'gigantic' is not a step of the manifest's type scale.
    const bad: TypeSize = 'gigantic';
    void bad;
  });
});

describe('Japanese line breaking is REQUESTED, which is all a render tree can prove', () => {
  it('passes both platform strategies for Japanese', () => {
    // Kinsoku shori — a line may not begin with a Japanese comma or a small kana. React
    // Native does not implement it; it asks the PLATFORM text engine to. So the gated half
    // is that we asked, in the form each platform understands.
    const json = JSON.stringify(
      tree(
        wrap(
          <Text size="body" color="foreground" script="japanese">
            藍鼠、それから
          </Text>,
          'light',
        ),
      ),
    );
    expect(json).toContain('push-out');
    expect(json).toContain('highQuality');
  });

  it('does NOT pass them for Latin, where they do not apply', () => {
    // Without this, the assertion above would pass on a component that sets them
    // unconditionally — which would be wrong, not merely wasteful: `push-out` changes
    // justification behaviour for Latin text too.
    const json = JSON.stringify(
      tree(
        wrap(
          <Text size="body" color="foreground">
            Ai-nezumi
          </Text>,
          'light',
        ),
      ),
    );
    expect(json).not.toContain('push-out');
    expect(json).not.toContain('highQuality');
  });

  // WHETHER THE BREAKING IS CORRECT IS NOT KNOWABLE HERE. There is no text engine in a JS
  // render tree, so no assertion in this file can see where a line actually broke. F-017
  // carries "Kinsoku line breaking is correct on a device, on iOS and on Android" as an
  // ATTESTED criterion for exactly that reason.
  //
  // Written as a comment rather than as a passing test. `expect(true).toBe(true)` under a
  // descriptive name reads as coverage in a test report and is worth nothing — which is one
  // of the six assertion shapes this feature's plan lists as grounds for rejection.
});
