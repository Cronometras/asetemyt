# D1 migration — asetemyt public mirror

This directory is the source of truth for the D1 schema that backs the public
listing endpoints (`/api/directorio/consultores`, `/api/directorio/software`).

## Why D1

Two concrete incidents motivated the migration (full timeline in skill
`devops/asetemyt-directory-ops`):

- **2026-09-08**: Firestore Spark plan exhausted its 20k reads/day quota. The
  endpoint `/api/directorio/consultores` started returning `[]` because the
  Firestore query 429'd and KV cached the empty result.
- **2026-09-09**: Cloudflare KV Free plan exhausted its 1000 puts/day quota
  during cache-bust attempts to recover from the Firestore incident.

D1 replaces both:
- 5M rows/day free read tier (vs Firestore Spark 20k).
- No per-write quota — D1 imports are batched, not per-key.

Firestore remains the source of truth for writes (claim flow, ficha edits,
admin actions). D1 is a read mirror, populated by `scripts/sync-firestore-to-d1.py`.

## Migrations

| File | Purpose |
|---|---|
| `0001_consultores.sql` | Mirror of `directorio_consultores_asetemyt` |
| `0002_software.sql` | Mirror of `directorio_software_asetemyt` |

## Apply migrations (remote)

Requires a CF API token with `D1:Edit` scope on the Micaot account. Set it in
shell before running:

```bash
export CLOUDFLARE_API_TOKEN=<token>
export CLOUDFLARE_ACCOUNT_ID=1d7e014531130045fb08225c02c73597
```

Create the DB once:

```bash
npx wrangler d1 create asetemyt-directorio
# → returns {"uuid": "<D1_ID>"} — copy into wrangler.toml as database_id
```

Apply migrations:

```bash
npx wrangler d1 migrations apply DB --remote
```

## Initial sync

After migrations, populate from Firestore:

```bash
cd /home/ubuntu/projects/asetemyt
python3 scripts/sync-firestore-to-d1.py --collections consultores,software
```

This is idempotent — uses `INSERT OR REPLACE` keyed by Firestore docId. Safe
to re-run after every enrichment round.

## Production binding (one-time, CF Dashboard)

The project uses CF Pages via git integration, so the production binding is
configured in the dashboard, not via wrangler deploy:

1. https://dash.cloudflare.com/ → Pages → asetemyt → Settings → Functions
2. **D1 database bindings** → Add binding
   - Variable name: `DB`
   - D1 database: `asetemyt-directorio`
3. Save → next deploy picks it up.

Without this binding, `src/lib/d1.ts` throws "D1 binding `DB` not found".

## Verification

After deploy:

```bash
# 1) Endpoint serves from D1
curl -s https://asetemyt.com/api/directorio/consultores \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('count:', d['count'])"
# Expected: 1024 (matches Firestore count)

# 2) No Firestore reads during this call (verify via Admin SDK read quota)
# (admin-side check, not part of public verification)
```

## Local dev

```bash
# Apply migrations locally
npx wrangler d1 migrations apply DB --local

# Seed local DB from Firestore (one-time, fast)
python3 scripts/sync-firestore-to-d1.py --local \
  --collections consultores,software
```

`wrangler dev` then serves `/api/directorio/consultores` against the local
SQLite file in `.wrangler/state/v3/d1/`.

## What's NOT in D1

Everything Firestore-specific stays in Firestore:

- Firebase Auth (`src/lib/auth.ts`, `/api/auth/*`)
- Writes (`/api/ficha/*`, `/api/admin/*`)
- Stripe webhook, jobs, reviews, newsletter, leads, outreach, coupons
- Articles (`articulos_asetemyt` — published via Firestore, blog pages prerendered)

D1 is a public read mirror only.
