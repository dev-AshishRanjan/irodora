/**
 * Every component, in every state its kind requires, in both themes.
 *
 * The suite itself is `@irodora/ui/testing` — the same function `apps/mobile` runs over its
 * screens. This file is the *registry* plus the assertions that prove the suite discriminates,
 * because a conformance suite nobody has watched reject anything is a suite that might only
 * be capable of passing [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { Pressable } from 'react-native';
import { render } from '@testing-library/react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeNumericFeature, nativeTapTarget } from '@irodora/design-tokens';
import {
  Appear,
  Bands,
  Button,
  Chip,
  Dialog,
  EmptyState,
  Mark,
  NavIcon,
  NAV_ICON_NAMES,
  Popover,
  Row,
  Screen,
  SearchField,
  Section,
  Sheet,
  Stack,
  Status,
  Surface,
  Swatch,
  swatchCorner,
  Tabs,
  Text,
  TextField,
  ThemeProvider,
  Wordmark,
} from '../src/index.js';
import {
  checkAll,
  checkStatusAdjacency,
  checkSubject,
  formatFindings,
  REQUIRED_STATES,
  type ConformanceSubject,
  type Finding,
  type TestNode,
} from '../src/testing/index.js';
import {
  BadStates,
  ColourInStyle,
  ColourOnlyInClassName,
  GenericName,
  LiteralColour,
  StatusBesideSample,
  StatusBesideSampleInWell,
  UnlabelledPressable,
  UnlabelledTextInput,
} from './fixtures/subjects.js';

/**
 * Render inside a forced theme, and hand back the walkable tree.
 *
 * **The tree is unmounted before it is returned (F-157), and that is not tidiness.**
 * `checkSubject` renders each subject in light and then in dark, in one test, without React
 * Native Testing Library's between-test cleanup running in between. For an ordinary component
 * that is harmless — each `render()` owns its own tree.
 *
 * A PORTALLED component is different. Its content mounts into a host that lives outside the tree
 * and is shared, so the light render's dialog was still mounted when the dark one was captured —
 * and the dark subject came back carrying light-theme colours. The conformance suite reported it
 * as three `colour-literal` findings, which is a true observation of a tree that no device would
 * ever build.
 *
 * The theme context itself was never the problem: probing a `useTheme()` inside the portal
 * returns the theme the provider was given. It was two mounts overlapping, which is a property of
 * the harness rather than of the component — and it only became visible when the first portalled
 * component was registered.
 */
function draw(node: React.JSX.Element, theme: 'light' | 'dark'): TestNode {
  const rendered = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
  const json = rendered.toJSON();
  rendered.unmount();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

/** A colour that carries provenance, which is what Swatch requires by type (ADR-0005). */
/*
 * TIME IS HELD STILL FOR EVERY SUBJECT, AND NEVER ADVANCED. Added by F-158.
 *
 * A conformance subject is a question about a RENDERED TREE — what colour is on this node, what
 * a screen reader would announce, whether a status sits beside a sample. None of those questions
 * is about frame 4, and this suite has never advanced a timer.
 *
 * It became load-bearing with the sheet. A gorhom sheet animates, so reanimated installs a
 * mapper, and when the mapper ticks `extractInputs` walks its inputs with `Object.values` for
 * any PLAIN OBJECT it is given. Under this harness that walk reaches React Native's own module
 * namespace and recurses through the module graph until the stack is gone:
 *
 * ```
 * RangeError: Maximum call stack size exceeded
 *   at Object.values (<anonymous>)
 *   at extractInputs (react-native-reanimated/src/mappers.ts:189)
 *   at mockedRequestAnimationFrame (react-native-worklets/.../uiRuntime)
 * ```
 *
 * IT IS A HARNESS ARTEFACT, NOT A DEFECT IN THE SHEET, and the reasoning is worth keeping
 * because the failure looks exactly like a product bug. On a device the same code runs through
 * the native worklets runtime and gorhom is used at scale; if the mapper's input really were the
 * React Native namespace, every app shipping this library would overflow on first open. What
 * differs here is the non-native worklets build the resolver loads, which drives mappers from a
 * mocked `requestAnimationFrame`.
 *
 * IT WAS ALSO ARRIVING FROM THE WRONG PLACE. The throw happens on a queued frame AFTER the
 * render returns, so jest attributes it to whichever test is running when the timer fires — how
 * an unrelated F-069 assertion started failing the moment a sheet joined this registry.
 *
 * WHAT THIS DOES NOT COVER: whether the sheet's animation is correct, or whether it drags. Both
 * need a device, and F-158's criterion 4 is attested rather than asserted for exactly that
 * reason.
 */
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const SAMPLE = fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 });

