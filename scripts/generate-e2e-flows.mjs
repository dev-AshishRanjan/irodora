/**
 * Generate the Maestro flows from the journey specs — and fail when they have drifted.
 *
 * ## Why a journey is generated rather than written
 *
 * A journey selects on the strings the app renders: a message the catalogue defines, the name
 * of a colour the corpus publishes, a screen the router declares. **None of those is checked by
 * anything when the journey cannot run**, and it cannot run here — F-091's criteria 2 to 4 are
 * `attested` because this workstation has no JDK and no emulator. A hand-written flow would go
 * wrong the first time somebody renamed a key, and every gate would stay green
 * ([ADR-0086](../docs/adr/0086-the-journey-is-a-maestro-flow-generated-from-a-spec.md)).
 *
 * So the spec names a **key**, a **slug** and a **route**, and this file resolves each against
 * the app's own sources — `src/i18n/en.ts`, the generated corpus bundle, and `app/` — before
 * writing a line of YAML. A rename now fails in `lint`, on a machine with no device, at the
 * moment it happens. It is the same shape as the five other `generate-*.mjs --check` pairs.
 *
 * The sources are **imported, not parsed**. Node 24 strips the types, so `en.ts` here is the
 * object the app renders from rather than a regex's opinion of it.
 *
 * ## What this does NOT check
 *
 * **That the screen at a route renders the key.** The catalogue says the key exists; nothing
 * here says `Atlas.tsx` uses it. That would mean reading a `.tsx` for `t('…')` occurrences,
 * which is source analysis of the kind that has now mistaken a comment for code five times in
 * this repository. It is a real gap and it is named rather than papered over.
 *
 * **That the flow drives the app correctly.** A valid flow can be a wrong flow. That is
 * criterion 2, it needs a device, and it is attested.
 *
 * ## Modes
 *
 * - (none) — write every flow.
 * - `--check` — regenerate in memory and byte-compare. Non-zero on drift. Runs in `lint`.
 *
 * The refusals are proven by `scripts/e2e-flows-proof.mjs`, which imports `renderFlow` from
 * here. It is a separate entry point rather than a `--prove` flag because a flag would have
 * this module import the proof that imports it — a cycle whose first symptom was a top-level
 * await that never settled.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_DIR = join(ROOT, 'apps', 'mobile', 'e2e', 'journeys');
const FLOW_DIR = join(ROOT, 'apps', 'mobile', 'e2e');
const ROUTE_DIR = join(ROOT, 'apps', 'mobile', 'app');

const CATALOGUE = join(ROOT, 'apps', 'mobile', 'src', 'i18n', 'en.ts');
const BUNDLE = join(ROOT, 'apps', 'mobile', 'src', 'corpus', 'generated', 'bundle.ts');
const APP_CONFIG = join(ROOT, 'apps', 'mobile', 'app.config.ts');

/*
 * `apps/mobile/package.json` has no `"type"`, so importing a `.ts` from it makes Node warn
 * once per module about reparsing. It is a performance note about three files, and it would
 * otherwise be three paragraphs of stderr in the middle of a gate's output. Filtered by CODE
 * rather than by message text, and every other warning still prints.
 */
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.code !== 'MODULE_TYPELESS_PACKAGE_JSON') console.warn(warning);
});

/** The steps a journey may take. Deliberately small — see ADR-0086's stated cost. */
const STEPS = ['launch', 'assertVisible', 'tap', 'inputText', 'back'];

/** The name fields a colour selector may draw its text from. */
const FIELDS = ['en', 'romaji', 'kanji', 'kana'];

// --- the app's own sources ---------------------------------------------------------------

/**
 * Everything a spec can refer to, read from where the app reads it.
 *
 * Imported rather than parsed, so this cannot disagree with what ships.
 */
