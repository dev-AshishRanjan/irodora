/**
 * The component conformance suite.
 *
 * One suite, exported at `@irodora/ui/testing`, run over every component **and** over
 * `apps/mobile`'s screens — the port-conformance pattern applied to components. A second copy
 * would be a second thing to keep in step, and the copy that drifts is always the one nobody
 * is looking at.
 *
 * ## It returns findings; it does not assert
 *
 * Deliberately runner-agnostic. `packages/ui` runs under Jest (ADR-0055) and the rest of the
 * repository under Vitest, so a suite that called `expect` could only ever run in one of them.
 * The caller turns findings into assertions.
 *
 * ## The kind, and why states are not a free-form list
 *
 * "Every component defines default, focus, active, disabled, loading, error and empty states"
 * is meaningless applied literally to `Text` — five of the seven do not exist for it. So a
 * component declares a **kind**, and the required set derives from the kind. The kind is the
 * only lever: a component cannot shorten its own list, it can only claim a kind, which is one
 * word, visible in the registry, and reviewable.
 *
 * ## The assertion that earns the suite
 *
 * **The rendered tree must differ between declared states.** Everything else here can be
 * satisfied by a component that declares seven states and renders one. `default` and
 * `disabled` producing byte-identical trees means the state was defined in name only, and
 * that is the failure a checklist review never catches.
 */

import type { Theme } from '@irodora/design-tokens';
import { LARGE_TEXT_TOKENS, nativeLargeTextMinPx, nativeTapTarget } from '@irodora/design-tokens';
import { paintedColors, pressableNodes, resolveTextNodes, type TestNode } from './tree.js';

export type ComponentKind = 'interactive' | 'data' | 'static';

/**
 * What each kind owes. Derived from the kind, never declared per component.
 *
 * `focus` is included for `interactive` because an external keyboard and Switch Control both
 * move focus on mobile — ACCESSIBILITY.md's A4 is about that, not about a keyboard nobody has.
 */
export const REQUIRED_STATES: Readonly<Record<ComponentKind, readonly string[]>> = {
  interactive: ['default', 'focus', 'active', 'disabled', 'loading'],
  data: ['default', 'loading', 'error', 'empty'],
  static: ['default'],
};

/** A component under test, and how to render it in a given state. */
export interface ConformanceSubject {
  readonly name: string;
  readonly kind: ComponentKind;
  /** Render in this state, in this theme. Return `null` if the state is genuinely N/A. */
  readonly render: (state: string, theme: Theme) => TestNode | null;
  /**
   * Words that must NOT be the whole accessible name — the component's own type. "swatch"
   * satisfies every "has a label" check while telling a screen-reader user nothing.
   */
  readonly forbiddenNames?: readonly string[];
  /**
   * Colour values this component renders as **data** rather than as chrome.
   *
   * A swatch exists to show an arbitrary sample, and an arbitrary sample is by definition not
   * a design token — so the colour-literal rule would flag the one thing the component is for.
   *
   * This is an exemption, so its polarity is what makes it safe: it is declared **here, in the
   * registry**, not as a prop on the component. A marker prop would be self-fulfilling — a
   * component that forgot it would become invisible to the check. Declared here, forgetting it
   * produces a FINDING, and the exemption is exact-match on the value rather than a blanket
   * pass for the component, so chrome painted with a literal is still caught.
   */
  readonly sampleValues?: readonly string[];
}

export interface Finding {
  readonly subject: string;
  readonly state: string;
  readonly theme: Theme;
  readonly rule: string;
  readonly detail: string;
}

const GENERIC_NAMES = ['swatch', 'button', 'colour', 'color', 'image', 'icon', 'view', 'text'];

/**
 * Check one subject across every required state and both themes.
 *
 * Returns findings. An empty array means it conformed; it does **not** mean anything ran, so
 * `checkAll` refuses an empty subject list separately.
 */
