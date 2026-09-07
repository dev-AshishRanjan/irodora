/**
 * The shape of `docs/design/design-system.manifest.json`, and the loader that checks a
 * parsed object against it.
 *
 * ## Why there is a loader at all
 *
 * The manifest is edited by hand by whoever is designing, and it is read by two blocking
 * gates. A field that is missing, misspelled or of the wrong type must stop the build with
 * the token's name in the message — not resolve to `undefined` and quietly take a default.
 * A gate that cannot read its input is failing open
 * [[a-gate-that-errors-is-failing-open]], and the most common way that happens is a
 * `?.` that silently skipped the thing it was supposed to check.
 *
 * ## Why not Zod
 *
 * `@irodora/contracts` owns the wire schemas, and this is not a wire type — nothing here
 * crosses a network boundary or reaches an API consumer. Pulling Zod in would put a runtime
 * dependency into a package that `apps/mobile` bundles, to validate a file that only exists
 * at build time. The validation is small enough to be explicit, and being explicit is what
 * lets each failure name the token it came from.
 */

import { derivedSrgb, isInGamut, oklchToRgb } from './derive.js';

/**
 * The two AUTHORED themes. Both are written by hand, checked independently, and neither is
 * derived from the other.
 */
export const BASE_THEMES = ['dark', 'light'] as const;
export type Mode = (typeof BASE_THEMES)[number];

/**
 * The theme families a person can choose between.
 *
 * `base` is the authored warm neutral. The rest are RECIPES — see `themeRecipes` in the
 * manifest and the derivation below — and each exists in both modes, because choosing a theme
 * and choosing light or dark are two different choices (FR-70).
 */
export const THEME_FAMILIES = ['base', 'fuka', 'yama', 'aota'] as const;
export type ThemeFamily = (typeof THEME_FAMILIES)[number];

/**
 * Every palette, by name. `base` keeps the names `light` and `dark` so nothing downstream
 * changed meaning when the families arrived.
 *
 * EVERYTHING ITERATES THIS. The gates, the four emitters and the conformance suite all read
 * `THEMES` rather than naming a theme, which is why eight palettes cost no call sites — that
 * was measured before it was proposed, and there is exactly one exhaustive `Record<Theme, …>`
 * in the repository.
 */
export const THEMES = [
  'dark',
  'light',
  'fuka.dark',
  'fuka.light',
  'yama.dark',
  'yama.light',
  'aota.dark',
  'aota.light',
] as const;
export type Theme = (typeof THEMES)[number];

/** The palette name for a family in a mode. `base` is the pair that has always been there. */
export function themeName(family: ThemeFamily, mode: Mode): Theme {
  return family === 'base' ? mode : `${family}.${mode}`;
}

/** Which mode a palette is, which is what decides whether it is a light or a dark reading. */
export function themeMode(theme: Theme): Mode {
  return theme.endsWith('light') ? 'light' : 'dark';
}

/**
 * A theme recipe: a hue, and how far to lift the chroma the base already carries.
 *
 * THE HUE COMES FROM THE CORPUS, pinned by slug. Not invented — `themes.test.ts` reads the
 * published entry and fails if the declared hue has drifted from it, the same pin
 * `generate-brand-assets.mjs` puts on the icon's five petals so a republish is a decision
 * rather than a silent redraw.
 */
export interface ThemeRecipe {
  /** The corpus entry this hue belongs to, by slug. */
  readonly entry: string;
  /** Its hue in OKLCh degrees. */
  readonly hue: number;
  /** What the base chroma is multiplied by, before the gamut ceiling. */
  readonly chromaScale: number;
}

/**
 * Tokens that stay EXACTLY as the base authored them, in every theme.
 *
 * Two different reasons, and both are worth keeping apart.
 *
 * **The sample's furniture** — `swatch.well` and the two-tone keyline — is what a colour is
 * read against. Tinting it would put a hue behind every sample in the product and change what
 * the sample looks like, which is the one thing a colour-measurement app may not do. That is
 * F-153's fourth acceptance criterion, and it is met here by construction rather than checked
 * afterwards.
 *
 * **The signals** — the chart ramp, the three status colours and the focus ring — are not
 * chrome. `chart.*` is a greyscale ramp precisely so hue is not the channel; a status says
 * something is wrong; a ring says where the cursor is. A signal that changes colour with the
 * decoration is a signal that has to be relearned every time somebody picks a new theme.
 */
export const NEUTRAL_IN_EVERY_THEME = [
  'swatch.well',
  'swatch.hairline',
  'swatch.hairline.inverse',
  'chart.1',
  'chart.2',
  'chart.3',
  'chart.4',
  'chart.5',
  'status.ok',
  'status.warn',
  'status.bad',
  'ring',
] as const;

/**
 * What a token is *for*, which is what decides the contrast threshold it must meet.
 *
 * WCAG sets different minimums for text, large text and non-text (SC 1.4.3 and 1.4.11), so a
 * gate cannot check a pairing without knowing which of the three it is looking at. Guessing
 * would make the gate wrong in one direction or the other, silently.
 *
 * - `text` — 4.5:1. **The default**, so an omission fails safe: a token that forgets to
 *   declare its usage is held to the strictest requirement rather than the loosest.
 * - `largeText` — 3:1. Only legitimate at >= 18.66 px, or >= 24 px bold.
 * - `nonText` — 3:1. UI components, focus indicators, graphical objects.
 * - `surface` — imposes no requirement of its own. A background. It still participates in
 *   pairings; the requirement comes from the other side.
 */
