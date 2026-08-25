/**
 * The English catalogue — **and the source of the key set** (ADR-0056).
 *
 * `MessageKey` is `keyof typeof en`, and `ja` is typed `Record<MessageKey, string>`. That is
 * the whole completeness mechanism: a **missing** key fails `tsc`, an **extra** key fails
 * `tsc`, and neither can be switched off by configuration.
 *
 * ADR-0028 forbids fallback, and fallback is the core behaviour of every mainstream runtime
 * i18n library — `fallbackLng` is a flag, and a guarantee that depends on a flag staying false
 * is a reminder, not a guarantee. This is the same move as `Provenance` on `Color`:
 * [[provenance-in-the-type-is-what-makes-honesty-structural]].
 *
 * ## Writing rules that are not style preferences
 *
 * **Prefer copy that does not inflect.** We have no ICU (ADR-0056's stated cost), so "2
 * colours" is written as a count beside a noun rather than as a pluralised sentence. That is a
 * constraint on the writing, not only on the code.
 *
 * **Say only what the system can demonstrate** (NFR-21, ADR-0031). The claims lint reads these
 * strings like any other source, so the banned overstatements fail the build here exactly as
 * they would in a component — as this very paragraph found out: its first draft quoted two of
 * them as examples and the lint rejected it, correctly, because a lint that trusted intent
 * would be trusting the thing it exists to check. claims-ok: names the rule without using a
 * banned construction; the phrases themselves live in claims.json, which is their one home.
 */

