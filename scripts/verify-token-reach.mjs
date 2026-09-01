#!/usr/bin/env node
/**
 * Gate 8 — token reach.
 *
 * Runs beside `a11y-scope.mjs` and answers, for **values**, the question that script answers
 * for components: *did anything get emitted that nothing uses?*
 *
 * ## What is already checked, and what is not
 *
 * Every value in `packages/design-tokens/src/generated/` is byte-compared against the manifest
 * by `emit.test.ts` and again by `generate-design-tokens.mjs --check`. So we know the emitted
 * value is **correct**. Nothing anywhere asks whether it is **used** — and a token nobody
 * paints is a design decision nobody applied, which is the same defect as a component nobody
 * renders (ADR-0054), one level down.
 *
 * F-019 found `nativeNumericFeature` that way by hand: emitted, exported, reaching no
 * component, for as long as nobody happened to look.
 *
 * ## What counts as a reader
 *
 * | zone | reader |
 * |---|---|
 * | `packages/ui/src/*.tsx`, `theme.tsx` | **yes** |
 * | `apps/mobile/src/**`, `apps/mobile/app/**` | **yes** |
 * | `packages/ui/src/testing/**` | **no** — this is the conformance checker |
 * | any `test` directory, any `.test.` file | **no** |
 * | `packages/design-tokens/**` | **no** — the emitter reading its own output is not reach |
 *
 * Excluding `testing/` is the point rather than an oversight. A value that exists so a
 * **check** can enforce it is a real thing, but it is not a painted pixel, and the difference
 * belongs in the declaration file where a reviewer can read it.
 *
 * ## Reach is transitive through object values, never through keys or array elements
 *
 * `Surface.tsx` reads `nativeElevation`, whose values are `background`, `surface.1`,
 * `surface.2`, `surface.3` — it **resolves** a colour through the map, so those four tokens
 * are reached without appearing anywhere as a literal.
 *
 * **Keys must not propagate.** `theme.tsx` reads `nativeColors`, whose keys are all 33 colour
 * tokens; if keys propagated, one import would mark the entire palette reached and this check
 * would be worth nothing.
 *
 * **Array elements must not propagate either**, and that one is subtler. `Text.tsx` reads
 * `nativeLargeTextSizes` to ask *is this size large text?* — a membership test, not a
 * resolution. Propagating through it would mark `display.2` reached on the strength of a
 * question nobody answers with it. An object is looked **up**; a list is looked **in**.
 *
 * ## How it errs
 *
 * A reader is found by identifier for a binding and by string literal for a named token. A
 * component that built a token name by concatenation would read a token this cannot see, and
 * the token would be reported as unreached — a **false positive**, which is the failure mode
 * that gets a check deleted. No such construction exists today. If one appears, the answer is
 * to stop constructing token names, not to loosen this.
 *
 * ## The escape hatch
 *
 * `.harness/verification/unreached-tokens.json`, in the shape of `retired-surface.json`:
 * every group carries a `why` and a citation, **the reasons print on every run**, and a
 * declaration for a token that IS reached fails. Both directions, the same rule the source
 * register (E-021) and the taxonomy vocabulary (E-028) carry — a dead exemption is how a live
 * one gets waved through later.
 *
 * ```
 * node scripts/verify-token-reach.mjs
 * node scripts/verify-token-reach.mjs --prove
 * ```
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

const GENERATED = [
  join(ROOT, 'packages', 'design-tokens', 'src', 'generated', 'native.ts'),
  join(ROOT, 'packages', 'design-tokens', 'src', 'generated', 'tokens.ts'),
];
const MANIFEST = join(ROOT, 'docs', 'design', 'design-system.manifest.json');
const DECLARATIONS = join(ROOT, '.harness', 'verification', 'unreached-tokens.json');

/** Directories whose components may reach a token. `app/` routes paint chrome, so they count. */
const READER_ZONES = [
  join(ROOT, 'packages', 'ui', 'src'),
  join(ROOT, 'apps', 'mobile', 'src'),
  join(ROOT, 'apps', 'mobile', 'app'),
];

