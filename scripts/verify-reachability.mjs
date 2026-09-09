#!/usr/bin/env node
/**
 * Every route has a way in.
 *
 * ## The gap this fills, and it is the converse of the gate beside it
 *
 * [`verify-route-targets.mjs`](./verify-route-targets.mjs) asks *does every target have a
 * route* — it catches a button that goes nowhere. Nothing asked the other question, and the
 * answer when it was finally asked was **eight**: eight finished screens with routes, conformance
 * subjects, accessibility coverage and tests, that a person holding the phone could not reach.
 *
 * ```
 * /atlas/compare  /atlas/find  /atlas/palettes  /profile/preferences
 * /profile/measure  /profile/export  /wardrobe/outfit  /wardrobe/shopping
 * ```
 *
 * Reported as *"I don't see settings, and options to choose themes in app. Are you sure you have
 * added all pages, and links."*
 *
 * ## The route model is IMPORTED, not re-derived
 *
 * `routePatterns()` and `targets()` come from the other gate. Two checks that disagree about
 * what a route is would each be right about their own model and wrong about the product
 * [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].
 *
 * ## What "reachable" means, and the limit is printed on every run
 *
 * A route is reachable when it is a **tab**, or when something navigates to it from a file that
 * is itself reachable. A route's outgoing edges are every navigation target found in its own
 * route file **and in the `apps/mobile` modules that file imports, transitively**.
 *
 * **Transitivity is not optional here.** `/atlas/palettes` is navigated to only from
 * `/profile/export`, which is itself an orphan. A gate that asked merely *"does anything link to
 * this"* would pass `palettes` and report seven where there are eight — the data in front of us
 * is exactly the case that separates the two rules.
 *
 * **THIS OVER-APPROXIMATES, WHICH IS FAILING OPEN, AND IT IS A CHOICE.** A screen imported by two
 * routes contributes its targets to both, so a route can be called reachable when only one of the
 * two importers can really get there. The honest alternative is a per-component call graph, which
 * this repository has no other reason to build. The over-approximation is stated in the output
 * rather than left for somebody to discover, the way `verify-contrast` prints what it does not
 * check.
 *
 * ## Exceptions expire
 *
 * Same shape as `unreached-tokens.json`, and the same reason (ADR-0088): an entry names the
 * feature that will reach the route, and **fails once that feature has made it reachable**. A
 * dead exception is caught rather than accumulating, which is the direction that matters — a
 * list nobody prunes is a list nobody reads.
 *
 * ```
 * node scripts/verify-reachability.mjs
 * node scripts/verify-reachability.mjs --prove
 * ```
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routePatterns, targets } from './verify-route-targets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'apps/mobile/app');
const MOBILE = join(ROOT, 'apps/mobile');
const DECLARATIONS = join(ROOT, '.harness/verification/unreachable-routes.json');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * The tabs, read out of the registry rather than listed here.
 *
 * `src/tabs.ts` is TypeScript and this is a script, so it is parsed as text — the same trade
 * every scanner here makes. The shape is asserted by `tab-icons.test.tsx`, so a registry this
 * regex stopped matching would be a registry that changed shape, which is a thing somebody did
 * deliberately.
 */
export function tabRoutes(file = join(MOBILE, 'src/tabs.ts')) {
  const source = readFileSync(file, 'utf8');
  const block = source.slice(source.indexOf('export const TABS'));
  const names = [...block.matchAll(/\bname:\s*'([^']+)'/gu)].map((m) => m[1]);
  // `index` is the group's own route, which is `/`.
  return names.map((n) => (n === 'index' ? '/' : `/${n}`));
}

/**
 * The `apps/mobile` files a module imports, resolved one level.
 *
 * Relative specifiers only. A package import leaves `apps/mobile` and cannot contain a route
 * target; an alias would need the tsconfig paths map, and this repository has none for the app.
 *
 * **`React.lazy(() => import('./x'))` is matched too**, because the Lens is loaded that way —
 * `app/(tabs)/lens.tsx` reaches `CameraLens` through exactly that, and missing it would make
 * every Lens exit invisible to this walk.
 */
