#!/usr/bin/env node
/**
 * Motion may not animate a colour.
 *
 * ## Why this matters more than it sounds
 *
 * **The intermediate frames of a colour transition are plausible colours that never existed.**
 * A user watching a swatch cross-fade reads a value the engine never produced, and for a
 * product whose entire claim is "this is what colour that is", that is a correctness defect
 * rather than a polish one. The manifest has said so since F-003; nothing enforced it.
 *
 * ## Why this is a script and not a rendered check
 *
 * **The rendered tree cannot see it.** Probed rather than assumed — an `Animated.View` with an
 * interpolated `backgroundColor` renders to:
 *
 * ```json
 * { "type": "View", "props": { "style": { "backgroundColor": "rgba(0, 0, 0, 1)" } } }
 * ```
 *
 * A concrete resolved value, indistinguishable from a static colour. The conformance suite,
 * which sees everything else in this product, is structurally blind here.
 *
 * ## Why the allowlist comes from `animatable`, not `forbidden`
 *
 * `motion.forbidden` is prose — *"background-color on a swatch"*, *"cross-fade between
 * samples"* — and nothing mechanical can be derived from it. `motion.animatable` is a property
 * list, and it is the same rule stated positively: **only these may be animated.** So the list
 * is genuinely derived from the manifest rather than copied beside it.
 *
 * ## What it cannot see, printed on every run
 *
 * Source analysis. A style assembled at runtime, spread from a variable, or built by a helper
 * is invisible to it. Saying so is the difference between a check and a claim.
 *
 * ```
 * node scripts/verify-motion.mjs
 * node scripts/verify-motion.mjs --prove
 * ```
 */

import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  unlinkSync,
  existsSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/** Directories whose components may animate. */
const SCOPES = [
  join(ROOT, 'packages', 'ui', 'src'),
  join(ROOT, 'apps', 'mobile', 'src'),
  join(ROOT, 'apps', 'mobile', 'app'),
];

/**
 * The allowlist, read from the generated tokens — which are emitted from the manifest.
 *
 * Not a copy. If `motion.animatable` gains a property, this check permits it on the next
 * build with nothing to edit here; if it loses one, this check starts rejecting it.
 */
async function allowedProperties() {
  const dist = join(ROOT, 'packages', 'design-tokens', 'dist', 'index.js');
  if (!existsSync(dist))
    throw new Error(
      '@irodora/design-tokens is not built, so the allowlist cannot be read from the manifest. ' +
        'Run `pnpm build` first. Refusing to fall back to a hard-coded list: a copy of the ' +
        'manifest beside the manifest is what this check exists to avoid.',
    );
  const { nativeMotion } = await import(pathToFileURL(dist).href);
  return new Set(nativeMotion.animatable);
}

function sourceFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/u.test(entry) && !/__guard__/u.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Style properties given to an `Animated.*` element in this source.
 *
 * Deliberately crude and deliberately narrow: it looks for `<Animated.X ... style={{ ... }}>`
 * and reads the keys of that literal. It will miss a style built elsewhere, which is stated
 * rather than hidden — a checker that overstated its reach would be worse than this one.
 */
