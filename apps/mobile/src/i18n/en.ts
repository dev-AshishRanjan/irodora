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

  /*
   * F-026 — guided personal colour profile setup (FR-26, FR-30).
   *
   * Two rules govern every string below. **Nothing may read as a measurement**: this is an
   * estimate from twelve forced choices and the copy says so in `profile.estimate`, which is
   * why the summary opens with an invitation to correct it rather than with a verdict
   * (ADR-0031, ADR-0010 §6). **Nothing may name a duration**: FR-26's 90 seconds is a design
   * budget nobody has measured, and a sentence quoting it would be the claim the budget was
   * carefully written not to make.
   */
  'home.openProfile': 'Build your colour profile',
  'profile.title': 'Your colour profile',
  'profile.privacy': 'No camera. Everything stays on this device.',
  /*
   * The photo path's version of the same claim, and the reason there are two.
   *
   * 'profile.privacy' says "No camera", which was simply true until F-097 gave the photo path a
   * producer. A privacy claim that quietly stops being true is worse than one never made, and
   * nothing would have failed: the string still exists, still renders, still reads well.
   *
   * This one says only what is true of that path — a frame was looked at and discarded, and
   * nothing left the device. It is the same claim NSCameraUsageDescription makes at the moment
   * permission is asked for, which is where a person first reads it.
   */
  'profile.privacyPhoto':
    'The camera looked once and the picture was discarded. Everything stays on this device.',
  /*
   * THE LENS (FR-13, F-097). What this copy may never say is "measure": a camera reading is
   * `estimated` provenance, and NFR-21's claims lint binds the word to `reference` and
   * `calibrated` (ADR-0031). It reads, it says how sure it is, and it never says how accurate
   * it is — because nobody has established that (NFR-23 is F-037's study and has not run).
   */
  'home.openLens': 'Read a colour with the camera',
  'home.openShopping': 'Check something before buying',
  'lens.title': 'Lens',
  'lens.privacy':
    'Frames are looked at on this device and discarded. Nothing is saved and nothing is sent.',
  'lens.viewfinder': 'Camera view. The colour under the centre of the frame is read continuously.',
  'lens.askTitle': 'The Lens needs the camera',
  'lens.askBody': 'Only to read the colour in front of it. No picture is kept.',
  'lens.ask': 'Allow the camera',
  'lens.deniedTitle': 'The camera is not available',
  'lens.deniedBody':
    'Camera access was turned off for Irodora. You can turn it back on in your device settings. Everything else in the app works without it.',
  'lens.waiting': 'Point the centre of the frame at a colour.',
  'lens.noReading': 'No colour has been read yet.',
  'lens.conditions': 'Conditions',
  'lens.confidence': 'How sure this reading is, from 0 to 1',
  'lens.reading': 'The colour under the crosshair',
  'lens.samples': 'Pixels used',
  'lens.nearest': 'Closest colours in the corpus',
  'lens.useForProfile': 'Use this colour for my profile',
  'lens.useForProfileNote':
    'It proposes a starting point you can change. Nothing is saved until you confirm it on the next screen.',
  'lens.light.daylight': 'Daylight',
  'lens.light.warmIndoor': 'Warm indoor light',
  'lens.light.coolIndoor': 'Cool indoor light',
  'lens.light.mixed': 'Mixed light',
  'lens.light.lowLight': 'Low light',
  'lens.light.unknown': 'Light not identified',
  'lens.space.srgb': 'sRGB',
  'lens.space.displayP3': 'Display-P3',
  'lens.space.unknown': 'Colour space not stated by the camera',
  'profile.progress': 'Comparison',
  'profile.question': 'Which would you rather wear?',
  'profile.choose': 'Choose',
  'profile.summary': 'What your answers suggest',
  'profile.estimate':
    'An estimate from the colours you chose, not a measurement. Change anything that is wrong — a change you make is kept.',
  'profile.corrected': 'You set this.',
  'profile.confidence.agreed': 'Your answers agreed on this.',
  'profile.confidence.split': 'Your answers were split, so this is less certain.',
  'profile.confidence.none': 'Not asked yet.',
  'profile.dim.lightness': 'Lightness range',
  'profile.dim.temperature': 'Warm or cool',
  'profile.dim.chroma': 'How much colour',
  'profile.dim.contrast': 'Contrast',
  'profile.dim.neutrals': 'Neutrals',
  'profile.dim.accents': 'Accents',
  'profile.dim.avoid': 'Harder to wear',
  'profile.band.dark': 'Darker',
  'profile.band.mid': 'Middle',
  'profile.band.light': 'Lighter',
  'profile.band.wide': 'All of it',
  'profile.chromaBand.low': 'Muted',
  'profile.chromaBand.mid': 'Moderate',
  'profile.chromaBand.high': 'Strong',
  'profile.temp.cool': 'Cool',
  'profile.temp.leansCool': 'Leans cool',
  'profile.temp.leansWarm': 'Leans warm',
  'profile.temp.warm': 'Warm',
  'profile.contrast.low': 'Soft',
  'profile.contrast.medium': 'Middle',
  'profile.contrast.high': 'Strong',
  'profile.keep': 'Keep',
  'profile.drop': 'Not this one',
  'profile.listEmpty': 'Nothing here, and that is an answer rather than a gap.',
  'profile.save': 'Save this profile',
  'profile.saved': 'Saved on this device.',
  'profile.notFinished': 'Every comparison needs an answer before this can be saved.',
  'profile.restart': 'Compare again',
  'profile.restartHint': 'Anything you set by hand stays as you set it.',

  /*
   * F-027 — photo-assisted setup (FR-27).
   *
   * `profile.fromPhoto` is a SECOND admission rather than a reworded first one. The guided path
   * has one thing to say — this is an estimate, correct it. The photo path has two: it is a
   * weaker estimate, and the reason is that a camera reads the room as much as the person
   * (ADR-0010 §2). Saying only the first would leave the weaker confidence looking arbitrary.
   */
  'profile.fromPhoto':
    'This came from one camera reading. A camera reads the light in the room as much as it reads you, so this is a weaker starting point than the comparisons — check each line.',
  'profile.confirm': 'This looks right',
  'profile.compareInstead': 'Answer the comparisons instead',
  'profile.confirmHint': 'Check the estimate and confirm it before saving.',

  /*
   * F-032 — CVD outfit mode (FR-35).
   *
   * EVERY STRING HERE IS AN OBSERVATION ABOUT THE COLOURS, NEVER ABOUT THE READER. "These two
   * are hard to tell apart" — not "you may not be able to distinguish these". The product knows
   * nothing about anybody's vision and must not imply that it does; that is criterion 3, and
   * `test/cvd-mode.test.ts` checks it with a decoy rather than trusting this comment.
   *
   * There is also no simulation preview to write copy for. A display filter shows a person what
   * their palette looks like TO SOMEONE ELSE, which is the industry default and helps designers
   * [[cvd-is-scoring-not-rendering]].
   */
  'cvd.title': 'Telling these apart',
  'cvd.none': 'Every pair here stays distinguishable under the three common colour-vision types.',
  'cvd.hard': 'These two are hard to tell apart',
  'cvd.separation': 'Separation',
  'cvd.swapTo': 'Swapping the second for this raises it to',
  'cvd.improvement': 'A gain of',
  'cvd.noAlternative': 'No colour in this version separates enough better to be worth the swap.',
  'cvd.method':
    'Measured on this device with a published model, at its strongest tabulated severity, against the pinned corpus version.',

  /* The wardrobe (FR-40, F-043). */
  'wardrobe.title': 'Add a garment',
  'wardrobe.type': 'What is it?',
  'wardrobe.typeHint': 'Jumper, coat, scarf',
  'wardrobe.colour': 'Its colour',
  'wardrobe.fromLens': 'Use the Lens reading — an estimate, not a match',
  'wardrobe.pickColour': 'Choose a colour',
  'wardrobe.photo': 'Photograph',
  'wardrobe.photoLibrary': 'Choose a photo',
  'wardrobe.photoCamera': 'Take a photo',
  'wardrobe.photoAttached': 'Photograph attached. It stays on this device.',
  'wardrobe.photoRejected': 'That file could not be used.',
  'wardrobe.optional': 'Everything below is optional',
  'wardrobe.brand': 'Brand',
  'wardrobe.size': 'Size',
  'wardrobe.save': 'Add to wardrobe',
  'wardrobe.saved': 'Added to your wardrobe.',
  'wardrobe.noType': 'Say what it is, and you can add it.',
  'wardrobe.noColour': 'Choose a colour, and you can add it.',
  'wardrobe.unknownSlug': 'That colour is not in this version of the collection.',
  'wardrobe.count': 'In your wardrobe',
  // F-051 — a price arrives with its currency or not at all (FR-46).
  'wardrobe.cost': 'What it cost',
  'wardrobe.costHint': 'e.g. 45.50',
  'wardrobe.currency': 'Currency code',
  'wardrobe.currencyHint': 'e.g. GBP',
  'wardrobe.costNotRecorded': 'Not recorded.',
  'wardrobe.costNoAmount': 'A price needs an amount as well as a currency.',
  'wardrobe.costBadAmount': 'Digits and at most one point, like 45.50.',
  'wardrobe.costBadCurrency': 'A three-letter currency code, like GBP or JPY.',
  'wardrobe.costTooPrecise': 'More decimal places than this currency has.',

  /* The outfit builder (FR-33, F-045). */
  'outfit.title': 'Build an outfit',
  'outfit.top': 'Top',
  'outfit.trouser': 'Trousers',
  'outfit.shoe': 'Shoes',
  'outfit.slotEmpty': 'Nothing chosen yet',
  'outfit.lock': 'Lock',
  'outfit.unlock': 'Unlock',
  'outfit.lockedNote': 'Locked. Other slots are chosen to go with this one.',
  'outfit.suggested': 'From your wardrobe',
  'outfit.overall': 'Overall',
  'outfit.empty': 'Nothing in your wardrobe fits a slot yet. Add a top, trousers or shoes.',
  /*
   * The compatibility explanation (FR-29, F-052).
   *
   * These twelve keys are `@irodora/recommendation`'s `MESSAGE_KEYS`, emitted by `scoreColor`
   * since R3 and rendered by nothing until now — the engine holds no catalogue by design
   * (FR-11), and until F-052 nothing in the app called `scoreColor` at all. E-053 is the link,
   * and `i18n.test.ts` is the guard that stops the engine emitting a key this cannot render.
   *
   * `supports` is a fit above 0.66, `opposes` below 0.34, `neutral` in between — so the middle
   * one says the factor did not weigh in, NOT that it was neither good nor bad in some deeper
   * sense.
   */
  'explain.temperature.supports': 'Its warmth sits with yours.',
  'explain.temperature.opposes': 'Its warmth works against yours.',
  'explain.temperature.neutral': 'Its warmth neither helps nor hurts.',
  'explain.lightness.supports': 'It sits inside your lightness range.',
  'explain.lightness.opposes': 'It sits outside your lightness range.',
  'explain.lightness.neutral': 'Its lightness neither helps nor hurts.',
  'explain.chroma.supports': 'It carries about as much colour as suits you.',
  'explain.chroma.opposes': 'It carries more or less colour than suits you.',
  'explain.chroma.neutral': 'How much colour it carries neither helps nor hurts.',
  'explain.contrast.supports': 'Its contrast is the strength you wear well.',
  'explain.contrast.opposes': 'Its contrast is stronger or softer than you wear well.',
  'explain.contrast.neutral': 'Its contrast neither helps nor hurts.',

  // F-052 — the shopping check (FR-52).
  'shopping.title': 'Before you buy',
  'shopping.origin':
    'Checked against your wardrobe on this device. Nothing is sent anywhere, and nothing is saved.',
  'shopping.now': 'Outfits your wardrobe makes now',
  'shopping.unlocked': 'New outfits this would add',
  'shopping.countedAt': 'Counted at',
  'shopping.noSlot':
    'Outfits are counted from tops, trousers and shoes. There is no slot for that, so there is no count — the other two answers still hold.',
  'shopping.compatibility': 'How it suits you',
  'shopping.evidence': 'How much of your profile was speaking',
  'shopping.noProfile': 'Set up a colour profile, and this will say how the colour suits you.',
  'shopping.duplicate': 'You own something close to this already',
  'shopping.noDuplicate': 'Nothing in your wardrobe is this close.',
  'shopping.empty': 'Add something to your wardrobe first, and this has something to compare.',

  // F-051 — cost per wear, and the three ways there is not one (FR-46).
  'outfit.perWear': 'Per wear',
  'outfit.perWearBasis': 'Price and wears',
  'outfit.costNoCost': 'No price recorded, so there is no cost per wear.',
  'outfit.costNoCurrency': 'A price with no currency, so there is no cost per wear.',
  'outfit.costNeverWorn': 'Not worn yet, so there is no cost per wear.',
  'outfit.wore': 'I wore this',
  'outfit.woreDone': 'Recorded. One more wear on each piece.',
  'outfit.woreNothing': 'Choose something, and you can record wearing it.',
  // F-109 — the preference weights are inspectable and resettable (FR-37).
  'preferences.title': 'What the app has learned',
  'preferences.origin':
    'Learned on this device, from outfits you kept and outfits you passed on. It never leaves the device.',
  'preferences.learned': 'Colour pairings',
  'preferences.formula':
    'The weight is calculated from the counts. Each step of the net moves it part of the way, up to a limit of',
  'preferences.accepted': 'Kept',
  'preferences.rejected': 'Passed',
  'preferences.net': 'Net',
  'preferences.weight': 'Weight',
  'preferences.empty': 'Nothing learned yet.',
  'preferences.emptyHint':
    'Keep or pass on an outfit and the pairing appears here, with the numbers behind it.',
  'preferences.resetTitle': 'Forget everything',
  'preferences.resetHint': 'Removes every pairing below and starts again from no preferences.',
  'preferences.reset': 'Forget everything',
  'preferences.resetCount': 'Pairings to forget',
  'preferences.resetIrreversible': 'This cannot be undone.',
  'preferences.resetCancel': 'Keep them',
  'preferences.resetDo': 'Forget them',
  // F-117 — a screen must never close the app when its native module will not load.
  'lens.unavailable': 'The camera is not available',
  'lens.unavailableBody':
    'This build cannot start the camera, so colour reading by camera is unavailable. Everything else in the app still works — the Atlas, the Finder, Compare and your wardrobe do not need a camera.',
  'lens.unavailableDetail':
    'If you are reporting this, the line below is the part that identifies the cause.',
} as const;

/** Every key the app may render. Derived, never listed twice. */
export type MessageKey = keyof typeof en;

/** Every key, as data — for the completeness and unused-key checks. */
export const MESSAGE_KEYS = Object.keys(en) as readonly MessageKey[];
