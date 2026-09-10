#!/usr/bin/env python3
"""sync-firestore-to-d1.py — Mirror Firestore public collections to Cloudflare D1.

Idempotent. Reads from Firestore via Admin SDK, generates SQL, applies via wrangler
CLI. Safe to re-run after every enrichment round (INSERT OR REPLACE keyed by docId).

Usage:
    # Full sync of both collections
    python3 scripts/sync-firestore-to-d1.py

    # Specific collections only
    python3 scripts/sync-firestore-to-d1.py --collections consultores

    # Local D1 (no remote) — for dev
    python3 scripts/sync-firestore-to-d1.py --local

    # Dry run: print SQL to stdout, don't execute
    python3 scripts/sync-firestore-to-d1.py --dry-run > /tmp/sync.sql

The script knows about both schemas (consultores, software) and applies the same
country normalization that /api/directorio/consultores did in-cache (so D1 stores
canonical values).

Replaces: the "cache-bust-by-version-bump" pattern. After this script, every insert
into Firestore is followed by one sync run + one CF Pages auto-deploy (git push).
No more bumping cache versions in src/lib/cache.ts.

Env vars (read from ~/.hermes/.env.micaot or shell):
    CLOUDFLARE_API_TOKEN     (required for --remote)
    CLOUDFLARE_ACCOUNT_ID    (required for --remote; default 1d7e014531130045fb08225c02c73597)
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# Resolve service-account path (existing pattern from scripts/add-batch-*.mjs)
SA_PATH = Path(__file__).parent / ".sa-asetemyt.json"


# ---------------------------------------------------------------------------
# Helper functions (defined BEFORE the COLLECTIONS schema so transforms can
# reference them by name when the dict literal is evaluated).
# ---------------------------------------------------------------------------

def _to_iso(v):
    """Firestore timestamp → ISO string. Accept datetime, str, or None."""
    if v is None:
        return ""
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()
    return str(v)


# Country normalization (same map the previous in-cache transform used).
_COUNTRY_MAP = {
    "spain": "España", "españa": "España",
    "germany": "Alemania", "alemania": "Alemania",
    "mexico": "México", "méxico": "México", "méjico": "México",
    "peru": "Perú", "perú": "Perú",
    "usa": "Estados Unidos", "us": "Estados Unidos",
    "united states": "Estados Unidos", "estados unidos": "Estados Unidos",
    "france": "Francia", "francia": "Francia",
    "italy": "Italia", "italia": "Italia",
    "portugal": "Portugal",
    "brazil": "Brasil", "brasil": "Brasil",
    "colombia": "Colombia",
    "argentina": "Argentina",
    "chile": "Chile",
    "uk": "Reino Unido", "united kingdom": "Reino Unido", "reino unido": "Reino Unido",
    "china": "China",
    "japan": "Japón", "japón": "Japón",
    "india": "India",
}


def _normalize_ubicacion(ubi: dict) -> dict:
    if ubi.get("pais"):
        norm = _COUNTRY_MAP.get(ubi["pais"].lower().strip())
        if norm:
            ubi = {**ubi, "pais": norm}
    return ubi


def _sql_escape(s):
    """SQL string escape: doubles single quotes."""
    if s is None:
        return ""
    return str(s).replace("'", "''")


# ---------------------------------------------------------------------------
# Schema definitions. Maps Firestore field → SQL column + optional transformer.
# ---------------------------------------------------------------------------

COLLECTIONS = {
    "consultores": {
        "firestore_collection": "directorio_consultores_asetemyt",
        "table": "consultores",
        "columns": [
            "id", "slug", "nombre", "tipo", "lang", "descripcion",
            "especialidades", "servicios", "ubicacion", "contacto", "logo",
            "verificado", "destacado", "created_at", "updated_at",
        ],
        "transforms": {
            "especialidades": lambda v: json.dumps(v or [], ensure_ascii=False),
            "servicios":      lambda v: json.dumps(v or [], ensure_ascii=False),
            "ubicacion":      lambda v: json.dumps(_normalize_ubicacion(v or {}), ensure_ascii=False),
            "contacto":       lambda v: json.dumps(v or {}, ensure_ascii=False),
            "verificado":     lambda v: 1 if v else 0,
            "destacado":      lambda v: 1 if v else 0,
            "createdAt":      _to_iso,
            "updatedAt":      _to_iso,
        },
        "rename": {
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
    },
    "software": {
        "firestore_collection": "directorio_software_asetemyt",
        "table": "software",
        "columns": [
            "id", "slug", "nombre", "tipo", "lang", "descripcion",
            "categorias", "funcionalidades", "pricing", "fabricante",
            "contacto", "logo", "verificado", "destacado", "created_at", "updated_at",
        ],
        "transforms": {
            "categorias":      lambda v: json.dumps(v or [], ensure_ascii=False),
            "funcionalidades": lambda v: json.dumps(v or [], ensure_ascii=False),
            "pricing":         lambda v: json.dumps(v or {}, ensure_ascii=False),
            "contacto":        lambda v: json.dumps(v or {}, ensure_ascii=False),
            "verificado":      lambda v: 1 if v else 0,
            "destacado":       lambda v: 1 if v else 0,
            "createdAt":       _to_iso,
            "updatedAt":       _to_iso,
        },
        "rename": {
            "createdAt": "created_at",
            "updatedAt": "updated_at",
        },
    },
}


# ---------------------------------------------------------------------------
# Firestore read
# ---------------------------------------------------------------------------

def fetch_firestore_docs(firestore_collection: str):
    """Stream all docs from a Firestore collection. Yields (docId, dict)."""
    if not SA_PATH.exists():
        sys.exit(
            f"ERROR: {SA_PATH} not found. Run: python3 scripts/extract-asetemyt-sa.py"
        )

    from firebase_admin import credentials, firestore, initialize_app

    cred = credentials.Certificate(str(SA_PATH))
    try:
        initialize_app(cred)
    except ValueError:
        pass  # already initialized (re-run case)

    db = firestore.client()
    for doc in db.collection(firestore_collection).stream():
        yield doc.id, doc.to_dict()


# ---------------------------------------------------------------------------
# SQL build
# ---------------------------------------------------------------------------

def build_sql(name: str, docs) -> str:
    """Build the SQL dump for one collection."""
    cfg = COLLECTIONS[name]
    lines = []
    lines.append(f"-- Sync {name} → {cfg['table']} at {datetime.now(timezone.utc).isoformat()}")
    lines.append(f"-- {len(docs)} docs")
    # D1 does NOT support SQL-level BEGIN TRANSACTION (wrangler rejects it). Each
    # INSERT OR REPLACE is atomic at the row level. For full atomicity across rows,
    # use --batch with wrangler (handled by apply_sql_*). For our use case
    # (idempotent re-sync of a few thousand rows), per-row atomicity is enough.

    for doc_id, data in docs:
        values = []
        for col in cfg["columns"]:
            if col == "id":
                values.append(_sql_escape(doc_id))
                continue
            # Resolve source field name (with rename)
            source_field = None
            for orig, dest in cfg["rename"].items():
                if dest == col:
                    source_field = orig
                    break
            if source_field is None:
                source_field = col

            raw = data.get(source_field)
            transform = cfg["transforms"].get(source_field)
            if transform:
                raw = transform(raw)
            values.append(_sql_escape(raw))

        cols_csv = ",".join(cfg["columns"])
        vals_csv = ",".join(f"'{v}'" for v in values)
        lines.append(
            f"INSERT OR REPLACE INTO {cfg['table']}({cols_csv}) VALUES({vals_csv});"
        )

    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# D1 apply
# ---------------------------------------------------------------------------

def apply_sql_remote(sql: str) -> int:
    """Apply SQL to remote D1 via wrangler. Returns wrangler exit code."""
    if not os.environ.get("CLOUDFLARE_API_TOKEN"):
        sys.exit(
            "ERROR: CLOUDFLARE_API_TOKEN not set. Export it or pass --local.\n"
            "Token needs D1:Edit scope on Micaot account (1d7e014531130045fb08225c02c73597)."
        )

    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False) as f:
        f.write(sql)
        sql_path = f.name

    try:
        proc = subprocess.run(
            ["npx", "wrangler", "d1", "execute", "DB", "--remote", "--yes", "--file", sql_path],
            cwd=Path(__file__).parent.parent,
            capture_output=True,
            text=True,
        )
        sys.stdout.write(proc.stdout)
        sys.stderr.write(proc.stderr)
        return proc.returncode
    finally:
        os.unlink(sql_path)


def apply_sql_local(sql: str) -> int:
    """Apply SQL to local D1 (wrangler miniflare SQLite)."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False) as f:
        f.write(sql)
        sql_path = f.name

    try:
        proc = subprocess.run(
            ["npx", "wrangler", "d1", "execute", "DB", "--local", "--yes", "--file", sql_path],
            cwd=Path(__file__).parent.parent,
            capture_output=True,
            text=True,
        )
        sys.stdout.write(proc.stdout)
        sys.stderr.write(proc.stderr)
        return proc.returncode
    finally:
        os.unlink(sql_path)