export function importsOf(file) {
  const source = readFileSync(file, 'utf8');
  const specifiers = [
    ...[...source.matchAll(/from\s*['"](\.[^'"]+)['"]/gu)].map((m) => m[1]),
    ...[...source.matchAll(/import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/gu)].map((m) => m[1]),
  ];
  const out = [];
  for (const spec of specifiers) {
    const base = resolve(dirname(file), spec).replace(/\.(tsx?|js)$/u, '');
    for (const candidate of [
      `${base}.tsx`,
      `${base}.ts`,
      join(base, 'index.tsx'),
      join(base, 'index.ts'),
    ])
      if (existsSync(candidate)) {
        out.push(candidate);
        break;
      }
  }
  return out;
}

/** The transitive closure of a route file's imports, within `apps/mobile`. */
function closureOf(entry) {
  const seen = new Set([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    for (const next of importsOf(file))
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  }
  return seen;
}

/**
 * Which route a URL lands on — **the most specific match, as the router itself resolves it.**
 *
 * ## The bug this replaced (F-215)
 *
 * This was `patterns.find((q) => q.test.test(url))`, and a URL routinely matches more than one
 * pattern: `/atlas/find` satisfies `^/atlas/find/?$` **and** `^/atlas/[^/]+/?$`, because the
 * atlas directory holds a `find.tsx` beside a `[slug].tsx`.
 *
 * `find` returns whichever came first in `patterns`, and that order is `readdirSync` order —
 * **sorted on NTFS, hash-ordered on ext4.** So on Linux the edge from `atlas/index.tsx` was
 * attributed to `/atlas/[slug]`, the three literal routes were left with no inbound edge, and
 * gate 2 reported them as orphans. The same commit was green on Windows.
 *
 * A gate that is correct on one operating system by accident is worse than one that fails,
 * because the failure is invisible to whoever runs it locally.
 *
 * ## The order
 *
 * A static segment beats a dynamic one. That is not a tie-break invented here — it is how
 * expo-router matches, and this check exists to model the router. Fewest dynamic segments wins;
 * then the longer path, so `/a/b` beats `/a` where both somehow match; then the URL itself, so
 * the result is a **total order** and never depends on the filesystem again.
 */
export function resolveRoute(patterns, url) {
  const dynamic = (p) => p.url.split('/').filter((s) => /^\[.+\]$/u.test(s)).length;
  const depth = (p) => p.url.split('/').length;
  return patterns
    .filter((p) => p.test.test(url))
    .sort(
      (a, b) => dynamic(a) - dynamic(b) || depth(b) - depth(a) || a.url.localeCompare(b.url),
    )[0];
}

/**
 * The route graph: which routes each route can reach.
 *
 * A target is resolved against the route patterns, so `/atlas/${slug}` and `/atlas/ai-nezumi`
 * both land on the `[slug]` route — the graph is over URLs the tree serves, not over strings.
 */
export function routeGraph(appDir = APP) {
  const patterns = routePatterns(appDir);
  const byFile = new Map();
  for (const p of patterns) {
    const file = join(appDir, `${p.file}.tsx`);
    byFile.set(p.url, existsSync(file) ? file : join(appDir, `${p.file}.ts`));
  }

  const edges = new Map();
  for (const p of patterns) {
    const entry = byFile.get(p.url);
    const reached = new Set();
    if (entry !== undefined && existsSync(entry))
      for (const file of closureOf(entry))
        for (const t of targets([file])) {
          const url = t.target.replaceAll('PARAM', 'x');
          const hit = resolveRoute(patterns, url);
          if (hit !== undefined && hit.url !== p.url) reached.add(hit.url);
        }
    edges.set(p.url, reached);
  }
  return { patterns, edges };
}

/** Walk from the tabs. */
export function reachable(appDir = APP, roots = tabRoutes()) {
  const { patterns, edges } = routeGraph(appDir);
  const seen = new Set();
  const queue = [];
  for (const root of roots) {
    // The same resolution as the edges use. A tab root is unambiguous today, and "today" is
    // exactly the word that made the edge case ship.
    const hit = resolveRoute(patterns, root);
    if (hit !== undefined && !seen.has(hit.url)) {
      seen.add(hit.url);
      queue.push(hit.url);
    }
  }
  while (queue.length > 0) {
    const url = queue.pop();
    for (const next of edges.get(url) ?? [])
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  }
  return { patterns, reachableUrls: seen };
}

function declarations() {
  const file = JSON.parse(readFileSync(DECLARATIONS, 'utf8'));
  const featureList = JSON.parse(
    readFileSync(join(ROOT, '.harness/state/feature_list.json'), 'utf8'),
  );
  const ids = new Set(featureList.features.map((f) => f.id));
  const done = new Set(featureList.features.filter((f) => f.status === 'done').map((f) => f.id));
  return { file, ids, done };
}

export function run(appDir = APP) {
  const { patterns, reachableUrls } = reachable(appDir);
  const orphans = patterns.filter((p) => !reachableUrls.has(p.url)).map((p) => p.url);
  return { orphans, routes: patterns.length, reached: reachableUrls.size };
}

if (process.argv.includes('--prove')) prove();
else main();

function main() {
  console.log(`\n${BOLD}Irodora — route reachability${OFF}\n`);
  const { orphans, routes, reached } = run();
  const { file, ids, done } = declarations();

  const declared = new Map(file.unreachable.map((e) => [e.url, e]));
  const problems = [];

  for (const url of orphans)
    if (!declared.has(url))
      problems.push(
        `${url} is served by a route and nothing reaches it. A screen with no way in cannot be ` +
          'used and cannot be reviewed; it is work that rots with nothing reporting it (NFR-26). ' +
          'Link it, or declare it with the feature that will.',
      );

  // The other direction, which is what stops the list becoming a graveyard.
  for (const [url, entry] of declared) {
    if (!orphans.includes(url))
      problems.push(
        `${url} is declared unreachable and IS reachable. The declaration is dead — remove it. ` +
          'A list nobody prunes is a list nobody reads.',
      );
    if (!ids.has(entry.closedBy))
      problems.push(`${url} names ${entry.closedBy}, which is not a feature in feature_list.json`);
    else if (done.has(entry.closedBy))
      problems.push(
        `${url} names ${entry.closedBy}, which is DONE and did not reach it. Either the feature ` +
          'missed its own criterion, or the declaration should have moved with it.',
      );
  }

  console.log(
    `${DIM}  ${String(routes)} route(s); ${String(reached)} reachable from the ${String(tabRoutes().length)} tabs; ` +
      `${String(orphans.length)} orphan(s), ${String(declared.size)} of them declared.${OFF}`,
  );
  console.log(
    `${DIM}  OVER-APPROXIMATES, DELIBERATELY: a screen imported by two routes contributes its ` +
      `targets to both, so a route can be called reachable when only one importer can really ` +
      `get there. That direction fails OPEN. The honest alternative is a per-component call ` +
      `graph, which nothing else here needs. Stated rather than left to be discovered.${OFF}`,
  );

  for (const [url, entry] of declared)
    console.log(
      `  ${YELLOW}•${OFF} ${BOLD}${url}${OFF} ${DIM}closedBy ${entry.closedBy} — ${entry.why}${OFF}`,
    );

  if (problems.length > 0) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s).${OFF}\n`);
    for (const p of problems) console.log(`  ${RED}✗${OFF} ${p}`);
    console.log();
    process.exit(1);
  }
  console.log(`\n${GREEN}${BOLD}Every route has a way in.${OFF}\n`);
}

/**
 * The proof.
 *
 * Built over a SYNTHETIC route tree rather than the real one, so the cases are readable and the
 * assertions do not move every time a screen is wired up. The real tree is what `main()` checks.
 */
function prove() {
  console.log(`\n${BOLD}Reachability — proof${OFF}\n`);
  const cases = [];
  const dir = mkdtempSync(join(tmpdir(), 'irodora-reach-'));
  const write = (rel, body) => {
    const path = join(dir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, 'utf8');
  };

  // A tab, a route it links to, a route linked only from THAT one, and an orphan.
  write('(tabs)/index.tsx', "export default () => { router.push('/atlas'); };\n");
  write('(tabs)/atlas/index.tsx', "export default () => { router.push('/atlas/compare'); };\n");
  write('(tabs)/atlas/compare.tsx', 'export default () => null;\n');
  write('(tabs)/atlas/lonely.tsx', 'export default () => null;\n');

  const { orphans } = run(dir);
  cases.push(['a tab is a root', !orphans.includes('/')]);
  cases.push(['a route a tab links to is reachable', !orphans.includes('/atlas')]);
  cases.push([
    'a route reachable only through a CHAIN is reachable — the transitive case',
    !orphans.includes('/atlas/compare'),
  ]);
  cases.push(['and a route nothing links to is an orphan', orphans.includes('/atlas/lonely')]);

  // Cut the chain: compare must become an orphan.
  write('(tabs)/atlas/index.tsx', 'export default () => null;\n');
  const cut = run(dir).orphans;
  cases.push([
    'DECOY — cutting the chain makes the far end unreachable',
    cut.includes('/atlas/compare'),
  ]);
  cases.push(['and leaves the near end reachable', !cut.includes('/atlas')]);

  rmSync(dir, { recursive: true, force: true });

  /*
   * THE SHAPE THAT SHIPPED (F-215), and the reason the fixture above could not see it.
   *
   * That tree has no DYNAMIC route in it, so no URL in it is ever ambiguous — and ambiguity was
   * the whole defect. `/atlas/compare` matches its own literal pattern AND the sibling
   * `[slug]` one, `patterns.find` returned whichever the filesystem listed first, and gate 2
   * went red on ubuntu-latest for a commit that was green on Windows.
   */
  const amb = mkdtempSync(join(tmpdir(), 'irodora-reach-amb-'));
  const writeAmb = (rel, body) => {
    const path = join(amb, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, 'utf8');
  };
  writeAmb('(tabs)/index.tsx', "export default () => { router.push('/atlas'); };\n");
  writeAmb(
    '(tabs)/atlas/index.tsx',
    "export default () => { router.push('/atlas/compare'); router.push('/atlas/ai-nezumi'); };\n",
  );
  writeAmb('(tabs)/atlas/compare.tsx', 'export default () => null;\n');
  writeAmb('(tabs)/atlas/[slug].tsx', 'export default () => null;\n');

  const ambiguous = run(amb).orphans;
  cases.push([
    'a literal route beside a [slug] sibling is reachable — the shape that went red on CI',
    !ambiguous.includes('/atlas/compare'),
  ]);
  cases.push([
    'and the dynamic route is still reachable, so specificity did not trade one orphan for another',
    !ambiguous.includes('/atlas/[slug]'),
  ]);

  /*
   * THE PROPERTY THAT WAS ACTUALLY VIOLATED. Asserting the outcome above without asserting the
   * INVARIANCE would leave the next ordering difference to be found by CI again — the verdict
   * has to be the same whichever order the routes are discovered in.
   */
  const patterns = routePatterns(amb);
  const forwards = resolveRoute(patterns, '/atlas/compare')?.url;
  const backwards = resolveRoute([...patterns].reverse(), '/atlas/compare')?.url;
  cases.push([
    'DECOY — and the answer does not change when the routes are discovered in reverse',
    forwards === '/atlas/compare' && backwards === '/atlas/compare',
  ]);
  cases.push([
    'DECOY — the fixture really is ambiguous, so the two cases above are not about nothing',
    patterns.filter((p) => p.test.test('/atlas/compare')).length === 2,
  ]);

  rmSync(amb, { recursive: true, force: true });

  let ok = true;
  for (const [name, passed] of cases) {
    if (!passed) ok = false;
    console.log(`  ${passed ? `${GREEN}✓` : `${RED}✗`}${OFF} ${name}`);
  }
  console.log(
    ok
      ? `\n${GREEN}${BOLD}The reachability walk discriminates.${OFF} ${DIM}It finds the chain and it finds the orphan — a check that reported everything reachable would pass the first half of this and fail the second.${OFF}\n`
      : `\n${RED}${BOLD}The proof did not hold.${OFF}\n`,
  );
  if (!ok) process.exit(1);
}
