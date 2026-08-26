/**
 * The published rule set, verified, as the app reads it.
 *
 * ## Why the app carries this at all
 *
 * The warm/cool **poles** live in the published weight set, and until F-099 the app carried its
 * own copy of them — `WARM_HUE = 60`, `COOL_HUE = 240`, beside a second implementation of the
 * bias function itself. Two definitions of one colour rule is
 * [E-008](../../../.harness/state/effects.json)'s failure exactly: both sides pass their own
 * tests, and they diverge silently the first time an editor publishes a new pole. The engine's
 * poles are a rule-set field and will be versioned as content; the app's were literals, so the
 * drift had a **known direction** before it happened.
 *
 * ## The digest comes from the ledger, never from the file
 *
 * The same arrangement as [`finder.ts`](./finder.ts)'s `lexicon()`, and for the same reason: the
 * **text** comes from the generated module and the **expected digest** comes from the ledger —
 * two exports that came from two files, which is the only arrangement in which comparing them
 * means anything (ADR-0046, ADR-0066). A record checked against a checksum it carries verifies
 * itself and nothing else.
 *
 * A mismatch throws and caches nothing, so a later call retries rather than handing back
 * something nobody checked.
 *
 * ## Nothing here parses
 *
 * `parseWeightContent` is the engine's, and it wraps `parseRuleSet` — the function that enforces
 * the weights summing to 1. A reader written here would agree with the file on the day it was
 * written and never again
 * [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].
 */

import { parseWeightContent, ruleSetFor, type RuleSet } from '@irodora/recommendation';
import { canonicalize } from '@irodora/corpus';
import { sha256 } from './corpus';
import {
  WEIGHTS_DIGEST,
  WEIGHTS_LABEL,
  WEIGHTS_RATIONALE_COUNT,
  WEIGHTS_TEXT,
} from './rules/generated/weights';

/**
 * The occasion the app reads.
 *
 * `default` and only `default`, because nothing in the app asks a question that varies by
 * occasion yet. Naming it here rather than threading it through means the day something does,
 * the change is visible as a change rather than as a parameter that was always there.
 */
const OCCASION = 'default' as const;

let cached: RuleSet | null = null;

/**
 * The published rule set, digest-verified.
 *
 * Built once. The poles, the falloff and the four weights all come from the same file the
 * engine scores with, so a photo estimate and the score the engine gives that colour cannot
 * disagree about what "warm" means.
 */
export function ruleSet(): RuleSet {
  if (cached !== null) return cached;

  const actual = sha256(canonicalize(JSON.parse(WEIGHTS_TEXT)));
  if (actual !== WEIGHTS_DIGEST)
    throw new Error(
      `weights: digest ${actual} does not match the ledger's ${WEIGHTS_DIGEST}. Published rule ` +
        'content is immutable, so there is no benign explanation for this.',
    );

  const content = parseWeightContent(JSON.parse(WEIGHTS_TEXT), `weights.${WEIGHTS_LABEL}.json`);

  /*
   * The count is checked as well as the digest, and they catch different things. The digest
   * catches an edited file; this catches the generated module and the ledger row having come
   * from two different generations — the module would then verify perfectly against its own
   * stale digest.
   */
  const rationales = content.occasions.reduce((n, o) => n + o.factors.length, 0);
  const outfit = content.outfit === null ? 0 : Object.keys(content.outfit).length;
  if (rationales + outfit !== WEIGHTS_RATIONALE_COUNT)
    throw new Error(
      `weights: the generated module records ${String(WEIGHTS_RATIONALE_COUNT)} rationale(s) ` +
        `and the file carries ${String(rationales + outfit)}. The two came from different ` +
        'generations — run `node scripts/generate-rules-bundle.mjs`.',
    );

  cached = ruleSetFor(content, OCCASION);
  return cached;
}