export const en = {
  'home.title': 'The engine is running on this device',
  'home.offline': 'Computed here, offline. Nothing was sent anywhere.',
  'colour.hex': 'Hex',
  'colour.coordinates': 'OKLCh',
  'colour.source': 'Source',
  'colour.difference': 'Difference',
  /** The unit is a name, not a claim — ΔE00 is a defined quantity, not an accuracy statement. */
  'colour.differenceUnit': 'ΔE00',
  'sample.indigo': 'Indigo',
  'sample.blueBlack': 'Blue-black',

  'atlas.title': 'Colour Atlas',
  'home.openAtlas': 'Browse the colours',

  'compare.title': 'Compare two colours',
  'compare.slotA': 'First colour',
  'compare.slotB': 'Second colour',
  'compare.choose': 'Choose a colour',
  'compare.difference': 'Difference',
  'compare.perAxis': 'Difference on each axis',
  'compare.separation': 'Separation for colour vision',
  'compare.contrast': 'Contrast',
  'compare.sameColour': 'These are the same entry, so every difference is zero.',
  'unit.deltaE00': 'ΔE00',
  'unit.lc': 'Lc',
  'space.cielab': 'CIELAB (D65)',
  'space.oklch': 'OKLCh',
  'space.srgb': 'encoded sRGB',
  'axis.labL': 'Lightness L*',
  'axis.labA': 'Green–red a*',
  'axis.labB': 'Blue–yellow b*',
  'axis.oklchL': 'Lightness L',
  'axis.oklchC': 'Chroma C',
  'axis.oklchH': 'Hue h',
  'contrast.wcag': 'WCAG 2.2 ratio',
  'contrast.apcaBOnA': 'APCA — second on first',
  'contrast.apcaAOnB': 'APCA — first on second',
  'contrast.apcaNote':
    'APCA is directional: which colour is the text changes the reading. WCAG is not.',
  'separation.score': 'Separation',
  'separation.deltaE00': 'Difference when simulated',
  'separation.lightness': 'Lightness difference',
  'separation.severity': 'Simulated at the strongest tabulated severity.',
  'home.openCompare': 'Compare two colours',
  'atlas.corpus': 'Corpus',
  'atlas.colours': 'colours',
  'atlas.palettes': 'palettes',
  'atlas.search': 'Search by name or reading',
  'atlas.filters': 'Filters',
  'atlas.all': 'All',
  'atlas.clear': 'Clear',
  'atlas.showing': 'Showing',
  'atlas.empty': 'No colour matches these filters.',
  'atlas.emptyHint': 'Clear them to see the whole corpus.',
  'filter.family': 'Family',
  'filter.temperature': 'Temperature',
  'filter.lightness': 'Lightness',
  'filter.chroma': 'Chroma',
  'filter.season': 'Season',
  'temperature.warm': 'Warm',
  'temperature.cool': 'Cool',
  'temperature.neutral': 'Neither',
  'band.dark': 'Dark',
  'band.mid': 'Medium',
  'band.light': 'Light',
  'chroma.low': 'Low',
  'chroma.mid': 'Medium',
  'chroma.high': 'High',
  'season.spring': 'Spring',
  'season.summer': 'Summer',
  'season.autumn': 'Autumn',
  'season.winter': 'Winter',
  'classification.historical': 'Historical',
  'classification.traditional': 'Traditional',
  'classification.modern-japanese': 'Modern Japanese',
  'classification.japanese-inspired': 'Irodora original, Japanese-inspired',
  'classification.editorial': 'Irodora original',
  'role.anchor': 'Anchor',
  'role.neutral': 'Neutral',
  'role.light': 'Light',
  'role.accent': 'Accent',
  'detail.names': 'Names',
  'detail.kanji': 'Kanji',
  'detail.kana': 'Kana',
  'detail.romaji': 'Romaji',
  'detail.english': 'English',
  'detail.coordinates': 'Coordinates',
  'detail.description': 'Description',
  'detail.contemporary': 'In use today',
  'detail.fashionUse': 'Worn as',
  'detail.taxonomy': 'Classification',
  'detail.provenance': 'Where this colour came from',
  'detail.relations': 'Related colours',
  'detail.palettes': 'In these palettes',
  'detail.colourVision': 'Colour vision',
  'detail.editorialNotes': 'Editorial notes',
  'detail.notFound': 'That colour is not in this corpus version.',
  'detail.notRecorded': 'Not recorded',
  'coord.xyz': 'XYZ (D65)',
  'coord.lab': 'CIELAB',
  'coord.lch': 'CIELCh',
  'coord.oklch': 'OKLCh',
  'coord.rgb': 'sRGB',
  'coord.inGamut': 'Fits inside sRGB',
  'coord.outOfGamut': 'Outside sRGB — the hex below is the nearest sRGB rendering',
  'coord.renderDifference': 'Difference to what the screen draws',
  'prov.source': 'Source',
  'prov.sourceId': 'Register id',
  'prov.sourceType': 'Kind of source',
  'prov.licence': 'Licence',
  'prov.rightsHolder': 'Rights holder',
  'prov.publisher': 'Publisher',
  'prov.publishedYear': 'Published',
  'prov.url': 'Link',
  'prov.derivation': 'How this value was obtained',
  'prov.author': 'Written by',
  'prov.reviewer': 'Checked by',
  'prov.reviewedAt': 'Checked on',
  'prov.independence': 'Review',
  'independence.independent': 'Checked by someone other than the author',
  'independence.self': 'Checked by its own author',
  'sourceType.measurement': 'Measurement',
  'sourceType.publication': 'Publication',
  'sourceType.museum-record': 'Museum record',
  'sourceType.editorial': 'Our own editorial work',
  'sourceType.standard': 'Published standard',
  'rel.related': 'Close in colour',
  'rel.complementary': 'Opposite in hue',
  'rel.historicalVariants': 'Historical variants',
  'rel.none': 'None recorded',
  'cvd.normal': 'As specified',
  'cvd.protan': 'Red-weak (protan)',
  'cvd.deutan': 'Green-weak (deutan)',
  'cvd.tritan': 'Blue-weak (tritan)',
  'cvd.note':
    'Simulated on this device with a published model, at its strongest tabulated severity. A simulation is a model, not what another person sees.',
  // F-020 — Palette Studio (FR-49).
  'home.openStudio': 'Build a palette',
  'studio.title': 'Palette Studio',
  'studio.origin': 'Made by you, on this device. It is not part of the Irodora corpus.',
  'studio.name': 'Palette name',
  'studio.nameHint': 'Evening walk',
  'studio.members': 'Colours in this palette',
  'studio.order': 'The order sets how much of the palette each colour takes.',
  'studio.role': 'Role',
  'studio.moveUp': 'Move up',
  'studio.moveDown': 'Move down',
  'studio.remove': 'Remove',
  'studio.empty': 'No colours yet.',
  'studio.emptyHint': 'Search below and choose a colour to add it.',
  'studio.add': 'Add a colour',
  'studio.save': 'Save palette',
  'studio.saved': 'Saved to this device.',
  'studio.yours': 'Palettes you have saved',
  'studio.none': 'Nothing saved yet.',
  'studio.open': 'Open',
  'studio.delete': 'Delete this palette',
  'studio.new': 'Start a new palette',
  'studio.problem.empty': 'Add at least one colour before saving.',
  'studio.problem.noAnchor':
    'One colour must be the anchor — the one the others are chosen against.',
  'studio.problem.noName': 'Give the palette a name before saving.',
  'studio.problem.other': 'This palette cannot be saved yet.',
  // F-021 — Colour Finder (FR-47).
  'home.openFinder': 'Find a colour',
  'finder.title': 'Colour Finder',
  'finder.search': 'Name, reading, hex, or a phrase',
  'finder.hint': 'Try a name, a hex like #526A6B, or “dark muted green”.',
  'finder.empty': 'Type something to search.',
  'finder.none': 'Nothing matches that.',
  'finder.answered.hex': 'Nearest colours to that hex',
  'finder.answered.phrase': 'Colours in the region that phrase describes',
  'finder.answered.name': 'Colours whose name matches',
  'finder.region': 'That phrase means',
  'finder.vocabulary': 'Vocabulary',
  'finder.noneHexHint': 'Every colour in this version is further away than the list shows.',
  'finder.nonePhraseHint': 'No colour in this version falls inside that region.',
  'finder.noneNameHint': 'No name, reading or slug contains that.',
  'axis.hue': 'Hue',
  // F-023 — Shareable colour cards (FR-50).
  'card.title': 'Colour card',
  'card.attribution': 'Irodora',
  'card.thumbnail': 'At thumbnail size',
  'card.note':
    'Generated on this device from the pinned corpus version. The same colour at the same version gives the same card.',
  'card.export': 'Saving the card to a file arrives with export.',
  'detail.openCard': 'See its card',
} as const;

/** Every key the app may render. Derived, never listed twice. */
export type MessageKey = keyof typeof en;

/** Every key, as data — for the completeness and unused-key checks. */
export const MESSAGE_KEYS = Object.keys(en) as readonly MessageKey[];
