import { Component, Suspense, lazy, type ReactNode } from 'react';
import { Stack } from 'expo-router';
import { CameraUnavailable } from '../../src/lens/CameraUnavailable';

/**
 * The route. Navigation options, and the one thing this file exists to guarantee: **pressing
 * "Read a colour with the camera" must never close the app.**
 *
 * ## Why the camera is loaded lazily
 *
 * `react-native-vision-camera` builds its native binding at module scope —
 * `NitroModules.createHybridObject('CameraFactory')` — so *importing* it throws when the
 * HybridObject is not registered in the build. `src/lens/permission.ts` records that exact error
 * from CI: *"Failed to get NitroModules: The native NitroModules Turbo/Native-Module could not be
 * found."*
 *
 * While this route imported the camera statically, that throw happened while the ROUTE MODULE
 * WAS BEING EVALUATED — before React rendered anything — so no error boundary could catch it and
 * the process went down. `React.lazy` turns the same failure into a rejected promise inside a
 * boundary: the app stays up, the rest of it keeps working, and the screen prints what actually
 * went wrong so it can be reported.
 *
 * This is not a workaround for the underlying cause. It is the behaviour a shipped app should
 * have had all along: **one screen's native dependency must not be able to take down the app.**
 */

const CameraLens = lazy(async () => import('../../src/lens/CameraLens'));

/**
 * `caught` rather than a nullable error, because `unknown` already includes `null` — and what
 * was thrown may legitimately BE null or undefined. A flag says "the boundary fired" without
 * making that indistinguishable from "it threw nothing".
 */
interface BoundaryState {
  readonly caught: boolean;
  readonly error: unknown;
}

/**
 * Catches anything the camera subtree throws, including a failed lazy import.
 *
 * A class because that is the only thing React gives us: `componentDidCatch` has no hook
 * equivalent, and expo-router's own `ErrorBoundary` export would not help here — it is for
 * render errors, and the failure this exists for is a module that will not load.
 */
class CameraBoundary extends Component<{ readonly children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { caught: false, error: undefined };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { caught: true, error };
  }

  override render(): ReactNode {
    const { caught, error } = this.state;
    if (caught) return <CameraUnavailable error={error} />;
    return this.props.children;
  }
}

export default function LensRoute(): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title: 'Lens' }} />
      <CameraBoundary>
        {/*
          `null` rather than a spinner: the module is bundled, so this resolves in the same tick
          on a working build and a spinner would flash. On a broken one the boundary takes over.
        */}
        <Suspense fallback={null}>
          <CameraLens />
        </Suspense>
      </CameraBoundary>
    </>
  );
}
