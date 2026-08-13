---
kind: lesson
title: PowerShell 5.1 round-trips UTF-8 content into mojibake unless you say otherwise twice
category: workaround
confidence: 1.0
created: 2026-08-13
scope: [scripts, root]
links: []
---

# PowerShell 5.1 round-trips UTF-8 into mojibake

**Encountered while generating the `.claude/` skill shims** (2026-08-13, this workstation).

Reading a UTF-8 file with `Get-Content` and writing it back with `Set-Content` turned every
em dash into `â€"`. The pipeline looked correct; the output was corrupted.

## Why

Windows PowerShell 5.1 defaults to the ANSI code page for **both** ends:

- `Get-Content` without `-Encoding` decodes UTF-8 bytes as Latin-1.
- `Set-Content -Encoding utf8` writes UTF-8 **with a BOM**, which is its own nuisance in
  markdown and JSON.

So a read/transform/write round trip corrupts on the way in and adds a BOM on the way out.

## The fix

Use .NET directly, with an explicit BOM-free encoder on both ends:

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$lines = [System.IO.File]::ReadAllLines($path, $utf8NoBom)
[System.IO.File]::WriteAllText($out, $body, $utf8NoBom)
```

## Why it matters more here than in most projects

This repository is full of content where a mangled character is a **correctness** problem,
not a cosmetic one:

- Japanese colour names — 藍鼠, 生成り, 納戸色.
- Colour notation — `ΔE00`, `L*a*b*`, `°`.
- Golden datasets compared by content hash.

`.gitattributes` normalises line endings for the same reason. Encoding needs the same
deliberateness.

## The general form

**Any script that reads repository content and writes it back must state its encoding
explicitly, at both ends.** The default is wrong on this platform, and the corruption is
silent — the script reports success.
