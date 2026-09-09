/**
 * The target: armed, replaced, disarmed, and never cleared by accident (F-200).
 *
 * The whole of criterion 2 is *"held for the session and disarmed deliberately, never
 * silently"*, and every assertion here is about the second half. The first is what a mailbox
 * would have got wrong.
 */

import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { allEntries, colorFor } from '../src/corpus';
import { TargetProvider, useTarget, type TargetColour, type TargetValue } from '../src/target';

const entry = allEntries()[0]!;
const other = allEntries()[1]!;

const targetFrom = (e: typeof entry): TargetColour => ({
  hex: e.derived.hex,
  oklch: [e.derived.oklch[0], e.derived.oklch[1], e.derived.oklch[2]],
  color: colorFor(e.entry),
  label: e.entry.name.en,
  slug: e.entry.slug,
});

/** Captures the context value so a test can drive it, the way a route would. */
function harness(): { readonly read: () => TargetValue; rerender: (label: string) => void } {
  let captured: TargetValue | null = null;
  function Probe({ label }: { readonly label: string }): React.JSX.Element {
    captured = useTarget();
    return <Text>{label}</Text>;
  }
  const view = render(
    <TargetProvider>
      <Probe label="a" />
    </TargetProvider>,
  );
  return {
    read: () => {
      if (captured === null) throw new Error('the probe never rendered');
      return captured;
    },
    // A different child, so the provider re-renders with a changed subtree — the closest a unit
    // test gets to "the person navigated somewhere else".
    rerender: (label: string) => {
      view.rerender(
        <TargetProvider>
          <Probe label={label} />
        </TargetProvider>,
      );
    },
  };
}

describe('arming and disarming', () => {
  it('starts with nothing armed', () => {
    expect(harness().read().target).toBeNull();
  });

  it('holds the colour it was given', () => {
    const h = harness();
    act(() => {
      h.read().arm(targetFrom(entry));
    });
    expect(h.read().target?.slug).toBe(entry.entry.slug);
    expect(h.read().target?.hex).toBe(entry.derived.hex);
  });

  it('replaces rather than queues — the second colour is the one meant', () => {
    const h = harness();
    act(() => {
      h.read().arm(targetFrom(entry));
    });
    act(() => {
      h.read().arm(targetFrom(other));
    });
    expect(h.read().target?.slug).toBe(other.entry.slug);
  });

  /**
   * THE DECOY FOR DISARM.
   *
   * A disarm that merely stopped rendering the bar would leave the value in place, and every
   * assertion about arming would still pass. The value must actually come back `null`.
   */
  it('disarms to null, not to the previous target', () => {
    const h = harness();
    act(() => {
      h.read().arm(targetFrom(entry));
    });
    act(() => {
      h.read().disarm();
    });
    expect(h.read().target).toBeNull();
  });
});

describe('nothing clears it silently', () => {
  it('survives a re-render with a different subtree', () => {
    /*
     * The unit-test reading of "navigation does not clear it". A mailbox would have been emptied
     * by the first reader; this is state, and it stays until somebody says otherwise.
     */
    const h = harness();
    act(() => {
      h.read().arm(targetFrom(entry));
    });
    h.rerender('b');
    expect(h.read().target?.slug).toBe(entry.entry.slug);
  });

  it('DECOY — a fresh provider really does start empty', () => {
    // Otherwise the assertion above could pass on a module-level value shared between tests,
    // which would be a target that outlived the session rather than one that survived a render.
    expect(harness().read().target).toBeNull();
  });
});

describe('a colour with no slug can be a target', () => {
  it('holds one, because a target is compared against rather than stored', () => {
    const h = harness();
    const generated: TargetColour = {
      hex: '#4C5A66',
      oklch: [0.45, 0.03, 240],
      color: colorFor(entry.entry),
      label: '#4C5A66',
      slug: null,
    };
    act(() => {
      h.read().arm(generated);
    });
    expect(h.read().target?.slug).toBeNull();
    expect(h.read().target?.label).toBe('#4C5A66');
  });
});

describe('the provider is not optional', () => {
  it('refuses to be read outside one, rather than behaving as though nothing were armed', () => {
    /*
     * A null-ish default would make the provider optional in a way nobody notices is missing —
     * and a screen silently behaving as though nothing were armed is indistinguishable from a
     * disarmed target, which is the failure this feature is written against.
     */
    function Bare(): React.JSX.Element {
      useTarget();
      return <Text>never</Text>;
    }
    expect(() => render(<Bare />)).toThrow(/TargetProvider/u);
  });
});
