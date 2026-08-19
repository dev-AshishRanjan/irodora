/**
 * What the `contrast` and `cvd` gates actually compute.
 *
 * Kept here rather than in the gate script so that the gate and the tests run the *same*
 * code. A gate script with its own copy of the rules is a second implementation of the
 * thing being checked, and the two versions diverge in the direction that makes the build
 * green.
 *
 * Every number is the engine's: `wcagContrast` and `apcaLc` from `@irodora/color-difference`,
 * `separationScore` from `@irodora/cvd-engine`. `separationScore` in particular is the
 * **same definition the recommendation engine ranks with** (E-005) — the design system is
 * held to the standard the product applies to outfits, and that is only true if it is
 * literally the same function.
 */

import { apcaLc, wcagContrast } from '@irodora/color-difference';
import {
  hasDichromacySupport,
  MACHADO_STEP,
  MACHADO_STEPS,
  SEPARATION_DELTA_E_CEILING,
  SEPARATION_LIGHTNESS_CEILING,
  SEPARATION_LIGHTNESS_WEIGHT,
  separationScore,
  simulateDichromacy,
  type Deficiency,
} from '@irodora/cvd-engine';
import { deltaE00 } from '@irodora/color-difference';
import { srgbToXyz, xyzToLab, type Rgb } from '@irodora/color-spaces';
import { resolveAll } from './derive.js';
import { THEMES, type ColorToken, type Manifest, type Theme, type Usage } from './manifest.js';

/** The deficiencies every semantic pair is checked against. */
export const DEFICIENCIES: readonly Deficiency[] = ['protan', 'deutan', 'tritan'];

/**
 * Every severity the check evaluates — **not just 1.0.**
 *
 * The obvious economy is to test the endpoint only, on the reasoning that a pair surviving
 * total deficiency survives every milder one. **That is false, and measurably so.** Machado's
 * tabulated matrices are not monotone in severity — the tritan table reverses direction
 * around 0.5–0.6 — and `light: status.warn / status.bad` under tritan scores **64.0 at
 * severity 0.90** against **67.1 at 1.0**. Nothing currently drops below the minimum, but the
 * *reason* for testing one point did not hold, so a future nudge would have slipped through
 * a check that looked thorough.
 *
 * These are Machado's own tabulated points, so no interpolation is involved in the ones that
 * matter most.
 */
export const CVD_SEVERITIES: readonly number[] = Array.from(
  { length: MACHADO_STEPS },
  (_, i) => i * MACHADO_STEP,
);

/** Severity 1.0 — total deficiency. Kept as a name because the manifest note refers to it. */
export const CVD_SEVERITY = 1;

export interface PairingResult {
  readonly theme: Theme;
  readonly foreground: string;
  readonly background: string;
  /** Which side's `usage` selected the requirement. */
  readonly governedBy: string;
  readonly usage: Usage;
  readonly required: number;
  readonly wcag: number;
  /** Reported, never substituted for WCAG (ADR-0021). Negative means light-on-dark. */
  readonly apca: number;
  readonly passes: boolean;
}

export interface SeparationResult {
  readonly theme: Theme;
  readonly a: string;
  readonly b: string;
  readonly deficiency: Deficiency;
  /** The WORST score across both models, every tabulated severity, and every ground. */
  readonly score: number;
  readonly required: number;
  /** Which model produced the worst score — `machado` or `vienot`. */
  readonly model: string;
  /** The severity at which it occurred. Not always 1.0; Machado is not monotone. */
  readonly severity: number;
  readonly passes: boolean;
}

/**
 * The separation score under Viénot 1999 total dichromacy.
 *
 * `separationScore` hard-codes the Machado path, so the same formula is reapplied here over
 * `simulateDichromacy` output. **The formula is not re-derived** — it reads the engine's own
 * exported constants, so a change to the weights in F-029 moves both callers together. If
 * `separationDetail` ever grows a model parameter, this collapses into a call to it.
 */
