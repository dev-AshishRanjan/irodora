/**
 * The fifth target: HeroUI Native's theme, generated from the manifest.
 *
 * HeroUI requires 35 variables per theme and computes 29 more from them with
 * `color-mix(in oklab, …)`. This file supplies all 64 as literals, because two separate
 * arguments land on the same answer:
 *
 * 1. **A colour the stylesheet computes is a colour the `contrast` gate never measured.**
 *    Four of the 29 carry text — `Alert` tints its title with `--color-success-soft-foreground`
 *    — so they are checked here, and a failure refuses to emit
 *    ([ADR-0062](../../../../docs/adr/0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md)).
 * 2. **Uniwind's runtime `colorMix` is `culori.interpolate`.** Leaving the declaration intact
 *    would hand the arithmetic to a dependency, on the device, where nothing can check it
 *    ([ADR-0063](../../../../docs/adr/0063-culori-ships-in-the-app-bundle-and-the-generated-stylesheet-emits-hex-only.md)).
 *
 * **Everything here is hex.** No `oklch()`, no `color-mix()`, no `rgba()`. Uniwind normalises
 * every variable through `culori.parse` → `formatHex` on device, and a hex makes that an
 * identity rather than a second opinion about a conversion ADR-0043 makes ours.
 *
 * ## What this file does NOT do
 *
 * It does not invent contrast requirements. The hover and `-soft` background variants are
 * checked for gamut and nothing else, because WCAG asks nothing of a pressed-state fill and
 * asserting a threshold it does not require would be a gate agreeing with itself.
 */

import { mixOklab, toHex, toHex8, tokenRgb, type MixOperand } from '../derive.js';
import { THEMES, type ColorToken, type Manifest, type Theme } from '../manifest.js';
import { wcagContrast } from '@irodora/color-difference';

/**
 * HeroUI's 35 required theme variables, each resolved to a manifest token.
 *
 * `SHADOW` rather than a token because `elevation.shadow` is `"none"` — surfaces here lift by
 * tint, and a shadow tints what it surrounds, which is the one thing a colour product cannot
 * afford next to a sample.
 */
const SHADOW = Symbol('none');

const BASE: Readonly<Record<string, string | typeof SHADOW>> = {
  '--background': 'background',
  '--foreground': 'foreground',
  '--surface': 'surface.1',
  '--surface-foreground': 'foreground',
  '--surface-secondary': 'surface.2',
  '--surface-secondary-foreground': 'foreground',
  '--surface-tertiary': 'surface.3',
  '--surface-tertiary-foreground': 'foreground',
  // Popovers and dialogs sit at surface.2 — the manifest's own role note for that token
  // names "the confidence card, popovers", so this is the recorded intent rather than a pick.
  '--overlay': 'surface.2',
  '--overlay-foreground': 'foreground',
  '--backdrop': 'backdrop',
  '--muted': 'foreground.2',
  '--default': 'surface.2',
  '--default-foreground': 'foreground',
  // `accent` is HeroUI's primary fill, and ours is `inverse` — the same pairing the Button
  // already uses. It is NOT a chromatic accent; the chroma ceiling forbids one.
  '--accent': 'inverse',
  '--accent-foreground': 'inverse.foreground',
  '--field-background': 'surface.3',
  '--field-foreground': 'foreground',
  '--field-placeholder': 'foreground.2',
  '--field-border': 'border',
  '--success': 'status.ok',
  '--warning': 'status.warn',
  '--danger': 'status.bad',
  // All three resolve to one token. It clears 4.5:1 on every status fill in both themes, and
  // three separate tokens holding the same value would be three things to keep in step.
  '--success-foreground': 'inverse.foreground',
  '--warning-foreground': 'inverse.foreground',
  '--danger-foreground': 'inverse.foreground',
  '--segment': 'surface.2',
  '--segment-foreground': 'foreground',
  '--border': 'border',
  '--separator': 'border',
  '--focus': 'ring',
  '--link': 'link',
  '--surface-shadow': SHADOW,
  '--overlay-shadow': SHADOW,
  '--field-shadow': SHADOW,
};

/** One operand of a derived declaration: another HeroUI variable, or the keyword. */
type Operand =
  { readonly ref: string; readonly percent: number } | { readonly transparent: number };

interface Derived {
  readonly name: string;
  readonly a: { readonly ref: string; readonly percent: number };
  readonly b: Operand;
  /**
   * The variable this colour is drawn ON, when it carries text. Present for exactly the four
   * `-soft-foreground` values, which is where a reader's eye actually lands.
   */
  readonly textOn?: string;
}