export const USAGES = ['text', 'largeText', 'nonText', 'surface'] as const;
export type Usage = (typeof USAGES)[number];

/** OKLCh coordinates as the manifest states them. `alpha` present means translucent. */
export interface ManifestOklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
  readonly alpha?: number;
}

export interface ColorToken {
  readonly oklch: ManifestOklch;
  /**
   * DERIVED, never authored (ADR-0043). Regenerated by `pnpm --filter @irodora/design-tokens
   * generate`; a hand-edited value is a `contrast` gate failure.
   */
  readonly srgb: string;
  readonly role: string;
  readonly usage: Usage;
  /**
   * Declared contrast pairings. The gate checks these and only these — the cartesian product
   * would be fast to compute and meaningless to read. A pairing used in a component but
   * absent here is a gate failure once components exist (F-017).
   */
  readonly pairsWith: readonly string[];
  /**
   * For a translucent token: **every** ground it may legally sit on.
   *
   * An `rgba()` has no contrast ratio and no separation score until something is behind it,
   * so a translucent token must name its grounds or it cannot be checked at all. It is a
   * list rather than a single value because naming one ground lets the gate check the
   * favourable case: a black hairline over `surface.1` (white, in the light theme) is the
   * best it will ever look, and the same line divides rows on `surface.2` and frames the
   * `swatch.well`. The gate takes the **worst** ground, so a single favourable declaration
   * cannot launder a failure.
   */
  readonly compositeOver?: readonly string[];
  /**
   * Why this token is deliberately covered by no contrast pairing.
   *
   * Required when nothing — in either direction — names it, because gate scope is driven by
   * `pairsWith` and a token nobody names is checked by nothing while looking exactly like a
   * token that passed. This turns "unchecked" from an absence into a statement a reviewer
   * can disagree with.
   */
  readonly uncheckedReason?: string;
}

export interface StatusEntry {
  readonly colorToken: string;
  readonly iconToken: string;
  readonly textRequired: boolean;
}

export interface CvdPairs {
  readonly minSeparation: number;
  readonly pairs: readonly (readonly [string, string])[];
}

export interface ChromaException {
  readonly rule: 'chromaCeiling';
  readonly token: string;
  readonly reason: string;
  readonly owner: string;
  readonly recordedAt: string;
}

export interface ContrastGateConfig {
  readonly standard: string;
  readonly normalText: number;
  readonly largeText: number;
  readonly nonText: number;
  readonly reportAPCA: boolean;
  /**
   * The px floor that makes `usage: "largeText"` mean something.
   *
   * WCAG 2.2 defines large text as >= 18.66 px, or >= 24 px bold. Until F-017 this number
   * lived only in prose and in three doc comments, while the rendered small-text check and
   * the `Text` component's types both depended on it. A number that three places agree about
   * by copying it is a number that will eventually disagree.
   */
  readonly largeTextMinPx: number;
  readonly largeTextMinBoldPx: number;
  readonly blockingWhenStatus: string;
  readonly chromaCeiling: { readonly maxChroma: number };
}

/** One step of the type scale. `lineHeight` and `tracking` are RATIOS, not lengths. */
export interface TypeStep {
  readonly size: number;
  /** Unitless multiple of `size`, as CSS means it. React Native does NOT mean this. */
  readonly lineHeight: number;
  /** CSS `em` string, e.g. `-0.04em`. Relative to `size`. */
  readonly tracking: string;
  readonly weight: number;
  readonly transform?: string;
}

/** The scripts the type scale is defined for. Japanese is not Latin with different glyphs. */
export const SCRIPTS = ['latin', 'japanese'] as const;
export type Script = (typeof SCRIPTS)[number];

export interface Typography {
  /**
   * CSS font stacks, one per family. **These are unusable on React Native**, which takes a
   * single family name and has no fallback cascade.
   *
   * `emitReactNative` therefore does **not** emit them, and a test asserts that it does not:
   * naming a face the bundle does not carry fails over to the system font silently, which is
   * tofu on exactly the rare kanji the corpus is made of. They are resolved when the font
   * asset lands (ADR-0057 §5, F-017 increment 9) — not before.
   */
  readonly families: Readonly<Record<string, string>>;
  readonly scale: Readonly<Record<string, TypeStep>>;
  /** Base leading per script. Japanese needs more at the same size. */
  readonly lineHeight: Readonly<Record<Script, number>>;
  readonly numeric: { readonly fontFeature: string };
}

/** Tonal elevation: each level names the surface token it resolves to. Never a shadow. */
export interface Elevation {
  readonly levels: Readonly<Record<string, string>>;
  readonly shadow: string;
}

export interface Motion {
  readonly durations: Readonly<Record<string, number>>;
  readonly easing: Readonly<Record<string, string>>;
  readonly animatable: readonly string[];
  readonly forbidden: readonly string[];
}

