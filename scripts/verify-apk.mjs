#!/usr/bin/env node
/**
 * Irodora — gate 16. The built artefact must prove its own claims.
 *
 * Every other check in this repository reads source. This one reads the file a person would
 * actually install, because the distance between the two is where the interesting failures
 * live: `app.config.ts` blocks `android.permission.INTERNET` today, and the Android manifest
 * merger adds permissions from dependencies **silently and by design**. A library that
 * declares `INTERNET` in its own manifest gets it merged into ours, no source file in this
 * repository changes, and the central privacy claim (NFR-12) quietly stops being true.
 *
 * So the assertions here are about bytes in the APK:
 *
 *   - `android.permission.INTERNET` is ABSENT from the merged manifest.
 *   - The package id is what we think it is.
 *   - `versionCode` and `versionName` are what the tag asked for — proof the version
 *     actually reached the artefact rather than stopping at an environment variable.
 *   - For a release, the signer certificate's SHA-256 is the fingerprint we expect.
 *
 * ## What this does NOT do, and what does it instead
 *
 * **It does not verify the signature cryptographically.** It identifies the signer. Whether
 * the signature is *valid* is `apksigner verify`'s job, it is a separate step in
 * `release.yml`, and the two answer different questions: apksigner says "this APK is
 * correctly signed", this says "and it was signed by US, not by the debug key that ships on
 * every machine in the world".
 *
 * **It parses the binary manifest itself rather than shelling out to `aapt2`** — because the
 * gate must be runnable where the Android SDK is not, and because a parser we control can be
 * mutation-tested. When `aapt2` IS available it is used as an INDEPENDENT ORACLE: if the two
 * disagree about the package or the permission set, that is a failure, not a preference. A
 * hand-written parser agreeing with itself is exactly the shape of a check that passes on a
 * file it misread.
 *
 * Usage:
 *   node scripts/verify-apk.mjs --apk path/to/app.apk \
 *        --expect-package com.irodora.app \
 *        --expect-version-code 100 --expect-version-name 0.1.0 \
 *        [--expect-signer-sha256 AB:CD:...] [--allow-unsigned]
 *
 *   node scripts/verify-apk.mjs --prove      # watch every assertion fail
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/* ================================================================== ZIP reading */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

/**
 * Where the central directory starts, and where the End Of Central Directory record is.
 *
 * The EOCD is the last thing in the file unless there is a trailing comment, so it is found
 * by scanning backwards for its signature. The scan is bounded at 64 KiB + 22, which is the
 * largest an EOCD with a maximal comment can be — an unbounded backwards scan over a 60 MB
 * APK would happily find the signature bytes inside a compressed entry and report nonsense.
 */
function readEndOfCentralDirectory(buf) {
  const limit = Math.max(0, buf.length - (0xffff + 22));
  for (let i = buf.length - 22; i >= limit; i--) {
    if (buf.readUInt32LE(i) !== EOCD_SIGNATURE) continue;
    return {
      entryCount: buf.readUInt16LE(i + 10),
      centralDirectorySize: buf.readUInt32LE(i + 12),
      centralDirectoryOffset: buf.readUInt32LE(i + 16),
    };
  }
  throw new Error('not a ZIP archive: no end-of-central-directory record');
}

