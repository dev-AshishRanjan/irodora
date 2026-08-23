import { addReleaseSigning } from '../plugins/withReleaseSigning';

/**
 * The transform that keeps a release build off the debug key (F-080).
 *
 * ## What this can and cannot prove
 *
 * The fixture below is the React Native template's signing region, copied verbatim from a
 * real `expo prebuild` output. A committed copy can drift from the template it mirrors, and
 * a test over a stale fixture is a test that agrees with yesterday — so the fixture is NOT
 * the guard against an Expo upgrade. **The plugin throwing at prebuild time is**, and prebuild
 * runs before every build in both workflows. What these cases prove is that the transform
 * does the right thing when it matches, and refuses rather than shrugs when it does not.
 *
 * The strongest check on all of this is downstream and reads bytes: gate 16 compares the
 * signer certificate in the built APK against the fingerprint the release is expected to
 * carry. A transform that silently no-ops still fails there.
 */

const TEMPLATE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

describe('addReleaseSigning', () => {
  it('points the release build type at a release signing config', () => {
    const out = addReleaseSigning(TEMPLATE);

    expect(out).toContain('signingConfig signingConfigs.release');
    // The debug build type keeps its own key — the on-demand test-build lane runs with no
    // secrets at all, and breaking that would push people towards building releases locally.
    expect(out).toContain(`        debug {
            signingConfig signingConfigs.debug
        }`);
  });

  it('leaves the release build type with no reference to the debug key', () => {
    const out = addReleaseSigning(TEMPLATE);
    const releaseBlock = out.slice(out.indexOf('        release {\n', out.indexOf('buildTypes')));

    expect(releaseBlock).not.toContain('signingConfigs.debug');
  });

  it('reads the keystore from the environment rather than from a committed path', () => {
    const out = addReleaseSigning(TEMPLATE);

    expect(out).toContain('System.getenv("IRODORA_ANDROID_KEYSTORE_PATH")');
    expect(out).toContain('System.getenv("IRODORA_ANDROID_KEYSTORE_PASSWORD")');
    expect(out).toContain('System.getenv("IRODORA_ANDROID_KEY_ALIAS")');
    expect(out).toContain('System.getenv("IRODORA_ANDROID_KEY_PASSWORD")');
    // Optional: a PKCS#12 keystore made with openssl rather than a JKS made with keytool.
    expect(out).toContain('System.getenv("IRODORA_ANDROID_KEYSTORE_TYPE")');
    // A literal password anywhere in the generated project is a password in a build log.
    expect(out).not.toMatch(/storePassword\s+'(?!android')/);
  });

  it('keeps the debug fallback impossible: no storeFile without the environment', () => {
    const out = addReleaseSigning(TEMPLATE);
    const releaseSigning = out.slice(
      out.indexOf('        release {'),
      out.indexOf('        debug {'),
    );

    // The guard is the `if`. Without it the config would carry an empty storeFile and AGP
    // would resolve it to something, which is how a "release" ends up unsigned or debug-signed.
    expect(releaseSigning).toContain('if (irodoraKeystore) {');
    expect(releaseSigning).not.toContain('debug.keystore');
  });

  it('THROWS when the template no longer has the anchor, rather than doing nothing', () => {
    const upgraded = TEMPLATE.replace(
      '            // Caution! In production, you need to generate your own keystore file.\n',
      '',
    );

    expect(() => addReleaseSigning(upgraded)).toThrow(/template has changed/i);
  });

  it('THROWS when there is no signingConfigs container at all', () => {
    expect(() => addReleaseSigning('android {\n}\n')).toThrow(/found 0/);
  });

  it('refuses to run twice over an already-transformed file', () => {
    const once = addReleaseSigning(TEMPLATE);

    expect(() => addReleaseSigning(once)).toThrow(/already references signingConfigs.release/);
  });
});