function animatedStyleKeys(source) {
  const findings = [];
  const element = /<Animated\.(\w+)[^>]*?style=\{\{([\s\S]*?)\}\}/gu;
  for (const m of source.matchAll(element)) {
    const component = m[1];
    const body = m[2] ?? '';
    for (const key of body.matchAll(/(?:^|[\s,{])([A-Za-z][\w]*)\s*:/gu)) {
      const property = key[1];
      if (property !== undefined) findings.push({ component, property });
    }
  }
  return findings;
}

/**
 * HeroUI's own colour animations, re-enabled from our side.
 *
 * `animatedStyleKeys` above reads `<Animated.X style={{…}}>` in OUR source. It cannot see
 * inside a dependency, and HeroUI's `PressableFeedback` animates `backgroundColor` in its
 * highlight — on by default on every Button. ADR-0062 turns that off at the provider; this is
 * what stops a wrapper turning it back on one component at a time.
 *
 * `motion.animatable` is `opacity` and `transform`, and the reason is not fussiness: the
 * intermediate frames of a colour transition are plausible colours the engine never produced,
 * which for this product is a correctness defect rather than a polish one.
 *
 * Only the props that animate a COLOUR are named. `scaleAnimation` is transform and
 * `opacity`-based feedback is allowed, so both stay available — a check that banned all
 * motion would be switched off inside a week.
 */
const COLOUR_ANIMATION_PROPS = ['highlightAnimation', 'rippleAnimation'];

function colourAnimationOptIns(source) {
  const findings = [];
  // The three ways to write "off". Anything else — an object, a variable, a bare prop — is
  // switching it on, or leaving it to a value this check cannot see, and both are findings.
  const OFF = new Set(['{false}', '"disabled"', "{'disabled'}", '{"disabled"}']);
  const BOUNDARY = /[\s{(,<]/u;

  for (const prop of COLOUR_ANIMATION_PROPS) {
    let from = 0;
    for (;;) {
      const at = source.indexOf(prop, from);
      if (at === -1) break;
      from = at + prop.length;

      // A JSX attribute, not a substring of a longer identifier or a word in a comment.
      const before = at === 0 ? ' ' : source[at - 1];
      if (before === undefined || !BOUNDARY.test(before)) continue;

      const rest = source.slice(from);
      const eq = rest.match(/^\s*=\s*/u);
      if (eq === null) {
        // `<Button highlightAnimation />` — a bare JSX prop is `true`.
        if (/^\s*[/>]/u.test(rest)) findings.push({ prop, value: '(bare, means true)' });
        continue;
      }

      const value = rest.slice(eq[0].length);
      const token = value.startsWith('{')
        ? value.slice(0, value.indexOf('}') + 1)
        : (/^(["'])[^"']*\1/u.exec(value)?.[0] ?? '');
      const normalised = token.replace(/\s+/gu, '');
      if (!OFF.has(normalised))
        findings.push({ prop, value: normalised === '' ? '(unreadable)' : normalised });
    }
  }
  return findings;
}

/**
 * The keys of a REANIMATED animated style — the half the literal scan structurally cannot see.
 *
 * `animatedStyleKeys` above reads `<Animated.X style={{…}}>`. **Reanimated never writes that.**
 * It writes `useAnimatedStyle(() => ({ opacity: … }))`, and a worklet's return object is not a
 * JSX attribute, so the existing scan reports zero animated elements for a file full of them.
 * F-144 introduced the engine; without this the gate would have gone quiet at exactly the moment
 * it acquired something to check.
 *
 * A `Keyframe` is the same problem one level deeper: its argument is `{ 0: {…}, 100: {…} }`,
 * so the properties are the keys of the FRAMES, not of the object itself.
 */
function reanimatedStyleKeys(source) {
  const findings = [];

  // `useAnimatedStyle(() => ({ … }))` — the arrow-returning-object form, which is the only one
  // this codebase uses and the only one worth claiming to read.
  for (const m of source.matchAll(/useAnimatedStyle\(\s*\(\)\s*=>\s*\(\{([\s\S]*?)\}\)\s*\)/gu)) {
    for (const key of topLevelKeys(m[1] ?? ''))
      findings.push({ component: 'useAnimatedStyle', property: key });
  }

  // `new Keyframe({ 0: { … }, 100: { … } })` — read one level in.
  for (const m of source.matchAll(/new Keyframe\(\{([\s\S]*?)\}\)/gu)) {
    for (const frame of (m[1] ?? '').matchAll(/\d+\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gu))
      for (const key of topLevelKeys(frame[1] ?? ''))
        findings.push({ component: 'Keyframe', property: key });
  }

  return findings;
}

/**
 * The keys of an object literal, ignoring anything nested inside braces or brackets.
 *
 * `transform: [{ translateY: … }]` must report `transform` and NOT `translateY` — the second is
 * a transform component, which the allow-list covers by covering `transform`. Counting it would
 * make the check reject its own allowed case, which is the failure mode that gets a gate
 * switched off rather than fixed.
 */
function topLevelKeys(body) {
  const keys = [];
  let depth = 0;
  let atKeyPosition = true;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '{' || ch === '[' || ch === '(') depth += 1;
    else if (ch === '}' || ch === ']' || ch === ')') depth -= 1;
    else if (ch === ',' && depth === 0) atKeyPosition = true;
    else if (depth === 0 && atKeyPosition && /[A-Za-z_$]/u.test(ch)) {
      const rest = /^([A-Za-z_$][\w$]*)\s*:/u.exec(body.slice(i));
      if (rest !== null) {
        keys.push(rest[1]);
        atKeyPosition = false;
      }
    }
  }
  return keys;
}

/**
 * A duration written as a number instead of taken from the scale.
 *
 * Criterion 1 of F-144 is *"the manifest durations and easings are a typed API, and nothing
 * animates with a literal"*. A literal is how a scale stops being a scale: 200 here and 250
 * there are both defensible on their own, and together they are the reason an app reads as
 * assembled from parts. `nativeMotion.durations.local` is a decision; `180` is a number that
 * happens to match one today.
 *
 * Only a BARE NUMERIC literal is a finding. `duration: duration('local')`,
 * `.duration(nativeMotion.durations.micro)` and any variable all pass — a check that rejected
 * every mention of `duration` would ban the typed API it exists to enforce.
 */
function durationLiterals(source) {
  const findings = [];
  for (const m of source.matchAll(/(?:^|[^\w.])duration\s*:\s*(-?\d+(?:\.\d+)?)\b/gu))
    findings.push({ component: 'a duration literal', property: `duration: ${m[1]}` });
  for (const m of source.matchAll(/\.duration\(\s*(-?\d+(?:\.\d+)?)\s*\)/gu))
    findings.push({ component: 'a duration literal', property: `.duration(${m[1]})` });
  return findings;
}

/**
 * A transition applied to a SWATCH — criterion 3's second half, stated mechanically.
 *
 * The manifest forbids *"cross-fade between samples"* in prose, and prose is not checkable. The
 * mechanical form is a layout or shared-element transition on a colour sample: reanimated
 * interpolates between the two, and **every intermediate frame is a colour the engine never
 * produced.** `sharedTransitionTag` is the exact shape — it exists to morph one element into
 * another — and `layout`, `entering` and `exiting` reach the same place when the thing
 * entering and the thing leaving are two different colours.
 *
 * These are PROPS, not style keys, so nothing else in this file can see them.
 *
 * `Appear` is how a swatch is allowed to arrive: it wraps the sample and animates the WRAPPER's
 * opacity and offset, so the colour itself is never interpolated — it is either drawn or not.
 */
const SWATCH_TRANSITION_PROPS = ['sharedTransitionTag', 'layout', 'entering', 'exiting'];

function swatchTransitions(source) {
  const findings = [];
  for (const m of source.matchAll(/<Swatch\b([^>]*)>/gu)) {
    const attrs = m[1] ?? '';
    for (const prop of SWATCH_TRANSITION_PROPS)
      if (new RegExp(`(?:^|\\s)${prop}\\s*=`, 'u').test(attrs))
        findings.push({ component: 'Swatch', property: `${prop} (a transition across a sample)` });
  }
  return findings;
}

function run(allowed) {
  const violations = [];
  let scanned = 0;
  let animatedElements = 0;

  for (const scope of SCOPES)
    for (const file of sourceFiles(scope)) {
      scanned += 1;
      const source = readFileSync(file, 'utf8');
      const keys = animatedStyleKeys(source);
      if (keys.length > 0) animatedElements += 1;
      for (const { component, property } of keys)
        if (!allowed.has(property))
          violations.push({ file: relative(ROOT, file), component, property });

      // The half the style scan structurally cannot reach: a dependency's own colour
      // animation, switched on from our side by a prop.
      for (const { prop, value } of colourAnimationOptIns(source))
        violations.push({
          file: relative(ROOT, file),
          component: `HeroUI ${prop}`,
          property: `backgroundColor (via ${prop}=${value})`,
        });

      // THE THREE F-144 ADDED, each seeing something none of the others can.
      const reanimated = reanimatedStyleKeys(source);
      if (reanimated.length > 0) animatedElements += 1;
      for (const { component, property } of reanimated)
        if (!allowed.has(property))
          violations.push({ file: relative(ROOT, file), component, property });

      for (const f of durationLiterals(source))
        violations.push({ file: relative(ROOT, file), ...f });

      for (const f of swatchTransitions(source))
        violations.push({ file: relative(ROOT, file), ...f });
    }

  return { violations, scanned, animatedElements };
}

const allowed = await allowedProperties();

if (process.argv.includes('--prove')) {
  console.log(`\n${BOLD}Motion — proving the check${OFF}\n`);
  const planted = join(ROOT, 'packages', 'ui', 'src', '__motion_probe__.tsx');
  const cases = [
    { name: 'an animated backgroundColor', style: 'backgroundColor: fade', shouldFail: true },
    { name: 'an animated width (a layout property)', style: 'width: grow', shouldFail: true },
    { name: 'an animated opacity', style: 'opacity: fade', shouldFail: false },
    { name: 'an animated transform', style: 'transform: shift', shouldFail: false },
  ];

  /*
   * HeroUI's own colour animation, switched on from our side (ADR-0062).
   *
   * These are a SEPARATE case shape because they are a prop on someone else's component, not
   * a style literal on an `Animated.*` element — which is precisely why the scan above cannot
   * see them. `PressableFeedback`'s highlight animates `backgroundColor` and is on by default
   * on every Button, so "we turned it off at the provider" needs something that notices a
   * component turning it back on.
   *
   * The two that must PASS matter as much as the two that must fail: a check that rejected
   * every mention of these props would ban the documented way to disable them, and would be
   * switched off within a week.
   */
  const propCases = [
    {
      name: 'highlightAnimation left on',
      attr: 'highlightAnimation={{ duration: 120 }}',
      shouldFail: true,
    },
    { name: 'rippleAnimation left on', attr: 'rippleAnimation', shouldFail: true },
    {
      name: 'highlightAnimation turned off',
      attr: 'highlightAnimation={false}',
      shouldFail: false,
    },
    {
      name: 'rippleAnimation set to disabled',
      attr: 'rippleAnimation="disabled"',
      shouldFail: false,
    },
  ];

  /*
   * THE THREE F-144 ADDED. These are whole planted FILES rather than a style fragment or a
   * single attribute, because what each one checks is not a JSX attribute: a worklet's return
   * object, a call argument, and a prop on someone else's component.
   *
   * Every one has a decoy that must PASS beside the one that must fail, and two of them are
   * the real point. `transform: [{ translateY }]` must be ALLOWED — a check that read the
   * nested key would reject the one animation this product is built on. And
   * `.duration(nativeMotion.durations.micro)` must be allowed, or the literal check bans the
   * typed API it exists to enforce.
   */
  const sourceCases = [
    {
      name: 'a reanimated style animating backgroundColor',
      body:
        "import { useAnimatedStyle } from 'react-native-reanimated';\n" +
        'export const s = () => useAnimatedStyle(() => ({ backgroundColor: c.value }));\n',
      shouldFail: true,
    },
    {
      name: 'a reanimated style animating opacity and a transform',
      body:
        "import { useAnimatedStyle } from 'react-native-reanimated';\n" +
        'export const s = () =>\n' +
        '  useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: y.value }] }));\n',
      shouldFail: false,
    },
    {
      name: 'a Keyframe cross-fading a colour',
      body:
        "import { Keyframe } from 'react-native-reanimated';\n" +
        'export const k = new Keyframe({ 0: { backgroundColor: a }, 100: { backgroundColor: b } });\n',
      shouldFail: true,
    },
    {
      name: 'a Keyframe fading opacity',
      body:
        "import { Keyframe } from 'react-native-reanimated';\n" +
        'export const k = new Keyframe({ 0: { opacity: 0 }, 100: { opacity: 1 } });\n',
      shouldFail: false,
    },
    {
      name: 'a duration written as a number',
      body:
        "import { withTiming } from 'react-native-reanimated';\n" +
        'export const a = withTiming(1, { duration: 250 });\n',
      shouldFail: true,
    },
    {
      name: 'a duration taken from the scale',
      body:
        "import { withTiming } from 'react-native-reanimated';\n" +
        "import { nativeMotion } from '@irodora/design-tokens';\n" +
        'export const a = withTiming(1, { duration: nativeMotion.durations.local });\n',
      shouldFail: false,
    },
    {
      name: 'a Keyframe given a literal duration',
      body:
        "import { Keyframe } from 'react-native-reanimated';\n" +
        'export const k = new Keyframe({ 0: { opacity: 0 } }).duration(200);\n',
      shouldFail: true,
    },
    {
      name: 'a Keyframe given a duration from the scale',
      body:
        "import { Keyframe } from 'react-native-reanimated';\n" +
        "import { nativeMotion } from '@irodora/design-tokens';\n" +
        'export const k = new Keyframe({ 0: { opacity: 0 } }).duration(nativeMotion.durations.micro);\n',
      shouldFail: false,
    },
    {
      name: 'a shared-element transition on a swatch',
      body:
        "import { Swatch } from './Swatch.js';\n" +
        'export const V = () => <Swatch color={c} sharedTransitionTag="sample" />;\n',
      shouldFail: true,
    },
    {
      name: 'a layout transition on a swatch',
      body:
        "import { Swatch } from './Swatch.js';\n" +
        "import { LinearTransition } from 'react-native-reanimated';\n" +
        'export const V = () => <Swatch color={c} layout={LinearTransition} />;\n',
      shouldFail: true,
    },
    {
      name: 'a swatch inside Appear — the allowed way for a sample to arrive',
      body:
        "import { Swatch } from './Swatch.js';\n" +
        "import { Appear } from './motion.js';\n" +
        'export const V = () => (\n' +
        '  <Appear index={2}>\n' +
        '    <Swatch color={c} />\n' +
        '  </Appear>\n' +
        ');\n',
      shouldFail: false,
    },
  ];

  let bad = 0;
  const baseline = run(allowed).violations.length;
  if (baseline !== 0) {
    console.log(`  ${RED}✗${OFF} the repository is not clean before planting anything`);
    process.exit(1);
  }
  console.log(
    `  ${GREEN}✓${OFF} baseline clean ${DIM}(asserted first, or a plant proves nothing)${OFF}`,
  );

  for (const c of cases) {
    writeFileSync(
      planted,
      `import { Animated } from 'react-native';\n` +
        `export function Probe({ fade, grow, shift }: never): React.JSX.Element {\n` +
        `  return <Animated.View style={{ ${c.style} }} />;\n}\n`,
    );
    const found = run(allowed).violations.length > 0;
    unlinkSync(planted);
    const ok = found === c.shouldFail;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${c.name} ${DIM}${c.shouldFail ? 'rejected' : 'allowed'}${OFF}`,
    );
  }

  for (const c of propCases) {
    writeFileSync(
      planted,
      `import { Button } from 'heroui-native';\n` +
        `export function Probe(): React.JSX.Element {\n` +
        `  return <Button ${c.attr} />;\n}\n`,
    );
    const found = run(allowed).violations.length > 0;
    unlinkSync(planted);
    const ok = found === c.shouldFail;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${c.name} ${DIM}${c.shouldFail ? 'rejected' : 'allowed'}${OFF}`,
    );
  }

  for (const c of sourceCases) {
    writeFileSync(planted, c.body);
    const found = run(allowed).violations.length > 0;
    unlinkSync(planted);
    const ok = found === c.shouldFail;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${c.name} ${DIM}${c.shouldFail ? 'rejected' : 'allowed'}${OFF}`,
    );
  }

  if (existsSync(planted)) unlinkSync(planted);
  if (bad > 0) {
    console.log(`\n${RED}${BOLD}The check does not discriminate.${OFF}\n`);
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Check proven.${OFF} ${DIM}A forbidden property is rejected and an ` +
      `allowed one is not — the second half matters, because a check that flagged all ` +
      `animation would be switched off within a week.${OFF}\n`,
  );
  process.exit(0);
}

console.log(`\n${BOLD}Motion${OFF}\n`);
const { violations, scanned, animatedElements } = run(allowed);
console.log(
  `${DIM}  ${String(scanned)} source file(s) scanned; ${String(animatedElements)} with an ` +
    `Animated style literal. Allowed: ${[...allowed].join(', ')} ${DIM}(from the manifest, ` +
    `not a copy).${OFF}`,
);
console.log(
  `${DIM}  ALSO CHECKED: HeroUI's highlightAnimation and rippleAnimation, which animate a background colour inside a dependency this scan cannot read (ADR-0062); reanimated's useAnimatedStyle and Keyframe bodies, which are worklets rather than JSX and which the literal scan above is structurally blind to; duration literals, which is how a scale stops being a scale; and layout or shared-element transitions on a Swatch, which is 'cross-fade between samples' stated mechanically. NOT CHECKED HERE: a style assembled at runtime, spread from a variable, or built ` +
    `by a helper. This is source analysis, and the rendered tree CANNOT see an animated ` +
    `colour — it resolves to a concrete value indistinguishable from a static one.${OFF}`,
);

if (violations.length > 0) {
  console.log(`\n${RED}${BOLD}${String(violations.length)} forbidden animation(s)${OFF}`);
  for (const v of violations)
    console.log(
      `  ${RED}✗${OFF} ${v.file}  ${BOLD}Animated.${v.component}${OFF} animates ` +
        `${BOLD}${v.property}${OFF}`,
    );
  console.log(
    `\n${DIM}  The intermediate frames of a colour transition are PLAUSIBLE colours that never\n` +
      `  existed, so a user reads a value the engine never produced. Animate opacity or\n` +
      `  transform instead, or change the value without a transition.${OFF}\n`,
  );
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}No forbidden animation.${OFF}\n`);