/** Every entry in the central directory, by name. */
function readCentralDirectory(buf, eocd) {
  const entries = new Map();
  let p = eocd.centralDirectoryOffset;

  for (let n = 0; n < eocd.entryCount; n++) {
    if (buf.readUInt32LE(p) !== CENTRAL_SIGNATURE)
      throw new Error(`corrupt central directory at byte ${String(p)}`);

    const nameLength = buf.readUInt16LE(p + 28);
    const extraLength = buf.readUInt16LE(p + 30);
    const commentLength = buf.readUInt16LE(p + 32);

    entries.set(buf.toString('utf8', p + 46, p + 46 + nameLength), {
      method: buf.readUInt16LE(p + 10),
      compressedSize: buf.readUInt32LE(p + 20),
      uncompressedSize: buf.readUInt32LE(p + 24),
      localHeaderOffset: buf.readUInt32LE(p + 42),
    });

    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/**
 * One entry's bytes.
 *
 * The local header's name and extra lengths are read rather than the central directory's:
 * they are allowed to differ, and using the wrong pair puts the read a few bytes off — which
 * inflates to garbage rather than failing, and is therefore the kind of bug that ships.
 */
function readEntry(buf, entry) {
  const p = entry.localHeaderOffset;
  if (buf.readUInt32LE(p) !== LOCAL_SIGNATURE)
    throw new Error(`corrupt local header at byte ${String(p)}`);

  const start = p + 30 + buf.readUInt16LE(p + 26) + buf.readUInt16LE(p + 28);
  const raw = buf.subarray(start, start + entry.compressedSize);

  if (entry.method === 0) return raw;
  if (entry.method === 8) return inflateRawSync(raw);
  throw new Error(`unsupported compression method ${String(entry.method)}`);
}

/* =========================================== binary AndroidManifest.xml (AXML) */

const RES_STRING_POOL_TYPE = 0x0001;
const RES_XML_TYPE = 0x0003;
const RES_XML_START_ELEMENT_TYPE = 0x0102;

const UTF8_FLAG = 1 << 8;

const TYPE_STRING = 0x03;
const TYPE_INT_DEC = 0x10;
const TYPE_INT_HEX = 0x11;
const TYPE_INT_BOOLEAN = 0x12;

const NO_ENTRY = 0xffffffff;

/**
 * The string pool every other chunk indexes into.
 *
 * Two encodings, chosen by a flag: UTF-16 with a 16-bit length, or UTF-8 with a pair of
 * 8-bit lengths (UTF-16 code units first, then bytes). Both use a high-bit continuation for
 * lengths that do not fit, and both are null-terminated — the terminator is why a length is
 * read rather than a delimiter searched for.
 */
function readStringPool(buf, chunkStart) {
  const headerSize = buf.readUInt16LE(chunkStart + 2);
  const stringCount = buf.readUInt32LE(chunkStart + 8);
  const flags = buf.readUInt32LE(chunkStart + 16);
  const stringsStart = buf.readUInt32LE(chunkStart + 20);
  const utf8 = (flags & UTF8_FLAG) !== 0;

  const strings = [];
  for (let i = 0; i < stringCount; i++) {
    const offset = buf.readUInt32LE(chunkStart + headerSize + i * 4);
    let p = chunkStart + stringsStart + offset;

    if (utf8) {
      // The first length is in UTF-16 code units and is not needed; skip it, honouring the
      // same continuation rule so the byte length is read from the right place.
      if (buf[p] & 0x80) p += 2;
      else p += 1;
      let length = buf[p];
      p += 1;
      if (length & 0x80) {
        length = ((length & 0x7f) << 8) | buf[p];
        p += 1;
      }
      strings.push(buf.toString('utf8', p, p + length));
    } else {
      let length = buf.readUInt16LE(p);
      p += 2;
      if (length & 0x8000) {
        length = ((length & 0x7fff) << 16) | buf.readUInt16LE(p);
        p += 2;
      }
      strings.push(buf.toString('utf16le', p, p + length * 2));
    }
  }
  return strings;
}

/**
 * The manifest facts this gate is about, read out of the binary XML.
 *
 * Only start-element chunks matter, and only three elements within them, so the walk is a
 * flat scan over top-level chunks rather than a tree build. Attribute *names* are plain
 * strings in the pool ("name", "versionCode") — the resource-id map is not needed to find
 * them, which is what keeps this parser small enough to be trustworthy.
 */
function parseAndroidManifest(buf) {
  if (buf.readUInt16LE(0) !== RES_XML_TYPE)
    throw new Error('AndroidManifest.xml is not binary XML (was it already decoded?)');

  let strings = null;
  const permissions = [];
  const manifest = { package: null, versionCode: null, versionName: null };
  const usesSdk = { minSdkVersion: null, targetSdkVersion: null };

  const fileSize = buf.readUInt32LE(4);
  let p = buf.readUInt16LE(2); // past the file header

  while (p + 8 <= fileSize) {
    const type = buf.readUInt16LE(p);
    const headerSize = buf.readUInt16LE(p + 2);
    const size = buf.readUInt32LE(p + 4);
    if (size < 8) throw new Error(`corrupt chunk at byte ${String(p)}`);

    if (type === RES_STRING_POOL_TYPE) {
      strings = readStringPool(buf, p);
    } else if (type === RES_XML_START_ELEMENT_TYPE) {
      if (strings === null) throw new Error('start element before the string pool');

      const nameIndex = buf.readUInt32LE(p + headerSize + 4);
      const element = strings[nameIndex];
      const attributeStart = buf.readUInt16LE(p + headerSize + 8);
      const attributeSize = buf.readUInt16LE(p + headerSize + 10);
      const attributeCount = buf.readUInt16LE(p + headerSize + 12);

      const attributes = new Map();
      for (let i = 0; i < attributeCount; i++) {
        const a = p + headerSize + attributeStart + i * attributeSize;
        const attributeName = strings[buf.readUInt32LE(a + 4)];
        const rawValue = buf.readUInt32LE(a + 8);
        const dataType = buf[a + 15];
        const data = buf.readUInt32LE(a + 16);

        let value;
        if (rawValue !== NO_ENTRY) value = strings[rawValue];
        else if (dataType === TYPE_STRING) value = strings[data];
        else if (dataType === TYPE_INT_DEC || dataType === TYPE_INT_HEX) value = data;
        else if (dataType === TYPE_INT_BOOLEAN) value = data !== 0;
        else value = data;

        attributes.set(attributeName, value);
      }

      if (element === 'manifest') {
        manifest.package = attributes.get('package') ?? null;
        manifest.versionCode = attributes.get('versionCode') ?? null;
        manifest.versionName = attributes.get('versionName') ?? null;
      } else if (element === 'uses-permission' || element === 'uses-permission-sdk-23') {
        const name = attributes.get('name');
        if (typeof name === 'string') permissions.push(name);
      } else if (element === 'uses-sdk') {
        usesSdk.minSdkVersion = attributes.get('minSdkVersion') ?? null;
        usesSdk.targetSdkVersion = attributes.get('targetSdkVersion') ?? null;
      }
    }

    p += size;
  }

  return { ...manifest, permissions: [...new Set(permissions)].sort(), usesSdk };
}

/* ============================================================ APK Signing Block */

const APK_SIG_BLOCK_MAGIC = 'APK Sig Block 42';
const SIGNATURE_SCHEME_IDS = new Map([
  [0x7109871a, 'v2'],
  [0xf05368c0, 'v3'],
  [0x1b93ad61, 'v3.1'],
]);

/**
 * The signer certificates, newest scheme first.
 *
 * The block sits between the last entry and the central directory, and is found from the
 * end: a trailing magic, a length that appears twice, and then id-value pairs. Reading it
 * from the front is not possible — nothing points at where it starts.
 *
 * Returns an empty list for an unsigned APK rather than throwing, because "unsigned" is a
 * legitimate state for a `aapt2 link` output and the CALLER decides whether it is acceptable.
 */
function readSignerCertificates(buf, centralDirectoryOffset) {
  const magicAt = centralDirectoryOffset - 16;
  if (magicAt < 24) return [];
  if (buf.toString('utf8', magicAt, magicAt + 16) !== APK_SIG_BLOCK_MAGIC) return [];

  const declaredSize = Number(buf.readBigUInt64LE(magicAt - 8));
  const blockStart = centralDirectoryOffset - declaredSize - 8;
  if (blockStart < 0 || Number(buf.readBigUInt64LE(blockStart)) !== declaredSize)
    throw new Error('APK Signing Block is present but its two size fields disagree');

  /**
   * A length-prefixed (u32) sequence, as a list of its elements.
   *
   * **A zero-length element is legal and must be kept.** This function used to `break` on
   * one, which looked like a sensible corruption guard and was not: `signed data` is
   * `[digests][certificates][additional attributes]`, so an empty digests list — or an empty
   * `additional attributes`, which is the common case — truncated the walk before the
   * certificates and reported a properly signed APK as unsigned. The proof caught it. The
   * loop still cannot spin, because `q` advances by at least the four length bytes.
   */
  const sequence = (region) => {
    const out = [];
    let q = 0;
    while (q + 4 <= region.length) {
      const length = region.readUInt32LE(q);
      q += 4;
      if (q + length > region.length) break;
      out.push(region.subarray(q, q + length));
      q += length;
    }
    return out;
  };

  const found = [];
  let p = blockStart + 8;
  while (p + 12 <= magicAt - 8) {
    const pairLength = Number(buf.readBigUInt64LE(p));
    if (pairLength < 4 || p + 8 + pairLength > magicAt - 8) break;
    const id = buf.readUInt32LE(p + 8);
    const value = buf.subarray(p + 12, p + 8 + pairLength);
    p += 8 + pairLength;

    const scheme = SIGNATURE_SCHEME_IDS.get(id);
    if (!scheme) continue;

    // signers -> signer -> signedData -> [digests, certificates, ...]
    for (const signers of sequence(value))
      for (const signer of sequence(signers)) {
        const [signedData] = sequence(signer);
        if (!signedData) continue;
        const [, certificates] = sequence(signedData);
        if (!certificates) continue;
        for (const der of sequence(certificates))
          found.push({
            scheme,
            sha256: createHash('sha256').update(der).digest('hex').toUpperCase(),
          });
      }
  }

  // v3 supersedes v2 and both are usually present with the same certificate; report each
  // distinct certificate once, so a fingerprint comparison is over a set of one.
  const seen = new Set();
  return found.filter((c) => !seen.has(c.sha256) && seen.add(c.sha256));
}

/* ================================================================== the oracle */

/** `aapt2`, if the Android SDK is reachable. Never required — always used when present. */
function findAapt2() {
  const home = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!home) return null;
  const buildTools = join(home, 'build-tools');
  if (!existsSync(buildTools)) return null;

  // Newest build-tools wins: aapt2 is backward-compatible with older manifests, and an old
  // one can fail to parse a newer resource format.
  const versions = readdirSync(buildTools).sort((a, b) =>
    b.localeCompare(a, 'en', { numeric: true }),
  );
  for (const v of versions)
    for (const name of ['aapt2.exe', 'aapt2'])
      if (existsSync(join(buildTools, v, name))) return join(buildTools, v, name);
  return null;
}

/**
 * The same three facts, read by a tool we did not write.
 *
 * This is the difference between a parser that is correct and a parser that agrees with
 * itself. When the two disagree the run FAILS — resolving the disagreement is the work, and
 * quietly preferring one answer would leave the gate reporting on a file it misread.
 */
function readWithAapt2(aapt2, apkPath) {
  const badging = execFileSync(aapt2, ['dump', 'badging', apkPath], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  const packageLine = /^package: name='([^']*)' versionCode='([^']*)' versionName='([^']*)'/m.exec(
    badging,
  );
  const permissions = [...badging.matchAll(/^uses-permission: name='([^']*)'/gm)].map((m) => m[1]);

  return {
    package: packageLine ? packageLine[1] : null,
    versionCode: packageLine ? Number(packageLine[2]) : null,
    versionName: packageLine ? packageLine[3] : null,
    permissions: [...new Set(permissions)].sort(),
  };
}

