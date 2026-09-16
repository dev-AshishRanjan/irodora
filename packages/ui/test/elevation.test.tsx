/**
 * The one shadow a mockup draws (F-227, ADR-0103).
 *
 * Depth in this product is tint: a surface lifts by taking a lighter token, because a shadow tints
 * what it surrounds and a sample must not be judged against a tinted surround (ADR-0044). Mockup
 * `25` draws one exception — its light cards on the washi ground — and this file is what keeps the
 * exception the size it was drawn at.
 *
 * **The negative cases are the point.** That a light card has a shadow is one assertion; that a dark
 * card, and a light level 2 or 3, have none is three, and they are the ones that would fail if
 * somebody decided the product looked better with depth everywhere.
 */

import { render } from '@testing-library/react-native';
import { nativeShadow } from '@irodora/design-tokens';
import type { DeclaredShadow } from '../src/elevation.js';
import { Card, Surface, Text, ThemeProvider } from '../src/index.js';

/** Read through the union the manifest may hold, exactly as a component reads it. */
const declared = nativeShadow as DeclaredShadow;

const draw = (theme: 'light' | 'dark', node: React.JSX.Element) =>
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

/** Flattened style of a host view, whatever RN nested it in. */
function styleOf(tree: ReturnType<typeof draw>, testID: string): Record<string, unknown> {
  const node = tree.getByTestId(testID);
  const style: unknown = node.props['style'];
  if (Array.isArray(style))
    return Object.assign({}, ...(style as object[])) as Record<string, unknown>;
  return (style ?? {}) as Record<string, unknown>;
}

const body = (
  <Text size="body" color="foreground">
    Ai-nezumi
  </Text>
);

describe('the one shadow a mockup draws', () => {
  it('is declared at all — otherwise every case below passes for the wrong reason', () => {
    // The vacuity guard. With `nativeShadow` at "none" the negatives hold trivially and the one
    // positive is the only thing standing between this file and proving nothing.
    expect(declared).not.toBe('none');
  });

  it('light level 1 carries it, with the manifest’s own numbers', () => {
    const tree = draw(
      'light',
      <Card level="1" testID="c">
        {body}
      </Card>,
    );
    const shadow = styleOf(tree, 'c')['boxShadow'];
    if (declared === 'none') throw new Error('declared none');
    expect(shadow).toBe(
      `0px ${String(declared.offsetY)}px ${String(declared.blur)}px rgba(23, 20, 17, ${String(
        declared.opacity,
      )})`,
    );
  });

  it('dark level 1 carries none — depth is tint (ADR-0044)', () => {
    const tree = draw(
      'dark',
      <Card level="1" testID="c">
        {body}
      </Card>,
    );
    expect(styleOf(tree, 'c')['boxShadow']).toBeUndefined();
  });

  it('light levels 2 and 3 carry none — 25 draws it on the card, not on every surface', () => {
    for (const level of ['2', '3'] as const) {
      const tree = draw(
        'light',
        <Card level={level} testID="c">
          {body}
        </Card>,
      );
      expect(`${level}: ${String(styleOf(tree, 'c')['boxShadow'])}`).toBe(`${level}: undefined`);
    }
  });

  it('a Surface follows the same rule as a Card, because the rule is the manifest’s', () => {
    const light = draw(
      'light',
      <Surface level="1" testID="s">
        {body}
      </Surface>,
    );
    const dark = draw(
      'dark',
      <Surface level="1" testID="s">
        {body}
      </Surface>,
    );
    expect(styleOf(light, 's')['boxShadow']).toBeDefined();
    expect(styleOf(dark, 's')['boxShadow']).toBeUndefined();
  });
});
