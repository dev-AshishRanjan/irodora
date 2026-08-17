/**
 * The compile-time half of NFR-9, and the `largeText` restriction.
 *
 * `@ts-expect-error` is the assertion: the line under it MUST fail to type-check, and `tsc`
 * reports an *error* if it does not. So this file is a negative test the compiler runs —
 * delete the `iconToken` requirement from `StatusPresentation` and `pnpm typecheck` goes red
 * on the unused directive, not silently green.
 *
 * ## What the first version of this file got wrong
 *
 * `TextToken` and `LargeTextToken` were declared as phantom brands — `string & { __text:
 * unique symbol }` — and this file asserted the two types differ. That was true and
 * **vacuous**: nothing produced a value of either type, the generated tokens were plain
 * strings, and the only way to obtain one was the hand-written cast this test performed on
 * itself. Meanwhile `DESIGN-SYSTEM.md` claimed `foreground.3` was "emitted under a
 * TypeScript brand that is not assignable where normal text is expected", which no code
 * anywhere supported.
 *
 * Both types are now **derived from the manifest** in `generated/tokens.ts` as literal
 * unions of the real token names. The assertions below are against those, so they fail if
 * the manifest changes `usage` — which is what makes them worth running.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  LARGE_TEXT_TOKENS,
  TEXT_TOKENS,
  type LargeTextToken,
  type StatusPresentation,
  type TextToken,
} from '../src/index.js';

describe('a status cannot be built from colour alone', () => {
  it('requires colour, icon and text together', () => {
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
  it('the two lists come from the manifest and do not overlap', () => {
    // Runtime, so a `usage` edit that put a token in both lists fails here rather than in a
    // component six months later.
    const text = new Set<string>(TEXT_TOKENS);
    for (const name of LARGE_TEXT_TOKENS) expect(text.has(name)).toBe(false);
    expect(TEXT_TOKENS.length).toBeGreaterThan(0);
    expect(LARGE_TEXT_TOKENS.length).toBeGreaterThan(0);
  });

  it('a LargeTextToken is not assignable where a TextToken is expected', () => {
    // `foreground.3` meets 3:1 and not 4.5:1. This is now a real literal union, so the
    // error comes from the token NAME, not from a brand nobody applies.
    const large: LargeTextToken = 'foreground.3';

    // @ts-expect-error — the whole point. foreground.3 is not in TEXT_TOKENS.
    const asText: TextToken = large;
    void asText;

    expectTypeOf<LargeTextToken>().not.toEqualTypeOf<TextToken>();
  });

  it('an arbitrary string is not a token name', () => {
    // @ts-expect-error — not a member of either union.
    const unchecked: TextToken = 'foreground.9';
    void unchecked;
  });

  it('a genuine text token IS assignable — the baseline', () => {
    // Without this, every assertion above would still pass if TextToken were `never`.
    const ok: TextToken = 'foreground';
    expectTypeOf(ok).toExtend<TextToken>();
  });
});
