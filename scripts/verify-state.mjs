#!/usr/bin/env node
/**
 * Irodora — gate 0: harness integrity.
 *
 * Proves that the documentation, the state files, the effect graph and the memory
 * are mutually consistent. It runs from day one, before any application code exists,
 * because a harness whose own state has rotted cannot be trusted to govern anything.
 *
 * Zero dependencies, Node built-ins only: it must run on a clean clone before
 * `pnpm install` has ever been executed.
 *
 * Every failure message says three things: what failed, why it matters, and what to do.
 * A failure that only states the failure has done a third of its job.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HARNESS = join(ROOT, '.harness');

/* ------------------------------------------------------------------ reporting */

const failures = [];
const warnings = [];
const checks = [];

const fail = (check, what, why, fix) => failures.push({ check, what, why, fix });
const warn = (check, what) => warnings.push({ check, what });
const pass = (check, detail) => checks.push({ check, detail });

/* ------------------------------------------------------------------ utilities */

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(
      'parse',
      `${relative(ROOT, path)} is not valid JSON`,
      'Every other check that reads this file cannot run.',
      `Fix the syntax error: ${error.message}`,
    );
    return null;
  }
};

const readText = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

/**
 * Directories that are never part of the repository's own governed surface.
 *
 * `node_modules` is the one that matters. pnpm links workspace packages into each other's
 * `node_modules`, so a walk that descends into it re-visits our own packages through their
 * symlinks — and, worse, walks into third-party packages. Before this exclusion the
 * scoped-harness scan reported 13 harnesses when 8 exist, the extras being color-core's
 * AGENTS.md reached through several packages' node_modules links. The count moved whenever a
 * dependency was added or removed, which is how it was noticed.
 *
 * The count being wrong is the small half. The large half is that a scan for language
 * weakening a golden rule was reading files we do not own: a dependency shipping an
 * AGENTS.md with the wrong sentence in it would have failed our build on a file nobody here
 * can edit.
 */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '.next', '.expo', 'coverage']);

/**
 * `withFileTypes` is deliberate: `Dirent.isDirectory()` does NOT follow symlinks, where
 * `statSync().isDirectory()` does. That is the second half of the same defect — a symlinked
 * directory is now skipped rather than descended into, so a link cycle cannot hang the gate.
 */
const walk = (dir, filter = () => true, acc = []) => {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, filter, acc);
    else if (entry.isFile() && filter(full)) acc.push(full);
  }
  return acc;
};

const posix = (p) => p.split(sep).join('/');

/* ------------------------------------------ a minimal, real JSON Schema subset */

/**
 * Validates against the committed schemas rather than duplicating their rules here.
 * Supports the subset those schemas actually use: type, required, properties,
 * additionalProperties, enum, const, pattern, minimum/maximum, minItems, minLength,
 * items, and $ref into $defs. Anything unsupported is ignored rather than silently
 * passed as valid — unsupported keywords are reported, so a schema cannot quietly
 * outgrow the validator.
 */
const SUPPORTED = new Set([
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'title',
  'description',
  'type',
  'required',
  'properties',
  'additionalProperties',
  'enum',
  'const',
  'pattern',
  'minimum',
  'maximum',
  'minItems',
  'maxItems',
  'minLength',
  'items',
  'format',
]);

