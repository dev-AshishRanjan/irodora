# API Contract

| | |
|---|---|
| **Status** | Baseline · foundation lands with F-015 |
| **Implements** | FR-20, FR-47, FR-62, FR-63, NFR-4, NFR-14 |
| **Decisions** | [ADR-0012](../adr/0012-backend-fastify-zod-openapi.md) · [ADR-0025](../adr/0025-api-first-and-generated-sdk.md) |

---

## 1. Principles

1. **The implementation is the contract.** OpenAPI is *generated* from the same schemas
   that validate at runtime. A hand-written spec drifts from the code within weeks and
   then quietly lies to every consumer.
2. **Validate at the boundary, trust inside.** Every request is parsed by a schema; the
   parsed type is what the handler receives. No handler ever sees an unvalidated shape.
3. **Version the surface, not the schema.** `/v1` is a stability promise. Additive changes
   ship inside it; breaking changes mint `/v2` and both run during a deprecation window.
4. **The catalog is public and cacheable; everything else is authenticated and private.**
5. **Errors are data.** A machine-readable code, a human message, a correlation id.

---

## 2. Base

```
https://api.irodora.com/v1
```

| Header | Direction | Purpose |
|---|---|---|
| `Authorization: Bearer <token>` | → | OIDC access token or API key |
| `Idempotency-Key: <uuid>` | → | Required on every non-idempotent mutation |
| `Accept-Language: en \| ja` | → | Localised names and explanation text |
| `X-Irodora-Corpus: 2026.08.1` | → | Pin the corpus version; omit for latest published |
| `X-Request-Id` | ↔ | Correlation id; echoed, and present in every log line |
| `X-Irodora-Envelope` | ← | The reproducibility envelope used for this response |

---

## 3. Surface

### Catalog — public, cacheable

```http
GET  /v1/colors                       # filter: family, era, classification, season, temperature
GET  /v1/colors/{slug}
GET  /v1/colors/{slug}/related
GET  /v1/palettes
GET  /v1/palettes/{slug}
GET  /v1/search?q=                    # names, romaji, kanji, hex, natural phrase
```

Immutable per corpus version → `Cache-Control: public, max-age=31536000, immutable` with
the version in the cache key. A publish mints a new version rather than invalidating,
so no cache can ever serve a half-updated catalog.

### Colour operations — stateless, no auth

```http
POST /v1/color/convert                # between any supported spaces
POST /v1/color/match                  # nearest corpus entries with ΔE00
POST /v1/color/compare                # ΔE00, per-axis, CVD separation, contrast
POST /v1/color/harmony                # harmony sets for a base colour
POST /v1/color/cvd                    # simulation and separation scoring
```

These exist for **server-side consumers and the public API**. Our own clients compute
locally — an app that round-trips to convert a colour is an app that stops working on the
underground.

### Recommendation — authenticated

```http
POST /v1/recommendations/pairings     # garment colour + slot → ranked candidates
POST /v1/recommendations/outfit       # a full outfit proposal
POST /v1/outfits/evaluate             # score an outfit the user assembled
POST /v1/outfits/generate             # generate from a wardrobe subset
```

### Personal and wardrobe — authenticated, tenant-scoped

```http
GET|PUT    /v1/profile
POST       /v1/profile/guided-setup
GET|POST   /v1/wardrobe/items
GET|PATCH|DELETE /v1/wardrobe/items/{id}
POST       /v1/wardrobe/items/{id}/image     # presigned upload
GET|POST   /v1/outfits
POST       /v1/sync                          # batched outbox push/pull
```

### Account

```http
GET    /v1/me
POST   /v1/me/export                  # DSR export — async, returns a job
DELETE /v1/me                         # DSR erasure — async, returns a job
GET    /v1/me/sessions
DELETE /v1/me/sessions/{id}
```

### Platform

```http
GET /healthz                          # liveness — process is up. No dependencies checked.
GET /readyz                           # readiness — database and cache reachable
GET /v1/openapi.json                  # generated from the implementation
```

`/healthz` deliberately checks nothing external. A liveness probe that fails when the
database blips causes the orchestrator to restart a perfectly healthy container — turning
a brief dependency hiccup into an outage. That distinction matters more under
Coolify/Dokploy, where the platform restarts on probe failure without much ceremony.

---

## 4. Request and response shapes

Colours on the wire always carry provenance (FR-9):

```jsonc
// POST /v1/recommendations/pairings
{
  "input": {
    "color": {
      "space": "oklch",
      "components": [0.58, 0.06, 155],
      "provenance": { "source": "estimated", "confidence": 0.81 }
    },
    "slot": "top"
  },
  "target": ["bottom", "shoes"],
  "context": { "occasion": "casual", "aesthetic": "japanese-contemporary" },
  "profileId": "p_01H..."
}
```

