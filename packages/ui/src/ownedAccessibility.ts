/**
 * The accessibility a control owns, refused to its callers (F-228 for `IconButton`; F-232 for every
 * control it rebuilds).
 *
 * A control announces one name, one role and one state, and it derives all three from its own
 * props: the name from `label`, the state from `disabled`, `loading` and `selected`. A prop through
 * which a caller could add a second name, change the role, contradict the state or take the control
 * out of the accessibility tree is therefore not an escape hatch. It is a way to make the control
 * lie, so it is refused.
 *
 * **Refused twice, because once is not enough for half of them.**
 * - They are declared `never` ({@link RefuseOwnedAccessibility}). That is what makes TSX refuse the
 *   `aria-*` spellings at all: a hyphenated attribute is exempt from the excess-property check, so
 *   merely omitting it from the props refuses nothing.
 * - They are removed at render ({@link withoutOwnedAccessibility}). React Native gives an `aria-*`
 *   prop precedence over its `accessibility*` twin (`View.js`, `Pressable.js`), so a cast that
 *   slipped `aria-disabled` through would override the state the control sets, whatever order the
 *   props were written in.
 *
 * `accessibilityHint` is deliberately NOT here: it describes what happens, it names nothing and
 * states nothing, and a caller is the one who knows the consequence. Nor are `accessibilityActions`
 * and the live-region props: they add to what a control offers or when it speaks, and contradict
 * none of its name, role, state or value.
 */

export const OWNED_ACCESSIBILITY = [
  'accessibilityLabel',
  'aria-label',
  'accessibilityLabelledBy',
  'aria-labelledby',
  'accessibilityRole',
  'role',
  'accessibilityState',
  'aria-disabled',
  'aria-busy',
  'aria-selected',
  'aria-checked',
  'aria-expanded',
  'aria-hidden',
  'accessible',
  'importantForAccessibility',
  'accessibilityElementsHidden',
  // A VALUE is state (F-232's review): a caller could announce "50%" on a button that has none.
  'accessibilityValue',
  'aria-valuemin',
  'aria-valuemax',
  'aria-valuenow',
  'aria-valuetext',
] as const;

export type OwnedAccessibility = (typeof OWNED_ACCESSIBILITY)[number];

/** Intersected into a control's props: each owned prop may only be absent. */
export type RefuseOwnedAccessibility = Readonly<Partial<Record<OwnedAccessibility, never>>>;

const OWNED = new Set<string>(OWNED_ACCESSIBILITY);

/**
 * The caller's props with every owned one removed. Spread it FIRST, then set the control's own
 * role, name and state after it.
 */
export function withoutOwnedAccessibility<P extends object>(props: P): P {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !OWNED.has(key))) as P;
}
