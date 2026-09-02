/**
 * Weather as a weighting context (FR-34, F-065).
 *
 * ## The criterion that shapes every case here
 *
 * > *Weather is an optional input; the recommendation is **unchanged and complete** without it.*
 *
 * "Unchanged" is a claim about bytes, not about approximation. F-046 established the standard
 * when it added preferences to `scoreOutfit`: *"absent means unchanged… the arithmetic is
 * identity rather than approximately identity. A test asserts that rather than trusting it."*
 * The same standard, as an acceptance criterion — so the first case below is the one that
 * matters, and the decoy beside it is what stops it passing for a function that ignores weather
 * altogether.
 *
 * ## Why weather weights the OUTFIT components and not the four colour factors
 *
 * `weights.2026.08.2.json`'s own provenance says an occasion is *"a different set of the same
 * numbers rather than a modifier applied afterwards"*. A weather multiplier over
 * `occasions[].factors` would make the published content contradict its own stated rule, so
 * weather owns the six outfit components instead — a different question, and no collision.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  outfitWeights,
  outfitWeightsFor,
  OUTFIT_WEIGHT_COMPONENTS,
  parseWeightContent,
  rationaleCount,
  RuleError,
  WEATHERS,
  type Weather,
} from '../src/index.js';

/**
 * The two published files, each as ONE `join` of string literals.
 *
 * `verify-cache-scope.mjs` resolves a `join` statically and **drops any segment that is not a
 * literal**, failing closed on what it cannot follow — which its own header states as a limit
 * rather than a guarantee. A helper taking the filename as a variable therefore resolved to the
 * DIRECTORY `content/rules`, and `turbo.json` lists `content/rules/**`, which covers the files
 * under it and not the directory itself. The scan was right: it could not tell that this suite
 * re-runs when the content changes.
 */
const CURRENT_FILE = join(
  __dirname,
  '..',
  '..',
  '..',
  'content',
  'rules',
  'weights.2026.08.3.json',
);
const PREVIOUS_FILE = join(
  __dirname,
  '..',
  '..',
  '..',
  'content',
  'rules',
  'weights.2026.08.2.json',
);

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

const current = () => parseWeightContent(read(CURRENT_FILE), 'weights.2026.08.3.json');
const previous = () => parseWeightContent(read(PREVIOUS_FILE), 'weights.2026.08.2.json');

describe('weather is optional, and absent means unchanged', () => {
  /*
   * THE CRITERION, ASSERTED DIRECTLY. Not "close to" and not "within a tolerance": the
   * no-weather path calls `outfitWeights` and does no arithmetic at all, so the guarantee is
   * structural rather than numerical.
   */
  it('returns exactly what outfitWeights returns when no weather is given', () => {
    const content = current();

    expect(outfitWeightsFor(content)).toEqual(outfitWeights(content));
  });

  it('and does so for a version that has no weather block at all', () => {
    const old = previous();

    expect(old.weather).toBeNull();
    expect(outfitWeightsFor(old)).toEqual(outfitWeights(old));
  });

  /*
   * THE DECOY. Without this, an implementation that ignored the weather argument entirely —
   * returning the default every time — would pass the two cases above perfectly.
   */
  it('DECOY — naming a weather DOES change the weights', () => {
    const content = current();

    expect(outfitWeightsFor(content, 'wet')).not.toEqual(outfitWeights(content));
  });
});

