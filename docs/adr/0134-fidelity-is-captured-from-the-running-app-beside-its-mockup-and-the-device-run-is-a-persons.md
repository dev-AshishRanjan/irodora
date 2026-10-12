# ADR-0134 — Fidelity is captured from the running app beside its mockup, and the device run is a person's

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-12 |
| **Feature** | F-221 |
| **Builds on** | [ADR-0038](0038-every-acceptance-criterion-names-its-check.md) (attested criteria); [ADR-0086](0086-the-journey-is-a-maestro-flow-generated-from-a-spec.md) (generated Maestro flows); F-218's route index (`mockups/index.json`); F-220's inventories (`mockups/inventory/NN.json`); F-204's conformance sweep; the claims lint ([ADR-0031](0031-measurement-claims-policy.md)) |
| **Applies** | R9-MOCKUP-FIDELITY §4 E2, §12; golden rules 11 and 14; NFR-25, NFR-19 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* And the person's direction of 2026-10-12: *"I have ran the app on mobile device, everything is fine, nothing breaks. You can proceed further, and consider F-221's device run as done. And if in F-221, we need device attestation to complete it, and to run app on device after this task starts, then I can do that at the required time."* |

---

## Context

R9 is entirely about how things look, and until now its only evidence has been an agent saying a
screen matches its mockup. The conformance sweep says so itself: it *"cannot see a layout that is
cramped or unbalanced"*. F-221 makes fidelity a picture a person can check. Every route is captured
from the running app and put beside the mockup that governs it, a record says what was and was not
captured, the sweep asserts each enrolled inventory's elements are drawn, and the claims patterns
run over rendered text.

Three facts shape the decisions:

- **This workstation cannot run the app.** It has no JDK, no Maestro CLI and no AVD, and the person
  has said none will be installed. The person can run the app on their own device and will do so
  when a feature needs it.
- **The app has no web target and no screenshot path of its own.** A capture from a jest render or
  a web build would be a picture of something else, which criterion 2 rules out.
- **The person has run the app on their mobile device** (2026-10-12) and directed that F-221's
  prerequisite device run, F-091's owed Atlas journey, be treated as done. Their words do not name
  the journey's steps, the suite's no-socket assertion or a CI run, so F-091's three attested
  criteria stay outstanding (golden rule 11). F-221 is unblocked on the person's direction, and that
  is recorded where the block was.

What was read before deciding:

- `mockups/index.json` holds 28 images and 21 routes: 20 drawn, plus `/profile/measure`, undrawn
  under OQ-7.
- Each inventory's `frame.screens[].box` and `dpPerPx` give the screen's crop and scale in the
  board, for example `14.splash` at 414,345, 284×595 px, 1.3521 dp/px.
- `scripts/mockup-inventory.mjs` already reads JPEG and PNG sizes from their headers (`imageSize`).
- The app's appearance defaults to `system` (`packages/ui/src/theme.tsx`), its locale comes from
  `expo-localization`, and its scheme is `irodora`.
- Maestro writes `takeScreenshot: <path>` as `<path>.png` in a `takeScreenshot/` folder inside the
  run's `--test-output-dir` ([Maestro docs](https://docs.maestro.dev/api-reference/commands/takescreenshot)).
