# E-064 — Virtualisation breaks a rendered-tree proxy, not the property it stood for

**Link:** `apps/mobile/src/screens/Atlas.tsx` → `screens.test.tsx` (F-018 criterion 1)
**Guard:** `gate:test` **Severity:** medium **Feature:** F-147

---

## What happened

F-018 criterion 1 is *"every corpus entry reachable in 3 interactions or fewer"*. It was asserted
by **walking the rendered tree for all 120 names**, and the doc comment said why that was fair:
the root lists the whole corpus with no filter, so reaching any entry is scroll-and-tap.

F-147 made the Atlas virtualise — because 120 eagerly-mounted subtrees is exactly what criterion
4 (*"smooth on a four-year-old mid-range Android"*) rules out. Two tests went red immediately.

**Neither was a regression.** *Reachable* was never the same as *simultaneously rendered*; the
rendered-tree walk was a proxy, and virtualisation invalidated the proxy while leaving the
property untouched.

## The fix, and why it is not a weakening

The property is now read where it is actually legible — **the list's `data`**, which still
carries all 120 slugs under no filter. That is a stronger statement than the old one in one
respect: it asserts the corpus reaches the list, rather than that a particular renderer happened
to mount it.

The second test kept its own point, which was different: *an entry is a colour, not only a name*.
It now asserts a **correspondence within the rendered window** — every entry whose kanji is in the
tree must have its hex there too. That survives virtualisation because it compares the window
against itself rather than against the corpus.

**Weakening one and keeping the other would have left "it draws colours" unchecked**, which is
the tempting move when a test goes red for a reason you believe is benign.

## The trap

A test that walks a rendered tree is asserting *what is mounted*. That is the right thing when
the question is about the tree — the conformance suite's colour and role checks genuinely are —
and the wrong thing when the question is about *reachability*, *content*, or *what a person can
get to*. The two are indistinguishable in a non-virtualised list, which is why the difference is
only discovered when something virtualises.

**Anything else in this repository that counts nodes to prove coverage has the same latent
problem.** Nothing else virtualises today.

## Related

- [[a-gate-must-model-what-renders-not-what-is-physically-correct]] — the same boundary from the
  other side: there, the tree was too generous; here, it became too narrow.
