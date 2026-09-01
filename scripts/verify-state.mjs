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

    /**
     * Every prose string gate 0 owns, with a label naming where it came from.
     *
     * `kind` separates the two populations. Only `criterion` subjects get the gate-id check
     * below: a criterion naming a gate is making a claim about how it will be verified, while
     * a doc naming `Gate 12 (perf)` is describing the system, and the second is not a defect.
     */
    const subjects = [];
    for (const f of featureList.features) {
      for (const [i, a] of (f.acceptance ?? []).entries())
        subjects.push({ kind: 'criterion', where: `${f.id}.acceptance[${i}]`, text: a });
      for (const [i, a] of (f.attested ?? []).entries())
        subjects.push({
          kind: 'criterion',
          where: `${f.id}.attested[${i}].criterion`,
          text: a.criterion,
        });
    }
    if (prdHere)
      for (const line of prdHere.split('\n'))
        if (/^\|\s*\*\*(?:FR|NFR)-\d+\*\*/.test(line))
          subjects.push({
            kind: 'criterion',
            where: `docs/PRD.md ${line.slice(0, 40).trim()}`,
            text: line,
          });

    /*
     * THE DOCUMENTS, ADDED BY F-107, and the reason is that this check MISSED ITS OWN
     * VOCABULARY: `docs/architecture/security/privacy-design.md` §4 said "per-tenant data key"
     * while `\bper-tenant\b` was already a declared term. It was green for months, correctly by
     * its own rules, because those rules only ever looked at criteria and PRD rows.
     *
     * A SUPERSEDED ADR IS NOT ROT, IT IS A RECORD. ADR-0025 names the generated OpenAPI
     * document fifteen times and ADR-0012 names the API process twelve, and both are correct:
     * they document decisions that were later reversed, and ADR-0051 is the reversal. Scanning
     * them would produce 91 findings where 31 are real — and marking sixty true statements
     * `retired-ok:` would turn the marker into wallpaper, which is how an escape hatch stops
     * meaning anything.
     *
     * So the filter is the ADR's own Status, which is a fact the document already states.
     */
    const docStatus = (text) => {
      const m = /##\s*Status\s*\n+([^\n]+)/u.exec(text);
      return (m?.[1] ?? '').replace(/[*.]/gu, '').trim().split(/\s+/u)[0]?.toLowerCase() ?? '';
    };
    const HISTORICAL = new Set(['superseded', 'retired', 'rejected', 'withdrawn']);

    let docsScanned = 0;
    let docsSkipped = 0;
    for (const zone of ['docs/architecture', 'docs/adr']) {
      for (const file of walk(join(ROOT, zone), (p) => p.endsWith('.md'))) {
        const text = readText(file);
        if (text === null) continue;
        const rel = posix(relative(ROOT, file));
        if (zone === 'docs/adr' && HISTORICAL.has(docStatus(text))) {
          docsSkipped += 1;
          continue;
        }
        docsScanned += 1;
        text.split('\n').forEach((line, i) => {
          subjects.push({ kind: 'doc', where: `${rel}:${String(i + 1)}`, text: line });
        });
      }
    }

    let hits = 0;
    let exempt = 0;

    for (const { kind, where, text } of subjects) {
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
      //
      // CRITERIA ONLY. A criterion naming a gate claims how it will be verified; a document
      // naming one is describing the system, and a doc discussing a gate that once existed is
      // the same kind of history a superseded ADR is.
      if (kind !== 'criterion') continue;
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
        `${subjects.length} line(s) scanned across criteria, PRD rows and ${docsScanned} ` +
          `document(s); ${retired.terms.length} retired term(s), gate ids derived from ` +
          `gates.json; ${exempt} deliberate mention(s); ${docsSkipped} superseded ADR(s) ` +
          'skipped as history. Vocabulary only — it cannot see a missing blockedBy',
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

/* ------------------------------------------------- stale rationale (F-089, NFR-24) */

/*
 * An effect rationale is where the honest admissions live — "guard: none", "not yet blocking",
 * "detected against intent rather than enforced". When the promise behind one is KEPT and the
 * sentence is not updated, the record becomes a lie in the direction that matters: it tells a
 * reader a verification does not exist, and the reader it misleads is one deciding whether to
 * skip it.
 *
 * Two real instances, a week apart:
 *
 *   E-017 said its guard was "built and proven but NOT YET BLOCKING" for three features after
 *   F-076 wired it. Caught by RUNNING the guard, not by reading about it.
 *
 *   E-007's memory note said "the four outputs … the emit tests byte-compare, so a skipped
 *   regenerate is loud". Both halves nearly true, and the gap between FOUR and FIVE was the
 *   defect — apps/mobile/global.css was compared by nothing. It survived because the sentence
 *   SOUNDED like coverage. That case is why memory notes are read here too: E-007's link was
 *   fine, its note was not.
 *
 * THE CHECK NEVER FIRES ON A PHRASE ALONE. It fires on a disagreement between the prose and
 * the repository: the rationale claims the guard is absent AND the guard is actually wired.
 * A word-matcher that flagged every "not yet" would be deleted within a release, and would
 * deserve to be — this repository narrates its own defects constantly.
 */

const claimsPath = join(HARNESS, 'verification/discharged-claims.json');
const claimsRaw = readText(claimsPath);

if (effects && claimsRaw) {
  let claimsConfig;
  try {
    claimsConfig = JSON.parse(claimsRaw);
  } catch {
    claimsConfig = null;
  }

  if (
    claimsConfig === null ||
    !Array.isArray(claimsConfig.claims) ||
    claimsConfig.claims.length === 0
  ) {
    fail(
      'stale-rationale',
      'discharged-claims.json is missing, unparseable, or declares no phrases',
      'A vocabulary check with no vocabulary passes over everything and reports coverage.',
      'Restore .harness/verification/discharged-claims.json.',
    );
  } else {
    const marker = claimsConfig.allowMarker ?? 'past-state-ok:';
    const gatesForClaims = readJson(join(HARNESS, 'verification/gates.json'));
    const rootPkg = readJson(join(ROOT, 'package.json'));
    const scriptBodies = Object.values(rootPkg?.scripts ?? {}).join(' ; ');
    const activeGates = new Set(
      (gatesForClaims?.gates ?? []).filter((g) => g.status === 'active').map((g) => g.id),
    );

    /**
     * Is this link's guard actually wired?
     *
     * Computed from the repository, never from prose. `gate:<id>` is wired when gates.json
     * has it ACTIVE; `script:<file>` is wired when a root script invokes that filename.
     *
     * `test:` and `lint:` guards are deliberately NOT resolved — a test path existing says
     * nothing about whether a runner reaches it, and guessing would be the failing-open shape
     * this whole file exists to avoid. Links guarded only that way are skipped and counted.
     */
    const wiring = (guard) => {
      const gateRefs = [...String(guard).matchAll(/gate:([a-z][a-z-]*)/gu)].map((m) => m[1]);
      const scriptRefs = [...String(guard).matchAll(/script:([\w.-]+\.mjs)/gu)].map((m) => m[1]);
      if (gateRefs.length === 0 && scriptRefs.length === 0) return 'unresolved';
      if (gateRefs.some((id) => activeGates.has(id))) return 'wired';
      if (scriptRefs.some((file) => scriptBodies.includes(file))) return 'wired';
      return 'not-wired';
    };

    let subjectCount = 0;
    let skippedNone = 0;
    let skippedUnresolved = 0;
    let exemptClaims = 0;

    for (const link of effects.links ?? []) {
      // THE HONEST CASE, skipped entirely. A link that reports a check we owe must keep
      // saying so — E-009 has since F-001, and this check must never be the reason it stops.
      if (String(link.guard).trim() === 'none') {
        skippedNone += 1;
        continue;
      }
      const state = wiring(link.guard);
      if (state === 'unresolved') {
        skippedUnresolved += 1;
        continue;
      }
      if (state !== 'wired') continue;

      const notePath = join(HARNESS, link.memory ?? '');
      const noteText = link.memory ? readText(notePath) : null;
      const subjects = [
        { where: `${link.id}.rationale`, text: String(link.rationale ?? '') },
        ...(noteText === null ? [] : [{ where: `${link.id} → ${link.memory}`, text: noteText }]),
      ];

      for (const { where, text } of subjects) {
        subjectCount += 1;
        if (text.includes(marker)) {
          exemptClaims += 1;
          continue;
        }
        for (const claim of claimsConfig.claims) {
          const hit = new RegExp(claim.pattern, 'iu').exec(text);
          if (hit === null) continue;
          fail(
            'stale-rationale',
            `${where} asserts ${claim.name} — "${hit[0]}" — but ${link.guard} is wired`,
            `${claim.why} A promise kept turns its own record into a lie, and the reader it ` +
              'misleads is one deciding whether to skip a verification.',
            `Rewrite the sentence for the guard that now exists, or append "${marker} <reason>" ` +
              'if it describes a past state on purpose.',
          );
        }
      }
    }

    pass(
      'stale-rationale',
      `${String(subjectCount)} rationale(s) and note(s) checked against ` +
        `${String(claimsConfig.claims.length)} phrase(s); ${String(skippedNone)} link(s) ` +
        `honestly report guard:none, ${String(skippedUnresolved)} guarded only by a test or ` +
        `lint rule this cannot resolve, ${String(exemptClaims)} marked as past state. ` +
        'A phrase alone is never a finding — only a phrase that disagrees with the repository',
    );
  }
}

/* ================================ 4b. id uniqueness across .harness (F-102, F-106) */

/*
 * Every id space in `.harness/` is a primary key, and no schema can check one.
 *
 * JSON Schema 2020-12 has `uniqueItems`, which compares WHOLE OBJECTS, and no
 * unique-by-property constraint — two entries sharing an id and differing anywhere else are
 * distinct objects and validate perfectly. So the key is the one field a schema is
 * structurally incapable of checking, and it is the field everything else resolves through.
 *
 * IT HAPPENED, AND IT WAS NOT CARELESSNESS. F-098 allocated `E-032` at 09:22:54 on
 * 2026-08-26 and F-028 allocated it again at 09:46:43 — twenty-four minutes apart, by two
 * features neither of which could see the other's write. Gate 0 then printed "E-032 (high)
 * has no guard" while one E-032 named a proven guard and the other honestly named none: a
 * warning simultaneously right and wrong, with nothing in it to say which link it meant.
 *
 * THIS IS A TABLE RATHER THAN THREE CHECKS BECAUSE THE ONE-OFF IS WHAT PRODUCED F-106.
 * F-102 fixed `effects.json` alone; tracing its effects found the same hole in
 * `feature_list.json` and `gates.json` within the hour, both passing gate 0 with a planted
 * duplicate. A fourth file would otherwise schedule F-107.
 *
 * A FEATURE ID IS THE WORST OF THEM, and the reason is that it is not merely a citation
 * target. `blockedBy` resolves by id and `next-feature` selects the lowest eligible id, so
 * two features numbered F-102 make "every blocker is done" a question with two answers.
 *
 * IT FAILS CLOSED. A declared file that is missing, unparseable, or whose array is not where
 * the table says is a FAILURE, never a skip — otherwise renaming a file silently disables its
 * check, and a check that cannot run is not passing.
 *
 * WHAT IS DELIBERATELY ABSENT, both established by experiment rather than by reading:
 *
 *   `unreached-tokens.json` — `group` is NOT a key. Ten entries carry five distinct groups
 *   and verify-token-reach.mjs maps (group, token) pairs, so a group-uniqueness check would
 *   fire on correct data on its first run. That is how a real check gets deleted for noise.
 *
 *   `off-scale-spacing.json` — a compound (file, property, value) key, and a duplicate is
 *   ALREADY caught elsewhere: verify-spacing-scale.mjs matches with findIndex, so a second
 *   identical entry matches nothing and a dead exemption is already a failure. Verified by
 *   planting one and watching it exit 1.
 *
 * The message names BOTH subjects. "Duplicate id E-032" on its own sends the reader to
 * `git log -S` to find out which two collided, which is the search this check exists to
 * spare them.
 */

const ID_SPACES = [
  {
    file: 'state/feature_list.json',
    path: 'features',
    key: 'id',
    plural: 'features',
    detail: (e) => e.title ?? '(no title)',
    why:
      'A feature id is not only a citation target, it is a control-flow input: `blockedBy` ' +
      'resolves by id and `next-feature` selects the lowest eligible id. Two features under ' +
      'one id make "every blocker is done" a question with two answers, and the check that ' +
      'stops work starting on an unfinished dependency reports whichever it reached first.',
  },
  {
    file: 'state/effects.json',
    path: 'links',
    key: 'id',
    plural: 'links',
    detail: (e) => e.from?.ref ?? '(no from.ref)',
    why:
      'An effect id is how every other document points at a consequence. When it resolves ' +
      'to two links, every reference to it — in a rationale, an ADR, a source comment or a ' +
      'gate warning — becomes ambiguous, and the graph stops being able to do the one job ' +
      'it has.',
  },
  {
    file: 'verification/gates.json',
    path: 'gates',
    key: 'id',
    plural: 'gates',
    detail: (e) => e.command ?? '(no command)',
    why:
      'A gate id resolves `activatesWith`, `requiredFor`, every feature’s `verification` ' +
      'list and the CI mirror. Two gates under one id mean a feature can name a gate that ' +
      'runs a command nobody chose, and the mirror can prove the wrong step is present.',
  },
  {
    file: 'verification/claims.json',
    path: 'banned',
    key: 'id',
    plural: 'banned constructions',
    detail: (e) => e.pattern ?? '(no pattern)',
    why:
      'The claims lint names the construction it caught, and an exemption is justified ' +
      'against one. Two constructions under one id make a finding unattributable and an ' +
      'exemption wider than whoever wrote it intended.',
  },
  {
    file: 'verification/discharged-claims.json',
    path: 'claims',
    key: 'name',
    plural: 'discharged claims',
    detail: (e) => e.pattern ?? '(no pattern)',
    why:
      'The stale-rationale failure reads "asserts <name>". Two claims under one name make ' +
      'that sentence point at a phrase the author did not write.',
  },
  {
    file: 'verification/retired-surface.json',
    path: 'terms',
    key: 'name',
    plural: 'retired terms',
    detail: (e) => e.pattern ?? '(no pattern)',
    why:
      'A retired term names what it retired and the ADR that retired it. Two under one name ' +
      'attribute a finding to the wrong decision.',
  },
  {
    file: 'verification/advisories.json',
    path: 'accepted',
    key: 'id',
    plural: 'accepted advisories',
    detail: (e) => e.package ?? '(no package)',
    why:
      'A disposition is an accepted risk recorded against one advisory id, with a ' +
      'reachability argument for one package. Two under one id accept a risk nobody ' +
      'assessed, which is the shape the advisory proof exists to prevent.',
  },
];

const FIX =
  'Give the later entry the next unallocated id, and move every reference a reader ' +
  'consults as current. Never reuse an id.';

let idEntries = 0;

for (const space of ID_SPACES) {
  const path = join(HARNESS, space.file);

  if (!existsSync(path)) {
    fail(
      'ids',
      `${space.file} is declared as an id space and is not there`,
      'A declared space that cannot be read is an unchecked space. Skipping it would let a ' +
        'rename disable a check with nothing to say so.',
      `Restore .harness/${space.file}, or remove it from ID_SPACES in this script.`,
    );
    continue;
  }

  const data = readJson(path);
  if (data === null) continue; // readJson has already reported the parse failure.

  const entries = data[space.path];
  if (!Array.isArray(entries)) {
    fail(
      'ids',
      `${space.file} has no "${space.path}" array, so its ids are unchecked`,
      'The table says where the entries live. When they move, the check silently stops ' +
        'having anything to check, and reads exactly like a pass.',
      `Point ID_SPACES at the new path in ${space.file}, or restore the array.`,
    );
    continue;
  }

  idEntries += entries.length;
  const owners = new Map();

  for (const entry of entries) {
    const id = entry?.[space.key];
    if (typeof id !== 'string' || id === '') {
      fail(
        'ids',
        `${space.file} has an entry with no "${space.key}"`,
        'An entry with no key cannot be referred to, and cannot be told apart from the next ' +
          'one that also has none.',
        `Give it a ${space.key}.`,
      );
      continue;
    }
    const detail = String(space.detail(entry));
    const first = owners.get(id);
    if (first === undefined) {
      owners.set(id, detail);
      continue;
    }
    fail(
      'ids',
      `${id} is used by two different ${space.plural}: "${first}" and "${detail}"`,
      space.why,
      FIX,
    );
  }
}

if (!failures.some((f) => f.check === 'ids'))
  pass(
    'ids',
    `${String(ID_SPACES.length)} id space(s), ${String(idEntries)} entries, every id distinct ` +
      '(2 spaces deliberately unkeyed — see the comment)',
  );

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

/* ========================================== 7b. lockfile ↔ manifests (F-098) */

/**
 * The lockfile resolves exactly what the manifests declare.
 *
 * CI installs with `pnpm install --frozen-lockfile`, which refuses when a manifest declares
 * something the lockfile does not resolve. That refusal is correct, and it is also the most
 * expensive place to learn it: install is the ninth step, every gate after it is skipped,
 * and the message names one package while saying nothing about how the two fell out of step.
 *
 * That is not hypothetical here. F-020 added `@irodora/corpus` to `packages/store`, and on
 * the workstation `pnpm install` could not run at all — Node 22 and pnpm 9 against `engines`
 * demanding 24 and 11 — so a hand-made junction stood in for the workspace link and local
 * work carried on correctly. Nothing regenerated the lockfile. Three pushes later CI was
 * still red on an install step nobody had touched, with three features' worth of commits
 * between the cause and the symptom.
 *
 * So the check belongs in gate 0: before install, on Node built-ins, on a clean clone. It is
 * the only place that can say "the lockfile is stale" to someone who cannot run pnpm at all.
 *
 * It MIRRORS pnpm's rule rather than approximating it — the same three dependency sections,
 * the same verbatim specifier comparison, the same treatment of `overrides` — because a
 * check that is merely similar produces both false greens and false reds, and the second
 * kind gets the check deleted. Where it cannot mirror pnpm (a `catalog:` specifier is
 * resolved in the lockfile and no longer matches the manifest text) it says so on the run
 * rather than quietly comparing the wrong two strings.
 */

const LOCKFILE = 'pnpm-lock.yaml';
const WORKSPACE_YAML = 'pnpm-workspace.yaml';
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];

