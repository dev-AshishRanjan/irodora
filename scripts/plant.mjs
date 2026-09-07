/**
 * The plant journal — a write-ahead log so a killed mutation proof cannot leave the tree broken.
 *
 * ## The problem, measured rather than imagined
 *
 * Every mutation proof in this repository plants a deliberate defect into a tracked file,
 * watches the check reject it, and restores in a `finally`. **A `finally` is a hope about how a
 * process ends, not a guarantee.** Seven incidents so far, by three mechanisms:
 *
 * | how it ended | what it left |
 * |---|---|
 * | a timeout, a Ctrl+C, a closed terminal | the `finally` never ran |
 * | Windows `EPERM` on `rmSync` | the `finally` ran and threw inside itself |
 * | Windows `UNKNOWN` on `writeFileSync` | the write that would have restored it failed |
 *
 * The damage was a CI workflow with a gate step disabled by `if: false`, a performance budget
 * of `0.0001`, four deleted corpus fixtures, a benchmark whose `percentile` returned constants,
 * and a design manifest with a colour value quietly changed. Every one of them is something
 * `git add -A` would have committed.
 *
 * ## Why the guard that already existed cannot fix it
 *
 * `verify-ci.mjs` compares `git status` before and after and warns when a file a proof plants
 * into is modified. It has now failed to help three times running, for one reason: **it cannot
 * tell a leak from ordinary work.** Every one of those runs was a feature that had legitimately
 * edited a file in the same session, so the warning was correct, expected, and dismissed.
 *
 * A guard whose signal is indistinguishable from ordinary work trains people to ignore it, which
 * is worse than not having one.
 *
 * ## What this does instead
 *
 * It records **intent**. Before a proof mutates a file, it writes the original bytes here. After
 * it restores, it removes the entry. So:
 *
 * - a journal that still has entries means a proof did not finish — *whatever* git thinks, and
 *   whatever else the author edited;
 * - the entry holds the bytes needed to put it back, so recovery does not need git and works on
 *   a file that was already dirty for good reasons.
 *
 * **The ordering is the safety property.** The journal is written BEFORE the mutation, so a
 * failure to journal means no mutation happens at all. There is no window in which a file is
 * broken and unrecorded.
 *
 * ## It refuses rather than repairing
 *
 * A leftover journal makes the next run **exit** with the recovery command, rather than restoring
 * automatically. Automatic restore would overwrite whatever is in the file now — and somebody
 * who spent the morning fixing the damage by hand should not have it reverted by a tool being
 * helpful.
 */

import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Where the journal lives.
 *
 * Under `.harness/state/` because that is where this repository keeps things a run needs to
 * remember, and dot-prefixed because it is machinery rather than a record — `verify-state.mjs`
 * reads that directory and a journal is not part of the state it governs. It is gitignored: a
 * committed journal would be a lie about a run that finished.
 */
export const JOURNAL = join(ROOT, '.harness', 'state', '.plant-journal.json');

const RED = '[31m';
const YELLOW = '[33m';
const BOLD = '[1m';
const DIM = '[2m';
const OFF = '[0m';

const rel = (p) => relative(ROOT, resolve(p)).replace(/\\/gu, '/');

function read() {
  if (!existsSync(JOURNAL)) return { entries: {} };
  try {
    const parsed = JSON.parse(readFileSync(JOURNAL, 'utf8'));
    return typeof parsed === 'object' && parsed !== null && typeof parsed.entries === 'object'
      ? parsed
      : { entries: {} };
  } catch {
    /*
     * A JOURNAL THIS CANNOT PARSE IS TREATED AS EMPTY, and that is the one place this fails
     * open. The alternative is refusing every run until somebody deletes a corrupt file by
     * hand — and a half-written journal means the process died DURING the record, which is
     * before the mutation, so the tree is intact.
     */
    return { entries: {} };
  }
}

/**
 * Remove some entries and write what is left.
 *
 * Rebuilt rather than deleted from: a dynamic `delete` is refused by lint, and filtering says
 * what is happening more directly anyway.
 */
function drop(keys) {
  const state = read();
  write({
    ...state,
    entries: Object.fromEntries(Object.entries(state.entries).filter(([k]) => !keys.has(k))),
  });
}

