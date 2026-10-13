/**
 * Find an executable on `PATH`.
 *
 * Written out rather than shelling out. `spawnSync('maestro')` reports `ENOENT` on Windows even
 * when `maestro.cmd` is sitting on the path, because Node does not consult `PATHEXT` — and the
 * scripts that use this exist to say accurately what is missing. Reporting "not installed" for a
 * tool that is installed would be the least useful lie they could tell.
 *
 * Shared by `e2e-run.mjs` (gate 7) and `fidelity-capture.mjs` (F-221), so the two cannot disagree
 * about whether Maestro is there.
 */

import { existsSync, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';

export function onPath(command) {
  const extensions =
    process.platform === 'win32' ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];

  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    if (directory === '') continue;
    for (const extension of extensions) {
      const candidate = join(directory, command + extension);
      try {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
      } catch {
        // An unreadable PATH entry is not this script's problem. Keep looking.
      }
    }
  }
  return null;
}