/** Strip the surrounding quotes YAML adds to keys like `'@irodora/corpus'` and values like `'>=1'`. */
const unquote = (s) => s.replace(/^'(.*)'$/s, '$1').replace(/^"(.*)"$/s, '$1');

/**
 * The `packages:` and `overrides:` blocks of pnpm-workspace.yaml, read with a line parser
 * because gate 0 carries no dependencies — the same constraint that shapes the CI mirror
 * check above.
 *
 * Only the forms this repository uses are understood, and an unrecognised `packages:` entry
 * is a FAILURE rather than a skip. A glob this parser walks past is a workspace project the
 * check silently stops covering, and "passed by finding nothing" is the shape of every
 * defect in this file's history.
 */
const parseWorkspaceYaml = (text) => {
  const packages = [];
  const overrides = new Map();
  const unsupported = [];
  let section = null;

  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*#/.test(raw) || raw.trim() === '') continue;

    const top = raw.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (top) {
      section = top[2] === '' ? top[1] : null;
      continue;
    }

    if (section === 'packages') {
      const item = raw.match(/^\s+-\s*(.+?)\s*$/);
      if (!item) continue;
      const glob = unquote(item[1]);
      if (/^[\w.@/-]+(\/\*{1,2})?$/.test(glob) || /^![\w.@/-]+(\/\*{1,2})?$/.test(glob))
        packages.push(glob);
      else unsupported.push(glob);
      continue;
    }

    if (section === 'overrides') {
      const entry = raw.match(/^\s+(.+?):\s*(.+?)\s*$/);
      if (entry) overrides.set(unquote(entry[1]), unquote(entry[2]));
    }
  }

  return { packages, overrides, unsupported };
};

