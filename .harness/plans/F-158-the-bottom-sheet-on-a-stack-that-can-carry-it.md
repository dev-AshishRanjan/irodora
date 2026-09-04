# F-158 — The bottom sheet, on a stack that can carry it

**Status:** in_progress · **Release:** R6 · **Blocked by:** F-157 (done)

---

## Why this is being worked before F-149

F-149 was selected first, by id. Its criterion 3 reads *"The result arrives in a sheet that can
be acted on without losing the frame"* — and `@irodora/ui` exports no `Sheet`. F-158 criterion 1
is what creates one, and F-158 criterion 3 is **the same sentence about the Lens written from the
other side**.

Building a sheet inside F-149 would be scope creep into a feature that already exists. So the
dependency was recorded in the field where a blocked feature says what blocks it (F-137's
precedent), F-149 went back to backlog, and the order inverts. F-158 is eligible today: F-157 is
done, the gesture stack is pinned to 2.32.0 ([ADR-0089](../../docs/adr/0089-the-gesture-stack-is-pinned-to-the-version-heroui-was-built-against.md)),
and `@gorhom/bottom-sheet@5.2.14` is in the store.

---

## What was established by probing rather than by reading

A throwaway test rendered HeroUI's `BottomSheet` open under jest. Three findings, all of which
change the design:

**1. It renders, and its children are in the tree.** `queryByText` found the content. This was
the open question — a sheet that only mounts on a device would make criterion 2 impossible, and
it does not.

**2. The overlay scrim and the handle indicator both reach the tree through `style`.** `#00000080`
and `#888888` came back from a style walk, so the contrast gate can see both.

**3. `backgroundStyle` DID NOT reach the tree.** What came back instead was
`rgba(0, 0, 0, 0.75)` — HeroUI's own background layer, painting a colour nobody in this
repository chose, on the surface a reading is displayed against.

The third is the same hazard `background={null}` closes on `Dialog` and `Popover`, and it is
worse here: a sheet is where a **colour reading** is shown, so the ground behind the sample is
decided by the active library theme. That is precisely the simultaneous-contrast problem
`swatch.well` exists to prevent, and it is why the wrapper rule says a blur layer must never be
inherited.

**The fix is a custom `backgroundComponent`** — a plain `View` painted from `surface.2`, the top
radius and `border.strong`. It is the exact analogue of `background={null}` plus `style`, and it
puts the ground back under our control where the contrast gate measures it.

---

## What gets built

### 1. `Sheet` in `packages/ui/src/overlay.tsx`

The overlay family already lives there (F-143), and a sheet is one. **The collapsed API is
`Dialog`'s**, which criterion 1 asks for directly:

```ts
export interface SheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly closeLabel: string;
  readonly script?: Script;
  readonly children?: ReactNode;
  readonly testID?: string;
}
```

Same prop names, same order, same meanings. A person who has used `Dialog` can use this without
reading it, and — more to the point — a reviewer comparing the two can see at a glance that the
scrim, the title level and the script handling are the same decisions rather than three
independent ones.

Painted from tokens, all through `style`:

| Part            | Token                            |
| --------------- | -------------------------------- |
| scrim           | `backdrop`                       |
| ground          | `surface.2`                      |
| top corners     | `radius.lg`                      |
| edge            | `border.strong`                  |
| drag handle     | `border.strong`                  |

Content sizes to itself rather than taking a snap point. A result sheet whose height is a
fraction of the screen is either cropping the result or padding it, and the content is what
knows which.

### 2. The conformance subject (criterion 2)

Rendered **open**, in both themes, in the registry beside `Dialog`. A sheet registered closed
would assert nothing at all — the tree would be empty, and every rule would pass vacuously.

The subject renders a `Swatch` inside it, because that is what the Lens puts there and because it
is the case finding 3 makes dangerous: if the ground ever reverts to the library's own layer, the
swatch's well and keyline are being read against a colour nobody chose, and the contrast gate is
the thing that would notice.

### 3. The Lens presents its reading in one (criterion 3)

Today the Lens is one long scroll: privacy line, viewfinder, instruction, conditions, the reading
card, nearest names, then two offer buttons. **Acting on a reading means scrolling the camera off
the screen** — which is the specific thing the notes say a sheet fixes.

Moving into the sheet: the reading card, the nearest names, and both offer buttons.
Staying on the screen: the privacy line, the viewfinder, the permission states and the capture
instruction — the instruction especially, because it says what to change **about the frame**, and
putting it in a sheet over the frame is telling somebody to adjust something they can no longer
see.

The sheet opens when a reading arrives and closes on dismissal; a new reading opens it again. The
content is **moved, not redesigned** — F-149 is the feature that rebuilds the readout, and doing
it here would be the same scope creep this plan just refused in the other direction.

---

## The criterion that cannot be discharged here, and why it is stated up front

> **4. A person can open, drag and dismiss it on a device.**

**Its value IS the gesture.** `Popover` and `Tabs` are portal-and-press, and a rendered tree tells
you most of what you need; a sheet that mounts but does not drag is a modal with a bad shape and
every assertion in this repository would still pass.

Finding 1 above means the tree can be checked — that the content is there, that the scrim is
painted, that the ground is ours. It does not mean the pan gesture composes with the scroll view
inside it, which is the single most common way a sheet is broken, and which no jest tree can see.

So criterion 4 is **attested, not asserted**, and the honest form of that is to say which half a
passing suite covers rather than letting the green tick imply both.

---

## Risks

**The gesture stack is the thing F-157 just fixed.** RNGH is pinned at 2.32.0 and gorhom is the
heaviest consumer of it in the tree. If anything is still wrong there this is where it surfaces —
which is an argument for doing it now rather than later.

**A `jest.setup.js` mock still stubs `GestureDetector` in `apps/mobile`.** F-157 removed the one
in `packages/ui` and left this one, and its docblock still asserts two facts F-157 disproved. It
is out of scope here and already flagged; what matters for this feature is that the sheet's UI
package tests run against the real gesture stack, and they do.

**Uniwind logs a dev error** (`useCSSVariable`) when HeroUI components render under jest. Present
before this feature, noise rather than signal, and noted so it is not mistaken for something this
change introduced.

---

## Definition of done

- [ ] `Sheet` exported from `@irodora/ui`, collapsed API identical in shape to `Dialog`'s
- [ ] The library's own background layer is refused; the ground is `surface.2` through `style`
- [ ] Registered in the conformance registry, rendered **open**, in both themes
- [ ] The Lens reading, nearest names and both offers are in the sheet; the instruction is not
- [ ] Gates 0–4, 6, 8, 9 green, plus the motion gate
- [ ] Criterion 4 attested honestly as a device criterion
- [ ] Effects traced; `progress.md` records finding 3 as the thing a reader would not predict