/** Not a reader: the conformance checker enforces tokens, it does not paint them. */
const NOT_A_READER =
  /[\\/]ui[\\/]src[\\/]testing[\\/]|[\\/]test[\\/]|\.test\.|[\\/]generated[\\/]/u;

// --- loading the emitted surface ------------------------------------------------------

/**
 * Import the generated modules as real objects.
 *
 * Their value syntax is already valid JavaScript — they are machine-written, so the shape is
 * fixed — and stripping `export type` lines and `as const` leaves a module a `data:` URL can
 * import. That beats parsing: a regex that silently matched fewer keys than exist would make
 * this check pass over a surface it never saw, which is the exact failure it exists to catch.
 * `assertParsedFully` below is the guard on that.
 */
async function loadEmitted() {
  const source = GENERATED.map((path) =>
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => !line.startsWith('export type '))
      .join('\n')
      .replaceAll(' as const', ''),
  ).join('\n');
  const module = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  const bindings = new Map(Object.entries(module));
  assertParsedFully(bindings);
  return bindings;
}

/** A parser that under-reads is worse than no parser. Cross-check against the two sources. */
function assertParsedFully(bindings) {
  const declared = GENERATED.flatMap((path) =>
    [...readFileSync(path, 'utf8').matchAll(/^export const (\w+)/gmu)].map((m) => m[1]),
  );
  const missing = declared.filter((name) => !bindings.has(name));
  if (missing.length > 0)
    fail(`the emitted modules declare ${missing.join(', ')} but importing them did not.`);

  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const emitted = new Set(Object.keys(bindings.get('nativeColors')?.dark ?? {}));
  const absent = Object.keys(manifest.color.dark).filter((name) => !emitted.has(name));
  if (absent.length > 0)
    fail(`the manifest declares colour token(s) ${absent.join(', ')} that were not emitted.`);
}

function fail(message) {
  console.log(`\n${RED}${BOLD}Token reach FAILED to run.${OFF} ${message}`);
  console.log(
    `${DIM}  A checker that cannot see its own subject has not passed; it has not run.${OFF}\n`,
  );
  process.exit(1);
}

/**
 * The names this check is answerable for.
 *
 * Named tokens at leaf level; `nativeMotion.forbidden` is prose, so it is answerable only at
 * binding level. Said here rather than implied, because a check that claims more coverage than
 * it has is the problem.
 *
 * `nativeSpacing` WAS in that sentence — it was a positional array with no names to be
 * answerable for. F-103 named its steps, so it *could* now join `radius step` below. It has
 * not, deliberately: the manifest keeps `xl2`..`xl5` as rhythm for layouts not yet built, so
 * adding the group would report five steps as unreached and require each to be declared in
 * `unreached-tokens.json` with a reason. That is a decision about what the scale is FOR, not a
 * consequence of naming it, so it is filed rather than folded in here (F-111).
 */
function namesOf(bindings) {
  const colours = new Set([
    ...Object.keys(bindings.get('nativeColors').dark),
    ...Object.keys(bindings.get('nativeColors').light),
  ]);
  return [
    { group: 'binding', kind: 'identifier', names: [...bindings.keys()] },
    {
      group: 'colour token',
      kind: 'literal',
      names: [...colours],
      // `colors` is what `useTheme()` hands a component; the generated bindings are what a
      // non-themed surface (the shareable card) reads directly.
      owners: ['colors', 'nativeColors', 'COLOR'],
      props: ['color', 'backgroundColor', 'borderColor'],
    },
    {
      group: 'radius step',
      kind: 'literal',
      names: Object.keys(bindings.get('nativeRadius')),
      owners: ['nativeRadius', 'RADIUS'],
      props: ['radius'],
    },
    {
      group: 'type step',
      kind: 'literal',
      names: Object.keys(bindings.get('nativeType').latin),
      owners: ['nativeType'],
      props: ['size'],
    },
    {
      group: 'status kind',
      kind: 'literal',
      names: Object.keys(bindings.get('STATUS_PAIRING')),
      owners: ['STATUS_PAIRING'],
      props: ['kind'],
    },
  ];
}

