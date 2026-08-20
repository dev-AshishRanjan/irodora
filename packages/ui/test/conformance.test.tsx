/**
 * Every component, in every state its kind requires, in both themes.
 *
 * The suite itself is `@irodora/ui/testing` — the same function `apps/mobile` runs over its
 * screens. This file is the *registry* plus the assertions that prove the suite discriminates,
 * because a conformance suite nobody has watched reject anything is a suite that might only
 * be capable of passing [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { render } from '@testing-library/react-native';
import { fromSpace } from '@irodora/color-core';
import { Button, Surface, Swatch, Text, ThemeProvider } from '../src/index.js';
import {
  checkAll,
  checkSubject,
  formatFindings,
  REQUIRED_STATES,
  type ConformanceSubject,
  type Finding,
  type TestNode,
} from '../src/testing/index.js';
import { BadStates, GenericName, LiteralColour } from './fixtures/subjects.js';

/** Render inside a forced theme, and hand back the walkable tree. */
function draw(node: React.JSX.Element, theme: 'light' | 'dark'): TestNode {
  const json = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>).toJSON();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

/** A colour that carries provenance, which is what Swatch requires by type (ADR-0005). */
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
    name: 'Surface',
    kind: 'static',
    render: (_state, theme) =>
      draw(
        <Surface level="2" padding={8}>
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
    name: 'Swatch',
    kind: 'interactive',
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

  it('rejects an accessible name that is only the component type', () => {
    const findings = checkSubject(
      { name: 'GenericName', kind: 'static', render: (_s, theme) => draw(<GenericName />, theme) },
      ['light', 'dark'],
    );
    expect(rules(findings)).toContain('generic-name');
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

  it('is radius 0, at every size, forever', () => {
    for (const size of [24, 72, 400]) {
      const tree = JSON.stringify(
        draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={SAMPLE} size={size} />, 'light'),
      );
      expect(tree).toContain('"borderRadius":0');
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
