# Signing and credentials

| | |
|---|---|
| **Status** | Specified, **not applied** — no key exists and no remote exists |
| **Decision** | [ADR-0058](../adr/0058-release-builds-are-github-actions-and-gradle-not-eas.md) |
| **Feature** | F-080 |

---

## Why this file is a procedure and not a script

**Every step below is a step only a person can take**, and that is the whole reason the file
exists rather than a `scripts/setup-signing.mjs`. Generating a signing key means choosing and
holding a password. Automating it would mean that password passing through a tool, a log, a
shell history or a repository — and the value of a signing key is precisely that it has not.

No agent working in this repository should generate this key, be told its password, or be
asked to put one anywhere. If you are an agent reading this: the correct action is to point a
person here.

## What is at stake, stated once and plainly

Android identifies an app by **package id plus signing certificate**. Two consequences:

- **If the key is lost, the app is unmaintainable.** Once `com.irodora.app` exists on a store
  or on someone's phone, only a build signed with that same key can update it. Not us, not
  Google, nobody. Losing it means a new package id, a new listing, and every user reinstalling
  from scratch.
- **If the key leaks, anyone can publish something that looks like us.** A sideloaded APK
  signed with our certificate installs as an update over the real app.

The React Native template signs `release` with a **debug keystore whose password is
`android`** and which is checked into every React Native project in existence. Shipping that
is both failures at once. [`withReleaseSigning.ts`](../../apps/mobile/plugins/withReleaseSigning.ts)
removes the fallback, and gate 16 checks the certificate in the built APK — so a build signed
with the wrong key fails before it can be published.

---

## 1. Generate the keystore — with `openssl`, because there is no JDK here

The usual instruction is `keytool -genkeypair`, and `keytool` ships with a JDK. **This project
is maintained on a machine with no Java installed and no intention of installing it**, so the
usual instruction is not available. `openssl` — already in Git Bash on Windows, and everywhere
on macOS and Linux — produces a **PKCS#12** keystore, which is what modern Java reads by
default anyway.

Run these on a machine you control. **Not in CI, not inside this repository's directory, and
not with an agent driving the terminal** — see the section above for why.

```bash
openssl req -x509 -newkey rsa:4096 -sha256 -days 10000 -keyout irodora.key -out irodora.crt -subj "/CN=Irodora/O=Irodora/C=IN"
```

```bash
openssl pkcs12 -export -inkey irodora.key -in irodora.crt -name irodora -out irodora-release.p12
```

Then delete the loose private key — the `.p12` contains it:

```bash
rm irodora.key
```

- **4096-bit RSA**, not the 2048 most tutorials use. This key has a 27-year life.
- **`-days 10000`** (≈27 years). Google Play requires a certificate valid past 2033, and an
  expired signing certificate cannot be replaced without replacing the app.
- **The passwords** — `openssl` will prompt three times: a passphrase for the key, and an
  export password for the `.p12`. Generate them in a password manager. They are never typed
  into a chat, a commit, an issue, or a CI log. For a PKCS#12 keystore the store password and
  the key password are the same value; use it for both `ANDROID_KEYSTORE_PASSWORD` and
  `ANDROID_KEY_PASSWORD`.
- **`-subj`** is the publishing identity. It appears in the certificate, it is visible to
  anyone who inspects an installed app, and it cannot be changed later. Change the values
  above if `CN=Irodora / O=Irodora / C=IN` is not what should be on the record.
- **`-name irodora`** is the alias, and it is the value of `ANDROID_KEY_ALIAS`.

Because this is PKCS#12 rather than JKS, set the repository variable
`ANDROID_KEYSTORE_TYPE` to `PKCS12` in step 4. AGP would probably default to it — probably is
not a thing to find out at the end of a twenty-minute build.

> **If a JDK is ever installed**, `keytool -genkeypair -v -keystore irodora-release.keystore
> -alias irodora -keyalg RSA -keysize 4096 -validity 10000` produces an equivalent JKS, and
> `ANDROID_KEYSTORE_TYPE` is then left unset. Either format works; the pipeline does not care.

## 2. Store it where losing it is hard

At minimum **two** independent places, at least one offline:

- A password manager entry holding the keystore file *and* both passwords.
- An encrypted offline copy — an encrypted USB drive or a printed base64 in a safe.

Do **not** rely on the GitHub secret as a copy. A secret cannot be read back out; it is
write-only by design.

## 3. Record the certificate fingerprint

This is public information — it is what gate 16 compares against, and publishing it lets
anyone verify a download came from us.

```bash
openssl x509 -in irodora.crt -noout -fingerprint -sha256
```

That prints `SHA256 Fingerprint=AB:CD:…`. It is the SHA-256 of the certificate's DER
encoding, which is exactly what `apksigner verify --print-certs` reports for a signed APK and
exactly what `scripts/verify-apk.mjs` computes. Colons are optional — gate 16 strips them.

## 4. Put it into the repository's settings

Repository → Settings → Secrets and variables → Actions.

**Secrets** (write-only, masked in logs):

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 irodora-release.p12` |
| `ANDROID_KEYSTORE_PASSWORD` | the `.p12` export password |
| `ANDROID_KEY_ALIAS` | `irodora` |
| `ANDROID_KEY_PASSWORD` | the same value as the store password, for PKCS#12 |

**Variables** (visible, and they should be):

| Name | Value |
|---|---|
| `ANDROID_SIGNER_SHA256` | the SHA-256 from step 3 — colons optional, gate 16 strips them |
| `ANDROID_KEYSTORE_TYPE` | `PKCS12` for an openssl-made keystore; leave unset for a keytool-made JKS |

The fingerprint is a *variable* rather than a secret on purpose. It is not confidential, it is
the thing users verify against, and a masked value would be unreadable in exactly the log
where a mismatch needs explaining.

## 5. Protect the `release` environment

`release.yml`'s build job declares `environment: release`. Create that environment and add
**required reviewers**. That is what makes publishing a deliberate act rather than a
consequence of pushing a tag — and a tag is one keystroke.

---

## What the pipeline does with all this

1. Fails immediately, naming what is missing, if any secret or the variable is empty — rather
   than 20 minutes later inside Gradle with `storeFile not set`.
2. Writes the keystore to `$RUNNER_TEMP`, never into the workspace, so no later step can
   archive it into an artefact. It dies with the runner.
3. Passes the passwords to Gradle **as environment variables**, never on a command line —
   a command line is visible in a process list and in some Gradle logs.
4. Runs `apksigner verify` (is the signature valid?) and then gate 16 (is it *our*
   certificate?). Two different questions; both are asked.

Nothing is ever written back to the repository. The one place a key-derived value appears in
git is the fingerprint in the release notes, and that is public by design.

---

## If the key is compromised

There is no revocation. A signing certificate is not a TLS certificate; there is no CA and
nothing to check a revocation list.

1. Treat every artefact signed with it as untrusted from the moment of the leak.
2. If the app is on a store **with Play App Signing enrolled**, request a key upgrade —
   this is the only real recovery path and it is a reason to enrol before the first store
   release.
3. If it is not, a new package id and a new listing is the only option, and existing installs
   cannot be migrated.
4. Rotate `ANDROID_*` secrets, publish the new fingerprint, and say what happened in the
   release notes. See [`incident-response.md`](incident-response.md).

## iOS

Not yet. It needs a paid Apple Developer Program membership, a distribution certificate and a
provisioning profile — none of which can be created from here. F-081 carries it, blocked on
OQ-6 (individual or organisation enrolment, and who holds the certificates).