describe('the published weather profiles', () => {
  it('carries every weather the engine reads, each with all six components', () => {
    const content = current();

    for (const weather of WEATHERS) {
      const resolved = outfitWeightsFor(content, weather);
      expect(`${weather}: ${Object.keys(resolved).sort().join(',')}`).toBe(
        `${weather}: ${[...OUTFIT_WEIGHT_COMPONENTS].sort().join(',')}`,
      );
    }
  });

  it('sums to one in every weather, or an overall would leave [0,100]', () => {
    const content = current();

    for (const weather of WEATHERS) {
      const total = Object.values(outfitWeightsFor(content, weather)).reduce((n, w) => n + w, 0);
      expect(`${weather} sums to ${total.toFixed(9)}`).toBe(`${weather} sums to ${(1).toFixed(9)}`);
    }
  });

  /*
   * FR-34's own standard is "occasion changes ranking MEASURABLY", and the same bar applies to
   * a weather. Four profiles that differed in the third decimal would be decoration.
   */
  it('differs measurably between hot and cold', () => {
    const content = current();
    const hot = outfitWeightsFor(content, 'hot');
    const cold = outfitWeightsFor(content, 'cold');

    const biggest = Math.max(...OUTFIT_WEIGHT_COMPONENTS.map((c) => Math.abs(hot[c] - cold[c])));
    expect(biggest).toBeGreaterThanOrEqual(0.05);
  });

  it('publishes mild identical to the base outfit block, which is what makes the rest legible', () => {
    const content = current();

    expect(outfitWeightsFor(content, 'mild')).toEqual(outfitWeights(content));
  });

  /*
   * AN ACCESSIBILITY FLOOR, NOT A PREFERENCE. A weather profile that lowered CVD separation
   * would be this product weighting a person out of its own answer, and the content's
   * provenance commits to never doing it. Asserted so the commitment is checked.
   */
  it('never reduces cvdAccessibility in any weather', () => {
    const content = current();
    const base = outfitWeights(content).cvdAccessibility;

    for (const weather of WEATHERS)
      expect(`${weather}: ${String(outfitWeightsFor(content, weather).cvdAccessibility)}`).toBe(
        `${weather}: ${String(base)}`,
      );
  });

  it('carries a rationale on every weather weight, counted by the ledger', () => {
    const content = current();

    // 20 occasion factors + 6 outfit components + 4 weathers x 6 components.
    expect(rationaleCount(content)).toBe(50);
    expect(rationaleCount(previous())).toBe(26);
  });
});

describe('an unpublished weather is refused, never defaulted', () => {
  it('throws for a version with no weather block', () => {
    expect(() => outfitWeightsFor(previous(), 'wet')).toThrow(RuleError);
    expect(() => outfitWeightsFor(previous(), 'wet')).toThrow(/2026\.08\.2/u);
  });

  it('refuses a weather the content does not carry, at parse time', () => {
    const raw = read(CURRENT_FILE) as { weather: Record<string, unknown> };
    const broken = { ...raw, weather: { ...raw.weather, blizzard: raw.weather['cold'] } };

    expect(() => parseWeightContent(broken, 'broken.json')).toThrow(RuleError);
  });

  it('refuses a weather block that carries some weathers and not others', () => {
    const raw = read(CURRENT_FILE) as { weather: Record<string, unknown> };
    const partial = { ...raw, weather: { mild: raw.weather['mild'] } };

    expect(() => parseWeightContent(partial, 'partial.json')).toThrow(/missing/u);
  });

  it('refuses a weather weight with no rationale, like every other weight', () => {
    const raw = read(CURRENT_FILE) as {
      weather: Record<string, Record<string, { weight: number; rationale: string }>>;
    };
    const stripped = {
      ...raw,
      weather: {
        ...raw.weather,
        cold: { ...raw.weather['cold'], harmony: { weight: 0.33, rationale: '' } },
      },
    };

    expect(() => parseWeightContent(stripped, 'stripped.json')).toThrow(/rationale/u);
  });

  it('DECOY — the published file parses, so the refusals discriminate', () => {
    expect(() => current()).not.toThrow();
  });
});

describe('2026.08.3 supersedes 2026.08.2 and changes nothing that was in it', () => {
  /*
   * THE CLAIM THE PROVENANCE MAKES, CHECKED. "Supersedes and changes nothing" is a sentence
   * anybody can write into a file; this compares the two published versions field by field so
   * that a weight quietly edited during the publish fails here rather than reaching a device.
   */
  it('has byte-identical occasions, falloff, poles and outfit block', () => {
    const before = read(PREVIOUS_FILE) as Record<string, unknown>;
    const after = read(CURRENT_FILE) as Record<string, unknown>;

    for (const key of ['occasions', 'falloff', 'poles', 'outfit'])
      expect(`${key}: ${JSON.stringify(after[key])}`).toBe(
        `${key}: ${JSON.stringify(before[key])}`,
      );
  });

  it('changes only the version, the date, the provenance and the new block', () => {
    const before = read(PREVIOUS_FILE) as Record<string, unknown>;
    const after = read(CURRENT_FILE) as Record<string, unknown>;

    const changed = Object.keys(after).filter(
      (key) => JSON.stringify(after[key]) !== JSON.stringify(before[key]),
    );
    expect(changed.sort()).toEqual(['provenance', 'publishedAt', 'versionId', 'weather']);
  });

  it('names what it supersedes, so the chain is followable', () => {
    const after = read(CURRENT_FILE) as { versionId: string };
    expect(after.versionId).toBe('2026.08.3');
  });
});

describe('the weather names are the ones an editor wrote profiles for', () => {
  it('is four, and each is a state a person can state', () => {
    expect([...WEATHERS]).toEqual(['mild', 'hot', 'cold', 'wet'] satisfies Weather[]);
  });
});
