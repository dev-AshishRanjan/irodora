/**
 * The compile-time half of NFR-9.
 *
 * `@ts-expect-error` is the assertion: the line under it MUST fail to type-check, and `tsc`
 * reports an *error* if it does not. So this file is a negative test the compiler runs —
 * delete the `iconToken` requirement from `StatusPresentation` and `pnpm typecheck` goes red
 * on the unused directive, not silently green.
 *
 * `expectTypeOf` carries the positive side. The two together are what make "a status
 * expressible only as colour cannot be constructed" a fact about the type rather than a
 * sentence in a document.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { LargeTextToken, StatusPresentation, TextToken } from '../src/index.js';

describe('a status cannot be built from colour alone', () => {
  it('requires colour, icon and text together', () => {
    expectTypeOf<StatusPresentation>().toHaveProperty('colorToken');
    expectTypeOf<StatusPresentation>().toHaveProperty('iconToken');
    expectTypeOf<StatusPresentation>().toHaveProperty('text');

    // Every channel is required, not optional. `toHaveProperty` alone would still pass if
    // one of them were `iconToken?: string`, which is exactly the shape someone reaches for
    // when a component has no icon to hand.
    expectTypeOf<keyof StatusPresentation>().toEqualTypeOf<
      'kind' | 'colorToken' | 'iconToken' | 'text'
    >();

    const complete: StatusPresentation = {
      kind: 'bad',
      colorToken: 'status.bad',
      iconToken: 'icon.cross',
      text: 'Could not read this colour',
    };
    expectTypeOf(complete).toExtend<StatusPresentation>();
  });

  it('does not compile without the icon', () => {
    // @ts-expect-error — colour and text but no icon. Two channels is not three.
    const colourAndTextOnly: StatusPresentation = {
      kind: 'warn',
      colorToken: 'status.warn',
      text: 'Low confidence',
    };
    void colourAndTextOnly;
  });

  it('does not compile without the text', () => {
    // @ts-expect-error — colour and icon but no label. A sighted user with CVD sees two
    // shapes and no words.
    const colourAndIconOnly: StatusPresentation = {
      kind: 'ok',
      colorToken: 'status.ok',
      iconToken: 'icon.check',
    };
    void colourAndIconOnly;
  });
});

describe('largeText is not text', () => {
  it('a LargeTextToken is not assignable where a TextToken is expected', () => {
    // `foreground.3` meets 3:1 and not 4.5:1. Structurally both are `string`, so only the
    // brand stops a 13 px label from taking it — a review comment would not.
    const large = 'foreground.3' as LargeTextToken;

    // @ts-expect-error — the whole point of the two brands.
    const asText: TextToken = large;
    void asText;

    expectTypeOf<LargeTextToken>().not.toEqualTypeOf<TextToken>();
  });

  it('neither brand is reachable from a plain string', () => {
    // @ts-expect-error — a bare string is not a checked token name.
    const unchecked: TextToken = 'foreground';
    void unchecked;
  });
});