function dichromatSeparation(a: Rgb, b: Rgb, deficiency: Deficiency): number {
  const la = xyzToLab(srgbToXyz(simulateDichromacy(a, deficiency)));
  const lb = xyzToLab(srgbToXyz(simulateDichromacy(b, deficiency)));
  const difference = Math.min(1, deltaE00(la, lb) / SEPARATION_DELTA_E_CEILING);
  const lightness = Math.min(1, Math.abs(la[0] - lb[0]) / SEPARATION_LIGHTNESS_CEILING);
  return (
    Math.max(
      difference,
      lightness * SEPARATION_LIGHTNESS_WEIGHT + difference * (1 - SEPARATION_LIGHTNESS_WEIGHT),
    ) * 100
  );
}

export interface Finding {
  readonly check: string;
  readonly detail: string;
}

/**
 * A pairing's requirement is the **stricter** of the two tokens' usages.
 *
 * `pairsWith` does not say which side is the foreground — `background` lists its text
 * tokens, while `ring` lists the surfaces it sits on — and WCAG's ratio is symmetric, so the
 * direction is only needed to pick a threshold. Taking the stricter side is direction-free
 * and cannot be gamed by declaring the pairing from the other end.
 */
export function requirementFor(
  manifest: Manifest,
  a: { name: string; token: ColorToken },
  b: { name: string; token: ColorToken },
): { required: number; governedBy: string; usage: Usage } | null {
  const { normalText, largeText, nonText } = manifest.gate.contrast;
  const threshold: Record<Usage, number | null> = {
    text: normalText,
    largeText,
    nonText,
    surface: null,
  };
  const ta = threshold[a.token.usage];
  const tb = threshold[b.token.usage];

  if (tb === null) {
    // Two surfaces impose nothing on each other. The caller reports that as a finding
    // rather than skipping it: a declared pairing that requires nothing reads as checked.
    if (ta === null) return null;
    return { required: ta, governedBy: a.name, usage: a.token.usage };
  }
  if (ta === null) return { required: tb, governedBy: b.name, usage: b.token.usage };
  return ta >= tb
    ? { required: ta, governedBy: a.name, usage: a.token.usage }
    : { required: tb, governedBy: b.name, usage: b.token.usage };
}

/** Every declared pairing, in both themes, with its WCAG ratio and its APCA Lc. */
export function checkContrast(manifest: Manifest): {
  results: readonly PairingResult[];
  findings: readonly Finding[];
} {
  const results: PairingResult[] = [];
  const findings: Finding[] = [];

  for (const theme of THEMES) {
    const tokens = manifest.color[theme];
    const lookup = (name: string): ColorToken => {
      const t = tokens[name];
      if (t === undefined) throw new Error(`${theme}.${name} is not a token`);
      return t;
    };

    for (const [name, token] of Object.entries(tokens)) {
      for (const otherName of token.pairsWith) {
        const other = lookup(otherName);
        const requirement = requirementFor(
          manifest,
          { name, token },
          { name: otherName, token: other },
        );
        if (requirement === null) {
          findings.push({
            check: 'pairing',
            detail:
              `${theme}: ${name} / ${otherName} — both sides are surfaces, so the pairing ` +
              'requires nothing. A declaration that asserts nothing is worse than no ' +
              'declaration: it reads as checked.',
          });
          continue;
        }

        // A translucent token has one appearance per ground it may sit on. The pairing is
        // judged on the WORST of them: a hairline that is legible on white and invisible on
        // a meter track has not met the requirement, and reporting the white case would be
        // reporting the case nobody has a problem with.
        let worst: { wcag: number; apca: number } | null = null;
        for (const a of resolveAll(name, token, lookup))
          for (const b of resolveAll(otherName, other, lookup)) {
            const wcag = wcagContrast(a.rgb, b.rgb);
            if (worst !== null && wcag >= worst.wcag) continue;
            // APCA is directional, and apcaLc takes the BACKGROUND first — the argument
            // order is part of what makes it directional, and swapping it silently reports
            // the reverse polarity.
            const [text, background] =
              requirement.governedBy === name ? [a.rgb, b.rgb] : [b.rgb, a.rgb];
            worst = { wcag, apca: apcaLc(background, text) };
          }
        if (worst === null) continue;

        results.push({
          theme,
          foreground: requirement.governedBy === name ? name : otherName,
          background: requirement.governedBy === name ? otherName : name,
          governedBy: requirement.governedBy,
          usage: requirement.usage,
          required: requirement.required,
          wcag: worst.wcag,
          apca: worst.apca,
          passes: worst.wcag >= requirement.required,
        });
      }
    }
  }

  return { results, findings };
}