// --- the reader zone ------------------------------------------------------------------

/**
 * Comments are not code, and a token named in prose is not a token anybody paints.
 *
 * This was found by the proof, not by reading: `border.strong` was removed from all five
 * components that use it and the check still called it reached, because `Button.tsx` mentions
 * `` `border.strong` `` in a comment explaining why it does not pair. Backticks are one of the
 * quote characters a literal read is matched by, so every JSDoc example in this codebase —
 * and `Text.tsx`'s header alone shows two colour tokens — was counting as a consumer.
 *
 * A character-by-character pass rather than a regex, because a regex that removes `//` to the
 * end of the line eats the rest of any string containing one.
 */
function stripComments(source) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (quote !== null) {
      out += c;
      if (c === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function sources() {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/u.test(entry.name) && !NOT_A_READER.test(path))
        out.push({ path, source: stripComments(readFileSync(path, 'utf8')) });
    }
  };
  for (const zone of READER_ZONES) walk(zone);
  return out;
}

// --- reach ----------------------------------------------------------------------------

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const identifierRead = (name) => new RegExp(`\\b${escape(name)}\\b`, 'u');

/**
 * A named token is read three ways in this codebase, and the check knows all three because a
 * check that knew only the first reported every radius step in the product as unreached — the
 * first thing it did on the real tree.
 *
 * | idiom | example |
 * |---|---|
 * | a quoted literal | `colors['surface.2']` |
 * | a member of the binding that owns it | `nativeRadius.pill` |
 * | a prop or key that takes that kind of token | `size="xs"`, `radius: 'md'` |
 *
 * ## An ambiguous bare literal is not evidence
 *
 * `xs` is a radius step **and** a type step. The 22 `size="xs"` literals in the screens say
 * nothing whatever about the radius, so for a name that appears in more than one group the
 * bare-literal alternative is dropped and only an owner- or prop-scoped read counts. That is
 * what separates `nativeRadius.xs` (nowhere) from `size="xs"` (everywhere), and it is why
 * radius `xs` is honestly reported while type step `xs` is not.
 */
function literalRead(name, { owners = [], props = [] }, ambiguous) {
  const n = escape(name);
  const alternatives = ambiguous ? [] : [`['"\`]${n}['"\`]`];
  const identifier = /^[A-Za-z_$][\w$]*$/u.test(name);
  for (const owner of owners) {
    if (identifier) alternatives.push(`\\b${escape(owner)}\\s*\\.\\s*${n}\\b`);
    alternatives.push(`\\b${escape(owner)}\\s*\\[\\s*['"\`]${n}['"\`]`);
  }
  for (const prop of props) alternatives.push(`\\b${escape(prop)}\\s*[=:]\\s*['"\`]${n}['"\`]`);
  return new RegExp(alternatives.join('|'), 'u');
}

/** Every string that is a *value* of an object, at any depth. Arrays do not propagate. */
function objectValues(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) {
    /* a list is looked IN, not looked UP — see the header */
  } else if (value !== null && typeof value === 'object')
    for (const inner of Object.values(value)) objectValues(inner, out);
  return out;
}

/**
 * Reach is keyed by group AND name, never by name alone.
 *
 * `xs` is a radius step and a type step. Keyed by name, the 22 `size="xs"` literals in the
 * screens marked the *radius* step reached as well — a false negative found by running this
 * before believing it, and the reason a token is only ever reported as `<group> <name>`.
 */
const key = (group, name) => `${group} ${name}`;

