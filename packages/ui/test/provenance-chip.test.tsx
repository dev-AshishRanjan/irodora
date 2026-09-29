/**
 * The provenance chip (F-233, criterion 4; F-284's criteria 1 and 2).
 *
 * - **Its words are the sample's own provenance**, from copy the type makes exhaustive.
 * - **It honours `15`'s switch**: drawn when *Show Provenance Badges* is on, nothing when it is off.
 * - **The sample's accessible name is identical either way**, and still names source and
 *   confidence (ADR-0005) — asserted on the rendered tree beside a real `Swatch`.
 * - **It is drawn as the mockups draw it**: `03` outlined at 16.5 dp, `12` filled at 18.5, `24`
 *   filled at 25 and led by the camera glyph.
 */

import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import {
  fromSpace,
  MEASUREMENT_SOURCES,
  withProvenance,
  type MeasurementSource,
  type Provenance,
} from '@irodora/color-core';
import {
  DisplaySettingsProvider,
  DRAWN_DISPLAY_SETTINGS,
  ProvenanceChip,
  Swatch,
  swatchAccessibleName,
  ThemeProvider,
  type Sample,
} from '../src/index.js';
import { flattenStyle, type TestNode } from '../src/testing/index.js';

const COPY: Readonly<Record<MeasurementSource, string>> = {
  reference: 'Reference',
  calibrated: 'Calibrated',
  estimated: 'Estimated',
  declared: 'Declared',
  derived: 'Derived',
};
/** A provenance of each source. A capture owes its conditions (ADR-0005), so those carry them. */
const provenanceOf = (source: MeasurementSource): Provenance =>
  source === 'calibrated' || source === 'estimated'
    ? {
        source,
        confidence: 0.8,
        originSpace: 'oklch',
        conditions: { illuminant: 'daylight', quality: 'good', sampleCount: 64, variance: 0.01 },
      }
    : { source, confidence: 0.8, originSpace: 'oklch' };
const sampleOf = (source: MeasurementSource): Sample => ({
  hex: '#526A6B',
  color: withProvenance(
    fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 }),
    provenanceOf(source),
  ),
});

function draw(node: React.JSX.Element, provenanceBadges = true): TestNode {
  const rendered = render(
    <ThemeProvider theme="dark">
      <DisplaySettingsProvider settings={{ ...DRAWN_DISPLAY_SETTINGS, provenanceBadges }}>
        {node}
      </DisplaySettingsProvider>
    </ThemeProvider>,
  );
  const json = rendered.toJSON() as TestNode;
  rendered.unmount();
  return json;
}

function nodes(tree: TestNode): readonly TestNode[] {
  const out: TestNode[] = [tree];
  for (const child of tree.children ?? []) if (typeof child !== 'string') out.push(...nodes(child));
  return out;
}
const texts = (tree: TestNode): readonly string[] =>
  nodes(tree).flatMap((n) => (n.children ?? []).filter((c): c is string => typeof c === 'string'));

describe('its words are the sample’s own provenance', () => {
  it.each(MEASUREMENT_SOURCES)('%s: says what the sample carries, and nothing else', (source) => {
    const said = texts(draw(<ProvenanceChip sample={sampleOf(source)} copy={COPY} />));
    expect(said).toContain(COPY[source]);
    // DECOY: every other source's words are absent.
    for (const other of MEASUREMENT_SOURCES.filter((s) => s !== source))
      expect(said).not.toContain(COPY[other]);
  });

  it('refuses copy that leaves a source unworded', () => {
    // Every source but `derived`, written out so nothing is bound and left unread.
    const partial = {
      reference: COPY.reference,
      calibrated: COPY.calibrated,
      estimated: COPY.estimated,
      declared: COPY.declared,
    };
    const missing = (
      // @ts-expect-error — every source must have its words
      <ProvenanceChip sample={sampleOf('estimated')} copy={partial} />
    );
    expect(missing).toBeDefined();
  });
});

describe('15’s switch (F-284)', () => {
  const beside = (
    <View>
      <Swatch name="Ai-nezumi" hex="#526A6B" color={sampleOf('estimated').color} />
      <ProvenanceChip sample={sampleOf('estimated')} copy={COPY} />
    </View>
  );

  it('draws the chip when the switch is on, and nothing when it is off', () => {
    expect(texts(draw(beside, true))).toContain('Estimated');
    expect(texts(draw(beside, false))).not.toContain('Estimated');
  });

  it('leaves the sample’s accessible name identical, naming source and confidence', () => {
    const names = [true, false].map((on) =>
      nodes(draw(beside, on))
        // The SAMPLE's name: the chip has its own words, and is outside this node.
        .filter((n) => n.props['accessibilityRole'] === 'button')
        .map((n) => n.props['accessibilityLabel'])
        .filter((l): l is string => typeof l === 'string'),
    );
    expect(names[0]).toStrictEqual(names[1]);
    const expected = swatchAccessibleName('Ai-nezumi', '#526A6B', sampleOf('estimated').color);
    expect(names[1]).toStrictEqual([expected]);
    expect(expected).toMatch(/estimated, 80 percent confidence/u);
  });
});

describe('drawn as the mockups draw it', () => {
  const badge = (tree: TestNode): Record<string, unknown> => {
    const found = nodes(tree)
      .map((n) => flattenStyle(n.props['style']))
      .find((s) => typeof s['height'] === 'number');
    if (found === undefined) throw new Error('no badge');
    return found;
  };

  it('03: outlined, 16.5 dp; 12: filled, 18.5 dp; 24: filled, 25 dp, led by the camera', () => {
    const at = (node: React.JSX.Element): Record<string, unknown> => badge(draw(node));
    expect(
      at(<ProvenanceChip sample={sampleOf('estimated')} copy={COPY} height={16.5} />),
    ).toMatchObject({ height: 16.5 });
    expect(
      at(
        <ProvenanceChip
          sample={sampleOf('estimated')}
          copy={COPY}
          fill="surface.2"
          height={18.5}
        />,
      ),
    ).toMatchObject({ height: 18.5 });
    const camera = draw(
      <ProvenanceChip
        sample={sampleOf('estimated')}
        copy={COPY}
        fill="surface.2"
        icon="camera"
        height={25}
      />,
    );
    expect(badge(camera)).toMatchObject({ height: 25 });
    expect(nodes(camera).some((n) => n.type === 'RNSVGSvgView')).toBe(true);
  });
});