/** Every `cvdPairs` entry × every deficiency, in both themes, at severity 1.0. */
export function checkSeparation(manifest: Manifest): readonly SeparationResult[] {
  const required = manifest.cvdPairs.minSeparation;
  const results: SeparationResult[] = [];

  for (const theme of THEMES) {
    const tokens = manifest.color[theme];
    const lookup = (name: string): ColorToken => {
      const t = tokens[name];
      if (t === undefined) throw new Error(`${theme}.${name} is not a token`);
      return t;
    };

    for (const [a, b] of manifest.cvdPairs.pairs) {
      const appearancesA = resolveAll(a, lookup(a), lookup);
      const appearancesB = resolveAll(b, lookup(b), lookup);
      for (const deficiency of DEFICIENCIES) {
        let score = Infinity;
        let model = 'machado';
        let severity = CVD_SEVERITY;
        for (const ra of appearancesA)
          for (const rb of appearancesB) {
            // Worst ground: a pair that separates on one surface and collapses on another is
            // a pair that collapses.
            for (const s of CVD_SEVERITIES) {
              const v = separationScore(ra.rgb, rb.rgb, deficiency, s);
              if (v < score) {
                score = v;
                model = 'machado';
                severity = s;
              }
            }
            // And the OTHER model. `color-engine.md` §7 assigns total dichromacy to
            // Brettel-Vienot and anomalous trichromacy to Machado, so "separable at severity
            // 1.0" evaluated only through Machado's extrapolation to its endpoint is a claim
            // about the wrong model. Vienot disagrees by up to 5.6 points on this palette.
            // Tritan is Machado-only: Vienot's single-plane simplification is not accurate
            // for it and `simulateDichromacy` throws rather than return a plausible wrong
            // answer (F-008).
            if (hasDichromacySupport(deficiency)) {
              const v = dichromatSeparation(ra.rgb, rb.rgb, deficiency);
              if (v < score) {
                score = v;
                model = 'vienot';
                severity = 1;
              }
            }
          }
        results.push({
          theme,
          a,
          b,
          deficiency,
          score,
          required,
          model,
          severity,
          passes: score >= required,
        });
      }
    }
  }

  return results;
}

/**
 * Chroma ceiling: a `surface`, `text` or `largeText` token above the ceiling needs an entry
 * in `exceptions`.
 *
 * The rule is applied **literally**, and the exceptions are recorded in the manifest rather
 * than written into this function's scope. An exception list is visible, reviewable and
 * countable; a carve-out in a checker's source is none of those.
 */
