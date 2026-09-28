/**
 * Text sets the face a mockup draws, and only where it draws it (F-226, ADR-0112).
 *
 * Asserted on the RENDERED node, as the rest of this suite does: a face prop that was passed and a
 * family that reached the text are different claims, and only the second is what a device paints.
 */

import { render } from '@testing-library/react-native';
import { nativeFaces, nativeFamilies } from '@irodora/design-tokens';
import { Text, type TextProps, type TypeSize as Step } from '../src/Text.js';
import { ThemeProvider } from '../src/theme.js';

/** The flattened style of the one text node rendered. */
function styleOf(node: React.JSX.Element): Record<string, unknown> {
  const { getByText } = render(<ThemeProvider theme="dark">{node}</ThemeProvider>);
  const style: unknown = getByText('Irodora').props['style'];
  return (
    Array.isArray(style) ? Object.assign({}, ...(style as object[])) : (style ?? {})
  ) as Record<string, unknown>;
}

describe('each face resolves to the family the manifest names', () => {
  it('sets Latin in the serif as Gelasio, at the weight it is cut at, with its own tracking', () => {
    const s = styleOf(
      <Text size="title" color="foreground" face="serif">
        Irodora
      </Text>,
    );
    expect(s['fontFamily']).toBe(nativeFamilies.serif);
    // The title step asks for 600; a single-weight face asked for 600 is a bold a platform fakes.
    expect(s['fontWeight']).toBe(nativeFaces.serif.fontWeight);
    // The step tracks −0.02 em; the serif's measured tracking is 0 (ADR-0112).
    expect(s['letterSpacing']).toBe(0);
  });

  it('sets Japanese in a serif element in the gothic — C6: kanji are sans, and Gelasio has none', () => {
    const s = styleOf(
      <Text size="title" color="foreground" face="serif" script="japanese">
        Irodora
      </Text>,
    );
    expect(s['fontFamily']).toBe(nativeFamilies.jp);
  });

  it('sets the mincho as Noto Serif JP, at 400', () => {
    const s = styleOf(
      <Text size="title" color="foreground" face="mincho" script="japanese">
        Irodora
      </Text>,
    );
    expect(s['fontFamily']).toBe(nativeFamilies.mincho);
    expect(s['fontWeight']).toBe(nativeFaces.mincho.fontWeight);
  });

  it('leaves the Latin sans to the platform — no family at all (ADR-0057 §6)', () => {
    for (const face of ['sans', 'gothic'] as const)
      expect(
        styleOf(
          <Text size="body" color="foreground" face={face}>
            Irodora
          </Text>,
        ),
      ).not.toHaveProperty('fontFamily');
  });

  it('DECOY — the default is the sans, and a Japanese default is the gothic', () => {
    expect(
      styleOf(
        <Text size="body" color="foreground">
          Irodora
        </Text>,
      ),
    ).not.toHaveProperty('fontFamily');
    expect(
      styleOf(
        <Text size="body" color="foreground" script="japanese">
          Irodora
        </Text>,
      )['fontFamily'],
    ).toBe(nativeFamilies.jp);
  });
});

describe('the faces exist only where a mockup draws them — as TYPES', () => {
  type P<S extends Step> = TextProps<S>;
  const fg = 'foreground' as const;

  it('accepts the serif and the mincho at the steps they are drawn at', () => {
    const display: P<'display1'> = { size: 'display1', color: fg, face: 'serif' };
    const card: P<'title'> = { size: 'title', color: fg, face: 'mincho', script: 'japanese' };
    expect([display.face, card.face]).toStrictEqual(['serif', 'mincho']);
  });

  it('refuses a serif caption, a serif figure, a Latin mincho and a mincho body', () => {
    // @ts-expect-error — no mockup draws the serif below body.
    const a: P<'caption'> = { size: 'caption', color: fg, face: 'serif' };
    // @ts-expect-error — the serif never sets figures (ADR-0112 d.5).
    const b: P<'title'> = { size: 'title', color: fg, face: 'serif', numeric: true };
    // @ts-expect-error — the mincho carries only corpus kanji, so it is Japanese only.
    const c: P<'title'> = { size: 'title', color: fg, face: 'mincho' };
    // @ts-expect-error — the mincho is drawn at title, on 20's card, and nowhere else.
    const d: P<'body'> = { size: 'body', color: fg, face: 'mincho', script: 'japanese' };
    expect([a, b, c, d]).toHaveLength(4);
  });
});