function validate(schema, data, root, path, errors, unsupported) {
  if (schema.$ref) {
    const key = schema.$ref.replace('#/$defs/', '');
    const target = root.$defs?.[key];
    if (!target) {
      errors.push(`${path}: schema $ref "${schema.$ref}" does not resolve`);
      return;
    }
    return validate(target, data, root, path, errors, unsupported);
  }

  for (const key of Object.keys(schema)) if (!SUPPORTED.has(key)) unsupported.add(key);

  const typeOf = (v) =>
    v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;

  if (schema.type) {
    const actual = typeOf(data);
    const ok =
      schema.type === 'number'
        ? actual === 'number' || actual === 'integer'
        : actual === schema.type;
    if (!ok) {
      errors.push(`${path}: expected ${schema.type}, got ${actual}`);
      return;
    }
  }

  if (schema.const !== undefined && data !== schema.const)
    errors.push(`${path}: must be "${schema.const}", got "${data}"`);

  if (schema.enum && !schema.enum.includes(data))
    errors.push(`${path}: "${data}" is not one of [${schema.enum.join(', ')}]`);

  if (typeof data === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(data))
      errors.push(`${path}: "${data}" does not match ${schema.pattern}`);
    if (schema.minLength !== undefined && data.length < schema.minLength)
      errors.push(`${path}: must be at least ${schema.minLength} characters (is ${data.length})`);
  }

  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum)
      errors.push(`${path}: must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && data > schema.maximum)
      errors.push(`${path}: must be <= ${schema.maximum}`);
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems)
      errors.push(`${path}: must have at least ${schema.minItems} item(s)`);
    if (schema.items)
      data.forEach((item, i) =>
        validate(schema.items, item, root, `${path}[${i}]`, errors, unsupported),
      );
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of schema.required ?? [])
      if (!(key in data)) errors.push(`${path}: missing required property "${key}"`);

    for (const [key, value] of Object.entries(data)) {
      const sub = schema.properties?.[key];
      if (sub) validate(sub, value, root, `${path}.${key}`, errors, unsupported);
      else if (schema.additionalProperties === false && !key.startsWith('_'))
        errors.push(`${path}: unexpected property "${key}"`);
    }
  }
}

const checkSchema = (name, schemaPath, dataPath) => {
  const schema = readJson(schemaPath);
  const data = readJson(dataPath);
  if (!schema || !data) return null;

  const errors = [];
  const unsupported = new Set();
  validate(schema, data, schema, name, errors, unsupported);

  if (unsupported.size)
    warn(
      'schema',
      `${name}: validator does not implement [${[...unsupported].join(', ')}] — those constraints are NOT being checked`,
    );

  if (errors.length) {
    fail(
      'schema',
      `${relative(ROOT, dataPath)} violates its schema (${errors.length} error${errors.length > 1 ? 's' : ''})`,
      'The state files are what every other check and every agent session reads.',
      errors
        .slice(0, 12)
        .map((e) => `  ${e}`)
        .join('\n') + (errors.length > 12 ? `\n  … and ${errors.length - 12} more` : ''),
    );
    return null;
  }
  pass('schema', `${name} valid`);
  return data;
};

/* ============================================================ 1. state schemas */

const featureList = checkSchema(
  'feature_list',
  join(HARNESS, 'state/schemas/feature_list.schema.json'),
  join(HARNESS, 'state/feature_list.json'),
);

const effects = checkSchema(
  'effects',
  join(HARNESS, 'state/schemas/effects.schema.json'),
  join(HARNESS, 'state/effects.json'),
);

/* ==================================================== 2. workflow invariants */

if (featureList) {
  const byId = new Map(featureList.features.map((f) => [f.id, f]));
  const inProgress = featureList.features.filter((f) => f.status === 'in_progress');

  if (inProgress.length > featureList.policy.wip_limit)
    fail(
      'wip',
      `${inProgress.length} features are in_progress (limit ${featureList.policy.wip_limit}): ${inProgress.map((f) => f.id).join(', ')}`,
      'Context split across k tasks gives each C/k. Below a threshold, none completes.',
      'Finish one, or move the others back to `todo`.',
    );
  else pass('wip', `${inProgress.length} in progress (limit ${featureList.policy.wip_limit})`);

  for (const f of featureList.features) {
    for (const blocker of f.blockedBy ?? []) {
      const b = byId.get(blocker);
      if (!b)
        fail(
          'blockers',
          `${f.id} is blocked by ${blocker}, which does not exist`,
          'A dangling blocker means the dependency graph is wrong.',
          `Remove it from ${f.id}.blockedBy, or add the missing feature.`,
        );
      else if (['in_progress', 'done', 'in_review'].includes(f.status) && b.status !== 'done')
        fail(
          'blockers',
          `${f.id} is ${f.status} but its blocker ${blocker} is ${b.status}`,
          'Working on a feature whose dependency is unfinished produces work that cannot be verified.',
          `Finish ${blocker} first, or correct the blockedBy list.`,
        );
    }

    // ADR-0038: an attested criterion must quote a REAL acceptance entry, verbatim.
    // Without this, attestation becomes a way to reword a criterion into something easier
    // and then excuse the softened version — which is worse than not declaring it at all.
    for (const att of f.attested ?? []) {
      if (!(f.acceptance ?? []).includes(att.criterion))
        fail(
          'attested',
          `${f.id} attests a criterion that is not in its acceptance list verbatim`,
          'Attestation excuses a criterion from being gated. If the text has drifted, the thing being excused is no longer the thing that was agreed.',
          `Make "attested[].criterion" exactly match an entry in ${f.id}.acceptance, or correct the acceptance entry.`,
        );

      if (att.status === 'verified' && !att.evidence)
        fail(
          'attested',
          `${f.id} marks an attested criterion verified with no evidence`,
          'A verification nobody can find is an assertion. This is the same rule gates follow.',
          'Set "evidence" to where the verification is recorded.',
        );
    }

    if (f.status === 'in_progress') {
      const planPath = f.plan ? join(HARNESS, f.plan) : null;
      if (!planPath || !existsSync(planPath))
        fail(
          'plan',
          `${f.id} is in_progress with no plan file`,
          'Plan before code is a golden rule: an approach discovered while implementing is a description, not a plan.',
          `Write .harness/plans/${f.id}-<kebab-title>.md from plans/TEMPLATE.md and set the feature's "plan" field.`,
        );
    }
  }
  if (!failures.some((f) => f.check === 'blockers' || f.check === 'plan'))
    pass('workflow', 'blockers and plan-before-code satisfied');

  if (!failures.some((f) => f.check === 'attested')) {
    const entries = featureList.features.flatMap((f) =>
      (f.attested ?? []).map((a) => ({ id: f.id, ...a })),
    );
    const outstanding = entries.filter((a) => a.status === 'outstanding' && a.blocks === 'release');

    pass(
      'attested',
      `${entries.length} attested criterion(a); ${outstanding.length} outstanding and blocking release`,
    );

    // Reported every run rather than only on failure. An obligation nobody is reminded of
    // is an obligation that gets discovered at release time (ADR-0038).
    for (const a of outstanding) warn('attested', `${a.id} owes: ${a.criterion}`);
  }
}

