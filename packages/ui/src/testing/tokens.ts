/**
 * Reverse lookup from a rendered colour value back to the token that produced it.
 *
 * ## Why this is the load-bearing piece
 *
 * Every rendered check downstream — "no component uses a raw colour literal", "no status is
 * carried by colour alone", "`foreground.3` never appears on small text" — is really the same
 * question asked three ways: **which token is this pixel?** A check that cannot answer that
 * has to fall back on trusting a prop the component supplies, and a component that forgets
 * the prop is then invisible to it. That is self-fulfilling, and the plan lists it as one of
 * the assertion shapes to reject.
 *
 * ## The one rule that makes it honest
 *
 * **A value that does not resolve is a FAILURE, never a skip.** Skipping the unresolvable
 * case fails open on exactly the input the colour-literal lint exists to catch — a hand-typed
 * `#8A8A8A` resolves to nothing, and "resolves to nothing" is the finding, not a reason to
 * look away.
 *
 * The token names are read from the generated exports rather than listed here, so a token
 * added to the manifest is covered without anyone remembering to update this file.
 */

import { nativeColors, type Theme } from '@irodora/design-tokens';

/** What a rendered colour turned out to be. */
export type ColorResolution =
  | { readonly kind: 'token'; readonly tokens: readonly string[] }
  | { readonly kind: 'unresolved'; readonly value: string }
  | { readonly kind: 'absent' };

type ThemeColors = Readonly<Record<string, string>>;

const themeColors = (theme: Theme): ThemeColors => nativeColors[theme];

/**
 * Build value -> token names once per theme.
 *
 * A list rather than a single name because distinct tokens legitimately share a value — the
 * two themes each carry a full set, and within a theme a composited variant can land on the
 * same hex as another token. Collapsing them would make the answer depend on key order.
 */
const indexes = new Map<Theme, ReadonlyMap<string, readonly string[]>>();

function indexFor(theme: Theme): ReadonlyMap<string, readonly string[]> {
  const cached = indexes.get(theme);
  if (cached !== undefined) return cached;
  const index = new Map<string, string[]>();
  for (const [token, value] of Object.entries(themeColors(theme))) {
    const k = value.toLowerCase();
    const existing = index.get(k);
    if (existing === undefined) index.set(k, [token]);
    else existing.push(token);
  }
  indexes.set(theme, index);
  return index;
}

/**
 * Resolve a rendered colour value to the token names that produce it, in this theme.
 *
 * `undefined` is `absent` rather than `unresolved`: a node that sets no colour has inherited
 * one, and the caller's inheritance model is what decides whether that is a problem. Conflating
 * the two would report every uncoloured `View` as a literal.
 */
export function resolveColor(value: string | undefined, theme: Theme): ColorResolution {
  if (value === undefined) return { kind: 'absent' };
  const tokens = indexFor(theme).get(value.toLowerCase());
  if (tokens === undefined || tokens.length === 0) return { kind: 'unresolved', value };
  return { kind: 'token', tokens };
}

/** Token names whose value equals this one, in either theme. For cross-theme reporting. */
export function tokensForValue(value: string): readonly string[] {
  const out = new Set<string>();
  for (const theme of ['light', 'dark'] as const)
    for (const t of indexFor(theme).get(value.toLowerCase()) ?? []) out.add(t);
  return [...out];
}

/** Does this token name denote a status colour? Read from the manifest, never hard-coded. */
export function isStatusToken(token: string): boolean {
  return token.startsWith('status.');
}
