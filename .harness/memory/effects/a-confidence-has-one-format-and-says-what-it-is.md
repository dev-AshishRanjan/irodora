# E-177 — A confidence has one format, and says what it is

**Link:** `percent.ts#confidenceText` → the sample's accessible name, the Lens readout, 03's chip
(F-244), 27's refused state (F-236) **Guard:** `percent.test` and the shared second-format scan in
both packages **Severity:** medium **Feature:** F-222

---

## Why B changes when A does

A reading's confidence is a ceiling the light, the capture and the colour space set, never the chance
the colour is right. Printed as a percentage beside a colour, it reads as exactly that chance. So it has
ONE format — floored with a float64 guard, so it never shows more than the value holds — and the Lens
says under it what it is. A second format anywhere would bring the bare figure back, which is why both
packages scan for one.

## The exception, named

`Shopping.tsx` prints `CompatibilityScore.confidence`, how much evidence a profile brought to a score:
a different quantity, allowed by name until F-258 rebuilds the screen.