/* ============================================ 2b. retired surfaces (F-074)

   Every check above this one reads STRUCTURE. This one reads PROSE, because the defect it
   exists for is a criterion that is perfectly well-formed and describes a system that no
   longer exists.

   That is not hypothetical. F-017's contract said to build a Next.js app with Server
   Components, axe, and a `web-perf` gate — nine months after ADR-0051 retired the web surface
   and four features after apps/mobile shipped. Gate 0 was green the whole time, correctly by
   its own rules, because `"Next.js 16 App Router..."` is a fine string in a fine array.

   SIX defects of this class were found by hand. Three of them were found AFTER a sweep that
   was specifically looking for them. That is the argument for a checker.

   TWO MECHANISMS, and the difference matters:

     · GATE IDS ARE DERIVED from gates.json. Retire a gate and every criterion naming it fails
       on the next run, with nothing to maintain. This half needs no judgement at all.
     · SURFACE VOCABULARY IS DECLARED, because "tenant" is not a symbol anywhere — it is a
       word. Each term cites the record that retired it, and the citation prints on failure.

   WHAT IT CANNOT SEE, said here so a green run is not read as "the state is true": it matches
   vocabulary. F-018 lacking `blockedBy: F-012` while being unable to read a corpus bundle is
   the same CLASS of defect — state that does not describe reality — and no word-matcher finds
   it. */

const retiredPath = join(ROOT, '.harness/verification/retired-surface.json');
const retiredRaw = readText(retiredPath);

if (featureList && retiredRaw) {
  /** @type {{terms: {pattern: string, name: string, retiredBy: string, why: string}[], allowMarker: string}} */
  let retired;
  try {
    retired = JSON.parse(retiredRaw);
  } catch {
    retired = null;
  }

  if (retired === null || !Array.isArray(retired.terms) || retired.terms.length === 0) {
    fail(
      'retired-surface',
      'retired-surface.json is missing, unparseable, or declares no terms',
      'A vocabulary check with no vocabulary passes over everything and reports coverage.',
      'Restore .harness/verification/retired-surface.json.',
    );
  } else {
    // Read directly rather than reusing the module-level `gates` and `prd`, which are defined
    // further down this file. A check that silently depends on declaration order is a check
    // that breaks when someone reorders the sections, and it breaks by passing.
    const gatesHere = readJson(join(HARNESS, 'verification/gates.json'));
    const prdHere = readText(join(ROOT, 'docs/PRD.md'));

    // Gate ids, derived. A criterion naming `Gate N (x)` where x is not a gate in gates.json.
    const knownGates = new Set((gatesHere?.gates ?? []).map((g) => g.id));
    const marker = retired.allowMarker ?? 'retired-ok:';

    /** Every prose string gate 0 owns, with a label naming where it came from. */
    const subjects = [];
    for (const f of featureList.features) {
      for (const [i, a] of (f.acceptance ?? []).entries())
        subjects.push({ where: `${f.id}.acceptance[${i}]`, text: a });
      for (const [i, a] of (f.attested ?? []).entries())
        subjects.push({ where: `${f.id}.attested[${i}].criterion`, text: a.criterion });
    }
    if (prdHere)
      for (const line of prdHere.split('\n'))
        if (/^\|\s*\*\*(?:FR|NFR)-\d+\*\*/.test(line))
          subjects.push({ where: `docs/PRD.md ${line.slice(0, 40).trim()}`, text: line });

    let hits = 0;
    let exempt = 0;

    for (const { where, text } of subjects) {
      // The escape hatch, checked FIRST. A criterion may name a retired surface in order to
      // forbid it or to describe correcting it — F-074's own criteria do, and so does
      // ADR-0051. A check that could not express its own feature gets switched off.
      if (text.includes(marker)) {
        exempt += 1;
        continue;
      }

      for (const term of retired.terms) {
        if (!new RegExp(term.pattern, 'iu').test(text)) continue;
        hits += 1;
        fail(
          'retired-surface',
          `${where} names ${term.name}`,
          `${term.why} Retired by ${term.retiredBy}.`,
          `Rewrite the criterion for the surface that exists, or add "${marker} <reason>" ` +
            'to it if it names the retired thing in order to forbid it.',
        );
      }

      // A gate id that is not a gate. Derived — nothing to maintain when a gate is retired.
      //
      // Two steps rather than one pattern, because "Gates 12 (perf) and 13 (web-perf)" names
      // TWO gates and only the first is preceded by the word. A single regex anchored on
      // "Gate" caught `perf` and walked straight past `web-perf`, which is the one that was
      // actually retired — so the string is first qualified as being ABOUT gates, then every
      // `N (id)` in it is checked.
      if (!/\bgates?\b/iu.test(text)) continue;
      for (const m of text.matchAll(/\d+\s*\(([a-z][a-z-]*)\)/gu)) {
        const id = m[1];
        if (knownGates.has(id)) continue;
        hits += 1;
        fail(
          'retired-surface',
          `${where} names gate "${id}", which is not in gates.json`,
          'A criterion cannot be satisfied by a gate that does not exist, and it reads as ' +
            'though it can.',
          `Name a gate from gates.json, or drop the clause.`,
        );
      }
    }

    if (hits === 0)
      pass(
        'retired-surface',
        `${subjects.length} criteria and requirement rows scanned; ${retired.terms.length} ` +
          `retired term(s), gate ids derived from gates.json; ${exempt} deliberate mention(s). ` +
          'Vocabulary only — it cannot see a missing blockedBy',
      );
  }
}