async function loadSources() {
  const { en } = await import(pathToFileURL(CATALOGUE).href);
  const { CORPUS_BUNDLE_TEXT, CORPUS_LABEL } = await import(pathToFileURL(BUNDLE).href);
  const config = await import(pathToFileURL(APP_CONFIG).href);

  const entries = new Map();
  for (const published of JSON.parse(CORPUS_BUNDLE_TEXT).entries)
    entries.set(published.entry.slug, published.entry);

  const android = config.default?.android?.package;
  const ios = config.default?.ios?.bundleIdentifier;
  if (typeof android !== 'string' || android !== ios)
    throw new Error(
      `app.config.ts declares android.package ${String(android)} and ios.bundleIdentifier ` +
        `${String(ios)}. A flow targets ONE appId, so two that disagree is a question this ` +
        'script cannot answer — fix the config.',
    );

  return {
    messages: en,
    entries,
    routes: routeFiles(),
    appId: android,
    corpus: CORPUS_LABEL,
    testIDs: declaredTestIDs(),
  };
}

/**
 * Every test id the app sets, read from source.
 *
 * A journey that selects on an id must not be able to invent one. Read rather than declared in
 * a list here, so an id removed from a component fails the generator instead of producing a
 * flow that passes review and fails on a phone.
 *
 * Template literals are expanded where the interpolation is a member of a literal array in the
 * same file — which is how the tab bar writes its five ids. An id assembled any other way is
 * not seen, and a journey naming it is refused, which is the safe direction.
 */
function declaredTestIDs() {
  const found = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/u.test(entry.name)) continue;
      const text = readFileSync(full, 'utf8');

      for (const m of text.matchAll(/testID[:=]\s*\{?\s*['"]([^'"]+)['"]/gu)) found.add(m[1]);

      // `tabBarButtonTestID: \`tab-\${tab.name}\`` — a prefix plus a member of a literal list.
      for (const m of text.matchAll(/TestID[:=]\s*\{?\s*`([^`$]*)\$\{[^}]+\}`/gu)) {
        const prefix = m[1];
        for (const n of text.matchAll(/name:\s*'([^']+)'/gu)) found.add(`${prefix}${n[1]}`);
      }
    }
  };
  walk(join(ROOT, 'apps', 'mobile', 'app'));
  walk(join(ROOT, 'apps', 'mobile', 'src'));
  return found;
}

/** Every route file under `apps/mobile/app`, relative and slash-separated. */
function routeFiles(dir = ROUTE_DIR, found = new Set()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) routeFiles(path, found);
    else found.add(relative(ROUTE_DIR, path).split('\\').join('/'));
  }
  return found;
}

// --- resolution --------------------------------------------------------------------------

/**
 * Maestro matches a text selector as a REGULAR EXPRESSION.
 *
 * Every string here is a literal — a colour called `Rain (Mud)` would otherwise match by
 * accident, and `.` in `Nothing was sent anywhere.` would match any character at all. Neither
 * is likely to break a run; both would make the flow mean something other than it says.
 */
function literal(text) {
  return text.replace(/[\\^$.|?*+()[\]{}]/g, (character) => `\\${character}`);
}

/**
 * One YAML scalar, **single-quoted**, which is what `prettier` writes.
 *
 * Not a stylistic choice. `prettier` formats `.yaml`, so a generator that emitted double quotes
 * would produce a file that `format` rewrites and `--check` then calls drifted — two gates
 * disagreeing forever about the same file, each correctly. A generated artefact has to be
 * generated the way the formatter would leave it.
 *
 * It also happens to be the right quoting for regex text: in a single-quoted YAML scalar a
 * backslash is a backslash, so the escapes `literal()` adds survive without being doubled.
 */
function scalar(text) {
  return `'${text.replace(/'/g, "''")}'`;
}

/**
 * True when the text carries something a single-quoted YAML scalar cannot hold.
 *
 * Written as a loop rather than a character class: a regex spelling of this is exactly what
 * `no-control-regex` exists to catch, and reaching for a disable comment in `scripts/` — the
 * directory that zone of the eslint config was written to protect — would be the wrong trade
 * for two lines.
 */
