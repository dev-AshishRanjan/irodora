import { Stack, useRouter } from 'expo-router';
import { Home } from '../src/screens/Home';

/**
 * The route. Navigation options only.
 *
 * The screen's content is `src/screens/Home.tsx` so it can be rendered — and therefore
 * checked — without mounting a navigator around it.
 */
export default function Index(): React.JSX.Element {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Irodora' }} />
      <Home
        onOpenAtlas={() => {
          router.push('/atlas');
        }}
        onOpenCompare={() => {
          router.push('/compare');
        }}
        onOpenStudio={() => {
          router.push('/palettes');
        }}
        onOpenFinder={() => {
          router.push('/find');
        }}
        onOpenProfile={() => {
          router.push('/profile');
        }}
        onOpenLens={() => {
          router.push('/lens');
        }}
        onOpenShopping={() => {
          router.push('/shopping');
        }}
        onOpenMeasure={() => {
          router.push('/measure');
        }}
      />
    </>
  );
}
