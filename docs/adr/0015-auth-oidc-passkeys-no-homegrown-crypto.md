# ADR-0015 — Standards-based authentication; we implement no password primitives

## Status

Accepted

## Date

2026-08-13

## Context

Authentication is a solved problem that unsolved implementations keep re-breaking. Password
hashing parameters, timing-safe comparison, reset-token entropy and expiry, enumeration
resistance, session fixation, rate limiting per identifier as well as per IP — each has a
well-known correct answer and a long history of subtly wrong implementations in production.

None of that is where this product's value lies. Every hour spent on a password reset flow
is an hour not spent on the colour engine, and the result is worse than the standard
implementation.

There is also a product argument. Onboarding must be fast enough not to lose the user
before the first "aha" (J1: 60 seconds to first value). A password form is friction that
also creates a credential to leak.

## Decision

**OIDC, passkeys, and federated identity. No password primitive is implemented in our
code.**

1. **Passkeys (WebAuthn) are the primary method.** Phishing-resistant, no shared secret,
   and faster than typing a password.
2. **Sign in with Apple and Google** for federated identity — required on iOS anyway where
   third-party sign-in is offered.
3. **Email magic link** as the fallback for users with neither. Single-use, short-lived,
   rate-limited per address and per IP.
4. **OIDC for the API.** Short-lived access tokens; refresh tokens rotate on use with
   reuse detection — a replayed refresh token revokes the family.
5. **We store no credential material.** No password hash column exists, which means the
   most common credential-breach class does not apply to us.
6. **Sessions are httpOnly, Secure, SameSite cookies** for web; secure platform storage on
   mobile. Session id rotates on privilege change. Revocation propagates within 60 s
   (FR-54).
7. **Local-only mode requires no account at all** (FR-55). The full core product works
   signed-out, so authentication is never the first thing a new user meets.

The provider choice — self-hosted (Keycloak, Zitadel, Ory) versus managed — is **OQ-1**,
open until R2. The decision here is the *standard*, which is what makes the provider
swappable behind an interface.

## Consequences

**Good.** The entire password-breach class does not apply. Passkeys are faster and safer
than what we would have built. Federated sign-in removes onboarding friction. Provider
choice stays open because we depend on OIDC, not on a vendor SDK.

**Bad.** An OIDC dependency in the critical path — provider downtime is our downtime, which
argues toward self-hosting. Passkeys still have real recovery UX problems when a user loses
every device, so magic-link fallback is mandatory rather than optional. Magic links depend
on email deliverability, which is its own operational surface. Some users still expect a
password field and will find its absence confusing.

**Neutral.** OQ-1 is deferred deliberately: the interface is the decision, the provider is
an adapter.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Email + password ourselves** | Universally understood, no external dependency. Requires implementing hashing, reset, enumeration resistance and rate limiting correctly and keeping them correct — and creates a credential store to breach. Explicitly rejected |
| **A managed auth SDK (Auth0, Clerk, Supabase Auth)** | Fastest to build, good UX out of the box. Vendor lock-in at the identity layer — the hardest thing to migrate later — plus per-MAU pricing that scales badly against a free tier, and complications for the self-hosted VPS profile |
| **Federated sign-in only** | Simplest of all. Excludes users without those accounts, and hands account recovery entirely to a third party |
| **Passkeys only** | Strongest security posture. Recovery is unsolved for a user who loses all devices, and adoption is not yet universal enough to be the sole method |

## Revisit when

- OQ-1 closes with a provider decision (before R2).
- Passkey recovery matures to the point that magic-link fallback becomes optional.
