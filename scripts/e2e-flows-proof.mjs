/**
 * Prove that the flow generator refuses what it claims to refuse.
 *
 * The generator's whole value is that a renamed key, an unpublished colour or a moved route
 * fails **here**, on a machine that cannot run the journey. That is a claim about REFUSALS, and
 * a refusal nobody has watched is a hope. So each class is mutated and required to be caught.
 *
 * ## The unmutated case is asserted FIRST, and it is not a formality
 *
 * A harness that cannot evaluate its subject at all reports every mutation as caught and looks
 * like a clean sweep. That happened in this repository — 38 mutations across four features, all
 * false, because the runner was never starting
 * [[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]]. So the
 * real spec against the real sources must RENDER before any mutation is believed.
 *
 * ## Nothing is planted on disk
 *
 * `renderFlow` is pure — spec and sources in, text or problems out — so every mutation here is
 * an object literal. There is no file to restore and therefore no interrupted run that leaves
 * one behind, which is the failure F-134 fixed in the gate-mirror proof and did not want to
 * reintroduce.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  renderFlow,
  captureSpecs,
  featureStatuses,
  indexRoutes,
  staleFlows,
  drift,
  loadSources,
  specFiles,
  SPEC_DIR,
  FLOW_DIR,
} from './generate-e2e-flows.mjs';

const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const dim = (text) => `\x1b[2m${text}\x1b[0m`;

/** Deep-enough copy for a spec: plain JSON in, plain JSON out. */
const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * A source set with one extra colour whose English name CONTAINS another's.
 *
 * The decoy for the uniqueness rule. An empty corpus would prove nothing — the rule is about
 * two rows matching one selector, so the fixture has to contain the collision
 * [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
 */
function withColliding(sources, text) {
  const entries = new Map(sources.entries);
  entries.set('decoy-colour', {
    slug: 'decoy-colour',
    name: { en: `Late ${text}`, kana: 'おとり', kanji: '囮', romaji: 'otori' },
  });
  return { ...sources, entries };
}

async function prove() {
  const sources = await loadSources();
  const files = specFiles();
  if (files.length === 0) throw new Error('no journey spec to mutate — nothing to prove');

  const file = files[0];
  const spec = JSON.parse(readFileSync(join(SPEC_DIR, file), 'utf8'));

  console.log('\nIrodora — the journey generator, mutated\n');

  let failures = 0;
  const check = (label, condition, detail) => {
    if (condition) console.log(`  ${green('✓')} ${label}`);
    else {
      failures += 1;
      console.log(`  ${red('✗')} ${label}`);
      if (detail !== undefined) console.log(`    ${detail}`);
    }
  };

  // 1. THE SUBJECT RUNS. Everything below is meaningless without this line.
  const real = renderFlow(spec, sources);
  check(
    'the real spec renders — the harness can evaluate its subject',
    real.problems === undefined && typeof real.text === 'string',
    real.problems?.join('; '),
  );
  if (real.problems !== undefined) {
    console.log(
      `\n  ${red('The unmutated spec does not render. No mutation below means anything.')}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const refuses = (label, mutate, expect) => {
    const mutated = clone(spec);
    const usedSources = mutate(mutated) ?? sources;
    const result = renderFlow(mutated, usedSources);
    const problems = result.problems ?? [];
    check(
      label,
      problems.some((problem) => problem.includes(expect)),
      problems.length === 0 ? 'RENDERED ANYWAY — the mutation was not caught' : problems.join('; '),
    );
  };

  const firstWith = (predicate) => spec.steps.findIndex(predicate);
  const keyStep = firstWith((step) => typeof step.key === 'string');
  const colourStep = firstWith((step) => typeof step.colour === 'string');
  const routeStep = firstWith((step) => typeof step.route === 'string');

  refuses(
    'a message key the catalogue does not define',
    (mutated) => {
      mutated.steps[keyStep].key = 'atlas.titel';
    },
    'is not in the catalogue',
  );

  refuses(
    'a colour the corpus does not publish',
    (mutated) => {
      mutated.steps[colourStep].colour = 'aki-batakee';
    },
    'is not in corpus',
  );

  refuses(
    'a route that is not a file under apps/mobile/app',
    (mutated) => {
      mutated.steps[routeStep].route = 'atlas/indx.tsx';
    },
    'is not a file under apps/mobile/app',
  );

  refuses(
    'a step verb the vocabulary does not contain',
    (mutated) => {
      mutated.steps[0].do = 'swipe';
    },
    'is not a step',
  );

  refuses(
    'a step naming both a key and a colour',
    (mutated) => {
      mutated.steps[colourStep].key = 'atlas.title';
    },
    'exactly one of',
  );

  refuses(
    'a name field the entry does not have',
    (mutated) => {
      mutated.steps[colourStep].field = 'french';
    },
    '"field" must be one of',
  );

  // The decoy: a second colour whose name CONTAINS the selected one, so one selector matches
  // two rows. The mutation is to the sources, not to the spec — the spec is already correct
  // and stays correct; what changes is the world it resolves against.
  {
    const step = spec.steps[colourStep];
    const text = sources.entries.get(step.colour).name[step.field ?? 'en'];
    const result = renderFlow(spec, withColliding(sources, text));
    const problems = result.problems ?? [];
    check(
      'a colour whose name appears inside another colour’s — two rows would match',
      problems.some((problem) => problem.includes('Two rows would match')),
      problems.length === 0
        ? 'RENDERED ANYWAY — the ambiguity was not caught'
        : problems.join('; '),
    );
  }

  // A catalogue string with a line break in it. Single-quoted YAML cannot carry one, and the
  // generator refuses rather than flattening it — so the refusal is watched here too. The
  // mutation is to the CATALOGUE, because that is where such a string would really come from.
  {
    const step = spec.steps[keyStep];
    const messages = { ...sources.messages, [step.key]: 'Colour\nAtlas' };
    const result = renderFlow(spec, { ...sources, messages });
    const problems = result.problems ?? [];
    check(
      'a message whose text contains a line break',
      problems.some((problem) => problem.includes('control character or a line break')),
      problems.length === 0
        ? 'RENDERED ANYWAY — a line break would have gone into a single-quoted scalar'
        : problems.join('; '),
    );
  }

  // A message key whose text also appears in ANOTHER key, on a step that TAPS. The decoy is
  // a second catalogue entry rather than an absence, and it is applied to a tap step only —
  // which is also what proves the asymmetry is deliberate rather than an oversight.
  {
    const tapStep = spec.steps.findIndex(
      (step) => step.do === 'tap' && typeof step.key === 'string',
    );
    const step = spec.steps[tapStep];
    const messages = { ...sources.messages, 'decoy.key': `Now ${sources.messages[step.key]}` };
    const problems = renderFlow(spec, { ...sources, messages }).problems ?? [];
    check(
      'a TAP on a message whose text appears in another key — two elements would match',
      problems.some((problem) => problem.includes('a tap must not choose')),
      problems.length === 0
        ? 'RENDERED ANYWAY — the tap would have chosen between two elements'
        : problems.join('; '),
    );

    // …and the same collision on an assertVisible is ALLOWED. An assertion that two elements
    // satisfy is still true; refusing it would be over-strictness, and an over-strict rule is
    // one somebody eventually weakens. Asserted so the exemption cannot rot into a bug.
    const assertStep = spec.steps.find(
      (candidate) => candidate.do === 'assertVisible' && typeof candidate.key === 'string',
    );
    const assertMessages = {
      ...sources.messages,
      'decoy.key': `Now ${sources.messages[assertStep.key]}`,
    };
    check(
      'the same collision on an assertVisible is allowed, deliberately',
      renderFlow(spec, { ...sources, messages: assertMessages }).problems === undefined,
      'an assertion that two elements satisfy was refused — the rule is now over-strict',
    );
  }

  // A spec that declares no route at all loses the E-055 guard without a line turning red.
  {
    const routeless = clone(spec);
    for (const step of routeless.steps) delete step.route;
    const problems = renderFlow(routeless, sources).problems ?? [];
    check(
      'a spec where no step declares a route',
      problems.some((problem) => problem.includes('no step declares a "route"')),
      problems.length === 0
        ? 'RENDERED ANYWAY — the journey would be unguarded against a renamed route'
        : problems.join('; '),
    );
  }

  /*
   * THE CAPTURE VOCABULARY (F-221, ADR-0134). A capture flow, as the fidelity run writes one: it
   * must render each step to what the runner expects, and refuse each way a capture goes wrong.
   */
  {
    const slug = spec.steps[colourStep].colour;
    const capture = {
      name: 'capture-probe',
      title: 'A capture, as the fidelity run writes one',
      why: 'F-221',
      locale: 'ja',
      steps: [
        { do: 'launch', clearState: false },
        { do: 'openRoute', route: '(tabs)/atlas/[slug].tsx', params: { slug: { colour: slug } } },
        { do: 'assertVisible', key: 'detail.provenance' },
        { do: 'settle' },
        { do: 'screenshot' },
      ],
    };
    const origin = { origin: 'apps/mobile/e2e/capture/routes.json' };
    const rendered = renderFlow(capture, sources, origin);
    const text = rendered.text ?? '';
    // The Japanese words, escaped as the generator escapes any selector (Maestro reads a regex).
    const ja = sources.catalogues.ja['detail.provenance'].replace(
      /[\\^$.|?*+()[\]{}]/g,
      (character) => `\\${character}`,
    );
    check('a capture flow renders', rendered.problems === undefined, rendered.problems?.join('; '));
    check(
      'it launches without clearing: the runner has cleared the app, under consent',
      text.includes('- launchApp:\n    clearState: false'),
    );
    check(
      'it opens the route as a deep link, the parameter filled by the published colour',
      text.includes(`- openLink: '${sources.scheme}://atlas/${slug}'`),
    );
    check(
      'it selects in the Japanese catalogue, not the English one',
      text.includes(`- assertVisible: '${ja}'`) && text.includes('the Japanese catalogue'),
    );
    check(
      'it settles, then takes its one capture',
      text.includes('- waitForAnimationToEnd\n- takeScreenshot: capture'),
    );
    check(
      'its header names the spec it came from',
      text.includes('# GENERATED from apps/mobile/e2e/capture/routes.json'),
    );

    const refusesCapture = (label, mutate, expect, usedSources = sources) => {
      const mutated = clone(capture);
      mutate(mutated);
      const problems = renderFlow(mutated, usedSources, origin).problems ?? [];
      check(
        label,
        problems.some((problem) => problem.includes(expect)),
        problems.length === 0
          ? 'RENDERED ANYWAY — the mutation was not caught'
          : problems.join('; '),
      );
    };
    const open = (mutated) => mutated.steps[1];
    refusesCapture(
      'a link whose parameter names an unpublished colour',
      (m) => {
        open(m).params.slug.colour = `${slug}-nowhere`;
      },
      'is not in corpus',
    );
    refusesCapture(
      'a link to a route whose parameter is not given',
      (m) => {
        open(m).params = {};
      },
      'needs "slug"',
    );
    refusesCapture(
      'a link filled by an id, which only the running app can know',
      (m) => {
        open(m).params.slug = { id: 'g-1' };
      },
      'must name a published colour',
    );
    refusesCapture(
      'a link carrying a parameter the route does not have',
      (m) => {
        open(m).params.colourway = { colour: slug };
      },
      'has no parameter "colourway"',
    );
    refusesCapture(
      'a link to the root, which a flow reaches by launching',
      (m) => {
        open(m).route = '(tabs)/index.tsx';
        delete open(m).params;
      },
      'is the root',
    );
    refusesCapture(
      'a link to a layout, which is not a screen',
      (m) => {
        open(m).route = '(tabs)/_layout.tsx';
        delete open(m).params;
      },
      'is a layout or special file',
    );
    refusesCapture(
      'a locale with no catalogue',
      (m) => {
        m.locale = 'fr';
      },
      '"locale" must be one of',
    );
    refusesCapture(
      'a second capture in one flow',
      (m) => {
        m.steps.push({ do: 'screenshot' });
      },
      'at most one "screenshot"',
    );
    refusesCapture(
      'a clearState that is neither true nor false',
      (m) => {
        m.steps[0].clearState = 'no';
      },
      'must be true or false',
    );
    // The Japanese catalogue, not the English one, is what a ja spec resolves in: a key missing
    // from it alone is refused, though English still has it.
    const withoutJa = { ...sources.catalogues.ja };
    delete withoutJa['detail.provenance'];
    refusesCapture(
      'a key the Japanese catalogue lacks, in a Japanese flow',
      () => undefined,
      'is not in the catalogue',
      { ...sources, catalogues: { ...sources.catalogues, ja: withoutJa } },
    );
  }

  /*
   * THE CAPTURE SPEC (F-221). The real one first: every route the index names, each reachable
   * route rendering in both locales. Then each way the spec and the index could part.
   */
  {
    const captureSpec = JSON.parse(readFileSync(join(FLOW_DIR, 'capture', 'routes.json'), 'utf8'));
    const indexed = indexRoutes(
      JSON.parse(readFileSync(join(FLOW_DIR, '..', '..', '..', 'mockups', 'index.json'), 'utf8')),
    );
    const features = featureStatuses();
    const real = captureSpecs(captureSpec, indexed, features);
    const unrendered = real.specs.filter(
      ({ spec: one }) => renderFlow(one, sources).problems !== undefined,
    );
    check(
      'the real capture spec covers the index, and every reachable route renders in both locales',
      real.problems.length === 0 &&
        unrendered.length === 0 &&
        real.specs.length + real.unreachable.length * 2 === indexed.size * 2,
      [...real.problems, ...unrendered.map((u) => `${u.route} (${u.locale}) does not render`)].join(
        '; ',
      ),
    );

    const refusesSpec = (label, mutate, expect, index = indexed, owners = features) => {
      const mutated = clone(captureSpec);
      mutate(mutated);
      const { problems } = captureSpecs(mutated, index, owners);
      check(
        label,
        problems.some((problem) => problem.includes(expect)),
        problems.length === 0
          ? 'ACCEPTED ANYWAY — the mutation was not caught'
          : problems.join('; '),
      );
    };
    refusesSpec(
      'a route the index names, missing from the capture spec',
      (m) => {
        m.routes = m.routes.filter((r) => r.route !== '/atlas/compare');
      },
      'the mockup index names /atlas/compare, and the capture spec does not',
    );
    refusesSpec(
      'a route the capture spec names, which the index does not',
      () => undefined,
      'the capture spec names /atlas/compare, which the mockup index does not',
      new Set([...indexed].filter((route) => route !== '/atlas/compare')),
    );
    refusesSpec(
      'a file that is not the route it claims',
      (m) => {
        m.routes.find((r) => r.route === '/atlas/compare').file = '(tabs)/atlas/find.tsx';
      },
      'serves /atlas/find, not /atlas/compare',
    );
    refusesSpec(
      'a route named twice',
      (m) => {
        m.routes.push(clone(m.routes.find((r) => r.route === '/atlas')));
      },
      'named twice',
    );
    refusesSpec(
      'a route marked unreachable with no reason',
      (m) => {
        m.routes.find((r) => r.unreachable !== undefined).unreachable = '';
      },
      'says no reason why',
    );
    refusesSpec(
      'a route with neither an anchor nor a reason it cannot be reached',
      (m) => {
        delete m.routes.find((r) => r.route === '/atlas').anchor;
      },
      'needs an "anchor"',
    );

    // A route declared unreachable is a debt with an owner (F-221's review, B2).
    const declared = (m) => m.routes.find((r) => r.unreachable !== undefined);
    refusesSpec(
      'an unreachable route that names no feature owing its reach',
      (m) => {
        delete declared(m).owner;
      },
      'names no feature that owes its reach',
    );
    refusesSpec(
      'an unreachable route owed by something that is not a feature',
      (m) => {
        declared(m).owner = 'F-9999';
      },
      'which is not a feature',
    );
    {
      const owner = declared(captureSpec).owner;
      refusesSpec(
        'an unreachable route owed by a feature already done',
        () => undefined,
        `owed by ${owner}, which is done`,
        indexed,
        new Map([...features, [owner, 'done']]),
      );
    }

    // A flow left on disk for a route the spec no longer names (M7): the --check refusal's rule.
    check(
      'a capture flow no route produces is found stale, and the ones the spec produces are not',
      JSON.stringify(
        staleFlows(new Set(['a.yaml', 'b.yaml']), ['a.yaml', 'b.yaml', 'old.yaml']),
      ) === JSON.stringify(['old.yaml']),
    );
  }

  // The drift half, through `drift()` — the function the `--check` mode itself calls. A proof
  // that compared two strings of its own would be asserting that `!==` works.
  {
    // Read from DISK. The first draft passed `real.text` — freshly regenerated — and called
    // the result "the committed flow", which was a claim about a file it never opened.
    const committed = readFileSync(join(FLOW_DIR, `${spec.name}.yaml`), 'utf8');
    check(
      'the flow committed to disk, unedited, reads as up to date',
      drift(spec, sources, committed).verdict === 'up to date',
      'the committed flow is not what the sources produce — regenerate it',
    );
    check(
      'ONE edited word in the committed flow reads as drifted',
      drift(spec, sources, committed.replace('assertVisible', 'assertNotVisible')).verdict ===
        'drifted',
      'an edited flow passed the comparison the gate makes',
    );
    check(
      'a spec whose flow was never generated reads as missing',
      drift(spec, sources, null).verdict === 'missing',
      'a spec with no flow at all was not noticed',
    );
  }

  console.log(
    failures === 0
      ? `\n${green('Proven.')} ${dim('Each refusal was watched refusing, and the real spec rendered first.')}\n`
      : `\n${red(`${String(failures)} of the generator’s refusals did not happen.`)}\n`,
  );
  if (failures > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await prove();