function write(state) {
  mkdirSync(dirname(JOURNAL), { recursive: true });
  if (Object.keys(state.entries).length === 0) {
    rmSync(JOURNAL, { force: true });
    return;
  }
  writeFileSync(JOURNAL, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

/**
 * WHICH RUN AN ENTRY BELONGS TO.
 *
 * The question a leftover check has to answer is *did a PREVIOUS run leave this*, and a bare
 * "is the journal empty" cannot tell that from a proof that spawns another proof — which two of
 * these do. `verify-gate-mirror-proof` starts `verify-gate-mirror --prove` as a child in order
 * to kill it, and the child refusing over its own parent's journal is a false alarm.
 *
 * So the first `plantJournal` in a process tree mints an id and puts it in the environment,
 * where every child inherits it. An entry tagged with the current id belongs to this run; one
 * tagged with anything else, or nothing, is a leftover.
 */
const RUN_KEY = 'IRODORA_PLANT_RUN';

function currentRun() {
  const existing = process.env[RUN_KEY];
  if (existing !== undefined && existing !== '') return existing;
  const minted = randomUUID();
  process.env[RUN_KEY] = minted;
  return minted;
}

/**
 * What a leftover journal says, and how to act on it.
 *
 * `run` narrows it to entries from OTHER runs. The CLI passes nothing, because from outside a
 * run every entry is a leftover by definition.
 */
export function describeLeftovers(run) {
  const { entries } = read();
  const paths = Object.keys(entries).filter((p) => run === undefined || entries[p]?.run !== run);
  if (paths.length === 0) return null;
  return {
    paths,
    owners: [...new Set(paths.map((p) => entries[p]?.owner ?? 'unknown'))],
  };
}

/**
 * Put every journalled file back, byte for byte, and clear the journal.
 *
 * Returns the paths restored. Deliberately separate from opening a journal: recovery is a
 * decision somebody makes, not something a tool does to them on the way past.
 */
export function recover() {
  const state = read();
  const restored = [];
  /** Recovery notes, for files whose bytes are not the whole of putting them back. */
  const notes = [];
  for (const [path, entry] of Object.entries(state.entries)) {
    const absolute = join(ROOT, path);
    if (entry.backup !== undefined) {
      /*
       * A DIRECTORY, restored from the copy the proof already made.
       *
       * `verify-content-proof` swaps a whole fixture corpus, so there are no bytes to hold
       * here — it keeps a gitignored copy and restores by copying back. What it did NOT have
       * was a way for the NEXT run to know the swap never finished, which is the half the
       * journal adds. The copy is its recovery; this records that one is outstanding.
       */
      rmSync(absolute, { recursive: true, force: true });
      cpSync(join(ROOT, entry.backup), absolute, { recursive: true });
    } else if (entry.deleted === true) {
      rmSync(absolute, { force: true });
    } else {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, entry.original, 'utf8');
    }
    restored.push(path);
    /*
     * SOME FILES NEED MORE THAN THEIR BYTES BACK.
     *
     * The content proof perturbs an OKLab matrix in a tracked SOURCE file and rebuilds the
     * packages that compile it. Restoring the source leaves the BUILT artefacts still holding
     * the perturbation — and gate 11 then fails on a taxonomy boundary, which looks nothing
     * like a leftover plant and cost a cycle to trace.
     *
     * A note is not a fix. It is the sentence a person needs, at the moment they need it.
     */
    if (typeof entry.note === 'string') notes.push(`${path}: ${entry.note}`);
  }
  write({ entries: {} });
  return { restored, notes };
}

/**
 * Open a journal for one proof.
 *
 * **Exits the process if a previous run left one behind.** That is the whole point: the check
 * happens before this run can add its own entries and confuse the picture, and it happens on
 * every proof rather than only under `verify:ci`, so running one directly is covered too.
 */
export function plantJournal(owner) {
  const run = currentRun();
  const leftovers = describeLeftovers(run);
  if (leftovers !== null) {
    console.error(
      `\n${RED}${BOLD}A mutation proof did not finish.${OFF}\n` +
        `${DIM}  ${String(leftovers.paths.length)} file(s) are still holding a planted defect, ` +
        `left by: ${leftovers.owners.join(', ')}.\n` +
        `  This is recorded rather than guessed — the journal was written BEFORE the mutation, ` +
        `so\n  it says what was broken and holds the bytes to undo it, whatever git thinks and ` +
        `whatever\n  else you have edited since.${OFF}\n`,
    );
    for (const path of leftovers.paths) console.error(`  ${YELLOW}!${OFF} ${path}`);
    console.error(
      `\n${DIM}  Put them back:${OFF}  node scripts/plant.mjs --recover\n` +
        `${DIM}  Nothing is restored automatically: if you have already fixed one by hand, a ` +
        `tool\n  being helpful would undo that.${OFF}\n`,
    );
    process.exit(1);
  }

  const mine = new Set();

  return {
    /**
     * Record a file's current bytes before mutating it.
     *
     * Call this FIRST. If the journal cannot be written this throws, and the mutation that was
     * about to happen does not — which is the ordering that makes the guarantee hold.
     */
    record(path, original) {
      const key = rel(path);
      const absolute = join(ROOT, key);

      /*
       * THE BYTES MAY BE PASSED IN, and most callers should. A proof reads the original once
       * and keeps it; re-reading here is only correct on the FIRST call, and a second call
       * after a mutation would journal the broken file as if it were the original — which is
       * worse than not journalling at all, because it makes recovery restore the defect.
       *
       * An entry is never overwritten for the same reason.
       */
      const state = read();
      if (state.entries[key] !== undefined) {
        mine.add(key);
        return;
      }

      state.entries[key] =
        original !== undefined
          ? { owner, run, original }
          : existsSync(absolute)
            ? { owner, run, original: readFileSync(absolute, 'utf8') }
            : { owner, run, deleted: true, original: '' };
      write(state);
      mine.add(key);
    },

    /**
     * Record a DIRECTORY whose recovery is a copy the caller already made.
     *
     * The journal holds bytes for a file and a pointer for a tree, because a fixture corpus is
     * not something to inline into a JSON document — and the proof that swaps one already
     * keeps a copy for exactly this reason.
     */
    recordTree(path, backup) {
      const key = rel(path);
      const state = read();
      if (state.entries[key] === undefined) {
        state.entries[key] = { owner, run, backup: rel(backup) };
        write(state);
      }
      mine.add(key);
    },

    /** Drop one file's entry, after it has been restored. */
    release(path) {
      const key = rel(path);
      drop(new Set([key]));
      mine.delete(key);
    },

    /**
     * Drop every entry this proof made.
     *
     * Called from the same `finally` that restores. It is not a substitute for restoring — the
     * journal records intent, and clearing it while a file is still broken would be recording
     * that the intent was carried out when it was not.
     */
    close() {
      drop(mine);
      mine.clear();
    },
  };
}

/**
 * The shape every proof in this repository already has, in one call.
 *
 * They all read their targets up front — *"so the `finally` can restore all of them whatever
 * happens in between"*, as one of them puts it — and that is exactly when the journal wants to
 * be written. So a migration is three small edits: import this, call it with the paths, and
 * `close()` in the same `finally` that restores.
 *
 * Reading the bytes HERE is correct precisely because this runs before any mutation. It would
 * not be correct later, which is why `record` refuses to overwrite an entry.
 */
export function guardPlants(owner, paths) {
  const journal = plantJournal(owner);
  for (const path of paths) journal.record(path);
  return journal;
}

/* ------------------------------------------------------------------------------- the CLI */

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  const argv = process.argv.slice(2);

  if (argv.includes('--recover')) {
    const { restored, notes } = recover();
    if (restored.length === 0) {
      console.log(`\n${DIM}Nothing to recover — no proof left a plant behind.${OFF}\n`);
    } else {
      console.log(`\n${BOLD}Restored ${String(restored.length)} file(s):${OFF}`);
      for (const path of restored) console.log(`  ${path}`);
      // Some files need more than their bytes back, and the note is the sentence a person needs
      // at the moment they need it.
      for (const note of notes) console.log(`\n  ${YELLOW}!${OFF} ${note}`);
      console.log('');
    }
    process.exit(0);
  }

  const leftovers = describeLeftovers();
  if (leftovers === null) {
    console.log(`\n${DIM}No plant is outstanding.${OFF}\n`);
    process.exit(0);
  }
  console.error(`\n${RED}${BOLD}${String(leftovers.paths.length)} file(s) hold a plant.${OFF}`);
  for (const path of leftovers.paths) console.error(`  ${YELLOW}!${OFF} ${path}`);
  console.error(`\n${DIM}  node scripts/plant.mjs --recover${OFF}\n`);
  process.exit(1);
}
