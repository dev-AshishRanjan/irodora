#!/usr/bin/env node
/**
 * Irodora — the Android minimum is a colour-correctness requirement, not a preference.
 *
 * Below API 26 the Lens cannot read a pixel buffer at all. `react-native-nitro-modules` guards
 * its entire `AHardwareBuffer` implementation behind `#if __ANDROID_API__ >= 26` and throws in
 * the `#else`; `__ANDROID_API__` is set by the NDK from Gradle's `minSdkVersion`, and Nitro takes
 * the app's value directly. Expo defaults it to 24 when nothing sets one — which is what shipped,
 * and what cost four device round trips to find (ADR-0079).
 *
 * ## Why a check, when a comment already says it
 *
 * The number lives in one config file. Lowering it back to 24 changes nothing that any test in
 * this repository can see: jest has no NDK, typecheck sees an integer, and lint sees a plugin
 * entry that resolves. The failure appears on a phone, on every frame, as a `console.error`
 * inside a library's own try/catch — which is to say, nowhere.
 *
 * ## What it asserts
 *
 *   1. `ANDROID_MIN_SDK` is exported from `app.config.ts` and is at least `FLOOR`.
 *   2. The `expo-build-properties` plugin is present and passes **that constant** — not a
 *      literal, because a literal is how the two drift apart, and not nothing, because a
 *      constant nobody reads is decoration.
 *
 * ## What it does NOT assert, and what does
 *
 * **That the built APK actually declares it.** That is a property of the artefact and it belongs
 * to gate 16, where `aapt2` is an independent oracle. This is source analysis: it can prove the
 * intent is written down, not that the manifest merger honoured it.
 *
 * Usage:
 *   node scripts/verify-android-min-sdk.mjs
 *   node scripts/verify-android-min-sdk.mjs --prove   # watch every assertion fail
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ciError } from './annotate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = 'apps/mobile/app.config.ts';

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * The lowest API level the frame pipeline works at.
 *
 * It is 26 because that is the number in Nitro's `#if`, not because 26 is a tasteful floor. If
 * the dependency's guard moves, this moves with it and the reason moves with both.
 */
const FLOOR = 26;

/** @returns {{ ok: true, value: number } | { ok: false, why: string }} */
function readDeclaredMinimum(source) {
  const declaration = /export\s+const\s+ANDROID_MIN_SDK\s*=\s*(\d+)\s*;/.exec(source);
  if (declaration === null)
    return { ok: false, why: `${CONFIG} does not export \`ANDROID_MIN_SDK\`` };

  const value = Number(declaration[1]);
  if (value < FLOOR)
    return {
      ok: false,
      why:
        `\`ANDROID_MIN_SDK\` is ${String(value)}, below the ${String(FLOOR)} the frame ` +
        `pipeline needs — the Lens cannot read a pixel buffer below it (ADR-0079)`,
    };

  return { ok: true, value };
}

/** @returns {{ ok: true } | { ok: false, why: string }} */
function checkPluginPassesIt(source) {
  const entry = /\[\s*'expo-build-properties'\s*,\s*\{([\s\S]*?)\}\s*\]/.exec(source);
  if (entry === null)
    return {
      ok: false,
      why:
        `${CONFIG} has no \`expo-build-properties\` plugin entry — a declared constant that ` +
        `reaches no build is decoration`,
    };

  const options = entry[1];
  if (!/minSdkVersion\s*:\s*ANDROID_MIN_SDK\b/.test(options)) {
    const literal = /minSdkVersion\s*:\s*(\d+)/.exec(options);
    return {
      ok: false,
      why:
        literal === null
          ? `the \`expo-build-properties\` entry does not set \`android.minSdkVersion\``
          : `the \`expo-build-properties\` entry hard-codes ${literal[1]} instead of passing ` +
            `\`ANDROID_MIN_SDK\` — two numbers that can disagree is how this regresses`,
    };
  }

  return { ok: true };
}

/** @returns {string[]} the reasons this source is unacceptable, empty when it is fine. */
function run(source) {
  const failures = [];
  const minimum = readDeclaredMinimum(source);
  if (!minimum.ok) failures.push(minimum.why);
  const plugin = checkPluginPassesIt(source);
  if (!plugin.ok) failures.push(plugin.why);
  return failures;
}