/**
 * The 29 `color-mix` declarations, transcribed from `heroui-native/lib/module/styles/theme.css`.
 *
 * Transcribed rather than parsed: parsing the dependency's stylesheet would make our build
 * silently follow whatever it changes to, and a colour changing under us without a diff is
 * the failure this whole file exists to prevent. A HeroUI upgrade that alters these is a
 * change we should have to look at.
 *
 * Note the three that sum to LESS than 100 %. That is not a typo in their stylesheet — under
 * CSS Color 5 it scales the result's alpha rather than the ratio, and `mixOklab` implements
 * that. Reading them as 90/2 rather than 92-scaled is how a subtle transparency bug gets in.
 */
const DERIVED: readonly Derived[] = [
  {
    name: '--color-surface-hover',
    a: { ref: '--surface', percent: 92 },
    b: { ref: '--surface-foreground', percent: 8 },
  },
  {
    name: '--color-background-secondary',
    a: { ref: '--background', percent: 96 },
    b: { ref: '--foreground', percent: 4 },
  },
  {
    name: '--color-background-tertiary',
    a: { ref: '--background', percent: 92 },
    b: { ref: '--foreground', percent: 8 },
  },
  {
    name: '--color-default-hover',
    a: { ref: '--default', percent: 96 },
    b: { ref: '--default-foreground', percent: 4 },
  },
  {
    name: '--color-accent-hover',
    a: { ref: '--accent', percent: 90 },
    b: { ref: '--accent-foreground', percent: 10 },
  },
  {
    name: '--color-success-hover',
    a: { ref: '--success', percent: 90 },
    b: { ref: '--success-foreground', percent: 10 },
  },
  {
    name: '--color-warning-hover',
    a: { ref: '--warning', percent: 90 },
    b: { ref: '--warning-foreground', percent: 10 },
  },
  {
    name: '--color-danger-hover',
    a: { ref: '--danger', percent: 90 },
    b: { ref: '--danger-foreground', percent: 10 },
  },
  {
    name: '--color-field-hover',
    a: { ref: '--field-background', percent: 90 },
    b: { ref: '--field-foreground', percent: 2 },
  },
  {
    name: '--color-field-border-hover',
    a: { ref: '--field-border', percent: 88 },
    b: { ref: '--field-foreground', percent: 10 },
  },
  {
    name: '--color-field-border-focus',
    a: { ref: '--field-border', percent: 74 },
    b: { ref: '--field-foreground', percent: 22 },
  },
  { name: '--color-default-soft', a: { ref: '--default', percent: 50 }, b: { transparent: 50 } },
  {
    name: '--color-default-soft-hover',
    a: { ref: '--default', percent: 60 },
    b: { transparent: 40 },
  },
  { name: '--color-accent-soft', a: { ref: '--accent', percent: 15 }, b: { transparent: 85 } },
  {
    name: '--color-accent-soft-hover',
    a: { ref: '--accent', percent: 20 },
    b: { transparent: 80 },
  },
  { name: '--color-danger-soft', a: { ref: '--danger', percent: 15 }, b: { transparent: 85 } },
  {
    name: '--color-danger-soft-hover',
    a: { ref: '--danger', percent: 20 },
    b: { transparent: 80 },
  },
  { name: '--color-warning-soft', a: { ref: '--warning', percent: 15 }, b: { transparent: 85 } },
  {
    name: '--color-warning-soft-hover',
    a: { ref: '--warning', percent: 20 },
    b: { transparent: 80 },
  },
  { name: '--color-success-soft', a: { ref: '--success', percent: 15 }, b: { transparent: 85 } },
  {
    name: '--color-success-soft-hover',
    a: { ref: '--success', percent: 20 },
    b: { transparent: 80 },
  },
  {
    name: '--color-separator-secondary',
    a: { ref: '--surface', percent: 85 },
    b: { ref: '--surface-foreground', percent: 15 },
  },
  {
    name: '--color-separator-tertiary',
    a: { ref: '--surface', percent: 81 },
    b: { ref: '--surface-foreground', percent: 19 },
  },
  {
    name: '--color-border-secondary',
    a: { ref: '--surface', percent: 78 },
    b: { ref: '--surface-foreground', percent: 22 },
  },
  {
    name: '--color-border-tertiary',
    a: { ref: '--surface', percent: 66 },
    b: { ref: '--surface-foreground', percent: 34 },
  },
  // THE FOUR THAT CARRY TEXT. Each is drawn on its own `-soft` fill, which is translucent, so
  // the check composites it over the page before measuring.
  {
    name: '--color-accent-soft-foreground',
    a: { ref: '--accent', percent: 80 },
    b: { ref: '--foreground', percent: 20 },
    textOn: '--color-accent-soft',
  },
  {
    name: '--color-danger-soft-foreground',
    a: { ref: '--danger', percent: 80 },
    b: { ref: '--foreground', percent: 20 },
    textOn: '--color-danger-soft',
  },
  {
    name: '--color-warning-soft-foreground',
    a: { ref: '--warning', percent: 65 },
    b: { ref: '--foreground', percent: 35 },
    textOn: '--color-warning-soft',
  },
  {
    name: '--color-success-soft-foreground',
    a: { ref: '--success', percent: 70 },
    b: { ref: '--foreground', percent: 30 },
    textOn: '--color-success-soft',
  },
];