/* ============================================ 3. requirement traceability (PRD) */

const prd = readText(join(ROOT, 'docs/PRD.md'));
const coverage = readText(join(ROOT, 'docs/REQUIREMENTS-COVERAGE.md'));

if (prd && featureList) {
  const declared = new Set([...prd.matchAll(/\*\*((?:FR|NFR)-\d+)\*\*/g)].map((m) => m[1]));

  if (declared.size === 0)
    fail(
      'prd',
      'No FR-*/NFR-* identifiers found in docs/PRD.md',
      'Traceability is the mechanism that stops unrequested work and orphaned requirements.',
      'Requirement ids must appear as **FR-1** / **NFR-1** in the PRD tables.',
    );

  const claimed = new Set();
  for (const f of featureList.features) {
    for (const req of f.requirements) {
      claimed.add(req);
      if (!declared.has(req))
        fail(
          'prd',
          `${f.id} claims ${req}, which does not exist in docs/PRD.md`,
          'A feature traced to a non-existent requirement is unreviewable — there is nothing to check it against.',
          `Correct ${f.id}.requirements, or add ${req} to the PRD.`,
        );
    }
  }

  const orphans = [...declared].filter((r) => !claimed.has(r));
  if (orphans.length)
    fail(
      'prd',
      `${orphans.length} requirement(s) claimed by no feature: ${orphans.join(', ')}`,
      'An unclaimed requirement will never be built, and nothing will report that.',
      'Assign each to a feature in feature_list.json, or remove it from the PRD.',
    );

  if (coverage) {
    const missing = [...declared].filter((r) => !new RegExp(`\\b${r}\\b`).test(coverage));
    if (missing.length)
      fail(
        'coverage',
        `${missing.length} requirement(s) absent from REQUIREMENTS-COVERAGE.md: ${missing.slice(0, 8).join(', ')}`,
        'The coverage matrix is how a reviewer sees, at a glance, that nothing is untraced.',
        'Add a row for each.',
      );
  } else {
    fail(
      'coverage',
      'docs/REQUIREMENTS-COVERAGE.md is missing',
      'Traceability cannot be reviewed.',
      'Restore the file.',
    );
  }

  if (!failures.some((f) => f.check === 'prd' || f.check === 'coverage'))
    pass('traceability', `${declared.size} requirements, all claimed and covered`);
}

/* ================================================== 4. effect graph and memory */

