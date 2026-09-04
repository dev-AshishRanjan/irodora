import { Stack } from 'expo-router';
import { useTheme } from '@irodora/ui';

/**
 * The Atlas tab's own stack (F-145). It holds the Finder, a colour and its card, Compare and Palette Studio — everything that is about a colour rather than about a garment.
 *
 * ## This is what makes "pushed within a tab" true rather than decorative
 *
 * Without a `Stack` here, every file in this directory would be a sibling route of the tab
 * itself: opening one would REPLACE the tab rather than push onto it, and going back would leave
 * the tab entirely. The tab bar would still be there and would have stopped meaning anything.
 *
 * The header is drawn by the stack rather than by each screen, so a pushed screen gets a back
 * affordance without asking for one — the behaviour a person expects, and the thing the flat
 * route table this replaced could not give at all.
 *
 * ## The tab's root screen has no header
 *
 * Its own `Screen` renders the title at the display step, and a navigation bar above that would
 * say the same word twice at two different sizes. A PUSHED screen turns the header back on,
 * because that is where the back affordance lives.
 */
export default function AtlasLayout(): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
