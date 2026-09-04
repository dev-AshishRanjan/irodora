import { Stack, useRouter } from 'expo-router';
import { Home } from '../../src/screens/Home';

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
          router.push('/atlas/compare');
        }}
        onOpenStudio={() => {
          router.push('/atlas/palettes');
        }}
        onOpenFinder={() => {
          router.push('/atlas/find');
        }}
        onOpenProfile={() => {
          router.push('/profile');
        }}
        onOpenLens={() => {
          router.push('/lens');
        }}
        onOpenShopping={() => {
          router.push('/wardrobe/shopping');
        }}
        onOpenWardrobe={() => {
          router.push('/wardrobe');
        }}
        onOpenExport={() => {
          router.push('/profile/export');
        }}
        onOpenMeasure={() => {
          router.push('/profile/measure');
        }}
      />
    </>
  );
}