/**
 * THE REGISTRY.
 *
 * A component that is not here and not on a screen is a component nobody checks — the shape
 * that has cost this repository six increments
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 */
const SUBJECTS: readonly ConformanceSubject[] = [
  {
    /*
     * BOTH MEMBERS OF THE UNION ARE RENDERED, and they are almost disjoint trees (F-139).
     *
     * The `action` form draws a Button; the `resolvedHere` form draws none. Registering only
     * one would check the accessibility of half a component — and the half that draws a control
     * is the half the feature exists for.
     */
    name: 'EmptyState',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <>
          <EmptyState
            message="Nothing here yet"
            hint="Add a garment and it appears here."
            action={{ label: 'Add a garment', onPress: () => undefined }}
          />
          <EmptyState message="No colour matches these filters." resolvedHere />
        </>,
        theme,
      ),
  },
  {
    /*
     * THE OVERLAY FAMILY (F-143), RENDERED OPEN.
     *
     * `open` is forced rather than left to a press, and that is the whole reason this subject is
     * worth having. A popover renders NOTHING when closed, so a subject that did not open it
     * would check an empty tree and report that nothing was wrong with it — the shape of a
     * conformance case that can only pass.
     *
     * Open, the gates can see the two things that matter: the scrim painting `backdrop`, which
     * no surface in this product had ever painted, and the panel's own ground against the text
     * on it. Both are real contrast questions and neither had been asked.
     */
    name: 'Popover',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <Popover
          open
          triggerLabel="Why this reading?"
          title="Mixed lighting"
          closeLabel="Close"
          description="Two light sources of different colour temperature reached the sample."
        />,
        theme,
      ),
  },
  {
    /*
     * THE DIALOG (F-157), RENDERED OPEN — the component that proves the pin.
     *
     * HeroUI reaches for GestureDetector inside Dialog.Content, for drag-to-dismiss. Under RNGH 3
     * that symbol was undefined and this subject would have thrown; under 2.32.0 it is a real
     * component. It renders here WITHOUT a gesture-handler mock, so what is checked is the tree a
     * device would build rather than a shape jest.setup.js invented.
     *
     * It is also the first PORTALLED subject, which is what surfaced the overlapping-mount bug in
     * the draw() helper above.
     */
    name: 'Dialog',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <Dialog
          open
          onOpenChange={() => undefined}
          title="Reset what the app has learned?"
          description="The counts behind every preference are removed. Your wardrobe is untouched."
          closeLabel="Close"
        />,
        theme,
      ),
  },
  {
    /*
     * RENDERED OPEN, and a sheet is the subject where that matters most. Registered closed it
     * would assert NOTHING — the tree would be empty and every rule would pass vacuously, which
     * is the shape of a subject that looks like coverage and is not.
     *
     * IT CONTAINS A SWATCH because that is what the Lens puts in one, and because it is the case
     * that makes the background finding dangerous. `BottomSheet.Content` accepts gorhom's
     * `backgroundStyle` and then ignores it; without the component's own background layer the
     * ground under this sample is `rgba(0, 0, 0, 0.75)`, chosen by the library's theme. A
     * colour read against a ground nobody picked is the simultaneous-contrast problem the whole
     * `swatch.well` rule exists to prevent — and this subject is what makes the contrast gate
     * measure the ground that is actually there.
     */
    name: 'Sheet',
    kind: 'static',
    sampleValues: ['#526A6B'],
    render: (_state, theme) =>
      draw(
        <Sheet
          open
          onOpenChange={() => undefined}
          title="This reading"
          description="An estimate, taken in the light you were standing in."
          closeLabel="Close"
        >
          <Swatch name="Ai-nezumi" hex="#526A6B" color={SAMPLE} />
        </Sheet>,
        theme,
      ),
  },
  {
    /*
     * TABS, WITH A SELECTION. Rendering them all unselected would leave the selected treatment —
     * a different ground, a heavier foreground, and `accessibilityState.selected` — checked by
     * nothing, and that treatment is the only thing distinguishing one tab from another.
     */
    name: 'Tabs',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <Tabs
          items={[
            { value: 'harmony', label: 'Harmony' },
            { value: 'vision', label: 'Colour vision' },
          ]}
          value="harmony"
          onValueChange={() => undefined}
        >
          <Text size="body" color="foreground">
            Ai-nezumi
          </Text>
        </Tabs>,
        theme,
      ),
  },
  {
    /*
     * THE IDENTITY (F-141).
     *
     * Both members, because they are different accessibility objects rather than two sizes of
     * one thing. A standing-alone `Mark` is an `image` with a name; the same mark inside a
     * `Wordmark` is DECORATIVE, because the word beside it is real text and a labelled mark
     * would make a screen reader say the product name twice.
     *
     * Registering only the lockup would leave the labelled form — the splash, a bare header —
     * checked by nothing, and it is the form where getting the label wrong actually costs
     * somebody something.
     */
    name: 'Brand',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <>
          <Wordmark size="display.2" />
          <Mark size={16} label="Irodora" />
        </>,
        theme,
      ),
  },
  {
    /*
     * THE FOUR LAYOUT PRIMITIVES, IN ONE COMPOSED TREE (F-140).
     *
     * Registered as one subject rather than four, deliberately: these components have no
     * appearance of their own — they are transparent, they paint nothing, and each carries a
     * single flex property. Four separate subjects would render four empty boxes and report
     * that nothing was wrong with any of them, which is the shape of a check that passes
     * because it is looking at the wrong thing.
     *
     * COMPOSED is what there is to check here. The gates read a rendered tree, so what they
     * can see is the text inside the layout meeting its ground at the sizes the scale gives
     * it — the display tier for the screen title, `title` for a section, `label` for an
     * eyebrow. That is a real contrast question and it had never been asked of the display
     * tier, because until this feature nothing in the product rendered one.
     */
    name: 'Layout',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <Screen title="Atlas" eyebrow="Corpus" scroll={false}>
          <Section title="Harmony" eyebrow="Relationships">
            <Stack gap="lg">
              <Row gap="sm" justify="between">
                <Text size="body" color="foreground">
                  Ai-nezumi
                </Text>
                <Text size="small" color="foreground.2" numeric>
                  2.14
                </Text>
              </Row>
            </Stack>
          </Section>
        </Screen>,
        theme,
      ),
  },
  {
    name: 'Surface',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <Surface level="2" padding="sm">
          <Text size="body" color="foreground">
            Ai-nezumi
          </Text>
        </Surface>,
        theme,
      ),
  },
  {
    name: 'Button',
    kind: 'interactive',
    render: (state, theme) =>
      draw(
        <Button
          label="Save this palette"
          disabled={state === 'disabled'}
          loading={state === 'loading'}
          variant={state === 'focus' ? 'secondary' : 'primary'}
          testID={state}
        />,
        theme,
      ),
  },
  {
    name: 'Chip',
    kind: 'interactive',
    // Same as Swatch: a filter chip that is on says so in its name and in its state.
    selectable: true,
    // 'chip' and 'filter' are what the role already tells a screen reader. A control whose
    // whole name is its own type says nothing about WHICH filter it is.
    forbiddenNames: ['chip', 'filter'],
    render: (state, theme) =>
      draw(
        <Chip
          label="Blue-grey"
          selected={state === 'active'}
          focused={state === 'focus'}
          disabled={state === 'disabled'}
          loading={state === 'loading'}
          testID={state}
        />,
        theme,
      ),
  },
  {
    name: 'SearchField',
    kind: 'interactive',
    forbiddenNames: ['search', 'field', 'input'],
    render: (state, theme) =>
      draw(
        <SearchField
          label="Search by name or reading"
          value={state === 'active' ? 'ai' : ''}
          onChangeText={() => {
            /* the suite renders; it does not drive */
          }}
          focused={state === 'focus'}
          disabled={state === 'disabled'}
          loading={state === 'loading'}
          testID={state}
        />,
        theme,
      ),
  },
  {
    name: 'TextField',
    kind: 'interactive',
    // The words a screen reader must never hear as the WHOLE name. "Name" would be one of
    // them if the palette field were labelled that way — it is "Palette name" for exactly
    // this reason.
    forbiddenNames: ['field', 'input', 'name', 'text'],
    render: (state, theme) =>
      draw(
        <TextField
          label="Palette name"
          hint="Evening walk"
          value={state === 'active' ? 'Evening walk' : ''}
          onChangeText={() => {
            /* the suite renders; it does not drive */
          }}
          focused={state === 'focus'}
          disabled={state === 'disabled'}
          loading={state === 'loading'}
          testID={state}
        />,
        theme,
      ),
  },
  {
    // Added because `a11y-scope.mjs` found it unreached on its first run: Status had unit
    // tests but was in no conformance registry and reachable from nothing that was — so it
    // had never been checked in BOTH themes, or against the colour-literal and font-scaling
    // rules. Registering it pulls `Icon` into the closure too, since Status renders one.
    name: 'Status',
    kind: 'static',
    render: (_state, theme) => draw(<Status kind="bad" text="Could not read this colour" />, theme),
  },
  {
    /*
     * REGISTERED FOR THE REASON `Status` WAS. `Appear` is reachable from the Atlas, so it is
     * not orphaned — but reachable is not the same as CHECKED IN BOTH THEMES, and an animated
     * wrapper is exactly the kind of component that can quietly paint or hide something.
     *
     * The subject renders a swatch inside it, which is the shape the product actually uses and
     * the shape `verify-motion` explicitly allows: the WRAPPER animates, the sample does not.
     * If `Appear` ever put a background or an opacity floor on its child, the swatch's own
     * conformance rules — its neutral well, its keyline, its accessible name — would be read
     * through this wrapper here and would fail.
     */
    name: 'Appear',
    kind: 'static',
    sampleValues: ['#526A6B'],
    render: (_state, theme) =>
      draw(
        <Appear index={1}>
          <Swatch name="Ai-nezumi" hex="#526A6B" color={SAMPLE} onPress={() => undefined} />
        </Appear>,
        theme,
      ),
  },
  {
    /*
     * THE FIRST CHART IN THE PRODUCT, and the subject that makes its one rule checkable.
     *
     * `chart.1`–`chart.5` are a near-achromatic ramp, chosen so that hue is never the channel
     * separating a series (golden rule 13). A conformance subject cannot judge whether a chart
     * is READABLE — but it can hold the thing that makes it readable without colour: every band
     * carries its own label and its own number as TEXT, so the rendered tree contains the whole
     * reading with the bars removed.
     *
     * FIVE BANDS, because five is the ramp. A subject with three would leave two tones drawn by
     * nothing and reached by nothing, which is exactly the state `chart.*` was in before this.
     */
    name: 'Bands',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <Bands
          unit="garments"
          bands={[
            { label: 'In no outfit', value: 2 },
            { label: 'In 1 to 3', value: 5 },
            { label: 'In 4 to 9', value: 9 },
            { label: 'In 10 to 24', value: 4 },
            { label: 'In 25 or more', value: 0 },
          ]}
        />,
        theme,
      ),
  },
  {
    /*
     * ALL FIVE AT ONCE, because the property that matters is that they DIFFER. A subject
     * rendering one glyph would check that a glyph renders; rendering the set is what puts the
     * whole family in front of the colour-literal and both-themes rules together.
     *
     * They are decorative — the tab carries the accessible name — so the check that matters
     * here is that none of them names a colour of its own.
     */
    name: 'NavIcon',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <Row gap="sm">
          {NAV_ICON_NAMES.map((name) => (
            <NavIcon key={name} name={name} color="#131110" />
          ))}
        </Row>,
        theme,
      ),
  },
  {
    name: 'Swatch',
    kind: 'interactive',
    // `active` means CHOSEN here — the sample carries a tick in its accessible name and
    // `accessibilityState.selected`, and the rule is what stops that being dropped.
    selectable: true,
    // The name a screen reader must never hear for this component.
    forbiddenNames: ['swatch', 'sample'],
    // The sample itself is DATA — an arbitrary colour is not a token by definition. Declared
    // here rather than marked on the component, so forgetting it fails rather than passes.
    sampleValues: ['#526A6B'],
    render: (state, theme) =>
      draw(
        <Swatch
          name="Ai-nezumi"
          hex="#526A6B"
          color={SAMPLE}
          selected={state === 'active'}
          focused={state === 'focus'}
          disabled={state === 'disabled'}
          loading={state === 'loading'}
          onPress={() => undefined}
        />,
        theme,
      ),
  },
];

