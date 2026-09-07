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
import {
  DECLARED_PAIRINGS,
  LARGE_TEXT_TOKENS,
  nativeColors,
  nativeLargeTextMinPx,
  nativeTapTarget,
} from '@irodora/design-tokens';
import {
  paintedColors,
  pressableNodes,
  renderedPairs,
  resolveTextNodes,
  type TestNode,
} from './tree.js';
import { isStatusToken } from './tokens.js';

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

/**
 * Whether a subject's `active` state means SELECTED.
 *
 * `active` is overloaded and that is the whole reason this is declared rather than inferred. For
 * a `Chip` or a `Swatch` it means *this one is chosen*; for a `Button`, a `SearchField` or a
 * `TextField` it means *this one is being pressed or typed into*. A rule that required
 * `accessibilityState.selected` for every active subject flagged all three of the latter, which
 * is a false positive on a component doing nothing wrong.
 *
 * So the registry says which is which. One word per subject, visible to a reviewer beside the
 * component it describes — the same shape as `sampleValues` and `forbiddenNames`, which are also
 * facts about a component that no tree can report.
 */
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
  /** Whether `active` means SELECTED for this component. See the note above. */
  readonly selectable?: boolean;
  /**
   * Why this subject paints no colour at all — a REASON, never a boolean.
   *
   * A subject whose rendered tree carries no colour is normally a subject the `contrast` gate
   * cannot see, and since F-087 that is a failure rather than a quiet pass. HeroUI styles
   * through `className`, Uniwind resolves className in METRO, and jest never runs Metro — so a
   * component that routes its colour that way renders here with an EMPTY colour set and every
   * colour check below iterates over nothing
   * [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]].
   *
   * A genuinely colourless component states why here. Same polarity as `sampleValues`: the
   * exemption lives in the registry where a reviewer sees it, not as a prop a component could
   * forget and thereby disappear from the check.
   */
  readonly paintsNoColour?: string;
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
 * Host components the platform announces correctly on its own (F-020).
 *
 * `no-role` exists because a `Pressable` renders to a plain view: a screen reader is told
 * nothing about it unless a role is declared. `TextInput` is not that case — iOS and Android
 * both type it as a text field natively, and **neither React Native role list has a member
 * that means it**: `Role` offers `searchbox` but no `textbox`, and `AccessibilityRole`'s
 * nearest is `text`, which means static text and would announce the field as something a
 * person cannot edit.
 *
 * So the exemption is by HOST TYPE and it is one entry long. It removes only the role check;
 * name, tap target, disabled and busy still apply to a text field exactly as to a button, and
 * `SearchField` still declares `search` because that is a real distinction the platform
 * cannot infer.
 *
 * Kept as a set rather than an `=== 'TextInput'` so adding a second one is a decision made
 * here, in the open, rather than a condition someone widens in passing.
 */