if (effects) {
  const memoryEffectsDir = join(HARNESS, 'memory/effects');
  const noteFiles = walk(memoryEffectsDir, (p) => p.endsWith('.md')).map((p) =>
    posix(relative(HARNESS, p)),
  );
  const referenced = new Set();

  for (const link of effects.links) {
    referenced.add(link.memory);

    if (!existsSync(join(HARNESS, link.memory)))
      fail(
        'effects',
        `${link.id} points at a missing memory note: ${link.memory}`,
        'The JSON says THAT B depends on A. The note says WHY — which is what lets the next person judge whether the link still holds.',
        `Create .harness/${link.memory}.`,
      );

    if (link.guard === 'none' && link.severity === 'critical' && !link.feature)
      fail(
        'effects',
        `${link.id} is critical with guard "none" and no tracked feature`,
        'A recorded dependency that nothing checks helps the careful reader and does nothing for the careless one — which is the case that matters.',
        `Add the guard, or set "feature": "F-0NN" naming the feature that will add it. Do NOT downgrade the severity.`,
      );

    if (link.guard === 'none' && link.severity !== 'critical')
      warn(
        'effects',
        `${link.id} (${link.severity}) has no guard — the graph is carrying a check we owe`,
      );

    for (const target of [link.from, ...link.to]) {
      if (target.exists === false) continue;
      if (!['file', 'symbol', 'test', 'artifact', 'content'].includes(target.kind)) continue;
      const filePart = target.ref
        .split('#')[0]
        .replace(/\/\*+.*$/, '')
        .replace(/\*+.*$/, '');
      if (!filePart) continue;
      if (!existsSync(join(ROOT, filePart)))
        fail(
          'effects',
          `${link.id} references a path that does not exist: ${target.ref}`,
          'A link pointing at a deleted file is rot. Left unchecked, the graph slowly stops describing the codebase.',
          `Update the reference, mark it "exists": false if it is planned, or set the link "status": "resolved".`,
        );
    }
  }

  for (const note of noteFiles)
    if (!referenced.has(note))
      fail(
        'effects',
        `${note} is not referenced by any effect link`,
        'An orphaned note will drift out of date with nothing pointing at it.',
        'Reference it from a link in effects.json, or delete it.',
      );

  if (!failures.some((f) => f.check === 'effects'))
    pass(
      'effects',
      `${effects.links.length} links, notes paired, paths resolve, critical links guarded`,
    );
}

/* ============================================================== 5. memory index */

const memoryIndex = readText(join(HARNESS, 'memory/index.md'));
if (memoryIndex) {
  const memoryFiles = walk(join(HARNESS, 'memory'), (p) => p.endsWith('.md'))
    .map((p) => posix(relative(join(HARNESS, 'memory'), p)))
    .filter((p) => !['index.md', 'README.md', 'observations.md'].includes(p));

  const uncovered = memoryFiles.filter((f) => !memoryIndex.includes(f));
  if (uncovered.length)
    fail(
      'memory',
      `${uncovered.length} memory file(s) absent from index.md: ${uncovered.slice(0, 6).join(', ')}`,
      'The index is what a session reads to decide what is relevant. An unindexed memory is an unread memory.',
      'Add a line for each to .harness/memory/index.md.',
    );
  else pass('memory', `${memoryFiles.length} memory files, all indexed`);

  // Wikilinks must resolve to a real memory file.
  const slugs = new Set(memoryFiles.map((f) => f.split('/').pop().replace(/\.md$/, '')));
  for (const file of walk(join(HARNESS, 'memory'), (p) => p.endsWith('.md'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\[\[([a-z0-9-]+)\]\]/g))
      if (!slugs.has(m[1]))
        warn(
          'memory',
          `${posix(relative(HARNESS, file))} links to [[${m[1]}]], which does not exist yet`,
        );
  }
}

/* ================================================================= 6. ADR index */

const adrDir = join(ROOT, 'docs/adr');
const adrIndex = readText(join(adrDir, 'README.md'));
if (adrIndex) {
  const adrFiles = readdirSync(adrDir).filter((f) => /^\d{4}-.*\.md$/.test(f));
  const missing = adrFiles.filter((f) => !adrIndex.includes(f));
  if (missing.length)
    fail(
      'adr',
      `${missing.length} ADR(s) absent from the index: ${missing.join(', ')}`,
      'A decision nobody can find gets re-litigated, differently.',
      'Add a row to docs/adr/README.md for each.',
    );

  for (const m of adrIndex.matchAll(/\]\((\d{4}-[a-z0-9-]+\.md)\)/g))
    if (!existsSync(join(adrDir, m[1])))
      fail(
        'adr',
        `The index links to ${m[1]}, which does not exist`,
        'A broken index link means the decision cannot be read.',
        'Restore the file, or remove the row.',
      );

  if (!failures.some((f) => f.check === 'adr'))
    pass('adr', `${adrFiles.length} ADRs, index consistent`);
}

/* ========================================================== 7. gates ↔ CI mirror */

const gates = readJson(join(HARNESS, 'verification/gates.json'));
const CI_WORKFLOW = '.github/workflows/ci.yml';
const ciPath = join(ROOT, CI_WORKFLOW);
const ci = readText(ciPath);