describe('the registry itself', () => {
  it('is not empty, and every kind it claims has a required state set', () => {
    expect(SUBJECTS.length).toBeGreaterThan(0);
    for (const s of SUBJECTS) expect(REQUIRED_STATES[s.kind].length).toBeGreaterThan(0);
  });

  it('refuses an empty registry rather than reporting it as coverage', () => {
    const findings = checkAll([]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule).toBe('empty-registry');
  });

  it('refuses a single theme, because the two are authored independently', () => {
    const findings = checkAll(SUBJECTS, ['light']);
    expect(findings[0]?.rule).toBe('single-theme');
  });
});

describe('every registered component conforms, in both themes', () => {
  it('produces no findings', () => {
    const findings = checkAll(SUBJECTS);
    // Compare the FORMATTED findings: jest's `expect` takes no message argument, so making
    // the human-readable form the compared value is what puts the detail in the failure.
    expect(formatFindings(findings)).toBe('');
  });

  it.each(SUBJECTS.map((s) => [s.name, s] as const))('%s', (_name, subject) => {
    const findings = checkSubject(subject, ['light', 'dark']);
    // Compare the FORMATTED findings: jest's `expect` takes no message argument, so making
    // the human-readable form the compared value is what puts the detail in the failure.
    expect(formatFindings(findings)).toBe('');
  });
});

