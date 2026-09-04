import { useRouter } from 'expo-router';
import { Home } from '../../src/screens/Home';
import { deviceRepository } from '../../src/store/repository';

/**
 * The route. The one wire the screen cannot make itself, and nothing else.
 *
 * ## Ten callbacks became three
 *
 * This route used to hand `Home` ten `onOpen*` props, one per button, because the button list
 * WAS the navigation. F-145 made the tab bar the navigation and F-146 removed the list, so what
 * is left are the three places Home still leads to directly — and each is a link out of a block
 * rather than an entry in a menu.
 *
 * `Stack.Screen` is gone too: this route is inside the tab group now, and the tab layout owns
 * the chrome. Setting options here would put a navigation bar above the tab bar's own screen.
 */
export default function Index(): React.JSX.Element {
  const router = useRouter();
  return (
    <Home
      // The REAL repository, not a fake. `screens.test.tsx` asserts this for every route that
      // takes one, because a screen wired to an in-memory store looks identical until a person
      // closes the app.
      store={deviceRepository()}
      onOpenLens={() => {
        router.push('/lens');
      }}
      onAddGarment={() => {
        router.push('/wardrobe/add');
      }}
      onOpenColour={(slug) => {
        router.push(`/atlas/${slug}`);
      }}
    />
  );
}
