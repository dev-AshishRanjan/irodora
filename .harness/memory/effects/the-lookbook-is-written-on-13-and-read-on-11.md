# E-205 — The lookbook is written on 13 and read back on 11

**Link:** `LookbookProvider` → the root layout, the Lab route and screen (`13`), the Wardrobe route
and screen (`11`), ADR-0136, R9 §4 E4 **Guard:** `lookbook.test` (the provider, the Lab, the
Wardrobe, and the three routes from source, with a decoy route); the registry's Lab and Wardrobe
subjects in every condition; the store's outfit tests **Severity:** high **Feature:** F-238

---

## Why B changes when A does

An outfit is saved on the Lab and read back on the Wardrobe. The lookbook is one list, held once,
and both screens draw from it. So a change to how it is stored, read or written reaches two screens
through one provider. Dropping either control breaks the feature silently:

- drop the Lab's save and nothing can be saved;
- drop the Wardrobe's choice and a save is a write nothing reads (OQ-40's problem, back again).

F-257 rebuilds 13 and F-255 rebuilds 11, and each rebuild is where a control is most likely to go
missing. So the route assertions name both, and each feature's notes say what to keep.

## What the provider promises

- **It reads the store once, at mount.**
- **It writes first, then reads back**, so a failed write shows nothing the next launch would not.
- **It knows the saved compositions**, so the Lab can say an outfit is already saved, and a duplicate
  writes nothing.
- **An in-app restore or erase would change the store underneath it.** Neither exists yet. F-263
  must make it read again, and its notes say so.

## What it does not guard

- **Layout on a device:** the choice's pill at 200 % text, the entry on a narrow phone.
- **Encryption at rest:** the lookbook is in the database file with every other row, protected
  only when SQLCipher is built in (F-336).
