/**
 * The conformance harness.
 *
 * Exported from the package at `@irodora/ui/testing` so that `apps/mobile` runs the **same**
 * suite over its screens rather than a copy of it — the port-conformance pattern, applied to
 * components. A second copy is a second thing to keep in step, and the copy that drifts is
 * always the one nobody is looking at.
 */

export {
  flattenStyle,
  paintedColors,
  pressableNodes,
  resolveTextNodes,
  RN_DEFAULT_FONT_SIZE,
  type ResolvedPressableNode,
  type ResolvedTextNode,
  type TestNode,
  type TextStyle,
} from './tree.js';

export { isStatusToken, resolveColor, tokensForValue, type ColorResolution } from './tokens.js';

export {
  checkAll,
  checkStatusAdjacency,
  checkSubject,
  formatFindings,
  REQUIRED_STATES,
  type ComponentKind,
  type ConformanceSubject,
  type Finding,
} from './conformance.js';
