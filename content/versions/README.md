# `content/versions/`

**Generated. Do not edit by hand.**

Each `YYYY.MM.N.json` is an immutable published corpus version — every published entry with
its derived values and per-entry checksum — produced by
[`scripts/generate-corpus.mjs`](../../scripts/generate-corpus.mjs) from the authored records in
[`../colors/`](../colors) and [`../palettes/`](../palettes).

`index.json` is the **append-only ledger**: one row per published version, carrying the root
checksum a loader verifies against. The expected checksum lives here rather than inside the
bundle, because a file checked against a checksum stored inside itself is not checked.

Correcting a published entry means **publishing a new version**, never editing one of these
files. A recommendation made six months ago must still be explainable (FR-10), and that
requires the values it used to still exist.

**A checksum mismatch is a SEV1**, with no threshold and no grace period. See
[ADR-0046](../../docs/adr/0046-published-corpus-is-an-immutable-generated-bundle.md) for what
that claim does and does not cover.

Empty today: entries arrive with F-012.