function hasControlCharacter(text) {
  for (const character of text) {
    const code = character.codePointAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * The visible text a step selects on, or the reason it cannot be resolved.
 *
 * Returns `{ text }` or `{ problem }` — never throws, so one spec's failures are reported
 * together rather than one run at a time.
 */
function selector(step, sources) {
  const hasKey = typeof step.key === 'string';
  const hasColour = typeof step.colour === 'string';

  /*
   * A TEST ID, for the one case a visible string cannot address.
   *
   * Every other selector in a journey is text a person can see, which is the property that
   * makes these flows readable and makes them fail when the product's own words change. An id
   * gives that up, so it is available only where text CANNOT work — and the rule above is what
   * decides that: the Atlas tab reads "Atlas", the screen title is "Colour Atlas", and a tap on
   * the first would match both.
   *
   * It is checked against the source that declares it rather than trusted, so an id that no
   * longer exists fails here instead of on a device.
   */
  if (step.testID !== undefined) {
    if (!sources.testIDs.has(step.testID))
      return {
        problem:
          `test id "${step.testID}" is declared by no component. A journey may only select on ` +
          'an id the app actually sets, or it is a flow that passes review and fails on a phone.',
      };
    return { id: step.testID };
  }

  const named = [hasKey, hasColour, step.testID !== undefined].filter(Boolean).length;
  if (named !== 1)
    return {
      problem:
        `must name exactly one of "key", "colour" or "testID" (got ${String(named)}). A step ` +
        'that names two selectors is a step whose author has not decided what it addresses.',
    };

  if (hasKey) {
    const message = sources.messages[step.key];
    if (typeof message !== 'string')
      return { problem: `message key "${step.key}" is not in the catalogue` };

    /*
     * THE SAME AMBIGUITY RULE AS COLOURS, BUT ONLY FOR A TAP — and the asymmetry is the point.
     *
     * The catalogue holds 21 exactly duplicated values: `compare.title` and `home.openCompare`
     * are both "Compare two colours", and both are on screens this journey could reach. A TAP
     * on a string that matches twice performs one of two DIFFERENT actions, chosen by whichever
     * element the framework reached first — a flake nobody can reproduce from reading the flow.
     *
     * An `assertVisible` on the same string is still a true assertion whichever element
     * satisfies it: the claim is that the text is on screen, and it is. So the rule would be
     * pure over-strictness there, and an over-strict rule is one somebody eventually weakens.
     */
    if (step.do === 'tap')
      for (const [key, other] of Object.entries(sources.messages)) {
        if (key === step.key) continue;
        if (typeof other === 'string' && other.includes(message))
          return {
            problem:
              `tapping message key "${step.key}" selects on "${message}", which also appears ` +
              `in "${key}" ("${other}"). Two elements would match, and a tap must not choose.`,
          };
      }

    return { text: message };
  }

  const entry = sources.entries.get(step.colour);
  if (entry === undefined)
    return { problem: `colour "${step.colour}" is not in corpus ${sources.corpus}` };

  const field = step.field ?? 'en';
  if (!FIELDS.includes(field))
    return { problem: `"field" must be one of ${FIELDS.join(', ')} — got "${String(field)}"` };

  const text = entry.name[field];
  if (typeof text !== 'string' || text === '')
    return { problem: `colour "${step.colour}" has no ${field} name` };

  /*
   * A selector that matches two rows taps whichever the framework reached first, which is a
   * flake nobody can reproduce from the flow. Maestro matches on a SUBSTRING, so uniqueness
   * has to be checked as containment across every name a row shows — not as inequality.
   */
  for (const [slug, other] of sources.entries) {
    if (slug === step.colour) continue;
    for (const otherField of FIELDS)
      if (typeof other.name[otherField] === 'string' && other.name[otherField].includes(text))
        return {
          problem:
            `colour "${step.colour}" selects on ${field} "${text}", which also appears in ` +
            `"${slug}" (${otherField}: "${other.name[otherField]}"). Two rows would match.`,
        };
  }

  return { text };
}

/** Render one step, or report why it cannot be rendered. */
function renderStep(step, index, sources) {
  const where = `step ${String(index + 1)}`;
  const problems = [];

  if (!STEPS.includes(step.do))
    return { problems: [`${where}: "${String(step.do)}" is not a step (${STEPS.join(', ')})`] };

  /*
   * `route` is optional and never affects the output. It is an assertion that the screen this
   * step expects to be on still exists — the cheapest way to make a renamed route break the
   * journey that navigates to it.
   */
  if (step.route !== undefined && !sources.routes.has(step.route))
    problems.push(`${where}: route "${String(step.route)}" is not a file under apps/mobile/app`);

  if (step.do === 'launch') {
    if (problems.length > 0) return { problems };
    return { lines: ['- launchApp:', '    clearState: true'] };
  }

  if (step.do === 'back') {
    if (problems.length > 0) return { problems };
    return { lines: ['- back'] };
  }

  const resolved = selector(step, sources);
  if (resolved.problem !== undefined) problems.push(`${where}: ${resolved.problem}`);

  // A single-quoted YAML scalar cannot carry a newline or a control character, and neither can
  // a selector that means anything. Refused rather than escaped: a message key whose value has
  // a line break is a copy bug, and silently flattening it here would hide it.
  if (resolved.text !== undefined && hasControlCharacter(resolved.text))
    problems.push(`${where}: the resolved text contains a control character or a line break`);

  if (problems.length > 0) return { problems };

  if (step.do === 'assertVisible')
    return { lines: [`- assertVisible: ${scalar(literal(resolved.text))}`] };
  if (step.do === 'tap')
    return {
      lines:
        resolved.id === undefined
          ? [`- tapOn: ${scalar(literal(resolved.text))}`]
          : [`- tapOn:`, `    id: ${scalar(literal(resolved.id))}`],
    };

  // inputText types into whatever was last tapped, and what it types is text rather than a
  // pattern — so it is NOT escaped as a regex. The spec's own step order is what puts the
  // focus in the field, which is why this takes a selector for its TEXT rather than a field.
  return { lines: [`- inputText: ${scalar(resolved.text)}`] };
}

/**
 * The whole flow for one spec.
 *
 * Pure: it takes the spec and the sources and returns text or problems. `--prove` calls it
 * with mutated inputs directly, so nothing is ever planted on disk
 * [[a-plant-that-outlives-its-run-is-a-disabled-gate]].
 */
export function renderFlow(spec, sources) {
  const problems = [];
  if (typeof spec.name !== 'string' || spec.name === '') problems.push('spec has no "name"');
  if (!Array.isArray(spec.steps) || spec.steps.length === 0) problems.push('spec has no "steps"');

  /*
   * AT LEAST ONE STEP MUST DECLARE ITS `route`, and this is the weakest of the rules here.
   *
   * The route assertion is what makes E-055 a guard at all: renaming `app/atlas/[slug].tsx`
   * breaks a journey and nothing else notices, because the run that would catch it needs a
   * device this workstation does not have. Per-step it is OPTIONAL, which means a spec could
   * quietly stop declaring any and lose the guard without a single line turning red.
   *
   * Requiring one anchor does not prove a journey declares every screen it visits — nothing
   * here can, short of executing it. It converts "silently unguarded" into "deliberately
   * unguarded", which is the difference this repository keeps paying for.
   */
  if (Array.isArray(spec.steps) && !spec.steps.some((step) => step.route !== undefined))
    problems.push(
      'no step declares a "route". At least one must, or a renamed route file breaks this ' +
        'journey with nothing to notice (E-055).',
    );

  const lines = [];
  for (const [index, step] of (spec.steps ?? []).entries()) {
    const rendered = renderStep(step, index, sources);
    if (rendered.problems !== undefined) problems.push(...rendered.problems);
    else lines.push(...rendered.lines);
  }

  if (problems.length > 0) return { problems };

  const header = [
    `# GENERATED from apps/mobile/e2e/journeys/${spec.name}.journey.json —`,
    '# do not edit. Run `node scripts/generate-e2e-flows.mjs` after changing the spec.',
    '#',
    `# ${spec.title}`,
    ...String(spec.why)
      .split('\n')
      // NO TRAILING SPACE ON AN EMPTY LINE. A `why` with a blank line between paragraphs
      // used to emit `"# "`, which prettier strips — so the committed flow and the
      // generated one differed by one invisible character and `--check` reported DRIFTED.
      .map((line) => (line === '' ? '#' : `# ${line}`)),
    '#',
    `# Selectors resolved against corpus ${sources.corpus} and the English catalogue.`,
  ];

  return { text: `${[...header, `appId: ${sources.appId}`, '---', ...lines].join('\n')}\n` };
}

// --- the files ----------------------------------------------------------------------------

/** Every spec on disk, newest-first by nothing — sorted, so the output order is stable. */
function specFiles() {
  if (!existsSync(SPEC_DIR)) return [];
  return readdirSync(SPEC_DIR)
    .filter((name) => name.endsWith('.journey.json'))
    .sort();
}

const flowPath = (spec) => join(FLOW_DIR, `${spec.name}.yaml`);

/**
 * What `--check` decides, as a function of what is on disk.
 *
 * Extracted so the proof can exercise **the comparison the gate makes**, rather than compare
 * two strings of its own and call that a test. `committed` is the file's text, or `null` when
 * there is no file.
 */
export function drift(spec, sources, committed) {
  const { text, problems } = renderFlow(spec, sources);
  if (problems !== undefined) return { problems };
  if (committed === null) return { verdict: 'missing', text };
  return { verdict: committed === text ? 'up to date' : 'drifted', text };
}

async function main() {
  const mode = process.argv[2];
  const sources = await loadSources();
  const files = specFiles();

  console.log('\nE2E flows\n');

  if (files.length === 0) {
    console.error(
      '  No journey spec under apps/mobile/e2e/journeys. A generator with no subject would\n' +
        '  write nothing and report success, which is the shape gate 7 exists to refuse.\n',
    );
    process.exitCode = 1;
    return;
  }

  let failed = false;
  for (const file of files) {
    const spec = JSON.parse(readFileSync(join(SPEC_DIR, file), 'utf8'));

    // The spec's `name` decides the flow's filename and its header. If it disagreed with the
    // file it was read from, `--check` would compare a flow to a spec nobody would think to
    // look in — so the two are required to be the same word.
    const expected = file.slice(0, -'.journey.json'.length);
    if (spec.name !== expected) {
      failed = true;
      console.error(`  ${file}`);
      console.error(`    REFUSED  spec "name" is "${String(spec.name)}", not "${expected}"`);
      continue;
    }

    const path = flowPath(spec);
    const shown = relative(ROOT, path).split('\\').join('/');
    const committed = existsSync(path) ? readFileSync(path, 'utf8') : null;
    const { text, problems, verdict } = drift(spec, sources, committed);

    if (problems !== undefined) {
      failed = true;
      console.error(`  ${file}`);
      for (const problem of problems) console.error(`    REFUSED  ${problem}`);
      continue;
    }

    if (mode === '--check') {
      if (verdict === 'up to date') {
        console.log(`  up to date   ${shown}`);
        continue;
      }
      failed = true;
      console.error(
        verdict === 'missing'
          ? `  MISSING      ${shown} — the spec is committed and the flow is not.`
          : `  DRIFTED      ${shown} — the committed flow is not what the sources produce.`,
      );
      continue;
    }

    writeFileSync(path, text);
    console.log(`  written      ${shown}`);
  }

  if (failed) {
    console.error(
      '\n  Run `node scripts/generate-e2e-flows.mjs` and commit the result, or fix the spec.\n',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `\n  ${String(files.length)} journey(s). Selectors resolve against the catalogue, the` +
      ' published corpus and the route table.\n',
  );
}

export { loadSources, specFiles, SPEC_DIR, FLOW_DIR };

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