/**
 * The workflow a gate is mirrored in.
 *
 * Almost every gate runs on every push, so `ci.yml` is the default and stays unwritten in
 * gates.json. A RELEASE gate is different: gate 16 reads a built APK, and there is no APK on
 * a pull request. Mirroring it against `ci.yml` would fail on every run, and the way that
 * failure actually gets resolved under deadline is by deleting the gate — so the check has to
 * be able to look somewhere else rather than the gate having to move.
 *
 * The declaration is the gate's, not this file's: a gate that names no workflow is checked
 * against CI, and one that names a missing file is a failure rather than an exemption.
 */
const workflowOf = (gate) => gate.workflow ?? CI_WORKFLOW;

/**
 * Every shell command the workflow actually runs.
 *
 * This used to be a substring test against the whole file, and it was weaker than it read.
 * `pnpm test` is a substring of `pnpm test:golden`, `pnpm test:e2e`, `pnpm test:contrast` and
 * five more — so **deleting the real `pnpm test` step left this check green**, which is the
 * exact failure the check exists to prevent, sitting inside the check. `pnpm test:e2e` had
 * the same hole via `pnpm test:e2e:full`.
 *
 * Matching whole run-commands also means a gate named in a COMMENT no longer counts as
 * mirrored, which matters here because the workflow names every gate in prose.
 *
 * Handles both `run: cmd` and block scalars (`run: |` followed by indented lines).
 *
 * **It also carries each step's `if:` (F-072).** This check used to walk straight past the
 * condition, which meant a gate could read `active` in gates.json, have a step here, pass this
 * check, and never once execute. That nearly shipped in F-011: gate 11's step carried
 * `if: hashFiles('content/colors') != ''` and `content/colors/` is empty until F-012, so the
 * gate would have been skipped on every push for the rest of R1 with nothing saying so.
 */
