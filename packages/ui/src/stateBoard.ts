/**
 * Board `27`'s scale, and the dimensions F-236 builds its four states from (ADR-0128 §1–§3).
 *
 * `27` is a board: it draws four cards at no screen's scale (`dpPerPx: null`). F-236 found its
 * scale in the drawing itself — **0.973 dp per px**, the median of its 13 text elements' ems against
 * their roles' steps — and every drawn dimension here is the inventory's reading times that scale:
 *
 * - a SIZE (a ring, a plate, a line) snapped to the half dp, as `BUTTON_HEIGHT` and `BADGE_HEIGHT`
 *   are;
 * - an INTERVAL (a padding, a gap) snapped to the R9 spacing scale (§2), and named here by its step.
 *
 * Type is not here: it takes its role's step (P3). The numbers are written out, not computed, so a
 * reader sees what ships; `progress-ring.test` and `states.test` recompute each one from
 * `mockups/inventory/27.json`, so a re-read of the board that moves one fails until this moves too.
 */

/** dp per px on board 27 (ADR-0128 §1). */
export const STATE_BOARD_K = 0.973;

/**
 * The working ring (`27.lens-working.progress`): its outer diameter and its stroke, in dp —
 * `(2 · radiusPx + strokePx) · k` and `strokePx · k`, each to the half dp.
 */
export const STATE_RING = { size: 132.5, stroke: 7 } as const;