/* ================================================================== the checks */

const INTERNET = 'android.permission.INTERNET';
const NETWORK_PERMISSIONS = [
  INTERNET,
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_WIFI_STATE',
];

/**
 * Every assertion, as data.
 *
 * Returned rather than printed so `--prove` can assert over the RESULT — a proof that greps
 * console output is a proof of the formatting.
 */
export function checkApk(apkPath, expected) {
  const buf = readFileSync(apkPath);
  const eocd = readEndOfCentralDirectory(buf);
  const entries = readCentralDirectory(buf, eocd);

  const manifestEntry = entries.get('AndroidManifest.xml');
  if (!manifestEntry) throw new Error('the APK contains no AndroidManifest.xml');
  const manifest = parseAndroidManifest(readEntry(buf, manifestEntry));

  const certificates = readSignerCertificates(buf, eocd.centralDirectoryOffset);
  const failures = [];
  const notes = [];

  const check = (ok, what, detail) => {
    if (!ok) failures.push({ what, detail });
  };

  // ---- NFR-12, as a property of the file --------------------------------------------
  const network = manifest.permissions.filter((p) => NETWORK_PERMISSIONS.includes(p));
  check(
    network.length === 0,
    'network permission present',
    `${network.join(', ')} — the app's central privacy claim is that it CANNOT transmit, and a ` +
      'permission is how it would. The manifest merger adds these from dependencies silently, ' +
      'so this is the only place the claim is actually checked. Adding one back is not a config ' +
      'tweak: it falsifies NFR-12 and needs an ADR.',
  );

  // ---- identity ----------------------------------------------------------------------
  if (expected.package !== undefined)
    check(
      manifest.package === expected.package,
      'package id',
      `manifest says ${String(manifest.package)}, expected ${expected.package}`,
    );

  if (expected.versionCode !== undefined)
    check(
      Number(manifest.versionCode) === Number(expected.versionCode),
      'versionCode',
      `manifest says ${String(manifest.versionCode)}, the tag asked for ${String(expected.versionCode)} — ` +
        'a mismatch means the version stopped at an environment variable and never reached the build.',
    );

  if (expected.versionName !== undefined)
    check(
      manifest.versionName === expected.versionName,
      'versionName',
      `manifest says ${String(manifest.versionName)}, the tag asked for ${expected.versionName}`,
    );

  // ---- who signed it ------------------------------------------------------------------
  if (expected.requireSignature)
    check(
      certificates.length > 0,
      'unsigned',
      'no APK Signing Block — an unsigned artefact cannot be installed and cannot be attributed.',
    );

  if (expected.signerSha256 !== undefined) {
    const want = expected.signerSha256.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    check(
      certificates.some((c) => c.sha256 === want),
      'signer certificate',
      `signed by ${certificates.map((c) => `${c.sha256} (${c.scheme})`).join(', ') || 'nobody'}, ` +
        `expected ${want}. A release signed by an unexpected certificate is either the debug key ` +
        'or somebody else, and both are the same problem for whoever installs it.',
    );
  }

  // ---- the independent reading --------------------------------------------------------
  const aapt2 = findAapt2();
  if (aapt2) {
    const oracle = readWithAapt2(aapt2, apkPath);
    const disagreements = [];
    if (oracle.package !== manifest.package)
      disagreements.push(`package: ours ${String(manifest.package)} vs ${String(oracle.package)}`);
    if (oracle.versionCode !== Number(manifest.versionCode))
      disagreements.push(
        `versionCode: ours ${String(manifest.versionCode)} vs ${String(oracle.versionCode)}`,
      );
    if (oracle.permissions.join('|') !== manifest.permissions.join('|'))
      disagreements.push(
        `permissions: ours [${manifest.permissions.join(', ')}] vs [${oracle.permissions.join(', ')}]`,
      );

    check(
      disagreements.length === 0,
      'aapt2 disagrees with this parser',
      `${disagreements.join('; ')}. One of the two readings is wrong and it is not safe to guess which.`,
    );
    notes.push(`cross-checked against ${aapt2}`);
  } else {
    notes.push(
      'aapt2 was NOT available — this run rests on one parser with nothing to disagree with it. ' +
        'Set ANDROID_HOME so the oracle can run.',
    );
  }

  notes.push(
    'NOT CHECKED HERE: that the signature is cryptographically valid (that is `apksigner verify`, ' +
      'a separate step), and that the app opens no socket at RUNTIME (gate 7, on a device).',
  );

  return { manifest, certificates, failures, notes };
}

