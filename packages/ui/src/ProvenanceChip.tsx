/**
 * The provenance chip — where a colour came from, beside the sample it speaks for (F-233,
 * criterion 4; F-284).
 *
 * ## A member of the sample family, not a label beside it
 *
 * It takes the SAMPLE, not a string, so its words can only be that sample's provenance: the
 * caller supplies the copy for every source (`copy` is exhaustive over `MeasurementSource` by
 * type, so a new source cannot go unworded), and the chip picks the one the sample's `Color`
 * carries. A chip saying "Measured" beside an estimated reading cannot be written.
 *
 * ## Drawn where the mockups draw it
 *
 * No mockup draws a chip ON a sample; each sits beside or above it, in the same card, as a badge:
 * `03` outlined at 16.5 dp, `12` filled in `surface.2` at 18.5 dp, `24` filled at 25 dp and led by
 * the camera glyph. So it is `Chip form="badge"`, and the surface places it (P1).
 *
 * ## It honours `15`'s switch, and the announcement does not change
 *
 * With *Show Provenance Badges on Swatches* off it draws nothing. The provenance is still said:
 * the sample's own accessible name carries source and confidence (ADR-0005,
 * `swatchAccessibleName`), and this chip is outside that node, so turning the switch changes what
 * a person sees and not what a screen reader hears.
 */

import type { MeasurementSource } from '@irodora/color-core';
import { Chip } from './Chip.js';
import { useDisplaySettings } from './displaySettings.js';
import type { GlyphName } from './Glyph.js';
import type { Sample } from './inkOnSample.js';

export interface ProvenanceChipProps {
  /** The sample the chip speaks for. Its words are this sample's provenance and nothing else. */
  readonly sample: Sample;
  /** The words for every source. Exhaustive by type: a new source cannot go unworded. */
  readonly copy: Readonly<Record<MeasurementSource, string>>;
  /** `12` and `24` fill it in `surface.2`; `03` draws it outlined. */
  readonly fill?: 'surface.2';
  /** `24` leads it with the camera glyph. */
  readonly icon?: GlyphName;
  /** The drawn height in dp: `03` 16.5, `12` 18.5, `24` 25. */
  readonly height?: number;
  readonly testID?: string;
}

export function ProvenanceChip({
  sample,
  copy,
  fill,
  icon,
  height,
  testID,
}: ProvenanceChipProps): React.JSX.Element | null {
  const { provenanceBadges } = useDisplaySettings();
  if (!provenanceBadges) return null;
  return (
    <Chip
      form="badge"
      label={copy[sample.color.provenance.source]}
      {...(fill === undefined ? {} : { fill })}
      {...(icon === undefined ? {} : { icon })}
      {...(height === undefined ? {} : { height })}
      {...(testID === undefined ? {} : { testID })}
    />
  );
}
