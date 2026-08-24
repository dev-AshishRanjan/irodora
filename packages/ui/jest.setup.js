/**
 * What the render harness needs before it can see a HeroUI tree (ADR-0062, F-087).
 *
 * One mock, and it is not cosmetic. `react-native-gesture-handler` v3 calls worklets'
 * `getUIRuntimeHolder` from an `Immediate` at import time. Under
 * `react-native-worklets/jest/resolver.js` — which the config uses so worklets resolves to a
 * build that exists outside a native runtime — that call throws, asynchronously, and jest
 * attributes the throw to whichever test happened to be running.
 *
 * HeroUI declares `react-native-gesture-handler@^2.28.0`; this tree resolves **3.2.1**, via
 * `expo-router`. That mismatch is accepted in ADR-0062 rather than solved — downgrading breaks
 * `expo-router` — and this is the first place it costs something.
 *
 * The mock is safe for what these tests assert. The gates here read the accessibility TREE
 * (ADR-0055); they never drive a gesture. A test that genuinely needs gesture behaviour cannot
 * use this harness and must say so.
 */

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual('react-native-gesture-handler/jestSetup.js');
  return {
    ...actual,
    GestureHandlerRootView: 'GestureHandlerRootView',
    GestureDetector: ({ children }) => children,
    Gesture: { Pan: () => ({ onUpdate: () => ({}) }) },
  };
});