export interface Manifest {
  readonly version: number;
  /** The approval lifecycle: `placeholder` makes the contrast gate report-only. */
  readonly status: string;
  /** The theme used when the platform expresses no preference. */
  readonly defaultTheme: Theme;
  readonly color: Readonly<Record<Theme, Readonly<Record<string, ColorToken>>>>;
  readonly statusPairing: Readonly<Record<string, StatusEntry>>;
  readonly cvdPairs: CvdPairs;
  readonly salience: Salience;
  readonly radius: Readonly<Record<string, number>>;
  readonly spacing: { readonly base: number; readonly scale: Readonly<Record<string, number>> };
  readonly size: {
    readonly tapTarget: number;
    /**
     * The smallest a sample may be drawn when the screen asks you to JUDGE it, in dp.
     *
     * Derived, never declared — see the parser. Scoped by what the surface asks of the reader:
     * a list that ranks keeps its thumbnails, a pair that must be assessed reaches this
     * (ADR-0095).
     */
    readonly judgeable: number;
  };
  readonly typography: Typography;
  readonly elevation: Elevation;
  readonly motion: Motion;
  readonly exceptions: readonly ChromaException[];
  readonly gate: { readonly contrast: ContrastGateConfig };
}

/**
 * The RECORDED salience rank of the status tokens (F-067, ADR-0053).
 *
 * Recorded rather than inferred. A rank read back out of the values can never disagree with
 * them, and the defect this exists to catch was precisely that no order had been stated — the
 * dark theme ranked warn > ok > bad while light ranked bad > warn > ok, and nothing noticed.
 */
export interface Salience {
  /** Loudest first. Token names without a theme prefix; the rank must hold in EVERY theme. */
  readonly rank: readonly string[];
  readonly why: string;
}