function ciRunCommands(yaml) {
  const commands = [];
  const lines = yaml.split('\n');

  /** The `if:` belonging to the step that contains line `i`, or null. */
  const conditionFor = (i, indent) => {
    for (let j = i - 1; j >= 0; j--) {
      const l = lines[j];
      if (!l.trim() || l.trim().startsWith('#')) continue;
      const ind = /^(\s*)/.exec(l)[1].length;
      // A new list item at or above the step's own indent ends the step we are inside.
      if (/^\s*-\s/.test(l) && ind <= indent.length) {
        const own = /^\s*-\s+if:\s*(.*)$/.exec(l);
        return own ? own[1].trim() : null;
      }
      if (ind < indent.length) return null;
      const cond = /^\s*if:\s*(.*)$/.exec(l);
      if (cond && ind === indent.length) return cond[1].trim();
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inline = /^(\s*)-?\s*run:\s*(.*)$/.exec(line);
    if (!inline) continue;

    const [, indent, value] = inline;
    const condition = conditionFor(i, indent);

    if (value !== '|' && value !== '>' && value !== '|-' && value !== '>-') {
      if (value.trim()) commands.push({ command: value.trim(), condition });
      continue;
    }

    // Block scalar: take the indented lines that follow.
    for (let j = i + 1; j < lines.length; j++) {
      const body = lines[j];
      if (!body.trim()) continue;
      const bodyIndent = /^(\s*)/.exec(body)[1];
      if (bodyIndent.length <= indent.length) break;
      commands.push({ command: body.trim(), condition });
    }
  }

  return commands;
}

if (gates) {
  const active = gates.gates.filter((g) => g.status === 'active');
  if (ci) {
    /** Parsed once per workflow file, not once per gate. */
    const commandsByWorkflow = new Map([[CI_WORKFLOW, ciRunCommands(ci)]]);
    const commandsIn = (workflow) => {
      if (!commandsByWorkflow.has(workflow)) {
        const text = readText(join(ROOT, workflow));
        commandsByWorkflow.set(workflow, text === null ? null : ciRunCommands(text));
      }
      return commandsByWorkflow.get(workflow);
    };

    for (const gate of active) {
      if (gate.ciStep === false) continue;

      const workflow = workflowOf(gate);
      const runCommands = commandsIn(workflow);
      if (runCommands === null) {
        fail(
          'ci-mirror',
          `Active gate "${gate.id}" declares workflow ${workflow}, which does not exist`,
          'A gate pointed at a missing file is unmirrored in the one way that looks deliberate.',
          `Create ${workflow}, or remove the "workflow" field so the gate is checked against ${CI_WORKFLOW}.`,
        );
        continue;
      }

      // A step counts as running the gate if its command IS the gate command, or begins
      // with it followed by a shell boundary — `pnpm lint && something` still runs the gate,
      // `pnpm lint:fix` does not.
      const steps = runCommands.filter(({ command }) => {
        if (!command.startsWith(gate.command)) return false;
        const rest = command.slice(gate.command.length);
        return rest === '' || /^[\s&|;]/.test(rest);
      });

      if (steps.length === 0) {
        fail(
          'ci-mirror',
          `Active gate "${gate.id}" has no step in ${workflow}`,
          'A gate that is declared but not run in CI is theatre — believed in, and not doing its job.',
          `Add a step running: ${gate.command}  (or set "ciStep": false if it is deliberately covered by another step).`,
        );
        continue;
      }

      // F-072. A step is mirrored AND runs only if nothing conditions it out. An `if:` on a
      // blocking gate is how a gate reads active, passes this check, and never executes.
      for (const { condition } of steps) {
        if (condition === null) continue;

        const declared = gate.ciCondition;
        if (!declared)
          fail(
            'ci-mirror',
            `Active gate "${gate.id}" has a CI step guarded by \`if: ${condition}\``,
            'A condition can silently skip a blocking gate on every push, and this check compares run-commands — it would keep reporting the gate as mirrored. That is how gate 11 nearly shipped skipped for the whole of R1.',
            `Remove the condition, or declare it in gates.json as "ciCondition": { "condition": ${JSON.stringify(condition)}, "why": "..." }.`,
          );
        else if (declared.condition !== condition)
          fail(
            'ci-mirror',
            `Active gate "${gate.id}" declares ciCondition ${JSON.stringify(declared.condition)} but its step carries ${JSON.stringify(condition)}`,
            'A stale declaration is worse than none: it reads as reviewed while describing something that is no longer there.',
            'Update gates.json to match the workflow, or change the workflow back.',
          );
        else if (!declared.why || declared.why.trim().length < 20)
          fail(
            'ci-mirror',
            `Active gate "${gate.id}" declares a ciCondition with no real reason`,
            'An exemption nobody had to justify is not an exemption — it is a way to turn a blocking gate off quietly.',
            'Give ciCondition.why at least 20 characters saying why skipping this gate is ever correct.',
          );
      }
    }
    if (!failures.some((f) => f.check === 'ci-mirror')) {
      const workflows = new Set(active.filter((g) => g.ciStep !== false).map(workflowOf));
      pass(
        'ci-mirror',
        `${active.length} active gate(s) mirrored across ${String(workflows.size)} workflow(s)`,
      );
    }
  } else {
    fail(
      'ci-mirror',
      '.github/workflows/ci.yml is missing',
      'Gate 0 must run on every push, or the state files rot without anyone noticing.',
      'Create the workflow.',
    );
  }

  const pending = gates.gates.filter((g) => g.status === 'pending');
  for (const g of pending)
    if (!g.activatesWith)
      fail(
        'gates',
        `Gate "${g.id}" is pending with no activatesWith feature`,
        'A gate with no activation trigger never activates, and nobody is reminded.',
        'Set activatesWith to the feature id that makes it meaningful.',
      );

  if (featureList) {
    const ids = new Set(featureList.features.map((f) => f.id));
    for (const g of gates.gates)
      if (g.activatesWith && !ids.has(g.activatesWith))
        fail(
          'gates',
          `Gate "${g.id}" activates with ${g.activatesWith}, which is not a feature`,
          'The activation will never fire.',
          'Point it at a real feature id.',
        );
    for (const f of featureList.features)
      for (const v of f.verification ?? [])
        if (!gates.gates.some((g) => g.id === v))
          fail(
            'gates',
            `${f.id} lists verification gate "${v}", which does not exist`,
            'The feature cannot be verified against a gate that is not defined.',
            'Correct the id, or define the gate.',
          );
  }
  if (!failures.some((f) => f.check === 'gates'))
    pass('gates', `${gates.gates.length} gates defined, ${active.length} active`);
}

/* ============================================== 8. env contract (.env.example) */

// Scans the whole workspace rather than one package. It used to read packages/config/src only,
// which was correct while a single package owned every environment read — but that package went
// with the server tier (ADR-0051), and a check scoped to a directory that no longer exists is a
// check that passes by finding nothing. A local-first app should read almost no environment at
// all, so the honest form of this check is: find every IRODORA_* read ANYWHERE, and require each
// to be documented. An empty result is then a real result rather than an absent one.
const envExample = readText(join(ROOT, '.env.example'));
if (envExample) {
  const documented = new Set([...envExample.matchAll(/^(IRODORA_[A-Z0-9_]+)=/gm)].map((m) => m[1]));
  const used = new Map();

  for (const group of ['apps', 'packages', 'scripts']) {
    const dir = join(ROOT, group);
    if (!existsSync(dir)) continue;
    for (const file of walk(
      dir,
      (p) => /\.(ts|tsx|mjs|js)$/.test(p) && !p.includes('node_modules'),
    ))
      for (const m of readFileSync(file, 'utf8').matchAll(/IRODORA_[A-Z0-9_]+/g))
        if (!used.has(m[0])) used.set(m[0], relative(ROOT, file));
  }

  const undocumented = [...used.keys()].filter((v) => !documented.has(v));
  if (undocumented.length)
    fail(
      'env',
      `${undocumented.length} variable(s) read in the workspace but absent from .env.example: ${undocumented.map((v) => `${v} (${used.get(v)})`).join(', ')}`,
      'An undocumented variable is a build or a launch that fails in a way nobody predicted, and .env.example is the only place a reviewer looks to find out what configuration exists.',
      'Add each to .env.example with a placeholder and a comment naming what reads it and what happens when it is absent.',
    );
  else if (used.size === 0)
    pass('env', 'no IRODORA_* variable is read anywhere — the contract is empty and enforced');
  else pass('env', `${String(used.size)} variable(s) read, all documented`);
}

/* =========================================== 9. scoped rules vs golden rules */

const agentsMd = readText(join(ROOT, 'AGENTS.md'));
if (agentsMd) {
  const WEAKENING = [
    /exempt from golden rule/i,
    /golden rule \d+ does not apply/i,
    /may skip (?:the )?verification/i,
    /may skip (?:the )?gates?/i,
    /waive[sd]? the (?:wip|verification|effect)/i,
    /relax(?:es|ed)? golden/i,
  ];
  const scoped = [
    ...walk(join(ROOT, 'apps'), (p) => p.endsWith('AGENTS.md')),
    ...walk(join(ROOT, 'packages'), (p) => p.endsWith('AGENTS.md')),
    ...walk(join(ROOT, 'content'), (p) => p.endsWith('AGENTS.md')),
  ];
  for (const file of scoped) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of WEAKENING)
      if (pattern.test(text))
        fail(
          'scope',
          `${posix(relative(ROOT, file))} appears to relax a golden rule (matched ${pattern})`,
          'More specific wins on conflict — but no scope may relax a golden rule. A local exemption silently disables a global guarantee.',
          'Remove the exemption. A scope may be STRICTER, never looser. If the golden rule is genuinely wrong, that is an ADR.',
        );
  }
  if (!failures.some((f) => f.check === 'scope'))
    pass('scope', `${scoped.length} scoped harnesses, none weakening a golden rule`);
}