export function checkChromaCeiling(manifest: Manifest): readonly Finding[] {
  const ceiling = manifest.gate.contrast.chromaCeiling.maxChroma;
  const excepted = new Set(manifest.exceptions.map((e) => e.token));
  const findings: Finding[] = [];

  for (const theme of THEMES)
    for (const [name, token] of Object.entries(manifest.color[theme])) {
      if (token.oklch.c <= ceiling || excepted.has(name)) continue;
      findings.push({
        check: 'chromaCeiling',
        detail:
          `${theme}.${name} has chroma ${String(token.oklch.c)}, above the ${String(ceiling)} ` +
          `ceiling for ` +
          'a surface or text token, and no entry in `exceptions`. Reduce the chroma, or ' +
          'record the exception with a reason and an owner.',
      });
    }

  // An exception nobody needs is an exception nobody will remove. Counting them only means
  // something if the count is real.
  for (const exception of manifest.exceptions) {
    const needed = THEMES.some((theme) => {
      const token = manifest.color[theme][exception.token];
      return token !== undefined && token.oklch.c > ceiling;
    });
    if (!needed)
      findings.push({
        check: 'chromaCeiling',
        detail:
          `exceptions: "${exception.token}" no longer exceeds the ceiling in either theme. ` +
          'Remove the exception — a stale one makes the count meaningless.',
      });
  }

  return findings;
}

/**
 * Structural checks that need no colour maths.
 *
 * Kept apart from the contrast results because they answer a different question: not "is
 * this pairing legible" but "does the manifest still say what it claims to say".
 */
/**
 * The salience rank holds in every theme (F-067, NFR-8, [ADR-0053]).
 *
 * ## Why this is a check and not a comment
 *
 * The approved system held the rank of OKLCh **L** constant across the two themes. The two
 * grounds have **opposite polarity** — against a light ground contrast rises as L falls,
 * against a dark ground it rises as L climbs — so L rank does not survive the flip. Measured,
 * light ranked `bad 93.5 > warn 78.6 > ok 77.8` while dark ranked `warn 62.5 > ok 58.6 >
 * bad 41.0`. A person toggling the theme got an inverted status hierarchy, and nothing in the
 * build had an opinion about it.
 *
 * > The invariant that makes two themes one system is the rank of CONTRAST against own ground,
 * > not the rank of lightness.
 *
 * ## Why the rank is READ rather than derived
 *
 * `manifest.salience.rank` is compared against the measured order. Deriving the expected rank
 * from the values would make this tautological — it could never disagree with them, which is
 * exactly the state the defect shipped in.
 *
 * Ties are a failure, not a pass. Two states equally loud is not a hierarchy, and it is the
 * shape a rank drifts through on its way to inverting.
 */
export function checkSalience(manifest: Manifest): readonly Finding[] {
  const findings: Finding[] = [];
  const declared = manifest.salience.rank;

  for (const theme of THEMES) {
    const tokens = manifest.color[theme];
    const lookup = (base: string): ColorToken => {
      const t = tokens[base];
      if (t === undefined) throw new Error(`${theme}.${base} is not a token`);
      return t;
    };

    const groundToken = tokens['background'];
    if (groundToken === undefined) {
      findings.push({
        check: 'salience',
        detail: `${theme} has no \`background\` token, so salience cannot be measured against its own ground.`,
      });
      continue;
    }
    const grounds = resolveAll('background', groundToken, lookup);

    const measured: { name: string; lc: number }[] = [];
    let missing = false;
    for (const name of declared) {
      const token = tokens[name];
      if (token === undefined) {
        findings.push({
          check: 'salience',
          detail: `${theme}.${name} is named in \`salience.rank\` but is not a token in this theme.`,
        });
        missing = true;
        continue;
      }
      // Worst appearance, for the same reason checkContrast takes it: a token that is loud
      // over one ground and quiet over another has not established a rank.
      let lc = Infinity;
      for (const g of grounds)
        for (const a of resolveAll(name, token, lookup))
          lc = Math.min(lc, Math.abs(apcaLc(g.rgb, a.rgb)));
      measured.push({ name, lc });
    }
    if (missing) continue;

    // Pairwise over adjacent entries. Destructuring the slice avoids a non-null assertion,
    // which the zone forbids: an assertion is a claim the compiler cannot check, and the
    // whole point of this check is that unchecked claims are how the rank inverted.
    for (const [louder, quieter] of measured.slice(0, -1).map((m, i) => [m, measured[i + 1]])) {
      if (louder === undefined || quieter === undefined) continue;
      if (louder.lc > quieter.lc) continue;
      findings.push({
        check: 'salience',
        detail:
          `${theme}: \`salience.rank\` says ${louder.name} is louder than ${quieter.name}, but ` +
          `measured against ${theme}.background they are ${louder.lc.toFixed(1)} and ` +
          `${quieter.lc.toFixed(1)} APCA Lc. ` +
          (louder.lc === quieter.lc
            ? 'Equal is a failure: two states equally loud is not a hierarchy, and it is the shape a rank drifts through on its way to inverting.'
            : 'The rank is inverted here.') +
          ' A rank that differs between themes means a person toggling the theme is told a' +
          ' different thing is urgent (ADR-0053).',
      });
    }
  }

  return findings;
}

