/**
 * The layout primitives (F-140).
 *
 * ## What is actually being proven here
 *
 * That a screen **cannot** express spacing as a number. The behavioural half — that `gap="lg"`
 * produces 16 — is worth little on its own, because a component that read the wrong step would
 * still pass a test written against whatever it read. The half that matters is the compile-time
 * refusal, and `tsc` errors on an unused `@ts-expect-error`, so each of those directives is an
 * assertion in **both** directions: it passes only while the careless form is still refused, and
 * it starts failing the moment somebody widens the type.
 *
 * That arrangement is F-139's, and `color-core`'s `color.test.ts` uses it for ADR-0005's
 * positional provenance. **The decoys matter as much as the refusals** — a prop type that
 * rejected *every* value would satisfy all four refusals below and be worse than the gap it
 * closed, so each refusal is paired with a case asserting the valid form still compiles.
 */

import { render } from '@testing-library/react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Row, Screen, Section, Stack, Surface, Text, ThemeProvider } from '../src/index.js';

const draw = (node: React.JSX.Element) =>
  render(<ThemeProvider theme="light">{node}</ThemeProvider>);

/** Flattened style of the first host view under the tree, whatever RN nested it in. */
function styleOf(tree: ReturnType<typeof draw>, testID: string): Record<string, unknown> {
  const node = tree.getByTestId(testID);
  const style: unknown = node.props['style'];
  if (Array.isArray(style))
    return Object.assign({}, ...(style as object[])) as Record<string, unknown>;
  return (style ?? {}) as Record<string, unknown>;
}

describe('a step name resolves to the step the manifest declares', () => {
  it.each([
    ['xs', nativeSpacing.xs],
    ['md', nativeSpacing.md],
    ['xl2', nativeSpacing.xl2],
    ['xl5', nativeSpacing.xl5],
  ] as const)('Stack gap=%s -> %s', (step, expected) => {
    const tree = draw(
      <Stack gap={step} testID="s">
        <Text size="body" color="foreground">
          Ai-nezumi
        </Text>
      </Stack>,
    );
    expect(styleOf(tree, 's')['gap']).toBe(expected);
  });

  it('Row lays out horizontally and centres by default', () => {
    const tree = draw(
      <Row gap="sm" testID="r">
        <Text size="body" color="foreground">
          Kakishibu
        </Text>
      </Row>,
    );
    const style = styleOf(tree, 'r');
    expect(style['flexDirection']).toBe('row');
    expect(style['gap']).toBe(nativeSpacing.sm);
    // The default that exists because a swatch beside its label is the case this replaces.
    expect(style['alignItems']).toBe('center');
  });

  it('Surface resolves its padding through the scale', () => {
    const tree = draw(
      <Surface level="1" padding="lg" testID="surf">
        <Text size="body" color="foreground">
          Ai-nezumi
        </Text>
      </Surface>,
    );
    expect(styleOf(tree, 'surf')['padding']).toBe(nativeSpacing.lg);
  });
});

describe('the screen title reaches the display tier', () => {
  /*
   * THE CRITERION THE FEATURE TURNS ON. Every screen in the product opened at `title` (22px),
   * so the scale it rendered was 22-to-10 while the manifest specified 72-to-10. This asserts
   * the size that actually reached the node rather than the prop that was passed — the same
   * distinction F-088 needed for `heading`, where the prop was set and the role was not.
   */
  it('renders its title at display.2, not title', () => {
    const tree = draw(<Screen title="Atlas" scroll={false} />);
    const node = tree.getByText('Atlas');
    const style: unknown = node.props['style'];
    const flat = (
      Array.isArray(style) ? Object.assign({}, ...(style as object[])) : (style ?? {})
    ) as Record<string, unknown>;
    expect(flat['fontSize']).toBe(34);
  });

  it('announces the title as a heading', () => {
    const tree = draw(<Screen title="Atlas" scroll={false} />);
    expect(tree.getByRole('header', { name: 'Atlas' })).toBeTruthy();
  });

  it('renders no header block when it has neither title nor eyebrow', () => {
    const tree = draw(
      <Screen scroll={false}>
        <Text size="body" color="foreground">
          Body only
        </Text>
      </Screen>,
    );
    expect(tree.queryByRole('header')).toBeNull();
  });

  it('Section keeps its heading at title, one tier below the screen', () => {
    // The tiers have to DIFFER or the scale has no contrast — a screen and its sections set at
    // the same size is the 24-against-16 default the visual-taste skill names.
    const tree = draw(<Section title="Harmony" />);
    const node = tree.getByText('Harmony');
    const style: unknown = node.props['style'];
    const flat = (
      Array.isArray(style) ? Object.assign({}, ...(style as object[])) : (style ?? {})
    ) as Record<string, unknown>;
    expect(flat['fontSize']).toBe(22);
  });
});

/**
 * The compile-time half, and the whole point of the feature.
 *
 * Each refusal is followed by a decoy asserting the valid form still compiles. Without the
 * decoys, a prop typed `never` would satisfy every refusal here and refuse the entire scale.
 */
describe('spacing cannot be expressed as a number (F-140)', () => {
  it('refuses a numeric gap on Stack', () => {
    // @ts-expect-error — 8 is a value somebody chose; `sm` is the decision the manifest argues
    // for. A convention in a document would have let this through.
    const bad = <Stack gap={8} />;
    expect(bad).toBeTruthy();
    const good = <Stack gap="sm" />;
    expect(good).toBeTruthy();
  });

  it('refuses a numeric gap on Row', () => {
    // @ts-expect-error — same refusal, different primitive. Both are asserted because a type
    // shared by two components can be widened on one of them.
    const bad = <Row gap={16} />;
    expect(bad).toBeTruthy();
    const good = <Row gap="lg" />;
    expect(good).toBeTruthy();
  });

  it('refuses a numeric padding on Screen and on Surface', () => {
    // @ts-expect-error — the page inset.
    const badScreen = <Screen padding={20} />;
    expect(badScreen).toBeTruthy();
    // @ts-expect-error — Surface was the LEAK: a tokenised component with an untokenised prop,
    // and all 32 of its call sites passed a literal.
    const badSurface = <Surface padding={12} />;
    expect(badSurface).toBeTruthy();
    const goodScreen = <Screen padding="xl2" />;
    const goodSurface = <Surface padding="md" />;
    expect(goodScreen).toBeTruthy();
    expect(goodSurface).toBeTruthy();
  });

  it('refuses a step the scale does not contain', () => {
    // @ts-expect-error — `xxl` is not a step. This is the case a numeric type would NOT have
    // caught, and it is why the prop is a key of the emitted token rather than a hand-written
    // union that agreed with the manifest on the day it was typed.
    const bad = <Stack gap="xxl" />;
    expect(bad).toBeTruthy();
    const good = <Stack gap="xl5" />;
    expect(good).toBeTruthy();
  });

  it('refuses a style prop, because that would re-admit every literal', () => {
    // @ts-expect-error — `style` is omitted from every primitive deliberately. A passthrough
    // would give back everything the types above refuse, in the one place nobody greps.
    const bad = <Stack style={{ gap: 8 }} />;
    expect(bad).toBeTruthy();
  });
});