const SELF_ANNOUNCING_HOSTS = new Set(['TextInput']);

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

      // --- the gate must be able to SEE a colour at all --------------------------------
      //
      // The check below iterates over the painted colours. An empty list makes it vacuous:
      // it reports nothing, prints as a pass, and looks identical to a component whose every
      // colour resolved. That is the shape F-087 found in HeroUI — className is resolved by
      // Uniwind's Metro plugin, jest does not run Metro, and the rendered tree came back with
      // no colours in it while the contrast gate stayed green over the empty set.
      //
      // WHAT THIS DOES NOT CATCH, stated so a green run is not read as more than it is: a
      // component that paints SOME colours through `style` and routes others through a class.
      // The lint rule in eslint.config.mjs is the primary defence there; this is the backstop
      // for the case where the whole component vanishes.
      const paintedHere = paintedColors(tree, theme);
      if (paintedHere.length === 0 && subject.paintsNoColour === undefined)
        at(
          'colour-invisible',
          'renders no colour the gate can read. If it routes colour through className, ' +
            'Uniwind resolves that in Metro and jest never runs Metro — pass a resolved ' +
            'token through `style` instead. If it genuinely paints nothing, say why in ' +
            '`paintsNoColour` on the registry entry.',
        );

      /*
       * --- THE PAIR ON THE SCREEN (F-171) -------------------------------------------
       *
       * Gate 9 checks the pairings the MANIFEST declares — thoroughly, in both themes, against
       * WCAG and APCA and eleven CVD severities. The loop below checks that every colour a
       * component paints resolves to a TOKEN. **Neither of them looks at a pair.**
       *
       * So a component could put `foreground` on `swatch.well` — both tokens, both individually
       * fine, a combination the manifest never declared — and every check in this repository
       * stayed green over a combination nothing had ever measured. It did: 546 times across the
       * screens, which is what the F-171 audit found and what this rule now reports.
       *
       * Gate 9's own charter says a used-but-undeclared pairing is a failure. Nothing could
       * detect "used", because nothing read what the components render. This does.
       *
       * WHAT IT STILL CANNOT SEE, stated so a green run is not read as more than it is:
       * a placeholder (a prop, not a text child), text drawn over an arbitrary sample colour
       * (which has no token by construction), and every non-text mark — borders, rings,
       * indicators — which carry `uncheckedReason` in the manifest and are gate 9's business.
       */
      // Widened once. `DECLARED_PAIRINGS` is a tuple of string literals, and whether it contains
      // a key built at runtime is not a question that type can answer.
      const declaredPairs: readonly string[] = DECLARED_PAIRINGS;

      for (const pair of renderedPairs(tree, theme, nativeColors[theme].background)) {
        const { foreground, background } = pair;
        if (foreground.kind !== 'token' || background.kind !== 'token') continue;
        // A value several tokens share is declared if ANY of its readings is: what a person sees
        // is the two colours, and which name we happen to print for them is not the question.
        const declared = foreground.tokens.some((f) =>
          background.tokens.some((b) => declaredPairs.includes(`${f}|${b}`)),
        );
        if (declared) continue;
        at(
          'pair-undeclared',
          `"${pair.text.slice(0, 32)}" draws ${foreground.tokens.join('/')} on ` +
            `${background.tokens.join('/')}, which no \`pairsWith\` declares — so gate 9 has ` +
            'never measured it. Declare the pairing in the manifest, or draw it on a ground that ' +
            'is declared.',
        );
      }

      // --- every colour resolves to a token -------------------------------------------
      // Unresolved is a FAILURE, never a skip: skipping it fails open on exactly the input
      // the colour-literal rule exists to catch.
      for (const painted of paintedHere) {
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
        // A host type the platform already announces correctly needs no declared role; see
        // `SELF_ANNOUNCING_HOSTS`. Everything else that responds must say what it is.
        if (p.accessibilityRole === undefined && !SELF_ANNOUNCING_HOSTS.has(p.hostType))
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
        /*
         * ACTIVE MEANS SELECTED, AND IT HAS TO SAY SO.
         *
         * `disabled` and `loading` were checked and `active` was not, so a component could
         * render an active state that looked identical to its default and nothing would notice
         * — the tree-difference assertion below only requires SOME difference, which a changed
         * background alone satisfies while telling a screen-reader user nothing.
         *
         * Reported as: *"Anytime we select something, it should be marked/highlighted … if it's
         * selectable"*. That is two requirements, and this is the one a test can hold: a person
         * who cannot see the highlight must still be told. `Chip` and `Swatch` both do it
         * already — a tick in the accessible name AND `accessibilityState.selected` — and the
         * rule is what stops the next selectable thing shipping with neither.
         */
        if (
          subject.selectable === true &&
          state === 'active' &&
          p.accessibilityState?.['selected'] !== true
        )
          at(
            'state-not-announced',
            `${p.path.join('>')} is selected but does not say so — a highlight a screen reader ` +
              'cannot read is not a second channel',
          );
      }
    }

    // --- the assertion that earns the suite -------------------------------------------
    //
    // Distinct states must produce distinct trees. Everything above can be satisfied by a
    // component that declares five states and renders one.
    /*
     * ONLY WHEN THERE ARE TWO STATES TO COMPARE (F-157).
     *
     * The assertion is "distinct states produce distinct trees". With one state there is no pair,
     * so the loop compared a tree to nothing and served only to serialize it — which is how
     * registering the first PORTALLED component turned a vacuous check into a thrown
     * `TypeError: Converting circular structure to JSON`. A portal's tree carries React context
     * objects, and a context holds its own `Provider`, which holds the context.
     *
     * `static` is every one-state kind, so this skips exactly the subjects the check could never
     * have said anything about, and keeps it for `interactive` and `data` where it earns the
     * suite. A portalled INTERACTIVE component would still meet the cycle, and `shapeOf` below is
     * what handles that — the guard is about meaning, the serializer is about robustness, and
     * neither substitutes for the other.
     */
    const seen = new Map<string, string>();
    if (rendered.size < 2) continue;
    for (const [state, tree] of rendered) {
      const shape = shapeOf(tree);
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

/**
 * A status colour may not sit beside a colour sample (F-069, NFR-8).
 *
 * ## Why this is a composition rule and not a token rule
 *
 * A saturated status colour next to a garment sample **changes how the sample reads** —
 * simultaneous contrast, the same physics `swatch.well` exists for. A red "poor quality" chip
 * beside a green fabric makes the fabric look different from the same fabric beside a grey
 * chip, and the person is looking at the fabric to decide something about it.
 *
 * Every component involved can be individually correct while the composition is wrong, which
 * is why nothing short of the rendered tree can see it.
 *
 * ## The rule, narrowed on purpose
 *
 * **Siblings**, not "anywhere in the tree". A status chip in a header and a sample three
 * screens down are not adjacent in any sense a person perceives, and a rule that flagged them
 * would be switched off within a week — which is worse than no rule.
 *
 * **`swatch.well` on the shared parent is the escape**, because it is precisely the mandated
 * neutral ground: if the sample is already in its well, the status colour is not touching it.
 */
export function checkStatusAdjacency(
  tree: TestNode,
  theme: Theme,
  sampleValues: readonly string[],
): readonly string[] {
  const samples = new Set(sampleValues.map((v) => v.toLowerCase()));
  const findings: string[] = [];

  /** Does this subtree paint a status token / a declared sample? */
  const paints = (node: TestNode): { status: boolean; sample: boolean } => {
    let status = false;
    let sample = false;
    const visit = (n: TestNode): void => {
      for (const painted of paintedColors(n, theme)) {
        if (painted.resolution.kind === 'token' && painted.resolution.tokens.some(isStatusToken))
          status = true;
        if (
          painted.resolution.kind === 'unresolved' &&
          samples.has(painted.resolution.value.toLowerCase())
        )
          sample = true;
      }
      for (const child of n.children ?? []) if (typeof child !== 'string') visit(child);
    };
    visit(node);
    return { status, sample };
  };

  const walk = (node: TestNode, path: readonly string[]): void => {
    const here = path.concat(node.type);
    const children = (node.children ?? []).filter((c): c is TestNode => typeof c !== 'string');

    if (children.length > 1) {
      const marks = children.map(paints);
      const hasStatus = marks.some((m) => m.status);
      const hasSample = marks.some((m) => m.sample);
      // Both present among siblings, and NOT separated: the shared parent is not the well.
      if (hasStatus && hasSample) {
        /*
         * WHERE THE WELL MAY BE — TWO PLACES, NOT ONE (F-152).
         *
         * This asked only whether the SHARED PARENT is a well, which is one of the two shapes
         * that separates them. `Status` has carried an `adjacentToSample` prop since F-069,
         * and what that prop does is paint the well on the status's OWN container — so the
         * sample abuts a neutral field rather than a status colour, which is the whole physics
         * of the rule.
         *
         * The two disagreed for as long as nothing painted a status. The first one that did
         * (the refused photograph, F-152) declared `adjacentToSample`, did exactly what the
         * prop's own docstring promises — *"declared rather than assumed, so the rendered scan
         * can see the claim"* — and the scan could not see it.
         *
         * A well around the status is not a weaker separation than a well around both. It is
         * the same band of neutral between the same two colours.
         */
        const isWell = (n: TestNode): boolean =>
          paintedColors({ type: n.type, props: n.props, children: null }, theme).some(
            (p) => p.resolution.kind === 'token' && p.resolution.tokens.includes('swatch.well'),
          );

        const parentIsWell = isWell(node);
        // The status-bearing sibling brought its own ground with it.
        const statusInOwnWell = children.some((c, i) => marks[i]?.status === true && isWell(c));

        if (!parentIsWell && !statusInOwnWell)
          findings.push(
            `${here.join('>')} places a status colour beside a colour sample with no ` +
              'swatch.well between them — simultaneous contrast changes how the sample reads, ' +
              'which is the thing the well exists to prevent',
          );
      }
    }

    for (const child of children) walk(child, here);
  };

  walk(tree, []);
  return findings;
}

/**
 * A tree, as a comparable string — cycle-safe.
 *
 * `JSON.stringify` was enough until F-157 registered a **portalled** component. A portal's tree
 * carries React context objects, and a context holds its own `Provider`, which holds the context:
 * `stringify` throws *"Converting circular structure to JSON"* and takes the whole subject with
 * it. The harness had never met one, because until F-143 nothing in this product rendered over
 * the page.
 *
 * A seen-set drops the repeat rather than following it. **`[circular]` is a stable marker, not a
 * skip** — two trees that differ only inside a cycle would compare equal, which is a real
 * narrowing of the check and is worth knowing: this assertion is about distinct states producing
 * distinct trees, and a state whose only difference lives inside a React context is a state
 * nothing here can tell apart. No component does that today; one that did would need a different
 * assertion, not a longer serializer.
 */
function shapeOf(tree: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(tree, (_key, value: unknown) => {
    if (typeof value !== 'object' || value === null) return value;
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    return value;
  });
}