function reachOf(bindings, files) {
  const blob = files.map((f) => f.source).join('\n');
  const groups = namesOf(bindings);
  const readers = new Map();
  const mark = (group, name, by) => {
    const k = key(group, name);
    if (!readers.has(k)) readers.set(k, new Set());
    readers.get(k).add(by);
  };

  // A name in more than one leaf group cannot be resolved from a bare literal — see literalRead.
  const seen = new Map();
  for (const g of groups) for (const n of g.names) seen.set(n, (seen.get(n) ?? 0) + 1);

  for (const { group, kind, names, owners, props } of groups)
    for (const name of names) {
      const pattern =
        kind === 'identifier'
          ? identifierRead(name)
          : literalRead(name, { owners, props }, seen.get(name) > 1);
      if (!pattern.test(blob)) continue;
      for (const file of files)
        if (pattern.test(file.source))
          mark(group, name, relative(ROOT, file.path).replaceAll('\\', '/'));
    }

  // The closure: a binding a component reads resolves through its own object values. A value
  // is credited to whichever group actually contains that name — nothing is credited by
  // position, so a coincidence of spelling cannot launder a token into reach.
  for (const [name, value] of bindings) {
    if (!readers.has(key('binding', name))) continue;
    if (Array.isArray(value) || value === null || typeof value !== 'object') continue;
    for (const inner of objectValues(value))
      for (const g of groups) if (g.names.includes(inner)) mark(g.group, inner, `via ${name}`);
  }

  return readers;
}

// --- declarations ---------------------------------------------------------------------

const MIN_WHY = 40;

function declarations(known, groupNames, override) {
  const file = override ?? JSON.parse(readFileSync(DECLARATIONS, 'utf8'));
  const byToken = new Map();
  const problems = [];

  for (const [index, entry] of file.unreached.entries()) {
    const at = `unreached[${String(index)}]`;
    const why = typeof entry.why === 'string' ? entry.why.trim() : '';
    if (why.length < MIN_WHY)
      problems.push(
        `${at}.why is ${String(why.length)} characters. A reason shorter than a sentence is a ` +
          'silent allowlist wearing the word "why".',
      );
    if (typeof entry.cites !== 'string' || entry.cites.trim() === '')
      problems.push(
        `${at}.cites is missing. Every entry names the record that justifies it, so an entry ` +
          'nobody can justify shows up as an entry with a weak one.',
      );
    if (!Array.isArray(entry.tokens) || entry.tokens.length === 0)
      problems.push(`${at}.tokens is empty. An entry that declares nothing declares nothing.`);
    if (!groupNames.includes(entry.group))
      problems.push(
        `${at}.group is "${String(entry.group)}", which is not one of ${groupNames.join(', ')}. ` +
          'An exemption says which KIND of thing it exempts, because `xs` is a radius step and ' +
          'a type step and they are not the same decision.',
      );

    for (const token of entry.tokens ?? []) {
      const k = key(entry.group, token);
      if (byToken.has(k))
        problems.push(`${at}: "${k}" is declared twice. Two reasons, and only one is read.`);
      if (!known.has(k))
        problems.push(
          `${at}: "${k}" is not emitted by anything. A declaration that outlived its token is ` +
            'an exemption pointing at nothing — most often a rename that left this behind.',
        );
      byToken.set(k, entry);
    }
  }

  return { byToken, problems, entries: file.unreached };
}

// --- the run --------------------------------------------------------------------------

export const rel = (path) => relative(ROOT, path).replaceAll('\\', '/');

/**
 * `overrides` and `declaredOverride` exist for `--prove`, which mutates **in memory**.
 *
 * A proof that edits `packages/` is a proof that can fail dirty, and this session has already
 * left a mutated manifest behind once. Nothing here writes to the working tree.
 */
export async function run(overrides = new Map(), declaredOverride = null) {
  const bindings = await loadEmitted();
  const files = sources().map((f) =>
    overrides.has(rel(f.path)) ? { ...f, source: overrides.get(rel(f.path)) } : f,
  );

  const readers = reachOf(bindings, files);
  const groups = namesOf(bindings);
  const known = new Set(groups.flatMap((g) => g.names.map((n) => key(g.group, n))));
  const declared = declarations(
    known,
    groups.map((g) => g.group),
    declaredOverride,
  );

  const unreached = [];
  const stale = [];
  for (const { group, names } of groups)
    for (const name of names) {
      const k = key(group, name);
      if (readers.has(k)) {
        if (declared.byToken.has(k))
          stale.push({ group, name, by: [...readers.get(k)].slice(0, 3) });
        continue;
      }
      if (!declared.byToken.has(k)) unreached.push({ group, name });
    }

  return { bindings, readers, groups, known, declared, unreached, stale, files };
}

