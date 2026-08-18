/**
 * The classification rules — FR-23, and the one that keeps the corpus honest.
 *
 * The `historical` cases carry most of the weight. Each asserts a *specific* rejection, not
 * merely that something threw: `checkClassification` has three failure modes and a test that
 * only asserts `.toThrow()` would pass if all three collapsed into one.
 */

import { describe, expect, it } from 'vitest';
import {
  checkClassification,
  CLASSIFICATIONS,
  CorpusError,
  isClassification,
  isOurOwnCuration,
  isSourceType,
  OUR_OWN_CURATION,
  SOURCE_TYPES,
  type ClassificationEvidence,
} from '../src/index.js';

const attested: ClassificationEvidence = {
  classification: 'historical',
  sourceType: 'publication',
  publishedYear: 1908,
};

describe('the five classifications', () => {
  it('is exactly the set FR-23 names, in the spec order', () => {
    expect(CLASSIFICATIONS).toEqual([
      'historical',
      'traditional',
      'modern-japanese',
      'japanese-inspired',
      'editorial',
    ]);
  });

  it('rejects anything else, including plausible near-misses', () => {
    for (const near of ['Historical', 'traditional ', 'modern_japanese', 'inspired', ''])
      expect(isClassification(near)).toBe(false);
  });

  it('names our own curation as a subset of the five, not a second list', () => {
    for (const c of OUR_OWN_CURATION) expect(isClassification(c)).toBe(true);
    expect(OUR_OWN_CURATION).toEqual(['japanese-inspired', 'editorial']);
  });

  it('treats exactly the other three as claims about the world, not about our judgement', () => {
    // The previous version of this asserted `CLASSIFICATIONS.filter(isOurOwnCuration)` equals
    // OUR_OWN_CURATION — true by construction for ANY subset, since `isOurOwnCuration` is
    // `OUR_OWN_CURATION.includes`. It could not fail. This asserts the complement literally,
    // so adding a classification to one list and not the other goes red.
    expect(CLASSIFICATIONS.filter((c) => !isOurOwnCuration(c))).toEqual([
      'historical',
      'traditional',
      'modern-japanese',
    ]);
  });
});

describe('source types', () => {
  it('is the licensing §2 hierarchy', () => {
    expect(SOURCE_TYPES).toEqual([
      'measurement',
      'publication',
      'museum-record',
      'editorial',
      'standard',
    ]);
  });

  it('rejects a type that is not in the hierarchy', () => {
    expect(isSourceType('website')).toBe(false);
    expect(isSourceType('scraped')).toBe(false);
  });
});

describe('our own curation cannot be marked historical', () => {
  it('rejects an editorial source claiming history, and says why', () => {
    expect(() => {
      checkClassification(
        { classification: 'historical', sourceType: 'editorial', publishedYear: 2026 },
        'fixture-invented.json',
      );
    }).toThrow(/OUR OWN CURATION and cannot be classified "historical"/u);
  });

  it('reports it against `classification`, which is the field a reviewer must change', () => {
    try {
      checkClassification(
        { classification: 'historical', sourceType: 'editorial', publishedYear: 2026 },
        'fixture-invented.json',
      );
      expect.unreachable('an editorial source classified historical must be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(CorpusError);
      expect((error as CorpusError).path).toBe('classification');
      expect((error as CorpusError).source).toBe('fixture-invented.json');
    }
  });

  it('accepts the same entry once it is labelled as ours', () => {
    for (const classification of OUR_OWN_CURATION)
      expect(() => {
        checkClassification(
          { classification, sourceType: 'editorial', publishedYear: null },
          'fixture-invented.json',
        );
      }).not.toThrow();
  });

  it('also refuses "traditional" and "modern-japanese" for an editorial source', () => {
    // The quieter half of the same dishonesty, and the one the first version of this rule
    // allowed: `traditional` claims an established name in the received canon and
    // `modern-japanese` claims documented current practice. Neither is ours to assert from our
    // own judgement — ADR-0007 gives a positive list, not a single forbidden value.
    for (const classification of ['traditional', 'modern-japanese'] as const)
      expect(() => {
        checkClassification(
          { classification, sourceType: 'editorial', publishedYear: 1908 },
          'fixture-invented.json',
        );
      }).toThrow(/OUR OWN CURATION and cannot be classified/u);
  });
});

describe('a historical claim needs a dated primary source', () => {
  it('accepts a dated publication', () => {
    expect(() => {
      checkClassification(attested, 'fixture-attested.json');
    }).not.toThrow();
  });

  it('rejects the same entry with no year, and points at the year field', () => {
    try {
      checkClassification({ ...attested, publishedYear: null }, 'fixture-attested.json');
      expect.unreachable('a historical claim with no date must be rejected');
    } catch (error) {
      expect((error as CorpusError).path).toBe('provenance.publishedYear');
      expect((error as CorpusError).message).toMatch(/DATED primary source/u);
    }
  });

  it('offers the honest alternative rather than only refusing', () => {
    // A gate that says "no" without saying what the correct entry looks like gets worked
    // around. `traditional` is the classification that fits an undated canonical name.
    expect(() => {
      checkClassification({ ...attested, publishedYear: null }, 'x.json');
    }).toThrow(/classify this "traditional"/u);
  });

  it('accepts an undated source for every classification that is not historical', () => {
    for (const classification of CLASSIFICATIONS.filter((c) => c !== 'historical'))
      expect(() => {
        checkClassification(
          { classification, sourceType: 'publication', publishedYear: null },
          'x.json',
        );
      }).not.toThrow();
  });
});

describe('the source type behind a historical claim', () => {
  it('accepts measurement, publication, museum-record and standard', () => {
    for (const sourceType of ['measurement', 'publication', 'museum-record', 'standard'] as const)
      expect(() => {
        checkClassification({ ...attested, sourceType }, 'x.json');
      }).not.toThrow();
  });

  it('leaves editorial as the only excluded type — which is the mechanism', () => {
    const excluded = SOURCE_TYPES.filter((sourceType) => {
      try {
        checkClassification({ ...attested, sourceType }, 'x.json');
        return false;
      } catch {
        return true;
      }
    });
    expect(excluded).toEqual(['editorial']);
  });
});