describe('the suite rejects what it is supposed to reject', () => {
  const rules = (findings: readonly Finding[]): readonly string[] => findings.map((f) => f.rule);

  it('rejects a component whose states render identically', () => {
    // THE ASSERTION THAT EARNS THE SUITE. Everything else can be satisfied by a component
    // that declares five states and renders one.
    const findings = checkSubject(
      {
        name: 'BadStates',
        kind: 'interactive',
        render: (_state, theme) => draw(<BadStates />, theme),
      },
      ['light', 'dark'],
    );
    expect(rules(findings)).toContain('state-not-rendered');
  });

  it('rejects a hand-typed colour', () => {
    const findings = checkSubject(
      {
        name: 'LiteralColour',
        kind: 'static',
        render: (_s, theme) => draw(<LiteralColour />, theme),
      },
      ['light', 'dark'],
    );
    expect(rules(findings)).toContain('colour-literal');
  });

  it('rejects a component whose colour the rendered tree cannot show', () => {
    // THE F-087 BACKSTOP. The tree below is the shape a real heroui-native Button produced
    // under this harness: a className, a transform, and no colour anywhere. Every colour
    // check in the suite then iterates over an empty list and reports nothing — which is
    // indistinguishable from a component whose every colour resolved.
    const findings = checkSubject(
      {
        name: 'ColourOnlyInClassName',
        kind: 'static',
        render: (_s, theme) => draw(<ColourOnlyInClassName />, theme),
      },
      ['light', 'dark'],
    );
    expect(rules(findings)).toContain('colour-invisible');
  });

  it('DECOY CONTROL — the same tree with a resolved token passes', () => {
    // Without this, the test above would pass for a component that fails for some OTHER
    // reason, and the rule it names would never have been the thing that fired.
    const findings = checkSubject(
      {
        name: 'ColourInStyle',
        kind: 'static',
        render: (_s, theme) => draw(<ColourInStyle />, theme),
      },
      ['light', 'dark'],
    );
    expect(rules(findings)).not.toContain('colour-invisible');
  });

  it('a subject that declares WHY it paints nothing is not flagged', () => {
    const findings = checkSubject(
      {
        name: 'ColourOnlyInClassName',
        kind: 'static',
        paintsNoColour: 'A spacer. It has no colour to declare, and never will.',
        render: (_s, theme) => draw(<ColourOnlyInClassName />, theme),
      },
      ['light', 'dark'],
    );
    expect(rules(findings)).not.toContain('colour-invisible');
  });

  it('rejects an accessible name that is only the component type', () => {
    const findings = checkSubject(
      { name: 'GenericName', kind: 'static', render: (_s, theme) => draw(<GenericName />, theme) },
      ['light', 'dark'],
    );
    expect(rules(findings)).toContain('generic-name');
  });

  /*
   * The pair that keeps the `TextInput` exemption honest (F-020).
   *
   * `no-role` now skips a host type the platform announces on its own. An exemption nobody
   * has watched fire — and nobody has watched STILL fire elsewhere — is indistinguishable
   * from switching the rule off.
   */
  /*
   * `transparent` paints nothing (F-023). The PAIR is what keeps that from becoming a hole:
   * the keyword is skipped, and a real hand-typed colour is still reported by the same run.
   *
   * It went unnoticed until F-023 because `Icon` has set it on its triangle glyph since F-003,
   * and the only registered subject rendering an Icon is `Status` with `kind="bad"` — the
   * CROSS glyph. That branch had never been rendered through this suite.
   */
  it('treats transparent as painting nothing, and still catches a real literal', () => {
    const findings = checkSubject(
      {
        name: 'TransparentAndLiteral',
        kind: 'static',
        render: (_state, theme) => draw(<ColourInStyle />, theme),
      },
      ['light', 'dark'],
    );
    expect(rules(findings)).toContain('colour-literal');
    expect(formatFindings(findings)).not.toContain('transparent');
  });
  it('still rejects a pressable with no role, now that TextInput is exempt', () => {
    const findings = checkSubject(
      {
        name: 'UnlabelledPressable',
        kind: 'interactive',
        render: (_state, theme) => draw(<UnlabelledPressable />, theme),
      },
      ['light', 'dark'],
    );
    expect(rules(findings)).toContain('no-role');
  });

  it('exempts a TextInput from the ROLE check and from nothing else', () => {
    const findings = checkSubject(
      {
        name: 'UnlabelledTextInput',
        kind: 'interactive',
        render: (_state, theme) => draw(<UnlabelledTextInput />, theme),
      },
      ['light', 'dark'],
    );
    // The platform supplies the role, so this is silent...
    expect(rules(findings)).not.toContain('no-role');
    // ...and supplies nothing else, so the missing name is still reported.
    expect(rules(findings)).toContain('no-name');
  });

  it('rejects a component that claims a state it cannot render', () => {
    const findings = checkSubject(
      {
        name: 'Absent',
        kind: 'interactive',
        render: (state, theme) => (state === 'loading' ? null : draw(<BadStates />, theme)),
      },
      ['light', 'dark'],
    );
    expect(rules(findings)).toContain('state-missing');
  });

  it('rejects a disabled control that does not announce it', () => {
    // The half that is invisible on screen and total for a screen-reader user.
    const findings = checkSubject(
      {
        name: 'SilentlyDisabled',
        kind: 'interactive',
        render: (state, theme) => draw(<Button label="Save this palette" testID={state} />, theme),
      },
      ['light', 'dark'],
    );
    expect(rules(findings)).toContain('state-not-announced');
  });
});