/* ================================================ 10. governed-doc link check */

const GOVERNED = [
  ...walk(join(ROOT, 'docs'), (p) => p.endsWith('.md')),
  ...walk(HARNESS, (p) => p.endsWith('.md')),
  join(ROOT, 'AGENTS.md'),
  join(ROOT, 'CLAUDE.md'),
  join(ROOT, 'README.md'),
  join(ROOT, 'CONTRIBUTING.md'),
  join(ROOT, 'SECURITY.md'),
  join(ROOT, 'NOTICE.md'),
].filter(existsSync);

let brokenLinks = 0;
for (const file of GOVERNED) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\]\(([^)\s#][^)\s]*)\)/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    const target = resolve(dirname(file), href.split('#')[0]);
    if (!existsSync(target)) {
      brokenLinks++;
      if (brokenLinks <= 15)
        fail(
          'links',
          `${posix(relative(ROOT, file))} → ${href} does not resolve`,
          'A broken link in a governed document sends the next reader nowhere, usually mid-task.',
          'Fix the path, or remove the link.',
        );
    }
  }
}
if (brokenLinks > 15)
  fail(
    'links',
    `… and ${brokenLinks - 15} further broken links`,
    'Suppressed for readability.',
    'Fix the ones above first.',
  );
if (brokenLinks === 0)
  pass('links', `${GOVERNED.length} governed documents, all relative links resolve`);

/* ==================================================================== output */

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

console.log(`\n${BOLD}Irodora — gate 0: harness integrity${OFF}\n`);

for (const c of checks)
  console.log(`  ${GREEN}✓${OFF} ${c.check.padEnd(14)} ${DIM}${c.detail}${OFF}`);

if (warnings.length) {
  console.log(`\n${YELLOW}${warnings.length} warning(s)${OFF}`);
  for (const w of warnings) console.log(`  ${YELLOW}!${OFF} ${w.check.padEnd(14)} ${w.what}`);
}

if (failures.length) {
  console.log(`\n${RED}${BOLD}${failures.length} failure(s)${OFF}\n`);
  for (const f of failures) {
    console.log(`  ${RED}✗ ${f.what}${OFF}`);
    console.log(`    ${DIM}why:${OFF} ${f.why}`);
    console.log(`    ${DIM}fix:${OFF} ${f.fix}\n`);
  }
  console.log(
    `${RED}${BOLD}Gate 0 FAILED.${OFF} The harness state is inconsistent; fix the causes above.\n`,
  );
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Gate 0 passed.${OFF} ${DIM}${checks.length} checks${warnings.length ? `, ${warnings.length} warning(s)` : ''}.${OFF}\n`,
);
