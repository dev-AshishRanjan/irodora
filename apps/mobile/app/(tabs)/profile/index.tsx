import { useCallback, useMemo, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ProfileSetup } from '../../../src/screens/ProfileSetup';
import { deviceRepository } from '../../../src/store/repository';
import { devicePicker } from '../../../src/wardrobe/picker';
import { takeReading } from '../../../src/lens/handoff';
import { activeProfile } from '../../../src/profile/store';
import { avatarUri, chooseAvatar } from '../../../src/profile/avatar';

/**
 * The route. Navigation options and the store, and nothing else.
 *
 * `deviceRepository` is imported **here** rather than in the screen: it reaches `expo-sqlite`,
 * which needs a device, so a screen that imported it could not be rendered by jest at all —
 * and the screen suite is where NFR-8 and NFR-9 are actually checked. `Repository` satisfies
 * `ProfileStore` structurally, so this is a pass-through and `typecheck` proves they agree.
 */
export default function ProfileRoute(): React.JSX.Element {
  const router = useRouter();
  /*
   * The offered reading, taken ONCE (F-097).
   *
   * In state rather than read on every render: `takeReading` consumes, so calling it during a
   * re-render would hand back the reading the first time and `null` every time after — the
   * estimate would appear and then vanish on the next keystroke. Reading it in the initialiser
   * takes the offer exactly once per mount, which is what "an offer" means.
   */
  const [reading] = useState(() => takeReading('profile'));

  /*
   * THE PICTURE (F-241), read through the repository and re-read when it changes.
   *
   * `version` is what makes the re-read happen: the store is not reactive, so choosing a picture
   * has to say so. The same shape `Preferences` uses after a reset, and cheaper than it sounds —
   * `avatarUri` asks for the INFO row first and only loads the blob when there is one.
   */
  const [version, setVersion] = useState(0);
  const [refused, setRefused] = useState(false);
  const store = deviceRepository();
  const profile = activeProfile(store);
  /*
   * MEMOISED ON `version`, which is the counter a change already bumps (F-241's review).
   *
   * Inline, this was a full BLOB read plus a base64 encode of a photograph of somebody's face on
   * every render, on the JS thread, with a multi-megabyte string repeatedly alive in the JS heap.
   * The review recorded it as a feature and it is one line, so it is fixed here instead: the
   * dependency that says "the picture changed" is the same one that already says so.
   */
  const uri = useMemo(
    () => (profile === null ? null : avatarUri(store, profile.id)),
    [store, profile, version],
  );

  const choose = useCallback((): void => {
    if (profile === null) return;
    setRefused(false);
    /*
     * FIRE AND FORGET, deliberately. The picker is a promise because the OS dialogue is, and a
     * route cannot await inside a press handler. A refusal is a RESULT here rather than a throw
     * — `chooseAvatar` catches only `ImageRejected` — so the `.catch` below is for the things
     * that are genuinely faults, and it says nothing to the person because a database that
     * cannot be written is not something a sentence under a button can help with.
     */
    void chooseAvatar(devicePicker(), store, profile.id, Date.now())
      .then((result) => {
        if (result.kind === 'refused') setRefused(true);
        if (result.kind === 'chosen') setVersion((v) => v + 1);
      })
      .catch(() => {
        /* Not a refused picture. Nothing a caption can do about it. */
      });
  }, [profile, store]);

  const remove = useCallback((): void => {
    if (profile === null) return;
    setRefused(false);
    store.clearProfileAvatar(profile.id, Date.now());
    setVersion((v) => v + 1);
  }, [profile, store]);

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      {/*
        Spread rather than `reading={reading ?? undefined}`. Under `exactOptionalPropertyTypes`
        an optional prop promises the key is either ABSENT or a reading — never
        present-and-undefined — and the screen's own `reading === undefined` test is what
        decides which privacy sentence it shows. Passing the key with `undefined` in it would
        make "no camera was used" depend on a distinction the type system exists to remove.
      */}
      <ProfileSetup
        /*
          `deviceRepository()` AT THE CALL SITE, not the binding above it, and the two are the
          same object — the module memoises. `screens.test.tsx` reads this line as source text to
          prove the route reaches for the real repository rather than a fake, and a binding it
          could not follow would weaken that check to make this file tidier.
        */
        store={deviceRepository()}
        {...(reading === null ? {} : { reading })}
        /*
          THE AVATAR CONTROLS ARE OFFERED ONLY WHEN THERE IS A PROFILE TO ATTACH ONE TO.
          `profile_avatar` hangs off `personal_color_profile`, so a picture before there is a
          profile has nothing to belong to — and a button that could not work is worse than one
          that is not there, which is the call F-154 made about the device colour.
        */
        avatarUri={uri}
        avatarRefused={refused}
        {...(profile === null ? {} : { onChooseAvatar: choose, onRemoveAvatar: remove })}
        /*
          THE ROUTE OWNS THE DESTINATION (F-180). `/profile/preferences` has existed since
          F-109 and NOTHING navigated to it — the appearance chooser inside it was unreachable
          for two releases, which is why "I don't see settings" was a correct report about a
          feature that was finished.
        */
        onOpenSettings={() => {
          router.push('/profile/preferences');
        }}
        onOpenMeasure={() => {
          router.push('/profile/measure');
        }}
        // FR-58. Being unreachable was worse here than anywhere else: the on-device privacy
        // claim is only meaningful if a person can act on it.
        onOpenExport={() => {
          router.push('/profile/export');
        }}
      />
    </>
  );
}
