#!/usr/bin/env python3
"""
enrich-d1-batch.py — Enriquece fichas existentes en D1 con datos adicionales
(email, telefono, linkedin, descripcion, servicios) verificados con curl.

Uso:
  python3 scripts/enrich-d1-batch.py --input /tmp/enrichments.json

El input es un JSON con shape {"updates": [{slug, email?, telefono?, linkedin?, descripcion?, servicios?}]}.
HACE UPDATE directo en app_documents (que dispara trigger que proyecta a consultores).
IMPORTANTE: Solo añade campos que tienen valor. NO sobreescribe campos existentes con valor.
Si un campo ya tiene contenido, se conserva el existente (a menos que se use --force).
"""
import argparse
import json
import os
import re
import secrets
import time
from pathlib import Path
import urllib.request
from urllib.parse import quote

VAULT = Path("/home/ubuntu/.hermes/.env.micaot")
DB_ID = "9047e833-5b98-4859-b234-774905843e78"


def load_cf_creds():
    content = VAULT.read_text()
    cf_token = re.search(r"^CLOUDFLARE_API_TOKEN\s*=\s*(.+?)\s*$", content, re.MULTILINE).group(1).strip()
    account_id = re.search(r"^CLOUDFLARE_ACCOUNT_ID\s*=\s*(.+?)\s*$", content, re.MULTILINE).group(1).strip()
    return cf_token, account_id


def d1_query(cf_token, account_id, sql, params=None):
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{DB_ID}/query"
    body = {"sql": sql}
    if params:
        body["params"] = params
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Authorization": f"Bearer {cf_token}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
    if not result.get("success"):
        raise RuntimeError(f"D1 query failed: {result}")
    return result["result"][0] if result.get("result") else {}


def escape_sql_string(s):
    return s.replace("'", "''")


def get_doc_by_slug(cf_token, account_id, slug):
    """Busca el docId y los datos actuales en app_documents por slug."""
    sql = f"SELECT id, data FROM app_documents WHERE collection='directorio_consultores_asetemyt' AND json_extract(data, '$.slug') = '{escape_sql_string(slug)}'"
    result = d1_query(cf_token, account_id, sql)
    rows = result.get("results", [])
    if not rows:
        return None, None
    return rows[0]["id"], json.loads(rows[0]["data"])


def update_doc(cf_token, account_id, doc_id, new_data):
    """Actualiza un doc en app_documents Y luego sincroniza consultores explícitamente.
    Esto es porque el trigger AFTER UPDATE en app_documents no siempre propaga
    al endpoint público (consultores) en D1 con la implementación actual,
    así que hacemos UPDATE directo en ambas tablas para garantizar visibilidad."""
    data_json = json.dumps(new_data, ensure_ascii=False)
    escaped = escape_sql_string(data_json)

    # 1. UPDATE app_documents
    sql1 = f"""UPDATE app_documents SET data = '{escaped}'
              WHERE collection='directorio_consultores_asetemyt' AND id = '{escape_sql_string(doc_id)}'"""
    d1_query(cf_token, account_id, sql1)

    # 2. UPDATE consultores directamente (campo a campo)
    contacto = new_data.get("contacto", {})
    if contacto:
        contacto_json = json.dumps(contacto, ensure_ascii=False)
        contacto_escaped = escape_sql_string(contacto_json)
        sql2 = f"""UPDATE consultores SET contacto = '{contacto_escaped}'
                  WHERE id = '{escape_sql_string(doc_id)}'"""
        d1_query(cf_token, account_id, sql2)

    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="JSON con shape {updates: [{slug, ...}]}")
    ap.add_argument("--dry-run", action="store_true", help="Solo mostrar diff, no insertar")
    ap.add_argument("--force", action="store_true", help="Sobreescribir campos existentes")
    args = ap.parse_args()

    cf_token, account_id = load_cf_creds()

    input_data = json.load(open(args.input))
    updates = input_data["updates"]
    print(f"📥 Cargadas {len(updates)} updates\n")

    enriched = []
    skipped = []

    for upd in updates:
        slug = upd["slug"]
        doc_id, current = get_doc_by_slug(cf_token, account_id, slug)
        if not doc_id:
            skipped.append({"slug": slug, "reason": "not found in D1"})
            continue

        # Construir new_data mezclando
        new_data = json.loads(json.dumps(current))  # deep copy
        changes_made = []
        # Los campos email/telefono/linkedin/web viven en data.contacto (no a nivel raíz)
        for field in ["email", "telefono", "linkedin", "web"]:
            if field not in upd:
                continue
            new_val = upd[field]
            # Asegurar que data.contacto existe
            if "contacto" not in new_data or not isinstance(new_data["contacto"], dict):
                new_data["contacto"] = {}
            cur_val = new_data["contacto"].get(field, "")
            # Si está vacío y tenemos nuevo, añadir
            if not cur_val or args.force:
                new_data["contacto"][field] = new_val
                if cur_val != new_val:
                    changes_made.append(f"contacto.{field}: '{cur_val[:30]}' → '{new_val[:30]}'")
        # Otros campos (descripcion, servicios) sí están a nivel raíz
        for field in ["descripcion", "servicios", "especialidades"]:
            if field not in upd:
                continue
            new_val = upd[field]
            cur_val = new_data.get(field, "")
            if not cur_val or args.force:
                new_data[field] = new_val
                if cur_val != new_val:
                    changes_made.append(f"{field}: '{str(cur_val)[:30]}' → '{str(new_val)[:30]}'")

        # Si se cambió algo, actualizar
        if changes_made:
            print(f"  📝 {slug} ({doc_id[:8]}…):")
            for c in changes_made:
                print(f"     · {c}")
            if args.dry_run:
                skipped.append({"slug": slug, "reason": "dry-run, no insertado"})
                continue
            try:
                ok = update_doc(cf_token, account_id, doc_id, new_data)
                if ok:
                    enriched.append({"slug": slug, "doc_id": doc_id, "changes": changes_made})
                    print(f"     ✓ actualizado")
                else:
                    skipped.append({"slug": slug, "reason": "UPDATE sin cambios"})
            except Exception as ex:
                skipped.append({"slug": slug, "reason": f"ERROR: {ex}"})
        else:
            skipped.append({"slug": slug, "reason": "sin cambios (campos ya tienen valor)"})
            print(f"  ⏭️  {slug}: sin cambios (campos ya poblados)")

    print(f"\n📊 Resultado: {len(enriched)} actualizadas, {len(skipped)} saltadas")
    if skipped:
        print("Saltadas:")
        for s in skipped:
            print(f"  - {s['slug']}: {s['reason']}")

    # Log
    log_path = Path("/tmp/d1_enrich_log.json")
    with open(log_path, "w") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "enriched": enriched,
            "skipped": skipped,
        }, f, indent=2, ensure_ascii=False)
    print(f"📝 Log en {log_path}")


if __name__ == "__main__":
    main()
