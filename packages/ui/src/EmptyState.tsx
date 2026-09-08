/**
 * An empty state that cannot be written without saying how somebody gets out of it.
 *
 * ## The defect this exists for (F-139)
 *
 * `/wardrobe/add` was a route nothing linked to except the Lens, after a successful camera
 * reading. Open the wardrobe directly and there was no way to put anything in it — and while
 * the frame processor was throwing on every frame (F-138), no way at all. Three more screens
 * told you to go and do something and then gave you no way to get there:
 *
 * ```
 * "Add a garment and it appears here…"          → nothing
 * "Nothing in your wardrobe fits a slot yet."   → nothing
 * "Add something to your wardrobe first…"       → nothing
 * "Build a palette first…"                      → nothing
 * ```
 *
 * The repository had already argued for the fix and half-applied it: `Wardrobe.tsx`'s own
 * comment says *"one is 'add a garment', the other is 'clear a filter'"* — and only the filter
 * case got a button.
 *
 * ## The union is the whole point
 *
 * `action` and `resolvedHere` are a **discriminated union**, so there is no way to render an
 * empty state without declaring which kind it is:
 *
 * ```tsx
 * <EmptyState message={…} action={{ label: …, onPress: … }} />  // the action is elsewhere
 * <EmptyState message={…} resolvedHere />                       // the action is on this screen
 * ```
 *
 * A written rule would rely on the next screen's author remembering it; this makes the careless
 * version **unbuildable**, which is
 * [ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)'s argument applied to
 * a product rule rather than to provenance. `tsc` is the guard — not a script that reads prose,
 * which this repository has now watched fail five separate times.
 *
 * **`resolvedHere` has no default, deliberately.** A default is a thing people accept without
 * reading, and accepting it is exactly the mistake being prevented. Both members carry the
 * other key as `never`, so passing both is also an error.
 *
 * ## What it does not solve
 *
 * A screen that renders a bare `<Text>` for its empty branch bypasses this entirely, and `tsc`
 * cannot see that. The four known sites are converted and this is the obvious thing to reach
 * for next — that is the honest limit of the guarantee, not a claim that the gap is closed.
 */

import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Button } from './Button.js';
import { Illustration, type IllustrationName } from './Illustration.js';
// `TextProps` is generic over its size, and this only forwards `script` — so the prop's type is
// taken from a concrete instantiation rather than by making this component generic too.
import { Text, type TextProps } from './Text.js';

type Script = TextProps<'body'>['script'];

/** Where to go, and what to call it. The label is also the accessible name. */
export interface EmptyAction {
  readonly label: string;
  readonly onPress: () => void;
}

/**
 * Exactly one of these, and the caller has to choose.
 *
 * `action` — the thing to do lives on ANOTHER screen, so this offers the route to it.
 * `resolvedHere` — the thing to do is on this screen already (a search field, a filter to
 * clear), so a second control would be a second way to do one thing.
 */
type Resolution =
  | { readonly action: EmptyAction; readonly resolvedHere?: never }
  | { readonly resolvedHere: true; readonly action?: never };

export type EmptyStateProps = {
  /** What is empty. One sentence, in the person's language. */
  readonly message: string;
  /**
   * The drawing, keyed by what is missing (F-191).
   *
   * **Required, and for the reason `resolvedHere` is.** This component's whole design is that
   * the careless version should be *unbuildable* rather than merely discouraged — that is what
   * the resolution union does, and a drawing that could be omitted would be omitted, twelve
   * times, exactly as the button was before F-139.
   *
   * There are three names for twelve empty states, because the twelve emptinesses are three:
   * nothing collected, nothing measured, nothing put together. Choosing among three is a
   * decision somebody can make correctly in a second; inventing a twelfth picture is not.
   */
  readonly art: IllustrationName;
  /** Why it is empty, or what would fill it. Optional — some emptiness explains itself. */
  readonly hint?: string;
  /** Passed through to `Text`, so Japanese gets the bundled face rather than tofu. */
  readonly script?: Script;
} & Resolution;

export function EmptyState(props: EmptyStateProps): React.JSX.Element {
  /*
   * `script` is defaulted rather than forwarded as `| undefined`. Under
   * `exactOptionalPropertyTypes` a `?:` prop promises the key is absent or a real value, never
   * present-and-undefined — so passing it straight through would not compile. `latin` matches
   * `Text`'s own default, so a caller that omits it gets what it would have got anyway.
   */
  const { message, hint, art, script = 'latin' } = props;

  return (
    <View style={{ gap: nativeSpacing.sm }}>
      {/*
        THE DRAWING LEADS, AND CARRIES NOTHING (F-191).

        Above the sentence because an empty state is read top to bottom and the picture is the
        thing that says "this is a state, not a failure" before any words are read. It is
        `accessibilityElementsHidden` and says nothing a screen reader needs — the message below
        is the entire content, which is the third illustration rule and golden rule 13 read
        strictly.
      */}
      <Illustration name={art} />
      <Text size="body" color="foreground" script={script}>
        {message}
      </Text>

      {hint === undefined ? null : (
        <Text size="small" color="foreground.2" script={script}>
          {hint}
        </Text>
      )}

      {/*
        `'action' in props` and nothing else. The first draft also tested
        `props.action !== undefined`, and `no-unnecessary-condition` rejected it — because after
        the `in` check the compiler has already narrowed to the member where `action` is
        REQUIRED. That error is the union doing its job, reported by the linter.
      */}
      {'action' in props ? (
        <View style={{ alignItems: 'flex-start' }}>
          {/*
            THE SCRIPT REACHES THE BUTTON TOO (F-152). It was forwarded to the message and the
            hint and stopped there, so a Japanese empty state drew its sentence in the bundled
            face and its only control in the platform font — the one place on the screen where
            a missing glyph would be sitting on the thing you are meant to press.
          */}
          <Button label={props.action.label} onPress={props.action.onPress} script={script} />
        </View>
      ) : null}
    </View>
  );
}