export function checkSubject(
  subject: ConformanceSubject,
  themes: readonly Theme[],
): readonly Finding[] {
  const findings: Finding[] = [];
  const states = REQUIRED_STATES[subject.kind];
  const forbidden = new Set([...(subject.forbiddenNames ?? []), ...GENERIC_NAMES]);
  const samples = new Set((subject.sampleValues ?? []).map((v) => v.toLowerCase()));

  for (const theme of themes) {
    const rendered = new Map<string, TestNode>();

    for (const state of states) {
      const tree = subject.render(state, theme);
      const at = (rule: string, detail: string): void => {
        findings.push({ subject: subject.name, state, theme, rule, detail });
      };

      if (tree === null) {
        at('state-missing', `declares kind "${subject.kind}" but renders nothing for "${state}"`);
        continue;
      }
      rendered.set(state, tree);

      // --- every colour resolves to a token -------------------------------------------
      // Unresolved is a FAILURE, never a skip: skipping it fails open on exactly the input
      // the colour-literal rule exists to catch.
      for (const painted of paintedColors(tree, theme)) {
        if (painted.resolution.kind !== 'unresolved') continue;
        // Exact-match exemption for declared sample data — never a blanket pass. Chrome
        // painted with a literal is still caught even on a component that renders samples.
        if (samples.has(painted.resolution.value.toLowerCase())) continue;
        at(
          'colour-literal',
          `${painted.path.join('>')} ${painted.property} = ${painted.resolution.value} ` +
            'resolves to no token in this theme',
        );
      }

      // --- text ------------------------------------------------------------------------
      for (const node of resolveTextNodes(tree, theme)) {
        if (!node.allowFontScaling)
          at('font-scaling', `${node.path.join('>')} disables font scaling; A7 needs 200%`);
        if (node.maxFontSizeMultiplier !== undefined && node.maxFontSizeMultiplier < 2)
          at(
            'font-scaling',
            `${node.path.join('>')} caps scaling at ${String(node.maxFontSizeMultiplier)}x, under 2x`,
          );
        // A largeText-only token below the floor. Read from the generated exports, so a
        // newly-classified token is covered without anyone editing this file.
        if (
          node.fontSize < nativeLargeTextMinPx &&
          node.colorResolution.kind === 'token' &&
          node.colorResolution.tokens.some((t) =>
            (LARGE_TEXT_TOKENS as readonly string[]).includes(t),
          )
        )
          at(
            'small-text-large-token',
            `${node.path.join('>')} at ${String(node.fontSize)}px uses ` +
              `${node.colorResolution.tokens.join('/')}, restricted to >= ${String(nativeLargeTextMinPx)}px`,
          );
      }

      // --- anything pressable ------------------------------------------------------------
      const pressables = pressableNodes(tree);
      if (subject.kind === 'interactive' && pressables.length === 0)
        at('not-interactive', 'declares kind "interactive" but nothing in the tree responds');

      for (const p of pressables) {
        if (p.accessibilityRole === undefined)
          at('no-role', `${p.path.join('>')} is pressable with no accessibilityRole`);
        const label = p.accessibilityLabel?.trim() ?? '';
        if (label === '') at('no-name', `${p.path.join('>')} is pressable with no accessible name`);
        else if (forbidden.has(label.toLowerCase()))
          at(
            'generic-name',
            `${p.path.join('>')} is named "${label}", which is its own type rather than its content`,
          );
        // DECLARED, not measured — a JS render tree has no Yoga pass (ADR-0055).
        const w = p.style['minWidth'];
        const h = p.style['minHeight'];
        const declaresTarget =
          typeof w === 'number' &&
          typeof h === 'number' &&
          w >= nativeTapTarget &&
          h >= nativeTapTarget;
        if (subject.kind === 'interactive' && !declaresTarget)
          at(
            'tap-target',
            `${p.path.join('>')} declares no ${String(nativeTapTarget)}px minimum (declared, not measured)`,
          );
        if (state === 'disabled' && p.accessibilityState?.['disabled'] !== true)
          at('state-not-announced', `${p.path.join('>')} is disabled but does not say so`);
        if (state === 'loading' && p.accessibilityState?.['busy'] !== true)
          at('state-not-announced', `${p.path.join('>')} is loading but is not marked busy`);
      }
    }

    // --- the assertion that earns the suite -------------------------------------------
    //
    // Distinct states must produce distinct trees. Everything above can be satisfied by a
    // component that declares five states and renders one.
    const seen = new Map<string, string>();
    for (const [state, tree] of rendered) {
      const shape = JSON.stringify(tree);
      const previous = seen.get(shape);
      if (previous !== undefined)
        findings.push({
          subject: subject.name,
          state,
          theme,
          rule: 'state-not-rendered',
          detail: `renders identically to "${previous}" — the state is defined in name only`,
        });
      else seen.set(shape, state);
    }
  }

  return findings;
}

/**
 * Check every subject, and **fail on an empty registry**.
 *
 * A suite that passes over no subjects is failing open for as long as nobody notices
 * [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]]. "There are no components"
 * and "I could not find the components" are opposite facts, and only one may proceed.
 */
export function checkAll(
  subjects: readonly ConformanceSubject[],
  themes: readonly Theme[] = ['light', 'dark'],
): readonly Finding[] {
  if (subjects.length === 0)
    return [
      {
        subject: '<registry>',
        state: '-',
        theme: themes[0] ?? 'light',
        rule: 'empty-registry',
        detail: 'no components were registered; a suite over an empty set has not passed',
      },
    ];
  if (themes.length < 2)
    return [
      {
        subject: '<registry>',
        state: '-',
        theme: themes[0] ?? 'light',
        rule: 'single-theme',
        detail:
          'both themes are authored independently here, so one theme proves nothing about the other',
      },
    ];
  return subjects.flatMap((s) => checkSubject(s, themes));
}

/** Human-readable, for a failing assertion's message. */
export function formatFindings(findings: readonly Finding[]): string {
  return findings
    .map((f) => `  ${f.subject} [${f.theme}/${f.state}] ${f.rule}: ${f.detail}`)
    .join('\n');
}