- Android 13 (API 33) added per-app languages through `LocaleManager`
  ([Android docs](https://developer.android.com/guide/topics/resources/app-languages)), and its
  service has shell commands under `cmd locale`. Their flags differ between releases, so the runner
  reads the setting back rather than trusting it.

## Decisions

### D1 — An element is found by what it draws, not by a marker

The inventory sweep finds each element on the rendered tree by a **locator**:

- **Derived from the inventory where it can be:**
  - a catalogue binding (`static:<key>`) is the catalogue's text in the locale, as a paragraph or an
    accessible name;
  - an `icon` is the glyph;
  - an `illustration` is the illustration;
  - a specific `@irodora/ui` component is that component, matched by reference.
- **Explicit everywhere else.** An engine, store or corpus value is matched by the text the screen's
  own function computes.
- **A `testID` only when its node draws something:** a paint, text or a glyph. Every element has
  exactly one locator, and every locator names an element.

**Rejected: stamping every inventory id onto the tree as a `testID`.** A marker proves a node claims
to be the element, not that the element is drawn; an empty `View` would pass. It also writes test
hooks into product code, collides with the structural ids that already exist (`state.*`, `launch.*`),
and ADR-0086 already refused `testID` as a selector.

### D2 (OQ-53) — Criterion 2 reads "an Android device or emulator"

Criterion 2 said *"on an Android emulator"*. The person will run the capture on their own device.
What the criterion protects is in its own words: *"not from a re-implementation of the screen — a
picture of something else is not evidence"*. A physical Android device meets that exactly as an
emulator does.

The criterion now reads *"an Android device or emulator"*, which is F-091 criterion 2's own wording.
Every run records the device model, its API level and whether it is an emulator. Attesting the old
wording over a phone run would overstate the evidence (golden rule 11). If the person's phone is not
Android, `maestro start-device --platform android` creates an emulator on their machine, and nothing
else changes.

### D3 — Rendered text comes from both the sweep and the device

- **The jest sweep, gated in `pnpm test`.** The criterion says a composed claim *"fails the sweep"*.
  The F-204 sweep already renders every registry subject in both locales, with and without motion. An
  optional `observe` hook on `checkAll` reads text from those renders, with no extra renders. That
  matters because `screens.test` has run out of memory before (F-240).
- **The device, for every capture.** `uiautomator dump`, taken straight after each screenshot. Its
  XML is documented and stable, so fixtures can be written without a device.
- **The unit of text is the paragraph, the visual line and the accessible name.** A visual line is
  sibling paragraphs in a row, joined. On the device, that means nodes whose bounds overlap
  vertically. A figure and its label in separate `Text`s are thereby read as the claim a person
  reads.

### D4 — The composition is an SVG, and adds no dependency

Each composed page is an SVG: the capture and its governing mockups as embedded images, each scaled
so one unit is one dp. A framed mockup is cropped to its inventory's screen box. Sizes come from
`imageSize()`.

**Rejected: compositing pixels.** It would need a JPEG decoder at the root, the only one in the
repository being an `apps/mobile` dependency under [ADR-0092](0092-pixels-come-out-of-a-file-in-javascript.md), plus a re-encode, and the person looking
gains nothing. Every embedded mockup's bytes must hash to its index row, or the composer throws, so
a picture can never sit beside a mockup that is not the specification.

### D5 — Theme and locale are set on the device, never in the app

- **Theme** is the system night mode, `cmd uimode night yes|no`, read back. The app's default
  `system` appearance follows it: Sumi in dark, Washi in light.
- **Locale** is the per-app locale on API 33 and later, read back and confirmed by a locale-specific
  anchor in each flow. `--locale-by-hand` is the fallback: the person sets the phone's language, and
  the anchors confirm it.

**Rejected: a deep-link parameter or a launch argument in the app.** That would be product code
written for a test.

### D6 — The runner clears the app, once per route, and only with consent

Each route starts from the state a fresh install reaches. The runner runs `pm clear` before each
route, then sets the locale again, and the flows launch without `clearState`. This erases the app's
data on the person's device, so the runner refuses to change anything without `--erase-app-data`.

It also writes `restore.txt` before its first change, and puts back what it changed in a `finally`
and on SIGINT:

- the display density, set so the screen is 384 dp wide;
- the font scale, set to 1;
- the animation scales, set to 0.

If a restore fails, it prints the commands that undo it.

### D7 — F-221 enrolls only what is built

The sweep's mechanism covers every inventory, but F-221 enrolls only the surfaces whose features are
done:

- `14.splash` (F-231);
- board 27's four cards (F-236).

Every other surface is **owed** by the features whose `mockups` field names it. The owners are read
from `feature_list.json`, so the sweep keeps no copy of R9 §7's feature column. A feature marked done
while its surface is still owed turns `pnpm test` red.

`00`, `14.icon`, `25` and `26` are not whole surfaces:

- `00` governs vocabulary;
- `14.icon` is an asset held by gate 16;
- `25` governs the light palette;
- `26` governs Japanese.

Each is recorded with its reason. The sweep asserts presence only. Order, grouping and proportion
belong to each surface feature's own first criterion.

## Consequences

- **Fidelity is a folder a person opens**, `.harness/verification/evidence/fidelity/<UTC>/compose/`,
  together with a record that cannot read alike for "nothing captured" and "no difference".
- **The device run is the person's.** `pnpm fidelity:capture -- --erase-app-data`, on an Android
  device or emulator with a non-debuggable build. Criteria 1, 2 and 5 carry attested entries with the
  exact command, and block the release until a run is recorded. A run's `raw/` folder can be sent
  back and recomposed here with `--compose`.
- **Everything else is gated here:** the flows by `generate-e2e-flows --check`; the composer, the
  record and the runner's orchestration by `fidelity-proof` in `lint`, with a fake device; the
  sweeps by `pnpm test`.
- **The device-side formats are documented, not yet observed:** `openLink`'s URL form,
  `takeScreenshot`'s folder, `uiautomator`'s XML, and `set-app-locales` through `pm clear`. Every
  step fails closed into the record, as not captured or unread. **Revisit this ADR after the first
  run**; anything the run shows needs fixing becomes a feature.

## Alternatives considered

| | why not |
|---|---|
| Capture jest renders as images | A picture of a re-implementation, which criterion 2 forbids, and react-test-renderer has no layout to draw |
| A web target for screenshots | There is none (no react-native-web), and a web layout is not the phone's |
| An emulator on this workstation | No JDK, by the person's standing decision |
| Wait for a CI device runner | F-091 criteria 3 and 4 are still outstanding, and R9 cannot wait for them |
| Pixel diffing against the mockups | The mockups are drawings, not renders; a threshold would be a number chosen to pass. The comparison is F-267's, and a person's |