describe('a heading is announced as one (F-088)', () => {
  /** Walk to the first node carrying a role, so the assertion reads the TREE not the prop. */
  function roleOf(node: TestNode): string | undefined {
    const here = node.props['accessibilityRole'];
    if (typeof here === 'string') return here;
    for (const child of node.children ?? []) {
      // A child is a node or a raw string; only a node can carry props.
      if (typeof child === 'string') continue;
      const found = roleOf(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  it('renders accessibilityRole="header" when asked', () => {
    // Screen-reader users navigate by heading. Asserted against the rendered node rather than
    // the prop, because "we passed it" and "it reached the tree" are different claims.
    const tree = draw(
      <Text size="title" color="foreground" heading>
        Colour Atlas
      </Text>,
      'dark',
    );
    expect(roleOf(tree)).toBe('header');
  });

  it('DOES NOT render it otherwise — a component that always sets it is as wrong', () => {
    const tree = draw(
      <Text size="title" color="foreground">
        Colour Atlas
      </Text>,
      'dark',
    );
    expect(roleOf(tree)).toBeUndefined();
  });

  it('the Home screen title is a heading, so the prop has a real consumer', () => {
    // A prop nothing uses is a prop nothing checks
    // [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]. This is asserted in the
    // app's own suite too; here it guards the component's half of the contract.
    const tree = draw(
      <Text size="title" color="foreground" heading>
        x
      </Text>,
      'light',
    );
    expect(roleOf(tree)).toBe('header');
  });
});

describe('the swatch carries what ACCESSIBILITY.md section 5 requires', () => {
  it('names the colour, its value AND its provenance', () => {
    const tree = JSON.stringify(
      draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={SAMPLE} />, 'light'),
    );
    expect(tree).toContain('Ai-nezumi');
    expect(tree).toContain('526A6B');
    // Provenance is in the accessible name, not only in the type.
    expect(tree).toContain(SAMPLE.provenance.source);
    expect(tree).toContain('percent confidence');
  });

  it('rounds in proportion, and the keyline stays concentric (ADR-0090)', () => {
    /*
     * THIS ASSERTED  AT EVERY SIZE, FOREVER. ADR-0090 reversed that: the
     * objection was the sampled AREA a corner removes, which is a function of radius relative to
     * size, so the corner is a ratio and the manifest bounds what it may cost.
     *
     * What is asserted instead is the property that replaced it — the sample is rounded in
     * proportion, and the keyline around it is exactly one pixel wider, which is what keeps two
     * nested rounded rectangles concentric. Equal radii would show ground through each corner.
     */
    for (const size of [24, 72, 240]) {
      const { sample, keyline } = swatchCorner(size);
      const tree = JSON.stringify(
        draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={SAMPLE} size={size} />, 'light'),
      );
      expect(tree).toContain(`"borderRadius":${String(sample)}`);
      expect(tree).toContain(`"borderRadius":${String(keyline)}`);
      expect(keyline - sample).toBe(1);
    }
  });

  it('carries a non-colour channel for selection', () => {
    // NFR-9: a highlighted selected item needs a checkmark too, not a border alone.
    const off = JSON.stringify(
      draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={SAMPLE} />, 'light'),
    );
    const on = JSON.stringify(
      draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={SAMPLE} selected />, 'light'),
    );
    expect(off).not.toContain('✓');
    expect(on).toContain('✓');
  });
});