export function checkStructure(manifest: Manifest): readonly Finding[] {
  const findings: Finding[] = [];

  // NFR-9. parseManifest already refuses a missing icon or `textRequired: false`; this
  // catches the subtler version — a status colour token with no pairing at all, which is a
  // colour-only status arrived at by deleting a line somewhere else.
  const paired = new Set(Object.values(manifest.statusPairing).map((e) => e.colorToken));
  for (const theme of THEMES)
    for (const name of Object.keys(manifest.color[theme]))
      if (name.startsWith('status.') && !paired.has(name))
        findings.push({
          check: 'statusPairing',
          detail:
            `${theme}.${name} is a status colour with no entry in \`statusPairing\`, so ` +
            'nothing requires an icon or a text label beside it (NFR-9).',
        });

  // A `largeText` token must never be declared as normal text. The component-level half of
  // this — catching a 13 px label that uses it — needs components, and lands with F-017.
  for (const theme of THEMES)
    for (const [name, token] of Object.entries(manifest.color[theme]))
      if (token.usage === 'largeText' && token.pairsWith.length > 0)
        findings.push({
          check: 'largeText',
          detail:
            `${theme}.${name} is largeText but declares its own pairings. A largeText token ` +
            'is listed by the surfaces that carry it, so the surface stays the thing that ' +
            'decides where it may appear.',
        });

  // COVERAGE. Gate scope is driven by `pairsWith`, so a token that appears in nobody's list
  // and declares none of its own is checked by nothing at all — and in the gate's output it
  // is indistinguishable from a token that passed. That is the same silent-failure shape the
  // status check above guards against, one level up.
  //
  // The remedy is not to invent pairings. It is to make "deliberately unchecked" a
  // DECLARATION: `uncheckedReason` says why, in the file, where a reviewer sees it.
  for (const theme of THEMES) {
    const tokens = manifest.color[theme];
    const covered = new Set<string>();
    for (const [name, token] of Object.entries(tokens))
      for (const other of token.pairsWith) {
        covered.add(name);
        covered.add(other);
      }
    for (const [name, token] of Object.entries(tokens)) {
      if (covered.has(name)) continue;
      if (token.uncheckedReason !== undefined) continue;
      findings.push({
        check: 'coverage',
        detail:
          `${theme}.${name} appears in no pairing, in either direction, so the contrast gate ` +
          'checks nothing about it — and says nothing, which reads as a pass. Declare a ' +
          'pairing, or record `uncheckedReason` saying why it cannot be checked here.',
      });
    }
    // An `uncheckedReason` on a token that IS covered is a stale exemption, and a stale
    // exemption is how a real check gets quietly skipped later.
    for (const [name, token] of Object.entries(tokens))
      if (covered.has(name) && token.uncheckedReason !== undefined)
        findings.push({
          check: 'coverage',
          detail:
            `${theme}.${name} carries an uncheckedReason but IS covered by a declared ` +
            'pairing. Remove the reason — it exempts nothing and will outlive the fact.',
        });
  }

  return findings;
}