/* ===================================================================== --prove */

/**
 * Watch every assertion fail, using fixtures built by `aapt2` rather than by this file.
 *
 * The binary XML in these fixtures is written by the REAL tool. That matters more than it
 * might look: a proof whose fixtures came from an encoder written next to the parser proves
 * the two agree with each other, which is the failure mode, not the check.
 *
 * The signing cases are the exception and are honest about it — no keystore and no JDK are
 * assumed, so a synthetic signing block is injected to prove the block is FOUND and the
 * fingerprint COMPARED. Whether a real signature verifies is `apksigner verify`'s question.
 */
function prove() {
  console.log(`\n${BOLD}Irodora — gate 16 artefact proof${OFF}\n`);

  const aapt2 = findAapt2();
  const home = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const platforms = home ? join(home, 'platforms') : null;
  const androidJar =
    platforms && existsSync(platforms)
      ? readdirSync(platforms)
          .sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
          .map((v) => join(platforms, v, 'android.jar'))
          .find((p) => existsSync(p))
      : undefined;

  if (!aapt2 || !androidJar) {
    console.log(`  ${RED}✗ COULD NOT RUN${OFF}`);
    console.log(
      `    ${DIM}aapt2: ${aapt2 ?? 'not found'}\n    android.jar: ${androidJar ?? 'not found'}${OFF}`,
    );
    console.log(
      `    ${DIM}A proof that cannot build its fixtures is not a proof that passed. Set ANDROID_HOME.${OFF}\n`,
    );
    process.exit(1);
  }

  const work = join(ROOT, '.cache/apk-proof');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  /** Build a real APK from manifest XML, via aapt2. */
  const build = (name, xml) => {
    const manifestPath = join(work, `${name}.xml`);
    const apkPath = join(work, `${name}.apk`);
    writeFileSync(manifestPath, xml, 'utf8');
    execFileSync(aapt2, ['link', '--manifest', manifestPath, '-I', androidJar, '-o', apkPath], {
      stdio: 'pipe',
    });
    return apkPath;
  };

  const manifestXml = ({ pkg = 'com.irodora.app', code = 100, name = '0.1.0', extra = '' } = {}) =>
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${pkg}"
    android:versionCode="${String(code)}"
    android:versionName="${name}">
  <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="36" />
  <uses-permission android:name="android.permission.CAMERA" />
${extra}
  <application />
</manifest>
`;

  const EXPECTED = {
    package: 'com.irodora.app',
    versionCode: 100,
    versionName: '0.1.0',
  };

  const cleanApk = build('clean', manifestXml());

  /**
   * Append a synthetic APK Signing Block carrying one DER blob as the "certificate", and
   * rewrite the EOCD so the central directory offset still points at the right place.
   */
  const withSigningBlock = (sourceApk, name, der) => {
    const buf = readFileSync(sourceApk);
    const eocd = readEndOfCentralDirectory(buf);
    const cdStart = eocd.centralDirectoryOffset;

    const u32 = (n) => {
      const b = Buffer.alloc(4);
      b.writeUInt32LE(n);
      return b;
    };
    const prefixed = (b) => Buffer.concat([u32(b.length), b]);

    const signedData = Buffer.concat([
      prefixed(Buffer.alloc(0)), // digests
      prefixed(prefixed(der)), // certificates
      prefixed(Buffer.alloc(0)), // additional attributes
    ]);
    const signer = Buffer.concat([
      prefixed(signedData),
      prefixed(Buffer.alloc(0)), // signatures
      prefixed(Buffer.alloc(0)), // public key
    ]);
    const value = Buffer.concat([u32(0x7109871a), prefixed(prefixed(signer))]);

    const pairLength = Buffer.alloc(8);
    pairLength.writeBigUInt64LE(BigInt(value.length));
    const pairs = Buffer.concat([pairLength, value]);

    const size = Buffer.alloc(8);
    size.writeBigUInt64LE(BigInt(pairs.length + 8 + 16));
    const block = Buffer.concat([size, pairs, size, Buffer.from(APK_SIG_BLOCK_MAGIC, 'utf8')]);

    const out = Buffer.concat([buf.subarray(0, cdStart), block, buf.subarray(cdStart)]);
    // The EOCD's pointer moved by exactly the block length.
    for (let i = out.length - 22; i >= 0; i--)
      if (out.readUInt32LE(i) === EOCD_SIGNATURE) {
        out.writeUInt32LE(cdStart + block.length, i + 16);
        break;
      }

    const apkPath = join(work, `${name}.apk`);
    writeFileSync(apkPath, out);
    return apkPath;
  };

  const der = Buffer.from('this is not a certificate, and it does not need to be', 'utf8');
  const derSha = createHash('sha256').update(der).digest('hex').toUpperCase();
  const signedApk = withSigningBlock(cleanApk, 'signed', der);

  const cases = [
    {
      name: 'the clean fixture (must stay GREEN)',
      apk: cleanApk,
      expected: EXPECTED,
      mustFail: false,
    },
    {
      name: 'a manifest that declares INTERNET',
      apk: build(
        'internet',
        manifestXml({ extra: '  <uses-permission android:name="android.permission.INTERNET" />' }),
      ),
      expected: EXPECTED,
      mustFail: 'network permission present',
    },
    {
      name: 'ACCESS_NETWORK_STATE, which is the quieter one',
      apk: build(
        'network-state',
        manifestXml({
          extra: '  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
        }),
      ),
      expected: EXPECTED,
      mustFail: 'network permission present',
    },
    {
      name: 'somebody else’s package id',
      apk: build('package', manifestXml({ pkg: 'com.example.irodora' })),
      expected: EXPECTED,
      mustFail: 'package id',
    },
    {
      name: 'a versionCode that never reached the build',
      apk: build('version-code', manifestXml({ code: 99 })),
      expected: EXPECTED,
      mustFail: 'versionCode',
    },
    {
      name: 'a versionName from the previous release',
      apk: build('version-name', manifestXml({ name: '0.0.9' })),
      expected: EXPECTED,
      mustFail: 'versionName',
    },
    {
      name: 'an unsigned APK where a signature is required',
      apk: cleanApk,
      expected: { ...EXPECTED, requireSignature: true },
      mustFail: 'unsigned',
    },
    {
      name: 'a signing block read, and the fingerprint matched (must stay GREEN)',
      apk: signedApk,
      expected: { ...EXPECTED, requireSignature: true, signerSha256: derSha },
      mustFail: false,
    },
    {
      name: 'signed by an unexpected certificate',
      apk: signedApk,
      expected: { ...EXPECTED, requireSignature: true, signerSha256: '00'.repeat(32) },
      mustFail: 'signer certificate',
    },
    {
      name: 'the clean fixture again (the baseline either side)',
      apk: cleanApk,
      expected: EXPECTED,
      mustFail: false,
    },
  ];

  const wrong = [];
  for (const c of cases) {
    let result;
    try {
      result = checkApk(c.apk, c.expected);
    } catch (error) {
      wrong.push({ c, why: `the checker threw: ${error.message}` });
      continue;
    }

    const names = result.failures.map((f) => f.what);
    if (c.mustFail === false) {
      if (names.length) wrong.push({ c, why: `expected GREEN, got: ${names.join(', ')}` });
      else console.log(`  ${GREEN}✓${OFF} ${c.name}`);
      continue;
    }
    if (!names.includes(c.mustFail)) {
      wrong.push({
        c,
        why: names.length
          ? `went red for ${names.join(', ')} rather than "${c.mustFail}"`
          : 'stayed GREEN',
      });
      continue;
    }
    console.log(`  ${GREEN}✓${OFF} ${c.name} ${DIM}→ ${c.mustFail}${OFF}`);
  }

  rmSync(work, { recursive: true, force: true });

  if (wrong.length) {
    console.log(`\n${RED}${BOLD}${String(wrong.length)} case(s) did not discriminate${OFF}\n`);
    for (const { c, why } of wrong)
      console.log(`  ${RED}✗${OFF} ${c.name}\n    ${DIM}${why}${OFF}`);
    console.log(`\n${RED}${BOLD}Artefact proof FAILED.${OFF}\n`);
    process.exit(1);
  }

  console.log(
    `\n${GREEN}${BOLD}All ${String(cases.length)} cases discriminate.${OFF} ` +
      `${DIM}Fixtures built by ${aapt2}${OFF}\n`,
  );
}

/* ======================================================================== main */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.prove) {
  prove();
} else if (!args.apk || args.apk === true) {
  console.log(
    `\n${RED}usage:${OFF} node scripts/verify-apk.mjs --apk <path> ` +
      `[--expect-package X] [--expect-version-code N] [--expect-version-name X] ` +
      `[--expect-signer-sha256 X] [--allow-unsigned]\n` +
      `       node scripts/verify-apk.mjs --prove\n`,
  );
  process.exit(2);
} else {
  const apkPath = resolve(args.apk);
  console.log(`\n${BOLD}Irodora — gate 16: the artefact${OFF}  ${DIM}${apkPath}${OFF}\n`);

  const expected = { requireSignature: args['allow-unsigned'] !== true };
  if (args['expect-package']) expected.package = String(args['expect-package']);
  if (args['expect-version-code']) expected.versionCode = Number(args['expect-version-code']);
  if (args['expect-version-name']) expected.versionName = String(args['expect-version-name']);
  if (args['expect-signer-sha256']) expected.signerSha256 = String(args['expect-signer-sha256']);

  const { manifest, certificates, failures, notes } = checkApk(apkPath, expected);

  console.log(`  package      ${String(manifest.package)}`);
  console.log(`  version      ${String(manifest.versionName)} (${String(manifest.versionCode)})`);
  console.log(
    `  sdk          min ${String(manifest.usesSdk.minSdkVersion)}, target ${String(manifest.usesSdk.targetSdkVersion)}`,
  );
  console.log(`  permissions  ${manifest.permissions.join(', ') || '(none)'}`);
  console.log(
    `  signed by    ${certificates.map((c) => `${c.scheme} ${c.sha256}`).join('\n               ') || '(unsigned)'}`,
  );
  console.log('');
  for (const n of notes) console.log(`  ${YELLOW}!${OFF} ${DIM}${n}${OFF}`);

  if (failures.length) {
    console.log(`\n${RED}${BOLD}${String(failures.length)} failure(s)${OFF}\n`);
    for (const f of failures)
      console.log(`  ${RED}✗ ${f.what}${OFF}\n    ${DIM}${f.detail}${OFF}\n`);
    console.log(`${RED}${BOLD}Gate 16 FAILED.${OFF} This artefact must not be published.\n`);
    process.exit(1);
  }

  console.log(`\n${GREEN}${BOLD}Gate 16 passed.${OFF}\n`);
}