describe('a selectable component has to announce that it is selected (F-163)', () => {
  /*
   * THE RULE, WATCHED CATCHING SOMETHING. Without this the check would be satisfied by a
   * registry in which nothing declared `selectable`, which is the state the suite was in before
   * F-163 and is indistinguishable from the rule working.
   */
  const highlightOnly: ConformanceSubject = {
    name: 'HighlightOnly',
    kind: 'interactive',
    selectable: true,
    render: (state, theme) =>
      draw(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="A colour"
          // A BACKGROUND AND NOTHING ELSE. This is exactly what "marked/highlighted" looks like
          // when it is implemented as a colour change and nothing more — and it satisfies the
          // suite's distinct-trees assertion, because the trees ARE distinct.
          accessibilityState={{ disabled: state === 'disabled', busy: state === 'loading' }}
          style={{
            minWidth: nativeTapTarget,
            minHeight: nativeTapTarget,
            backgroundColor: state === 'active' ? '#333333' : '#EEEEEE',
          }}
        />,
        theme,
      ),
  };

  it('is reported when the selected state is a highlight nobody can hear', () => {
    const findings = checkSubject(highlightOnly, ['light']);
    expect(findings.map((f) => f.rule)).toContain('state-not-announced');
  });

  it('DECOY — the same component passes once it says so', () => {
    const announced: ConformanceSubject = {
      ...highlightOnly,
      render: (state, theme) =>
        draw(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state === 'active' ? 'A colour ✓' : 'A colour'}
            accessibilityState={{
              selected: state === 'active',
              disabled: state === 'disabled',
              busy: state === 'loading',
            }}
            style={{
              minWidth: nativeTapTarget,
              minHeight: nativeTapTarget,
              backgroundColor: state === 'active' ? '#333333' : '#EEEEEE',
            }}
          />,
          theme,
        ),
    };
    expect(checkSubject(announced, ['light']).map((f) => f.rule)).not.toContain(
      'state-not-announced',
    );
  });

  it('and a component that is NOT selectable is left alone', () => {
    // The false positive this rule had on its first draft: `active` means "being pressed" for a
    // Button, and requiring `selected` there flagged three components doing nothing wrong.
    const pressable: ConformanceSubject = { ...highlightOnly, selectable: false };
    expect(checkSubject(pressable, ['light']).map((f) => f.rule)).not.toContain(
      'state-not-announced',
    );
  });
});