/** A resolved colour: straight sRGB plus its own alpha. */
interface Resolved {
  readonly rgb: readonly [number, number, number];
  readonly alpha: number;
}

export class HerouiEmitError extends Error {
  constructor(findings: readonly string[]) {
    super(
      `HeroUI theme not emitted — ${String(findings.length)} failure(s):\n  ${findings.join('\n  ')}\n` +
        'Refusing to write a stylesheet whose colours do not pass the gate that governs them. ' +
        'Change the token or the mapping; never widen the requirement.',
    );
    this.name = 'HerouiEmitError';
  }
}

function baseValues(manifest: Manifest, theme: Theme): Map<string, Resolved> {
  const tokens = manifest.color[theme];
  const out = new Map<string, Resolved>();
  for (const [cssVar, token] of Object.entries(BASE)) {
    if (token === SHADOW) continue;
    const t: ColorToken | undefined = tokens[token];
    if (t === undefined)
      throw new Error(`${theme}: BASE maps ${cssVar} to "${token}", which is not a token`);
    out.set(cssVar, { rgb: tokenRgb(token, t), alpha: t.oklch.alpha ?? 1 });
  }
  return out;
}

/** The colours a translucent fill can actually present, one per ground it may sit on. */
function overGrounds(manifest: Manifest, theme: Theme, fill: Resolved): Resolved[] {
  if (fill.alpha >= 1) return [fill];
  const tokens = manifest.color[theme];
  return (['background', 'surface.1', 'surface.2'] as const).map((g) => {
    const ground = tokens[g];
    if (ground === undefined) throw new Error(`${theme}.${g} is not a token`);
    const base = tokenRgb(g, ground);
    // Encoded, not linear: this predicts what the platform draws, and the platform is not
    // physically faithful. `compositeEncoded`'s own note explains why picking one model
    // silently certifies a colour that does not render.
    return {
      rgb: [
        fill.rgb[0] * fill.alpha + base[0] * (1 - fill.alpha),
        fill.rgb[1] * fill.alpha + base[1] * (1 - fill.alpha),
        fill.rgb[2] * fill.alpha + base[2] * (1 - fill.alpha),
      ] as const,
      alpha: 1,
    };
  });
}

/** Every value HeroUI needs for one theme, computed and checked. */
export function herouiTheme(
  manifest: Manifest,
  theme: Theme,
): { readonly values: Map<string, Resolved>; readonly findings: readonly string[] } {
  const values = baseValues(manifest, theme);
  const findings: string[] = [];

  const operand = (o: Operand): MixOperand => {
    if ('transparent' in o) return { rgb: [0, 0, 0], alpha: 0, percent: o.transparent };
    const v = values.get(o.ref);
    if (v === undefined)
      throw new Error(`${theme}: derived declaration references unknown ${o.ref}`);
    return { rgb: v.rgb, alpha: v.alpha, percent: o.percent };
  };

  for (const d of DERIVED) {
    const r = mixOklab(operand(d.a), operand(d.b));
    values.set(d.name, { rgb: r.rgb, alpha: r.alpha });
  }

  // The only contrast requirement that genuinely applies: text on its own fill.
  const { normalText } = manifest.gate.contrast;
  for (const d of DERIVED) {
    if (d.textOn === undefined) continue;
    const text = values.get(d.name);
    const fill = values.get(d.textOn);
    if (text === undefined || fill === undefined) throw new Error(`${theme}: ${d.name} unresolved`);
    for (const ground of overGrounds(manifest, theme, fill)) {
      const ratio = wcagContrast(text.rgb, ground.rgb);
      if (ratio < normalText)
        findings.push(
          `${theme}: ${d.name} on ${d.textOn} is ${ratio.toFixed(2)}:1, below the ` +
            `${normalText.toFixed(1)} required for text. HeroUI draws this pairing in Alert. ` +
            'Change the status token or the mapping — never the threshold.',
        );
    }
  }

  return { values, findings };
}

