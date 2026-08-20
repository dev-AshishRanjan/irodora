/**
 * Every screen, run through the **same** conformance suite the component library runs.
 *
 * Not a copy of it — `@irodora/ui/testing` is imported. A second implementation is a second
 * thing to keep in step, and the copy that drifts is always the one nobody is looking at.
 *
 * ## What this file is really for
 *
 * A component library can be perfectly conformant and reach no user. These assertions are over
 * the actual screens, which is where NFR-8 and NFR-9 either hold or do not
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 */

import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import {
  checkAll,
  formatFindings,
  type ConformanceSubject,
  type TestNode,
} from '@irodora/ui/testing';
import { Home } from '../src/screens/Home.js';

function draw(node: React.JSX.Element, theme: 'light' | 'dark'): TestNode {
  const json = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>).toJSON();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

/**
 * THE SCREEN REGISTRY.
 *
 * A screen absent from here is a screen nothing checks. `a11y-scope.mjs` (increment 10) will
 * compare this list against the files under `app/` and fail on a screen that is missing.
 */
const SCREENS: readonly ConformanceSubject[] = [
  {
    name: 'screens/Home',
    // A screen is `static` for now: it reads, it does not yet accept input. The Atlas (F-018)
    // and the Lens (F-040) bring interactive screens and will claim the matching kind.
    kind: 'static',
    // The two samples the screen renders are DATA — arbitrary colours, not tokens. Declared
    // here in the registry rather than marked on the screen, so forgetting is a failure.
    sampleValues: ['#334B7E', '#28324D'],
    render: (_state, theme) => draw(<Home />, theme),
  },
];

describe('every screen conforms', () => {
  it('has screens to check at all', () => {
    expect(SCREENS.length).toBeGreaterThan(0);
  });

  it('produces no findings, in either theme', () => {
    const findings = checkAll(SCREENS);
    expect(formatFindings(findings)).toBe('');
  });
});
