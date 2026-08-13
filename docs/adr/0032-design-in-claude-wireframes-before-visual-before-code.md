# ADR-0032 — Design happens in Claude, wireframes before visual design, both before code

## Status

Accepted

## Date

2026-08-14

## Context

[`DESIGN-BRIEF.md`](../design/DESIGN-BRIEF.md) §7 said the design deliverable could arrive
in "whatever format reviews best". That was correct while the tool was undecided and is now
under-specified: we know the tool, and leaving the fidelity staging implicit is how a
wireframe review turns into an argument about a shade of grey.

Two things need fixing.

**The tool.** Design is produced in **Claude** rather than Figma. That is a real
constraint, not a neutral substitution. It means designs arrive as **code** — HTML and
inline SVG — which is an advantage (a wireframe can be inspected in a browser, measured,
run through axe, and viewed at any width) and a limitation (no component library, no
auto-layout, no comment threads pinned to a rectangle).

**The staging.** A single "design deliverable" collapses two reviews that need to happen
separately. Reviewing structure and visual treatment together produces the worst of both:
feedback about type weight arrives before anyone has agreed what is on the page, and a
structural objection surfaces after the colours have been chosen and are expensive to
revisit.

This matters more here than in most products. Half the hard constraints in the design brief
are about **what colour does to perception** — C1 (the interface must not decorate with
colour), C6 (no gradients or shadows near a swatch), C7 (motion must not alter a colour).
Those cannot be judged from a wireframe, and the structural questions cannot be judged once
the page is full of colour.

## Decision

**Three stages, each with its own approval. Nothing proceeds to the next until the previous
one is signed off.**

### Stage 1 — Wireframes

Structure, hierarchy, content, states, flow. **Greyscale.**

One exception, and it is the important one: **a colour sample is content, not decoration.**
Wireframes show a real representative colour where a sample would appear, because C1 is
only testable if you can see a sample sitting inside the chrome. Everything else is neutral.

Delivered as an inspectable page, annotated in place. What is being approved: *is this the
right content, in the right order, with the right states?*

### Stage 2 — Visual design

Type, spacing, the OKLCh token values, the mark, motion. Built on approved wireframes.

What is being approved: *does this read as precise, honest, calm, editorial, accessible,
unisex — and can you still judge a garment colour accurately inside it?*

### Stage 3 — Code

Implementation against the approved design. The token values land in
[`design-system.manifest.json`](../design/design-system.manifest.json) and its `status`
moves from `placeholder` to `approved`, **which makes the contrast gate blocking**.

### What Claude-as-the-design-tool means concretely

| | |
|---|---|
| **Format** | HTML with inline SVG. Self-contained, no external assets |
| **Review** | Published as an artifact — openable, resizable, inspectable |
| **Annotation** | In the page, beside what it describes. Not a separate document |
| **Fidelity discipline** | Stage 1 is greyscale by rule, not by preference |
| **Iteration** | Redeploy the same file to the same URL; the link is stable across revisions |
| **Verification** | Because it is real HTML, axe and a contrast check can run against a design **before** it is implemented |

That last row is the genuine advantage over a static design tool, and it is why the tool
choice is worth recording rather than treating as incidental. A contrast failure found in
Figma is a note; a contrast failure found in a wireframe is a test result.

### What we give up, and how we compensate

| Lost | Compensation |
|---|---|
| A component library with variants | The component set is specified in [`DESIGN-BRIEF.md` §5](../design/DESIGN-BRIEF.md) and becomes `@irodora/ui`, which is the real library |
| Auto-layout | CSS grid and flex are the layout system anyway |
| Pinned comment threads | Numbered annotations in the page; feedback references the number |
| Designer-tool handoff specs | The design **is** the spec — it is inspectable markup |
| Rapid visual exploration | Genuinely slower. Accepted: this product's design problem is restraint, not exploration |

## Consequences

**Good.** The design is inspectable, measurable and testable before implementation — axe and
contrast checks can run against a wireframe. There is no handoff translation step and
therefore no handoff drift. Revisions keep a stable URL. And separating the two reviews
means structural feedback arrives while structure is still cheap to change.

**Bad.** Visual exploration is slower than in a dedicated tool — trying six type
treatments is six code edits, not six duplicated frames. There is no component library, so
consistency across screens depends on discipline rather than on instances. No pinned
comments, so feedback is less precisely located. And a stage-1 review that strays into
visual feedback wastes both parties' time, which means the fidelity rule has to be enforced
rather than assumed.

**Neutral.** Design artefacts live outside the repository as published pages; what lands in
the repository is the token manifest and the component specification, which is what the code
actually consumes.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Figma** | Mature, excellent exploration, real component variants, pinned comments, and every designer knows it. But it adds a handoff translation step that drifts, it cannot run axe against a design, and the user has chosen not to use it. The exploration advantage is worth less here than usual — the design problem is restraint, not breadth |
| **One combined design stage** | Fewer review cycles. Collapses two distinct questions: feedback about type weight arrives before anyone has agreed what is on the page, and structural objections surface after the colours are expensive to change |
| **Wireframes in colour** | Faster, arguably more realistic. Defeats the purpose — the whole point of stage 1 is to settle structure while colour is not yet an argument, and this product's colour decisions are perceptual constraints that deserve their own review |
| **Skip wireframes; design directly** | Fastest to something that looks finished. Structural mistakes then get discovered during visual design, when the cost of changing them is highest |

## Revisit when

- A component library becomes necessary enough that maintaining consistency by hand
  measurably fails — the point at which `@irodora/ui` should be built *before* the remaining
  designs rather than after.
- The visual-exploration cost becomes the bottleneck rather than the review cost.