/**
 * Expand one workspace glob to the project directories it selects, as posix paths relative
 * to the repository root. A directory without a package.json is not a project — pnpm ignores
 * it, so this must too, or every glob would report phantom projects.
 */
const expandWorkspaceGlob = (glob) => {
  const isProject = (dir) => existsSync(join(ROOT, dir, 'package.json'));

  if (!glob.includes('*')) return isProject(glob) ? [glob] : [];

  const prefix = glob.replace(/\/\*{1,2}$/, '');
  const recursive = glob.endsWith('/**');
  const base = join(ROOT, prefix);
  if (!existsSync(base)) return [];

  const found = [];
  const descend = (relDir) => {
    for (const entry of readdirSync(join(ROOT, relDir), { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
      const child = `${relDir}/${entry.name}`;
      if (isProject(child)) found.push(child);
      if (recursive) descend(child);
    }
  };
  descend(prefix);
  return found;
};

/**
 * The `importers:` block of the lockfile, plus its top-level `overrides:`.
 *
 * Indentation is the grammar: importer keys sit at two spaces, dependency sections at four,
 * package names at six, and `specifier:`/`version:` at eight. A project with no dependencies
 * is written inline as `tests/bench: {}` and must still register as PRESENT — treating it as
 * absent would report two false failures on this repository today.
 */
const parseLockfile = (text) => {
  const importers = new Map();
  const overrides = new Map();
  let block = null;
  let importer = null;
  let section = null;
  let dep = null;

  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '' || /^\s*#/.test(raw)) continue;

    const top = raw.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (top) {
      block = top[2] === '' ? top[1] : null;
      importer = null;
      section = null;
      dep = null;
      continue;
    }

    if (block === 'overrides') {
      const entry = raw.match(/^\s+(.+?):\s*(.+?)\s*$/);
      if (entry) overrides.set(unquote(entry[1]), unquote(entry[2]));
      continue;
    }

    if (block !== 'importers') continue;

    const head = raw.match(/^ {2}(\S.*?):\s*(\{\})?\s*$/);
    if (head) {
      importer = unquote(head[1]);
      importers.set(importer, new Map());
      section = null;
      dep = null;
      continue;
    }
    if (importer === null) continue;

    const sec = raw.match(/^ {4}(\w+):\s*$/);
    if (sec) {
      section = DEP_SECTIONS.includes(sec[1]) ? sec[1] : null;
      if (section) importers.get(importer).set(section, new Map());
      dep = null;
      continue;
    }
    if (section === null) continue;

    const name = raw.match(/^ {6}(\S.*?):\s*$/);
    if (name) {
      dep = unquote(name[1]);
      importers.get(importer).get(section).set(dep, null);
      continue;
    }

    const spec = raw.match(/^ {8}specifier:\s*(.*?)\s*$/);
    if (spec && dep !== null) importers.get(importer).get(section).set(dep, unquote(spec[1]));
  }

  return { importers, overrides };
};

const lockText = readText(join(ROOT, LOCKFILE));
const workspaceText = readText(join(ROOT, WORKSPACE_YAML));

if (workspaceText === null)
  fail(
    'lockfile',
    `${WORKSPACE_YAML} is missing`,
    'Without it there is no workspace, and this check cannot know which manifests feed the lockfile. It would then pass by finding nothing.',
    'Restore pnpm-workspace.yaml.',
  );
else if (lockText === null)
  fail(
    'lockfile',
    `${LOCKFILE} is missing`,
    '`pnpm install --frozen-lockfile` — what CI runs — refuses outright without a lockfile, and an unlocked install is not a reproducible one.',
    'Run `pnpm install --lockfile-only` on the pinned toolchain and commit the result.',
  );
else {
  const workspace = parseWorkspaceYaml(workspaceText);
  const lock = parseLockfile(lockText);

  for (const glob of workspace.unsupported)
    fail(
      'lockfile',
      `${WORKSPACE_YAML} declares the package glob "${glob}", which this check cannot expand`,
      'Projects it selects would be invisible here while pnpm still installs them — the check would look green over a surface it never read.',
      'Use a supported form (an exact path, `dir/*`, or `dir/**`), or teach expandWorkspaceGlob the new one. Do not leave it unread.',
    );

  const excluded = new Set(
    workspace.packages
      .filter((g) => g.startsWith('!'))
      .flatMap((g) => expandWorkspaceGlob(g.slice(1))),
  );
  const projects = [
    '.',
    ...new Set(
      workspace.packages
        .filter((g) => !g.startsWith('!'))
        .flatMap(expandWorkspaceGlob)
        .filter((d) => !excluded.has(d)),
    ),
  ].sort();

  if (lock.importers.size === 0)
    fail(
      'lockfile',
      `${LOCKFILE} parsed to zero importers`,
      'Every comparison below would then trivially agree, and this check would report a clean lockfile for any lockfile at all.',
      'The lockfile format has changed under the parser in section 7b. Fix the parser — do not relax the check.',
    );

  let drift = 0;
  let deps = 0;
  let catalogued = 0;

  for (const project of projects) {
    const manifest = readJson(join(ROOT, project, 'package.json'));
    if (manifest === null) continue;

    const importer = lock.importers.get(project);
    if (importer === undefined) {
      const declares = DEP_SECTIONS.some((s) => Object.keys(manifest[s] ?? {}).length > 0);
      if (declares) {
        drift += 1;
        fail(
          'lockfile',
          `${LOCKFILE} has no importer for the workspace project "${project}"`,
          'pnpm resolves each project separately; a project the lockfile never saw cannot be installed frozen, and `--frozen-lockfile` fails at install with every gate after it skipped.',
          'Run `pnpm install --lockfile-only` on the pinned toolchain and commit pnpm-lock.yaml.',
        );
      }
      continue;
    }

    for (const section of DEP_SECTIONS) {
      const declared = manifest[section] ?? {};
      const resolved = importer.get(section) ?? new Map();

      for (const [name, specifier] of Object.entries(declared)) {
        deps += 1;
        if (specifier.startsWith('catalog:')) {
          catalogued += 1;
          if (!resolved.has(name)) {
            drift += 1;
            fail(
              'lockfile',
              `${LOCKFILE} does not resolve ${name} for ${project} (${section})`,
              'The manifest declares it, so `pnpm install --frozen-lockfile` refuses.',
              'Run `pnpm install --lockfile-only` on the pinned toolchain and commit pnpm-lock.yaml.',
            );
          }
          continue;
        }
        if (!resolved.has(name)) {
          drift += 1;
          fail(
            'lockfile',
            `${LOCKFILE} does not resolve ${name}@${specifier}, which ${project}/package.json declares under ${section}`,
            'This is the exact condition `pnpm install --frozen-lockfile` refuses on. CI stops at install and every gate after it is skipped, so the push reports one opaque failure instead of the state of the build.',
            'Run `pnpm install --lockfile-only` on the pinned toolchain (Node 24.19.0, pnpm 11.21.0) and commit pnpm-lock.yaml alongside the manifest change.',
          );
        } else if (resolved.get(name) !== specifier) {
          drift += 1;
          fail(
            'lockfile',
            `${LOCKFILE} resolves ${name} at "${String(resolved.get(name))}" but ${project}/package.json asks for "${specifier}"`,
            'pnpm compares specifiers verbatim; a changed range is as fatal to a frozen install as a missing dependency, and it is easier to miss in review because the name is still there.',
            'Run `pnpm install --lockfile-only` on the pinned toolchain and commit pnpm-lock.yaml alongside the manifest change.',
          );
        }
      }

      for (const name of resolved.keys())
        if (!(name in declared)) {
          drift += 1;
          fail(
            'lockfile',
            `${LOCKFILE} still resolves ${name} for ${project} (${section}), which the manifest no longer declares`,
            'A frozen install refuses on a removal as readily as on an addition, and a dependency nothing declares is one nobody is reviewing.',
            'Run `pnpm install --lockfile-only` on the pinned toolchain and commit pnpm-lock.yaml.',
          );
        }
    }
  }

  for (const [name, version] of workspace.overrides)
    if (!lock.overrides.has(name)) {
      drift += 1;
      fail(
        'lockfile',
        `${LOCKFILE} carries no override for ${name}, which ${WORKSPACE_YAML} pins to ${version}`,
        'The pins in pnpm-workspace.yaml exist because two copies of a native module is a runtime the camera and the UI do not share (ADR-0062). An override the lockfile has not absorbed is a pin that is not in force.',
        'Run `pnpm install --lockfile-only` on the pinned toolchain and commit pnpm-lock.yaml.',
      );
    } else if (lock.overrides.get(name) !== version) {
      drift += 1;
      fail(
        'lockfile',
        `${LOCKFILE} overrides ${name} to "${String(lock.overrides.get(name))}" but ${WORKSPACE_YAML} pins "${version}"`,
        'The lockfile is what installs. A pin that disagrees with it is a decision recorded in the place nobody resolves from.',
        'Run `pnpm install --lockfile-only` on the pinned toolchain and commit pnpm-lock.yaml.',
      );
    }

  for (const name of lock.overrides.keys())
    if (!workspace.overrides.has(name)) {
      drift += 1;
      fail(
        'lockfile',
        `${LOCKFILE} overrides ${name}, which ${WORKSPACE_YAML} no longer pins`,
        'Every override is a supply-chain decision. One that survives only in the lockfile has lost the comment that justified it.',
        'Run `pnpm install --lockfile-only` on the pinned toolchain and commit pnpm-lock.yaml.',
      );
    }

  if (catalogued > 0)
    warn(
      'lockfile',
      `${String(catalogued)} dependenc(ies) use a catalog: specifier — presence is checked, the version is NOT. The lockfile records the resolved version there, so comparing it to the manifest text would fail on every correct lockfile.`,
    );

  if (drift === 0)
    pass(
      'lockfile',
      `${String(projects.length)} workspace projects, ${String(deps)} declared dependencies and ${String(workspace.overrides.size)} override(s) all resolved in ${LOCKFILE}`,
    );
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