async function report() {
  console.log(`\n${BOLD}Gate 8 — token reach${OFF}\n`);
  const result = await run();

  for (const { group, name } of result.unreached)
    console.log(
      `  ${RED}✗${OFF} ${group} ${BOLD}${name}${OFF}\n` +
        `${DIM}      Emitted from the manifest and read by no component. Use it, delete the ` +
        `decision, or declare it in\n      ${relative(ROOT, DECLARATIONS)} with a reason.${OFF}`,
    );

  for (const { group, name, by } of result.stale)
    console.log(
      `  ${RED}✗${OFF} ${group} ${BOLD}${name}${OFF} is declared unreached, and is read by ` +
        `${by.join(', ')}\n${DIM}      Remove the declaration. A dead exemption is how a live ` +
        `one gets waved through later.${OFF}`,
    );

  for (const problem of result.declared.problems) console.log(`  ${RED}✗${OFF} ${problem}`);

  const checked = result.groups.reduce((n, g) => n + g.names.length, 0);
  if (checked === 0) fail('no token names were found at all.');

  console.log(
    `${DIM}  ${result.groups
      .map((g) => `${String(g.names.length)} ${g.group}s`)
      .join(' · ')}${OFF}\n`,
  );

  // The declared set prints on every run, not only on a failure. An exemption nobody reads is
  // an exemption nobody weighs — the reason `retired-surface.json` prints its citations too.
  for (const entry of result.declared.entries)
    console.log(
      `  ${YELLOW}•${OFF} ${BOLD}${String(entry.tokens.length)} ${entry.group}(s) unreached${OFF} ` +
        `${DIM}(${entry.cites})${OFF} ${entry.tokens.join(', ')}\n` +
        `${DIM}      ${entry.why}${OFF}`,
    );

  const bad = result.unreached.length + result.stale.length + result.declared.problems.length;
  if (bad > 0) {
    console.log(
      `\n${RED}${BOLD}Token reach FAILED.${OFF} ${String(bad)} problem(s).\n` +
        `${DIM}  A value emitted from the design manifest that reaches no component is a ` +
        `decision nobody applied.${OFF}\n`,
    );
    process.exit(1);
  }

  const declaredCount = result.declared.byToken.size;
  console.log(
    `\n${GREEN}${BOLD}Token reach passed.${OFF} ${DIM}${String(checked)} name(s) — ` +
      `${String(checked - declaredCount)} read by a component, ${String(declaredCount)} declared ` +
      `unreached with a reason.${OFF}\n`,
  );
}

// --- the proof --------------------------------------------------------------------------

/** A plant that silently changes nothing is a test that passes for the wrong reason. */
function without(overrides, file, needle) {
  const path = join(ROOT, file);
  const source = overrides.get(file) ?? stripComments(readFileSync(path, 'utf8'));
  if (!source.includes(needle))
    throw new Error(`the plant is stale: ${file} does not contain ${needle}`);
  overrides.set(file, source.replaceAll(needle, 'REMOVED_BY_PROVE'));
  return overrides;
}

/** Every reader file of a literal, so a token can be removed from all of them at once. */
function readersOfLiteral(needle) {
  return sources()
    .filter((f) => f.source.includes(needle))
    .map((f) => rel(f.path));
}

const declaredCopy = () => JSON.parse(readFileSync(DECLARATIONS, 'utf8'));

