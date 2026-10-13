/**
 * The child half of `bookmark-force-quit.test.ts`: replay a recorded write, then die.
 *
 * Run as `node replay-and-die.ts <database> <plan.json>`, by Node's own type stripping, so it
 * imports nothing from this package — `test` runs before this package is built, and a child that
 * loaded `dist/` would be replaying last build's repository.
 *
 * The plan names the connection pragmas, the statements the real repository method issued —
 * **its `BEGIN` and `COMMIT` included, recorded from the method rather than added here**, so a
 * method that split its write into two transactions is replayed as two — and where to cut: before
 * statement `cut`, or after the last one when `cut` is their count. At the cut it writes `CUT` to
 * stdout with a synchronous write, so the parent knows it got that far, and kills itself with
 * SIGKILL — no `finally`, no `close`, no exit handler, which is what a swipe-away or the OS
 * reclaiming memory leaves behind. On Windows SIGKILL is TerminateProcess.
 */

import { readFileSync, writeSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

interface Plan {
  readonly pragmas: readonly string[];
  readonly statements: readonly { readonly sql: string; readonly params: SQLInputValue[] }[];
  readonly cut: number;
}

const [, , database, planFile] = process.argv;
if (database === undefined || planFile === undefined)
  throw new Error('usage: node replay-and-die.ts <database> <plan.json>');
const plan = JSON.parse(readFileSync(planFile, 'utf8')) as Plan;

const die = (): never => {
  writeSync(1, 'CUT\n');
  process.kill(process.pid, 'SIGKILL');
  // SIGKILL cannot be caught, so this is never reached; it is here for the type.
  throw new Error('still alive after SIGKILL');
};

const db = new DatabaseSync(database);
for (const pragma of plan.pragmas) db.exec(pragma);
plan.statements.forEach((statement, index) => {
  if (index === plan.cut) die();
  db.prepare(statement.sql).run(...statement.params);
});
if (plan.cut === plan.statements.length) die();
throw new Error(`cut ${String(plan.cut)} is past the ${String(plan.statements.length)} statements`);