describe('a status colour may not sit beside a colour sample (F-069)', () => {
  const SAMPLE_VALUES = ['#526A6B'];
  const check = (theme: 'light' | 'dark', inWell = false): readonly string[] =>
    checkStatusAdjacency(
      draw(
        inWell ? <StatusBesideSampleInWell theme={theme} /> : <StatusBesideSample theme={theme} />,
        theme,
      ),
      theme,
      SAMPLE_VALUES,
    );

  it('flags a status chip touching a bare sample', () => {
    // Simultaneous contrast. The chip changes how the fabric reads, and the fabric is what
    // the person is deciding about.
    const findings = check('light');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/swatch\.well/u);
  });

  it('ALLOWS the same pair when swatch.well is their shared ground', () => {
    // THE HALF THAT MAKES THE RULE USABLE. Without it the rule could be "flag any status
    // colour anywhere near anything", which would pass the negative above and be switched
    // off within a week — worse than no rule.
    expect(check('light', true)).toHaveLength(0);
  });

  it('does not flag the real components, which is asserted FIRST for a reason', () => {
    // A negative case means nothing if the check fires on everything.
    for (const subject of SUBJECTS)
      for (const state of REQUIRED_STATES[subject.kind]) {
        const tree = subject.render(state, 'light');
        if (tree === null) continue;
        expect(checkStatusAdjacency(tree, 'light', subject.sampleValues ?? [])).toHaveLength(0);
      }
  });

  it('holds in both themes', () => {
    // The two themes are authored independently; a status token's value differs between them.
    expect(check('dark')).toHaveLength(1);
    expect(check('dark', true)).toHaveLength(0);
  });
});