/** Thrown with the path of the offending field. The path is the whole value of the message. */
export class ManifestError extends Error {
  constructor(path: string, detail: string) {
    super(`design-system.manifest.json: ${path} — ${detail}`);
    this.name = 'ManifestError';
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isUsage = (v: string): v is Usage => (USAGES as readonly string[]).includes(v);

/**
 * Millimetres in an inch. Exact by definition since 1959, so it is a unit conversion rather
 * than a measurement — which is why it lives here and not in the manifest.
 */
const MM_PER_INCH = 25.4;

function requireRecord(v: unknown, path: string): Record<string, unknown> {
  if (!isRecord(v)) throw new ManifestError(path, 'expected an object');
  return v;
}

function requireNumber(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new ManifestError(path, 'expected a finite number');
  return v;
}

function requireString(v: unknown, path: string): string {
  if (typeof v !== 'string' || v.length === 0)
    throw new ManifestError(path, 'expected a non-empty string');
  return v;
}

function parseOklch(v: unknown, path: string): ManifestOklch {
  const o = requireRecord(v, path);
  const l = requireNumber(o['l'], `${path}.l`);
  const c = requireNumber(o['c'], `${path}.c`);
  const h = requireNumber(o['h'], `${path}.h`);
  if (l < 0 || l > 1) throw new ManifestError(`${path}.l`, `OKLCh L is [0,1]; got ${String(l)}`);
  if (c < 0) throw new ManifestError(`${path}.c`, `chroma cannot be negative; got ${String(c)}`);
  if (o['alpha'] === undefined) return { l, c, h };
  const alpha = requireNumber(o['alpha'], `${path}.alpha`);
  if (alpha < 0 || alpha > 1)
    throw new ManifestError(`${path}.alpha`, `alpha is [0,1]; got ${String(alpha)}`);
  return { l, c, h, alpha };
}

function parseToken(v: unknown, path: string): ColorToken {
  const o = requireRecord(v, path);
  const oklch = parseOklch(o['oklch'], `${path}.oklch`);
  const srgb = requireString(o['srgb'], `${path}.srgb`);
  const role = requireString(o['role'], `${path}.role`);

  const usage: unknown = o['usage'];
  if (typeof usage !== 'string' || !isUsage(usage))
    throw new ManifestError(
      `${path}.usage`,
      `expected one of ${USAGES.join(', ')}; got ${JSON.stringify(usage)}. ` +
        'Without it the gate cannot know which WCAG minimum applies.',
    );

  const pairsWith = o['pairsWith'];
  if (!Array.isArray(pairsWith) || pairsWith.some((p) => typeof p !== 'string'))
    throw new ManifestError(`${path}.pairsWith`, 'expected an array of token names');

  // A translucent token without grounds is not evaluable: there is no ratio and no
  // separation score until something is behind it. Fail here rather than let a gate
  // silently skip it.
  const composite = o['compositeOver'];
  const hasGrounds =
    Array.isArray(composite) &&
    composite.length > 0 &&
    composite.every((g) => typeof g === 'string');
  if (oklch.alpha !== undefined && !hasGrounds)
    throw new ManifestError(
      `${path}.compositeOver`,
      'a translucent token must name every ground it may sit on, as a non-empty array, or ' +
        'neither its contrast nor its CVD separation is defined. Naming one favourable ' +
        'ground is how a check passes a token that is invisible where it is actually used.',
    );

  let token: ColorToken = {
    oklch,
    srgb,
    role,
    usage,
    pairsWith: pairsWith as readonly string[],
  };
  if (hasGrounds) token = { ...token, compositeOver: composite };
  if (o['uncheckedReason'] !== undefined)
    token = {
      ...token,
      uncheckedReason: requireString(o['uncheckedReason'], `${path}.uncheckedReason`),
    };
  return token;
}

/**
 * Validate a parsed manifest.
 *
 * Takes an already-parsed object rather than a path: reading a file is a Node concern, and
 * this package is bundled by `apps/mobile`. The one caller that touches the filesystem is
 * `generate.mjs`, which is not shipped.
 */
/**
 * The largest chroma that fits in sRGB at this lightness and hue.
 *
 * Bisection on chroma alone, holding L and H exactly — which is the same move ADR-0045 makes
 * for gamut mapping, and it is done here rather than through `gamutMap` because the point of
 * this feature is that **a theme never moves lightness**. A mapper free to trade L for C would
 * make that sentence untrue in the one place it has to hold.
 */
export function fittedChroma(l: number, c: number, h: number): number {
  if (isInGamut(oklchToRgb({ l, c, h }))) return c;
  let lo = 0;
  let hi = c;
  // 24 halvings of a chroma below 0.4 lands well inside the third decimal the manifest keeps.
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (isInGamut(oklchToRgb({ l, c: mid, h }))) lo = mid;
    else hi = mid;
  }
  /*
   * FLOORED, AND THEN CHECKED AGAIN.
   *
   * Rounding to the third decimal the manifest keeps can round a bisected chroma back UP past
   * the boundary it just found — `fuka.dark.foreground` came out 0.000154 over the top of the
   * blue channel that way, which `tokenRgb` refuses rather than clipping. Flooring cannot go
   * up; the loop after it is for the case where even the floor is a hair outside.
   */
  let fitted = Math.floor(lo * 1000) / 1000;
  while (fitted > 0 && !isInGamut(oklchToRgb({ l, c: fitted, h }))) fitted -= 0.001;
  return Math.max(0, Math.round(fitted * 1000) / 1000);
}

/**
 * One theme, derived from a base by moving hue and lifting chroma. **L is never touched.**
 *
 * Contrast is dominated by lightness, so preserving it means a derived theme starts from a
 * palette that already passes and the only open question is whether the added chroma cost
 * anything — which gate 9 then measures over the derived values rather than over a promise
 * (criterion 3). It also makes the result reviewable in one sentence: the hue moved, and
 * nothing else did.
 */
export function deriveTheme(
  base: Readonly<Record<string, ColorToken>>,
  recipe: ThemeRecipe,
  ceiling: number,
  where: string,
): Record<string, ColorToken> {
  const neutral = new Set<string>(NEUTRAL_IN_EVERY_THEME);
  const out: Record<string, ColorToken> = {};

  for (const [name, token] of Object.entries(base)) {
    // A token with no chroma has no hue to move, and at L 0 or 1 there is no room for any.
    if (neutral.has(name) || token.oklch.c === 0) {
      out[name] = token;
      continue;
    }

    /*
     * THE CEILING IS THE ANSWER TO "HOW STRONG MAY A THEME BE", and it was already in the
     * manifest before this feature existed:
     *
     *   > "The interface is near-achromatic by rule so that the garment colour is the only
     *   > chroma competing for the eye."
     *
     * That is a product rule with a stated reason, and a theme does not get to argue with it.
     * So a tint may lift chroma toward the ceiling and never past it — which means NO THEME
     * ADDS A CHROMA EXCEPTION, and the near-achromatic guarantee holds in all eight palettes
     * rather than in the two somebody happened to author.
     *
     * The hue is what carries the theme. A cool grey and a warm grey are immediately
     * distinguishable across a whole screen at chroma this low; that is the same effect that
     * makes people particular about white balance.
     */
    const wanted = Math.min(Math.round(token.oklch.c * recipe.chromaScale * 1000) / 1000, ceiling);
    const c = fittedChroma(token.oklch.l, wanted, recipe.hue);
    const tinted: ColorToken = { ...token, oklch: { ...token.oklch, c, h: recipe.hue }, srgb: '' };
    out[name] = { ...tinted, srgb: derivedSrgb(`${where}.${name}`, tinted) };
  }

  return out;
}

export function parseManifest(input: unknown): Manifest {
  const root = requireRecord(input, '<root>');

  const color = requireRecord(root['color'], 'color');
  const themes: Record<string, Record<string, ColorToken>> = {};
  for (const mode of BASE_THEMES) {
    const entry = requireRecord(color[mode], `color.${mode}`);
    const tokens: Record<string, ColorToken> = {};
    for (const [name, value] of Object.entries(entry))
      tokens[name] = parseToken(value, `color.${mode}.${name}`);
    themes[mode] = tokens;
  }

  /*
   * THE DERIVED THEMES, BEFORE ANY CHECK RUNS.
   *
   * This is the whole of criterion 3. Every gate in this repository reads the parsed manifest,
   * so deriving here means the contrast and CVD checks run over the ACTUAL VALUES a device will
   * paint — never over a recipe, a promise, or a claim that the derivation is safe.
   *
   * A recipe the theme list does not name, or a name the recipes do not cover, is a parse
   * error: the const and the manifest have to agree or the types stop describing the data.
   */
  /*
   * Read here rather than after the gate block, because the derivation needs it and the
   * derivation has to happen before anything checks the result. One reader, one value: the
   * ceiling a theme respects is the SAME number `checkChromaCeiling` enforces, not a copy.
   */
  const chromaCeiling = requireNumber(
    requireRecord(
      requireRecord(requireRecord(root['gate'], 'gate')['contrast'], 'gate.contrast')[
        'chromaCeiling'
      ],
      'gate.contrast.chromaCeiling',
    )['maxChroma'],
    'gate.contrast.chromaCeiling.maxChroma',
  );

  const recipesRaw = requireRecord(root['themeRecipes'], 'themeRecipes');
  const recipes: Record<string, ThemeRecipe> = {};
  for (const [name, value] of Object.entries(recipesRaw)) {
    if (name.startsWith('_')) continue;
    const o = requireRecord(value, `themeRecipes.${name}`);
    recipes[name] = {
      entry: requireString(o['entry'], `themeRecipes.${name}.entry`),
      hue: requireNumber(o['hue'], `themeRecipes.${name}.hue`),
      chromaScale: requireNumber(o['chromaScale'], `themeRecipes.${name}.chromaScale`),
    };
  }

  const tinted = THEME_FAMILIES.filter((f) => f !== 'base');
  const declared = Object.keys(recipes).sort().join(' ');
  if (declared !== [...tinted].sort().join(' '))
    throw new ManifestError(
      'themeRecipes',
      `declares [${declared}] and THEME_FAMILIES expects [${[...tinted].sort().join(' ')}]. ` +
        'The list is a const so every theme name is a literal type; a recipe the list does not ' +
        'name would be derived into a palette nothing can refer to.',
    );

  for (const family of tinted) {
    const recipe = recipes[family];
    if (recipe === undefined) continue;
    if (recipe.chromaScale <= 0)
      throw new ManifestError(`themeRecipes.${family}.chromaScale`, 'must be positive');
    if (recipe.hue < 0 || recipe.hue >= 360)
      throw new ManifestError(`themeRecipes.${family}.hue`, 'must be a degree in [0, 360)');
    for (const mode of BASE_THEMES) {
      const name = `${family}.${mode}`;
      themes[name] = deriveTheme(themes[mode] ?? {}, recipe, chromaCeiling, `color.${name}`);
    }
  }

  // Every theme declares the same token names, or a component written against one theme
  // resolves to `undefined` in the other — at runtime, on whichever theme the author was
  // not looking at.
  const [first, ...rest] = THEMES;
  const reference = Object.keys(themes[first] ?? {}).sort();
  for (const theme of rest) {
    const names = Object.keys(themes[theme] ?? {}).sort();
    if (names.join(' ') !== reference.join(' ')) {
      const missing = reference.filter((n) => !names.includes(n));
      const extra = names.filter((n) => !reference.includes(n));
      throw new ManifestError(
        `color.${theme}`,
        `token names differ from color.${first}` +
          (missing.length > 0 ? `; missing ${missing.join(', ')}` : '') +
          (extra.length > 0 ? `; unexpected ${extra.join(', ')}` : ''),
      );
    }
  }

  // Every name in a pairsWith must resolve, in the theme that declared it.
  for (const theme of THEMES) {
    const tokens = themes[theme] ?? {};
    for (const [name, token] of Object.entries(tokens)) {
      for (const other of token.pairsWith)
        if (!(other in tokens))
          throw new ManifestError(
            `color.${theme}.${name}.pairsWith`,
            `"${other}" is not a token in this theme`,
          );
      for (const ground of token.compositeOver ?? [])
        if (!(ground in tokens))
          throw new ManifestError(
            `color.${theme}.${name}.compositeOver`,
            `"${ground}" is not a token in this theme`,
          );
    }
  }

  // `status` is the approval lifecycle, a string. The status/icon pairing lives under
  // `statusPairing` — the two were both spelled `status` until F-003, and JSON keeps only
  // the last key, so the approval value never survived parsing.
  const approvalStatus = requireString(root['status'], 'status');

  const statusRaw = requireRecord(root['statusPairing'], 'statusPairing');
  const statusEntries: Record<string, StatusEntry> = {};
  for (const [name, value] of Object.entries(statusRaw)) {
    if (name.startsWith('_')) continue;
    const o = requireRecord(value, `statusPairing.${name}`);
    const entry: StatusEntry = {
      colorToken: requireString(o['colorToken'], `statusPairing.${name}.colorToken`),
      iconToken: requireString(o['iconToken'], `statusPairing.${name}.iconToken`),
      textRequired: o['textRequired'] === true,
    };
    if (!entry.textRequired)
      throw new ManifestError(
        `statusPairing.${name}.textRequired`,
        'NFR-9: colour is never the only channel. A status that does not require text is ' +
          'a status expressible as colour alone.',
      );
    // The colour token must exist, or the pairing names a channel that does not render.
    for (const theme of THEMES)
      if (!(entry.colorToken in (themes[theme] ?? {})))
        throw new ManifestError(
          `statusPairing.${name}.colorToken`,
          `"${entry.colorToken}" is not a token in color.${theme}`,
        );
    statusEntries[name] = entry;
  }

  const cvdRaw = requireRecord(root['cvdPairs'], 'cvdPairs');
  const pairsRaw = cvdRaw['pairs'];
  if (!Array.isArray(pairsRaw)) throw new ManifestError('cvdPairs.pairs', 'expected an array');
  const pairs = pairsRaw.map((p, i): readonly [string, string] => {
    if (!Array.isArray(p) || p.length !== 2)
      throw new ManifestError(`cvdPairs.pairs[${String(i)}]`, 'expected a pair of token names');
    return [
      requireString(p[0], `cvdPairs.pairs[${String(i)}][0]`),
      requireString(p[1], `cvdPairs.pairs[${String(i)}][1]`),
    ] as const;
  });

  const salienceRaw = requireRecord(root['salience'], 'salience');
  const rankRaw = salienceRaw['rank'];
  if (!Array.isArray(rankRaw) || rankRaw.length < 2)
    throw new ManifestError('salience.rank', 'expected an array of at least two token names');
  const salience: Salience = {
    rank: rankRaw.map((r, i) => requireString(r, `salience.rank[${String(i)}]`)),
    why: requireString(salienceRaw['why'], 'salience.why'),
  };

  const gate = requireRecord(root['gate'], 'gate');
  const contrastRaw = requireRecord(gate['contrast'], 'gate.contrast');
  const ceiling = requireRecord(contrastRaw['chromaCeiling'], 'gate.contrast.chromaCeiling');

  const exceptionsRaw = root['exceptions'];
  if (!Array.isArray(exceptionsRaw)) throw new ManifestError('exceptions', 'expected an array');
  const exceptions = exceptionsRaw.map((e, i): ChromaException => {
    const o = requireRecord(e, `exceptions[${String(i)}]`);
    if (o['rule'] !== 'chromaCeiling')
      throw new ManifestError(
        `exceptions[${String(i)}].rule`,
        'the only recognised rule is chromaCeiling',
      );
    return {
      rule: 'chromaCeiling',
      token: requireString(o['token'], `exceptions[${String(i)}].token`),
      reason: requireString(o['reason'], `exceptions[${String(i)}].reason`),
      owner: requireString(o['owner'], `exceptions[${String(i)}].owner`),
      recordedAt: requireString(o['recordedAt'], `exceptions[${String(i)}].recordedAt`),
    };
  });

  /*
   * NAMED, like `radius` below, and F-103 is why: as a positional array a component wrote
   * `nativeSpacing[2]` and nothing in that expression named 12. Parsed the same way radius is,
   * `_note` skipped the same way, so the two scales cannot drift apart in how they are read.
   */
  const spacingRaw = requireRecord(root['spacing'], 'spacing');
  const spacingScaleRaw = requireRecord(spacingRaw['scale'], 'spacing.scale');
  const scale: Record<string, number> = {};
  for (const [name, value] of Object.entries(spacingScaleRaw)) {
    if (name.startsWith('_')) continue;
    scale[name] = requireNumber(value, `spacing.scale.${name}`);
  }

  const radiusRaw = requireRecord(root['radius'], 'radius');
  const radius: Record<string, number> = {};
  for (const [name, value] of Object.entries(radiusRaw)) {
    if (name.startsWith('_')) continue;
    radius[name] = requireNumber(value, `radius.${name}`);
  }
  /*
   * THE SWATCH CORNER IS BOUNDED BY THE AREA IT REMOVES (ADR-0090).
   *
   * This read `if (radius['swatch'] !== 0) throw`, with the reason that a corner removes sampled
   * area from exactly the region the eye uses to judge a flat colour. That reasoning is right and
   * it does not require zero — it requires the loss to be SMALL, and the manifest's own note said
   * so: "the effect grows as the swatch shrinks".
   *
   * A rounded square of side s with corner radius r loses (4 - pi)r^2, so the fraction of the
   * sample lost is 0.8584 * (r/s)^2. Expressing the corner as a RATIO makes that fraction
   * constant at every size, which is what a product drawing samples from 32px to 380px needs; a
   * single pixel value is 37% of the smaller and 3% of the larger.
   *
   * The guard is not removed, it is restated as the thing it was always about. A ratio cannot be
   * raised to something perceptually significant without this refusing to parse.
   */
  const swatchRatio = requireNumber(radiusRaw['swatchRatio'], 'radius.swatchRatio');
  /*
   * UNDERSCORED, so it is NOT emitted as a token.
   *
   * It is a parse-time CONSTRAINT, not a radius anything draws with — and the loop above skips
   * `_`-prefixed keys, which is the manifest's existing way of saying "this is for the loader".
   * Emitted, it reached no component and token reach flagged it, correctly: a value in the radius
   * record looks like a corner somebody could set, and this one is a ceiling on what a corner may
   * cost.
   */
  const minStraight = requireNumber(
    radiusRaw['_minStraightEdgeFraction'],
    'radius._minStraightEdgeFraction',
  );

  /*
   * WHAT BOUNDS A SWATCH CORNER, AND WHY THIS IS THE SECOND ANSWER (ADR-0094).
   *
   * It was the sampled AREA a corner removes — `(4 - π)r²` — capped at 2%, which held the ratio
   * near 0.15 and left a 44px swatch with a 5.5px corner. That was reported as a rectangle,
   * twice, and it was: there is no value inside that bound which looks any different.
   *
   * **Area was the wrong measure.** Colour appearance does depend on area, and it needs an
   * order-of-magnitude change to matter; the difference between losing 1.3% and 5.4% of a swatch
   * is not something anybody can see.
   *
   * What actually degrades a sample is the corner growing until the shape stops being a FIELD
   * and starts being a blob. At `ratio = 0.5` a square is a circle, and a circle is a worse
   * container for judging a colour: proportionally more of it is edge, and edge is where
   * simultaneous contrast acts — the physics `swatch.well` exists for.
   *
   * So the bound is the straight run left on each edge. `side - 2r >= side · f` rearranges to
   * `ratio <= (1 - f) / 2`, and at `f = 0.5` that is 0.25: half of every edge is still a
   * straight run of colour, and the sample reads as a rectangle with softened corners rather
   * than as a curve.
   */
  const straight = 1 - 2 * swatchRatio;
  if (swatchRatio < 0 || straight < minStraight)
    throw new ManifestError(
      'radius.swatchRatio',
      `a corner of ${String(swatchRatio)} leaves ${(straight * 100).toFixed(1)}% of each edge ` +
        `straight, and the declared floor is ${(minStraight * 100).toFixed(1)}%. Past that the ` +
        'corners meet and the sample stops being a field of colour — which is what it is for.',
    );

  // --- size -----------------------------------------------------------------------------
  //
  /*
   * A SAMPLE THAT CARRIES A NUMBER MUST SUBTEND THE OBSERVER THAT NUMBER WAS FIT FOR (ADR-0095).
   *
   * This product's colorimetry is the CIE 2° standard observer throughout — `whitepoints.ts`
   * carries D65/2° and D50/2°, the calibration reader refuses a patch value whose observer is
   * unstated, and ΔE00 is parameterised for it. A sample presented as the SUBJECT of a colour
   * difference and drawn smaller than that is being judged under conditions the number was not
   * fit for. Below roughly 1° it stops being a technicality: the central fovea is sparse in
   * S-cones, and small fields measurably lose blue–yellow discrimination.
   *
   * THE VALUE IS DERIVED HERE AND NOWHERE ELSE, and a manifest that writes it literally is a
   * parse error. A constant that has been copied out of its reasoning cannot be checked against
   * it later — which is exactly how the Android safe-zone assertion came to carry the previous
   * mark's numbers and would have passed while the new one was clipped (E-085).
   *
   *   2 · d · tan(θ/2)  is the chord a field of θ subtends at distance d
   *   1 dp = 25.4 / dpPerInch mm  is the density-independent pixel's definition
   *
   * At the declared 2° and 350 mm that is 12.2185 mm, which is 76.97 dp, which rounds to 77.
   */
  const sizeRaw = requireRecord(root['size'], 'size');
  if (sizeRaw['judgeable'] !== undefined)
    throw new ManifestError(
      'size.judgeable',
      'is derived from observerDegrees, viewingDistanceMm and dpPerInch, and may not be ' +
        'written down. A value copied out of its reasoning cannot be checked against it — ' +
        'remove the key and change an input instead.',
    );

  const observerDegrees = requireNumber(sizeRaw['observerDegrees'], 'size.observerDegrees');
  const viewingDistanceMm = requireNumber(sizeRaw['viewingDistanceMm'], 'size.viewingDistanceMm');
  const dpPerInch = requireNumber(sizeRaw['dpPerInch'], 'size.dpPerInch');

  if (observerDegrees <= 0 || viewingDistanceMm <= 0 || dpPerInch <= 0)
    throw new ManifestError(
      'size',
      'observerDegrees, viewingDistanceMm and dpPerInch are all physical quantities and all ' +
        'have to be positive.',
    );

  const fieldMm = 2 * viewingDistanceMm * Math.tan((observerDegrees / 2) * (Math.PI / 180));
  const size = {
    tapTarget: requireNumber(sizeRaw['tapTarget'], 'size.tapTarget'),
    judgeable: Math.round(fieldMm / (MM_PER_INCH / dpPerInch)),
  };

  // --- typography ---------------------------------------------------------------------
  //
  // Parsed rather than ignored as of F-017. Until then the manifest declared a type scale
  // that no target emitted, so "the manifest is the single source of truth" was true of
  // colour and aspirational of everything else.
  const typoRaw = requireRecord(root['typography'], 'typography');
  const familiesRaw = requireRecord(typoRaw['families'], 'typography.families');
  const families: Record<string, string> = {};
  for (const [name, value] of Object.entries(familiesRaw)) {
    if (name.startsWith('_')) continue;
    families[name] = requireString(value, `typography.families.${name}`);
  }

  const scaleRaw = requireRecord(typoRaw['scale'], 'typography.scale');
  const typeScale: Record<string, TypeStep> = {};
  for (const [name, value] of Object.entries(scaleRaw)) {
    if (name.startsWith('_')) continue;
    const o = requireRecord(value, `typography.scale.${name}`);
    const tracking = requireString(o['tracking'], `typography.scale.${name}.tracking`);
    // `em` or the bare string "0". A length in px here would be silently wrong on both
    // targets: CSS would honour it and React Native would multiply it by the font size.
    if (tracking !== '0' && !/^-?\d*\.?\d+em$/u.test(tracking))
      throw new ManifestError(
        `typography.scale.${name}.tracking`,
        `expected an em value or "0", got "${tracking}" — tracking is relative to the font size`,
      );
    const step: TypeStep = {
      size: requireNumber(o['size'], `typography.scale.${name}.size`),
      lineHeight: requireNumber(o['lineHeight'], `typography.scale.${name}.lineHeight`),
      tracking,
      weight: requireNumber(o['weight'], `typography.scale.${name}.weight`),
    };
    typeScale[name] =
      o['transform'] === undefined
        ? step
        : {
            ...step,
            transform: requireString(o['transform'], `typography.scale.${name}.transform`),
          };
  }

  const leadingRaw = requireRecord(typoRaw['lineHeight'], 'typography.lineHeight');
  const latinLeading = requireNumber(leadingRaw['latin'], 'typography.lineHeight.latin');
  const japaneseLeading = requireNumber(leadingRaw['japanese'], 'typography.lineHeight.japanese');
  // The whole reason the manifest carries two is that they differ. If they are ever equal,
  // the Japanese layout is Latin layout that nobody checked in Japanese.
  if (japaneseLeading <= latinLeading)
    throw new ManifestError(
      'typography.lineHeight.japanese',
      `must exceed latin (${String(latinLeading)}); Japanese needs more leading at the same ` +
        'size, and a single value for both is a layout only ever checked in one language',
    );
  const leading: Readonly<Record<Script, number>> = {
    latin: latinLeading,
    japanese: japaneseLeading,
  };

  // --- elevation ----------------------------------------------------------------------
  const elevationRaw = requireRecord(root['elevation'], 'elevation');
  const levels: Record<string, string> = {};
  for (const [name, value] of Object.entries(elevationRaw)) {
    if (name.startsWith('_') || name === 'shadow') continue;
    levels[name] = requireString(value, `elevation.${name}`);
  }
  // Tonal, never shadow — a shadow tints what it surrounds, which is disqualifying next to
  // a colour sample. Enforced here so it cannot be relaxed in a component.
  const shadow = requireString(elevationRaw['shadow'], 'elevation.shadow');
  if (shadow !== 'none')
    throw new ManifestError(
      'elevation.shadow',
      `expected "none", got "${shadow}" — elevation is tonal here, because a shadow tints ` +
        'what it surrounds and the swatch rule forbids that next to a sample',
    );
  // Every level must name a real token, in every theme, or a surface resolves to undefined
  // on whichever theme the author was not looking at.
  //
  // `Object.hasOwn`, NOT `in`: `in` walks the prototype chain, so `"constructor"`,
  // `"toString"` and `"valueOf"` all pass an `in` check against a plain object and then
  // resolve to a Function at runtime. A check that accepts `elevation.2 = "toString"` is
  // failing open on the exact class of input it exists to reject
  // [[a-gate-that-errors-is-failing-open]].
  for (const theme of THEMES)
    for (const [level, token] of Object.entries(levels))
      if (!Object.hasOwn(themes[theme] ?? {}, token))
        throw new ManifestError(
          `elevation.${level}`,
          `"${token}" is not a token in color.${theme}`,
        );

  // --- motion -------------------------------------------------------------------------
  const motionRaw = requireRecord(root['motion'], 'motion');
  const durationsRaw = requireRecord(motionRaw['durations'], 'motion.durations');
  const durations: Record<string, number> = {};
  for (const [name, value] of Object.entries(durationsRaw)) {
    if (name.startsWith('_')) continue;
    durations[name] = requireNumber(value, `motion.durations.${name}`);
  }
  const easingRaw = requireRecord(motionRaw['easing'], 'motion.easing');
  const easing: Record<string, string> = {};
  for (const [name, value] of Object.entries(easingRaw)) {
    if (name.startsWith('_')) continue;
    easing[name] = requireString(value, `motion.easing.${name}`);
  }
  const animatable = motionRaw['animatable'];
  const forbidden = motionRaw['forbidden'];
  if (!Array.isArray(animatable) || animatable.some((a) => typeof a !== 'string'))
    throw new ManifestError('motion.animatable', 'expected an array of strings');
  if (!Array.isArray(forbidden) || forbidden.some((f) => typeof f !== 'string'))
    throw new ManifestError('motion.forbidden', 'expected an array of strings');

  const defaultTheme = requireString(root['defaultTheme'], 'defaultTheme');
  if (!(THEMES as readonly string[]).includes(defaultTheme))
    throw new ManifestError('defaultTheme', `expected one of ${THEMES.join(', ')}`);

  return {
    version: requireNumber(root['version'], 'version'),
    status: approvalStatus,
    defaultTheme: defaultTheme as Theme,
    color: themes as Manifest['color'],
    statusPairing: statusEntries,
    cvdPairs: {
      minSeparation: requireNumber(cvdRaw['minSeparation'], 'cvdPairs.minSeparation'),
      pairs,
    },
    salience,
    radius,
    spacing: { base: requireNumber(spacingRaw['base'], 'spacing.base'), scale },
    size,
    typography: {
      families,
      scale: typeScale,
      lineHeight: leading,
      numeric: {
        fontFeature: requireString(
          requireRecord(typoRaw['numeric'], 'typography.numeric')['fontFeature'],
          'typography.numeric.fontFeature',
        ),
      },
    },
    elevation: { levels, shadow },
    motion: {
      durations,
      easing,
      animatable: animatable as string[],
      forbidden: forbidden as string[],
    },
    exceptions,
    gate: {
      contrast: {
        standard: requireString(contrastRaw['standard'], 'gate.contrast.standard'),
        normalText: requireNumber(contrastRaw['normalText'], 'gate.contrast.normalText'),
        largeText: requireNumber(contrastRaw['largeText'], 'gate.contrast.largeText'),
        nonText: requireNumber(contrastRaw['nonText'], 'gate.contrast.nonText'),
        reportAPCA: contrastRaw['reportAPCA'] === true,
        largeTextMinPx: requireNumber(
          contrastRaw['largeTextMinPx'],
          'gate.contrast.largeTextMinPx',
        ),
        largeTextMinBoldPx: requireNumber(
          contrastRaw['largeTextMinBoldPx'],
          'gate.contrast.largeTextMinBoldPx',
        ),
        blockingWhenStatus: requireString(
          contrastRaw['blockingWhenStatus'],
          'gate.contrast.blockingWhenStatus',
        ),
        chromaCeiling: {
          maxChroma: requireNumber(ceiling['maxChroma'], 'gate.contrast.chromaCeiling.maxChroma'),
        },
      },
    },
  };
}