const real = readFileSync(resolve(ROOT, CONFIG), 'utf8');

if (process.argv.includes('--prove')) {
  console.log(`\n${BOLD}Proving the Android minimum check discriminates${OFF}\n`);

  /*
   * Each decoy is a change somebody could plausibly make. The LAST one is the point: a check
   * that only noticed a MISSING value would pass a lowered one, and lowering is the regression
   * that actually happens — somebody widening device support without knowing what it costs.
   */
  const cases = [
    ['the real config', real, false],
    [
      'the constant lowered to 24',
      real.replace('ANDROID_MIN_SDK = 26', 'ANDROID_MIN_SDK = 24'),
      true,
    ],
    [
      'the constant lowered to 25',
      real.replace('ANDROID_MIN_SDK = 26', 'ANDROID_MIN_SDK = 25'),
      true,
    ],
    [
      'the constant removed',
      real.replace(/export\s+const\s+ANDROID_MIN_SDK\s*=\s*\d+\s*;/, ''),
      true,
    ],
    [
      'the plugin entry removed',
      real.replace(/\[\s*'expo-build-properties'[\s\S]*?\}\s*\]\s*,/, ''),
      true,
    ],
    [
      'the plugin hard-coding 24 instead of the constant',
      real.replace('minSdkVersion: ANDROID_MIN_SDK', 'minSdkVersion: 24'),
      true,
    ],
    [
      'the plugin hard-coding 26 instead of the constant',
      real.replace('minSdkVersion: ANDROID_MIN_SDK', 'minSdkVersion: 26'),
      true,
    ],
  ];

  let bad = 0;
  for (const [name, source, shouldFail] of cases) {
    if (source === real && name !== 'the real config') {
      console.log(`  ${RED}✗${OFF} ${name} — the decoy changed nothing, so it proves nothing`);
      bad += 1;
      continue;
    }
    const failures = run(source);
    const failed = failures.length > 0;
    const right = failed === shouldFail;
    if (!right) bad += 1;
    console.log(
      `  ${right ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`} ${name} — ` +
        `${failed ? 'rejected' : 'accepted'}${right ? '' : `, expected ${shouldFail ? 'rejected' : 'accepted'}`}` +
        `${failed && right && shouldFail ? `${DIM}: ${failures[0]}${OFF}` : ''}`,
    );
  }

  if (bad > 0) {
    console.log(`\n${RED}${BOLD}The check does not discriminate.${OFF}\n`);
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Check proven.${OFF} ${DIM}A lowered minimum is rejected, not only a ` +
      `missing one — and the real config is accepted, which is the half that stops this ` +
      `being a check that fails on everything.${OFF}\n`,
  );
  process.exit(0);
}

console.log(`\n${BOLD}Android minimum${OFF}\n`);

const failures = run(real);

if (failures.length > 0) {
  console.log(`${RED}${BOLD}${String(failures.length)} problem(s) with the Android minimum${OFF}`);
  for (const why of failures) {
    console.log(`  ${RED}✗${OFF} ${why}`);
    ciError(CONFIG, 1, why);
  }
  console.log(
    `\n${DIM}  Below API ${String(FLOOR)} the Lens cannot read a pixel buffer: Nitro compiles\n` +
      `  its AHardwareBuffer support out and throws instead, on every frame, into a\n` +
      `  console.error inside a library's own try/catch. ADR-0079 has the whole chain.${OFF}\n`,
  );
  process.exit(1);
}

const declared = readDeclaredMinimum(real);
console.log(
  `${DIM}  minSdkVersion ${String(declared.ok ? declared.value : '?')} ` +
    `(floor ${String(FLOOR)}, from Nitro's \`#if __ANDROID_API__ >= 26\`), declared in ` +
    `${CONFIG} and passed to expo-build-properties.${OFF}`,
);
console.log(
  `${DIM}  NOT CHECKED HERE: that the built APK declares it. That is a property of the\n` +
    `  artefact and belongs to gate 16, where aapt2 is an independent oracle. This is source\n` +
    `  analysis — it proves the intent is written down, not that the merger honoured it.${OFF}`,
);

console.log(`\n${GREEN}${BOLD}The Android minimum is what the Lens needs.${OFF}\n`);