/**
 * `--color-surface-hover` → `--irodora-surface-hover`.
 *
 * The intermediate a theme variant actually sets. Namespaced for the same reason
 * `emit/css.ts` namespaces its layer: Tailwind v4 DEFINES `--color-*` itself, so setting one
 * directly inside a variant collides with the theme block rather than feeding it.
 */
const intermediate = (colorVar: string): string => colorVar.replace('--color-', '--irodora-');

const format = (r: Resolved): string => (r.alpha >= 1 ? toHex(r.rgb) : toHex8(r.rgb, r.alpha));

/**
 * `apps/mobile/global.css`.
 *
 * Emits both themes plus the calculated layer, and **throws rather than writing** if any
 * checked pairing fails — a generator that emits a failing stylesheet and reports the failure
 * separately is a generator whose output someone will ship
 * [[a-gate-that-errors-is-failing-open]].
 */
export function emitHeroui(manifest: Manifest): string {
  const themes = new Map<Theme, ReturnType<typeof herouiTheme>>();
  const findings: string[] = [];
  for (const theme of THEMES) {
    const r = herouiTheme(manifest, theme);
    themes.set(theme, r);
    findings.push(...r.findings);
  }
  if (findings.length > 0) throw new HerouiEmitError(findings);

  const out: string[] = [
    '/*',
    ' * GENERATED — do not edit.',
    ' *   source: docs/design/design-system.manifest.json',
    ' *   regenerate: pnpm --filter @irodora/design-tokens generate',
    ' *',
    " * HeroUI Native's theme, driven by our manifest (ADR-0062). Every value is sRGB hex:",
    ' * Uniwind normalises each variable through culori on device, and a hex leaves that call',
    ' * nothing to decide, so the conversion stays ours (ADR-0043, ADR-0063).',
    ' *',
    ' * The --color-* block below REPLACES the color-mix() declarations HeroUI ships. Those',
    ' * would be evaluated at runtime by culori, producing colours no gate has measured — and',
    ' * four of them carry text.',
    ' */',
    '',
    "@import 'heroui-native/styles';",
    '',
    '@layer theme {',
    '  :root {',
  ];

  for (const theme of THEMES) {
    const resolved = themes.get(theme);
    // Every lookup below is asserted rather than assumed. `herouiTheme` populated this map a
    // few lines ago, so a miss is a bug in THIS file — which is exactly the kind that a `!`
    // turns into an undefined printed into a stylesheet.
    if (resolved === undefined) throw new Error(`${theme} was not resolved`);
    const { values } = resolved;
    out.push(`    @variant ${theme} {`);
    for (const [cssVar, token] of Object.entries(BASE)) {
      if (token === SHADOW) {
        out.push(`      ${cssVar}: 0 0 0 0 transparent;`);
        continue;
      }
      const v = values.get(cssVar);
      const t = manifest.color[theme][token];
      if (v === undefined || t === undefined)
        throw new Error(`${theme}: ${cssVar} did not resolve to a value`);
      const { l, c, h } = t.oklch;
      out.push(
        `      ${cssVar}: ${format(v)}; /* ${token} — oklch(${String(l)} ${String(c)} ${String(h)}) */`,
      );
    }
    // The calculated values live in the SAME variant block, so each theme carries its own
    // literal. The alternative — one `light-dark()` declaration per variable — would hand
    // the choice back to Uniwind's runtime, and the point of this file is that nothing on
    // the device decides anything about a colour.
    out.push('');
    for (const d of DERIVED) {
      const dv = values.get(d.name);
      if (dv === undefined) throw new Error(`${theme}: ${d.name} did not resolve to a value`);
      const b =
        'transparent' in d.b
          ? `transparent ${String(d.b.transparent)}%`
          : `${d.b.ref} ${String(d.b.percent)}%`;
      const note = d.textOn === undefined ? '' : ` — TEXT, checked on ${d.textOn}`;
      out.push(
        `      ${intermediate(d.name)}: ${format(dv)}; /* mix(${d.a.ref} ${String(d.a.percent)}%, ${b})${note} */`,
      );
    }
    out.push('    }');
  }
  out.push('  }', '}', '');

  // Map HeroUI's Tailwind theme names onto the per-theme intermediates. This is HeroUI's own
  // indirection — `--color-x: var(--x)` — reused, which is why re-declaring here wins
  // without fighting the cascade.
  out.push('@theme inline static {');
  out.push('  /* Computed from the manifest, never by color-mix() on the device. */');
  for (const d of DERIVED) out.push(`  ${d.name}: var(${intermediate(d.name)});`);
  out.push('}', '');

  return out.join('\n');
}