async function prove() {
  console.log(`\n${BOLD}Gate 8 — token reach · proof${OFF}\n`);
  let bad = 0;

  const say = (ok, name, detail) => {
    if (!ok) bad += 1;
    console.log(`  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${name} ${DIM}${detail}${OFF}`);
  };
  const named = (result, group, name) =>
    result.unreached.some((u) => u.group === group && u.name === name);

  // Asserted FIRST. A plant against an already-red baseline proves nothing.
  const base = await run();
  say(
    base.unreached.length === 0 && base.stale.length === 0 && base.declared.problems.length === 0,
    'baseline clean',
    '(asserted first, or a plant proves nothing)',
  );

  // Criterion 3, and F-019's exact defect replayed: remove the one real consumer.
  const numeric = await run(without(new Map(), 'packages/ui/src/Text.tsx', 'nativeNumericFeature'));
  say(
    named(numeric, 'binding', 'nativeNumericFeature'),
    'a binding whose only consumer is removed is named',
    'nativeNumericFeature — the token F-019 found by hand',
  );

  // The decoy, and the half that matters: five components read `border.strong`. Removing ONE
  // must NOT fire. A check that reported a token while a reader remained would be switched off.
  const readers = readersOfLiteral(`'border.strong'`);
  let one = new Map();
  one = without(one, readers[0], `'border.strong'`);
  const partial = await run(one);
  say(
    !named(partial, 'colour token', 'border.strong') && readers.length > 1,
    'a token with four readers left is NOT named',
    `${String(readers.length)} readers, one removed — the decoy`,
  );

  let all = new Map();
  for (const file of readers) all = without(all, file, `'border.strong'`);
  const removed = await run(all);
  say(
    named(removed, 'colour token', 'border.strong'),
    'a token whose LAST reader is removed is named',
    'border.strong',
  );

  /*
   * The closure is load-bearing, and `surface.1` is the token that proves it: no component
   * names it as a literal anywhere, so its ONLY reader is `Surface.tsx` resolving through
   * `nativeElevation`. `background` would not do — eight screens paint it directly, so
   * removing the map leaves it reached and the case would pass without testing anything.
   */
  const viaMap = await run(without(new Map(), 'packages/ui/src/Surface.tsx', 'nativeElevation'));
  say(
    named(viaMap, 'colour token', 'surface.1') && !named(base, 'colour token', 'surface.1'),
    'removing the map a component resolves through names its values',
    'nativeElevation → surface.1, which no literal anywhere names',
  );

  // A declaration for a token that IS read must fail — the reverse direction.
  const staleDecl = declaredCopy();
  staleDecl.unreached.push({
    group: 'colour token',
    tokens: ['foreground'],
    why: 'A planted declaration for a token five screens paint, to prove the reverse direction.',
    cites: 'F-092',
  });
  const withStale = await run(new Map(), staleDecl);
  say(
    withStale.stale.some((s) => s.name === 'foreground'),
    'a declaration for a token that IS read is reported',
    'the dead-exemption direction',
  );

  // A reason too short to be a reason, and a declaration pointing at nothing.
  const weak = declaredCopy();
  weak.unreached.push({ group: 'colour token', tokens: ['ring'], why: 'unused', cites: 'F-092' });
  say(
    (await run(new Map(), weak)).declared.problems.length > 0,
    'a `why` shorter than a sentence is reported',
    'a silent allowlist wearing the word "why"',
  );

  const ghost = declaredCopy();
  ghost.unreached.push({
    group: 'colour token',
    tokens: ['surface.9'],
    why: 'A planted declaration naming a token nothing emits, as a rename would leave behind.',
    cites: 'F-092',
  });
  say(
    (await run(new Map(), ghost)).declared.problems.length > 0,
    'a declaration naming a token nothing emits is reported',
    'surface.9',
  );

  const noCite = declaredCopy();
  noCite.unreached.push({
    group: 'colour token',
    tokens: ['ring'],
    why: 'A planted declaration with a real reason and no record behind it, which is the point.',
  });
  say(
    (await run(new Map(), noCite)).declared.problems.length > 0,
    'a declaration with no citation is reported',
    'an entry nobody can justify',
  );

  if (bad > 0) {
    console.log(`\n${RED}${BOLD}The check does not discriminate.${OFF} ${String(bad)} case(s).\n`);
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Check proven.${OFF} ${DIM}A token that loses its last reader is named, a ` +
      `token that still has four is not, and a declaration that outlived its token fails. ` +
      `Nothing was written to the working tree.${OFF}\n`,
  );
}

const entry =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (entry) await (process.argv.includes('--prove') ? prove() : report());