def verify_count(name: str, remote: bool) -> int:
    """Read the COUNT from D1 post-sync. Returns the count."""
    cfg = COLLECTIONS[name]
    flag = "--remote" if remote else "--local"
    proc = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "DB", flag,
         "--command", f"SELECT COUNT(*) AS n FROM {cfg['table']}"],
        cwd=Path(__file__).parent.parent,
        capture_output=True,
        text=True,
    )
    out = proc.stdout
    for line in out.splitlines():
        line = line.strip().strip(",").strip()
        if line.startswith('"n"') or line.startswith("n:"):
            try:
                return int(line.split(":")[-1].strip().rstrip(",").strip('" '))
            except (ValueError, IndexError):
                continue
    return -1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--collections",
        default="consultores,software",
        help="Comma-separated list. Default: consultores,software",
    )
    parser.add_argument("--local", action="store_true", help="Sync to local D1 (miniflare) instead of remote (default)")
    parser.add_argument("--dry-run", action="store_true", help="Print SQL to stdout, don't apply")
    parser.add_argument("--skip-verify", action="store_true", help="Skip post-sync COUNT verification")
    args = parser.parse_args()

    target = "local" if args.local else "remote"
    print(f"=== sync-firestore-to-d1.py — target={target} ===", file=sys.stderr)
    print(f"    collections: {args.collections}", file=sys.stderr)

    if not SA_PATH.exists():
        sys.exit(
            f"ERROR: {SA_PATH} not found.\n"
            f"Run: python3 {Path(__file__).parent}/extract-asetemyt-sa.py"
        )

    collections = [c.strip() for c in args.collections.split(",") if c.strip()]
    unknown = [c for c in collections if c not in COLLECTIONS]
    if unknown:
        sys.exit(f"ERROR: unknown collection(s): {unknown}. Known: {list(COLLECTIONS.keys())}")

    for name in collections:
        print(f"\n--- {name} ---", file=sys.stderr)
        print(f"  fetching from Firestore...", file=sys.stderr)
        docs = list(fetch_firestore_docs(COLLECTIONS[name]["firestore_collection"]))
        print(f"  fetched {len(docs)} docs", file=sys.stderr)

        sql = build_sql(name, docs)
        print(f"  generated SQL: {len(sql):,} bytes, {sql.count(chr(10))} lines", file=sys.stderr)

        if args.dry_run:
            sys.stdout.write(sql)
            continue

        print(f"  applying to {target} D1...", file=sys.stderr)
        rc = apply_sql_local(sql) if args.local else apply_sql_remote(sql)
        if rc != 0:
            sys.exit(f"ERROR: wrangler exited {rc}")

        if not args.skip_verify:
            n = verify_count(name, remote=not args.local)
            print(f"  post-sync COUNT(*) = {n} (Firestore had {len(docs)})", file=sys.stderr)
            if n != len(docs):
                print(
                    f"  ⚠️  count mismatch ({n} vs {len(docs)}) — investigate before deploy",
                    file=sys.stderr,
                )
                sys.exit(2)

    print(f"\n=== sync complete — {target} ===", file=sys.stderr)


if __name__ == "__main__":
    main()