```jsonc
{
  "base": {
    "name": { "en": "Muted Sage", "ja": "青磁鼠" },
    "hex": "#718477",
    "match": { "slug": "seiji-nezumi", "deltaE00": 2.14, "similarity": 0.94 }
  },
  "recommendations": {
    "bottom": [
      {
        "name": { "en": "Ecru", "ja": "生成り" },
        "hex": "#E8DFCF",
        "score": 93,
        "explanation": {
          "factors": [
            { "factor": "lightness-balance", "contribution": 18.2, "direction": "supports", "detail": "explain.lightness.strong" },
            { "factor": "temperature",       "contribution":  9.4, "direction": "supports", "detail": "explain.temperature.compatible" },
            { "factor": "cvd-separation",    "contribution":  4.1, "direction": "supports", "detail": "explain.cvd.clear" }
          ]
        },
        "cvd": { "protan": 88, "deutan": 91, "tritan": 95 }
      }
    ]
  },
  "envelope": { "engine": "1.0.0", "corpus": "2026.08.1", "rules": "2026.08.4", "profile": "p_01H...:v3" }
}
```

`detail` is a **message key**, not a sentence. The same response must render in English
and Japanese, and the client owns presentation. A server that returns prose has made the
locale decision on the client's behalf, wrongly.

---

## 5. Errors

```jsonc
{
  "error": {
    "code": "colour_out_of_gamut",
    "message": "The requested colour cannot be represented in the target gamut.",
    "details": { "space": "srgb", "suggestion": "Enable gamut mapping." },
    "requestId": "01H..."
  }
}
```

| Status | Meaning |
|---|---|
| 400 | Malformed request |
| 401 | Missing or invalid credentials |
| 403 | Authenticated but not entitled (includes tier gating) |
| 404 | Not found, **or** not visible to this tenant |
| 409 | Conflict — idempotency-key reuse with a different body; sync conflict |
| 422 | Well-formed but semantically invalid |
| 429 | Rate limited — `Retry-After` and `X-RateLimit-Reset` always present |
| 500 | Our fault. Correlation id returned; details never leaked |
| 503 | Dependency unavailable — client should fall back to the local engine |

**404, not 403, for another tenant's resource.** A 403 confirms the id exists, which is a
free enumeration oracle.

Codes are a closed, versioned enum in `@irodora/contracts` — clients switch on them, so a
typo'd string in one handler is a broken client.

---

## 6. Idempotency

Every non-idempotent mutation requires `Idempotency-Key`. The key, request fingerprint and
response are stored for 24 hours:

- same key, same body → the stored response, not a second write
- same key, **different** body → `409`
- no key on a mutating route → `400`

This is not optional politeness. Mobile clients retry on flaky networks, and a duplicate
wardrobe item created by a retry is a data-quality bug the user has to clean up manually.

---

## 7. Pagination

Cursor-based only. Opaque, signed cursors encoding the sort key and direction.

```
GET /v1/colors?limit=50&cursor=eyJrIjoi...
→ { "data": [...], "page": { "nextCursor": "...", "hasMore": true } }
```

Offset pagination skips and duplicates rows when the underlying set changes mid-scroll,
which is exactly what a catalog does while an editor is publishing.

**A cursor encodes a sort order, not just a position.** Changing the sort must invalidate
the cursor rather than silently reinterpreting it against a different ordering.

---

## 8. Rate limiting

| Class | Default |
|---|---|
| Anonymous catalog reads | 120/min per IP |
| Authenticated general | 600/min per user |
| Auth endpoints | 10/min per IP **and** per identifier |
| Image upload | 30/min per user |
| Export / report generation | 5/hour per user |
| API keys | Per-plan quota with monthly metering |

Sliding window in Valkey. Limits are per-tenant as well as per-user, so one user cannot
exhaust an organisation's budget.

---

## 9. Versioning and deprecation

Inside `/v1`, **additive only**: new endpoints, new optional request fields, new response
fields. Clients must ignore unknown response fields, and the generated SDK does.

Never inside a version: removing or renaming a field, narrowing a type, changing a
default, changing an error code's meaning, or changing the semantics of an existing field.

A breaking change mints `/v2`. `/v1` then runs for **at least 12 months** with `Deprecation`
and `Sunset` headers, and usage is tracked so we know who is still on it before it goes.

---

## 10. The generated SDK

`@irodora/sdk` is generated from the OpenAPI document, which is generated from the
implementation. Three consequences:

- The SDK cannot describe an endpoint that does not exist.
- A contract change that breaks a consumer breaks the SDK build first — in our CI, not
  their production.
- The dashboard and mobile app consume the SDK, so they are the first users of every
  contract change ([E-004](../../.harness/state/effects.json)).
