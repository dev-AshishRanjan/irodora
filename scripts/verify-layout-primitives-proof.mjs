#!/usr/bin/env node
/**
 * The layout gate, watched refusing (F-203).
 *
 * A gate nobody has seen fail is configuration that parses. This plants a screen that invents a
 * row, watches the rule catch it, and then proves the rule is not simply refusing everything by
 * running it over the same file with the offence removed.
 *
 * **It writes into a temporary directory and never touches `apps/`.** A proof that planted into
 * the real tree would leave the repository dirty if it were interrupted — the hazard
 * `verify-gate-mirror-proof` exists to catch, and there is no reason to create a second one.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { offences } from './verify-layout-primitives.mjs';

const GREEN = '[32m';
const RED = '[31m';
const DIM = '[2m';
const BOLD = '[1m';
const OFF = '[0m';

/** A screen that composes properly. The control. */
const CLEAN = `import { Row, Text } from '@irodora/ui';

export function Fixture(): React.JSX.Element {
  return (
    <Row gap="sm" align="baseline">
      <Text size="body" color="foreground">
        a
      </Text>
    </Row>
  );
}
`;

/** The same screen with the row written by hand. */
const OFFENDING = `import { View } from 'react-native';
import { Text } from '@irodora/ui';

export function Fixture(): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text size="body" color="foreground">
        a
      </Text>
    </View>
  );
}
`;

const cases = [
  { name: 'a screen that invents a row is REFUSED', source: OFFENDING, expect: 1 },
  { name: 'DECOY — the same screen composed with Row passes', source: CLEAN, expect: 0 },
];

export function run() {
  console.log(`\n${BOLD}Irodora — the layout gate, watched refusing${OFF}\n`);

  const dir = mkdtempSync(join(tmpdir(), 'irodora-layout-'));
  let failures = 0;
  try {
    for (const c of cases) {
      writeFileSync(join(dir, 'Fixture.tsx'), c.source);
      const found = offences(dir).length;
      const ok = found === c.expect;
      if (!ok) failures += 1;
      console.log(
        `  ${ok ? `${GREEN}✓` : `${RED}x`}${OFF} ${c.name}\n` +
          `    ${DIM}expected ${String(c.expect)} offence(s), got ${String(found)}${OFF}`,
      );
    }
  } finally {
    // Always, even on a throw: a proof that leaves its plant behind is the thing it exists to
    // prevent, one directory along.
    rmSync(dir, { recursive: true, force: true });
  }

  console.log();
  if (failures === 0) {
    console.log(`${GREEN}${BOLD}Proven.${OFF} ${DIM}The refusal was watched refusing.${OFF}\n`);
    return 0;
  }
  console.log(`${RED}${BOLD}${String(failures)} case(s) did not behave as stated.${OFF}\n`);
  return 1;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  process.exit(run());