/**
 * C9 — **numbers are tabular**, and the token reaches the node.
 *
 * `nativeNumericFeature` was emitted from the manifest and asserted against it by
 * `packages/design-tokens`, and consumed by **nothing**, for two releases. A generated value
 * with no consumer passes every test it has [[a-tested-module-nobody-wired-up-passes-every-test-it-has]];
 * what it cannot do is align a column.
 *
 * Asserted over the RENDERED tree rather than by reading `Text.tsx`, because "the prop is in
 * the source" and "the variant reached the node" are different claims — and the second is the
 * one a text engine acts on. Whether the glyphs are ACTUALLY equal-width is a property of the
 * face, and that stays a device attestation.
 */
describe('figures are tabular where a caller asks for them (C9)', () => {
  function styleOf(node: TestNode): Record<string, unknown> {
    const raw: unknown = node.props['style'];
    // `reduce` rather than `Object.assign({}, ...raw)`: the spread widens to `any`, and a
    // React Native style array legitimately contains `null` and `false` layers that
    // `Object.assign` would happily skip while the types pretended otherwise.
    if (Array.isArray(raw))
      return (raw as unknown[]).reduce<Record<string, unknown>>(
        (acc, layer) =>
          typeof layer === 'object' && layer !== null
            ? { ...acc, ...(layer as Record<string, unknown>) }
            : acc,
        {},
      );
    return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  }

  function variants(node: TestNode, out: unknown[] = []): unknown[] {
    const v = styleOf(node)['fontVariant'];
    if (v !== undefined) out.push(v);
    for (const child of node.children ?? []) if (typeof child !== 'string') variants(child, out);
    return out;
  }

  it('carries the manifest feature when the numeric prop is set', () => {
    const tree = draw(
      <Text size="small" color="foreground" numeric>
        12.34
      </Text>,
      'light',
    );
    expect(variants(tree)).toContainEqual([nativeNumericFeature]);
  });

  /*
   * THE DECOY. Without it, a component that applied the variant unconditionally would satisfy
   * the assertion above and the prop would be decoration
   * [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
   */
  it('DECOY — a Text without `numeric` carries no font variant at all', () => {
    const tree = draw(
      <Text size="small" color="foreground">
        12.34
      </Text>,
      'light',
    );
    expect(variants(tree)).toHaveLength(0);
  });

  it('uses the manifest value rather than a literal', () => {
    // If someone writes 'tabular-nums' into Text.tsx and the manifest later says something
    // else, this is what disagrees. The token is the single home.
    expect(nativeNumericFeature).toBe('tabular-nums');
  });
});
