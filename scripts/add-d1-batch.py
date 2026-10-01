#!/usr/bin/env python3
"""
add-d1-batch.py — Inserta un lote de fichas en D1 (asetemyt-directorio)
vía Cloudflare REST API, sin pasar por Firestore.

Uso:
  python3 scripts/add-d1-batch.py --input /tmp/tanda1_lean.json

El input es JSON con shape {"empresas": [...]}.
Hace dedupe contra slugs y webs de D1 ya conocidos (descargados a /tmp/d1_*.json).
Inserta via INSERT INTO app_documents (collection, id, data) — el trigger proyecta
automáticamente a la tabla pública `consultores`.
"""
import argparse
import json
import os
import re
import secrets
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlsplit

import urllib.request

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


def normalize_web(w):
    if not w:
        return ""
    return re.sub(r"^https?://", "", w).rstrip("/").lstrip("www.").lower()


def normalize_slug(s):
    s = (s or "").lower().strip()
    # Quitar acentos
    repl = {"á":"a","é":"e","í":"i","ó":"o","ú":"u","ü":"u","ñ":"n"}
    for k,v in repl.items(): s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def gen_id():
    # 20 chars alphanumeric, compatible con Firestore-style
    return secrets.token_urlsafe(15).replace("-", "A").replace("_", "B")[:20]


def load_existing_dedup():
    slugs = set(json.load(open("/tmp/d1_slugs.json"))) if Path("/tmp/d1_slugs.json").exists() else set()
    webs = set(json.load(open("/tmp/d1_webs.json"))) if Path("/tmp/d1_webs.json").exists() else set()
    ids = set(json.load(open("/tmp/d1_ids.json"))) if Path("/tmp/d1_ids.json").exists() else set()
    names = set(json.load(open("/tmp/d1_names.json"))) if Path("/tmp/d1_names.json").exists() else set()
    return slugs, webs, ids, names


def normalize_name(n):
    """Normaliza nombre para detectar duplicados: minúsculas, sin acentos, sin sufijos corporativos,
    sin espacios/puntuación."""
    if not n: return ""
    s = n.lower().strip()
    repl = {"á":"a","é":"e","í":"i","ó":"o","ú":"u","ü":"u","ñ":"n"}
    for k,v in repl.items(): s = s.replace(k, v)
    # Eliminar sufijos corporativos comunes para comparar nombres raíz
    for suf in [" s.l.", " s.l", " sl", " s.a.", " s.a", " sa", " s.l.u.", " slu",
                " s.l.l.", " sll", " s.c.", " sc", " s.c.p.", " scp",
                " s.coop", " s. coop", " s.a.t.", " sat", " sociedad anonima",
                " sociedad limitada", " s.l.ne", " slne", " & cia", " y cia",
                " consulting", " consultores", " consultoria", " consulting group",
                " group", " grupo", " ingenieria", " engineering", " eng",
                " espana", " spain", " internacional", " international"]:
        if s.endswith(suf):
            s = s[:-len(suf)].strip()
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


def extract_root_domain(web):
    """Extrae el dominio raíz (sin TLDs compuestos comunes .com.es, .co.uk, etc.) para
    detectar empresas que usan mismo nombre en TLD distinto."""
    if not web: return ""
    w = normalize_web(web)
    # Quitar subdominios comunes
    parts = w.split("/")[0].split(".")
    if len(parts) >= 2:
        # dominio raíz = últimas 2 partes (o 3 si TLD compuesto tipo .com.es)
        if len(parts) >= 3 and parts[-2] in ("com","co","org","net","gov","edu","ac"):
            return "".join(parts[-3:])
        return "".join(parts[-2:])
    return w


def build_data(empresa, doc_id, now_iso):
    """Construye el JSON `data` que se almacena en app_documents.
    El trigger extrae cada campo con json_extract(NEW.data, '$.slug') etc."""
    data = {
        "slug": empresa["slug"],
        "nombre": empresa["nombre"],
        "tipo": empresa.get("tipo", "empresa"),
        "lang": empresa.get("lang", "es"),
        "descripcion": empresa.get("descripcion", ""),
        "especialidades": json.dumps(empresa.get("especialidades", []), ensure_ascii=False),
        "servicios": json.dumps(empresa.get("servicios", []), ensure_ascii=False),
        "ubicacion": json.dumps(empresa.get("ubicacion", {}), ensure_ascii=False),
        "contacto": json.dumps(empresa.get("contacto", {}), ensure_ascii=False),
        "logo": empresa.get("logo", ""),
        # Booleanos REALES (json.dumps los serializa como true/false). Ojo:
        # escribir "false" como cadena hace que json_extract proyecte TEXT
        # 'false' y !!'false' === true en el lector → check de verificación
        # y destacado en TODAS las fichas (bug 2026-09-27).
        "verificado": bool(empresa.get("verificado")),
        "destacado": bool(empresa.get("destacado")),
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    return data


def escape_sql_string(s):
    """Escapa una cadena para usarla como literal SQL entre comillas simples."""
    return s.replace("'", "''")


def insert_one(cf_token, account_id, doc_id, data_json_str):
    """Inserta una fila en app_documents. El trigger AFTER INSERT proyecta a consultores."""
    sql = f"""INSERT INTO app_documents (collection, id, data) VALUES (
'directorio_consultores_asetemyt',
'{escape_sql_string(doc_id)}',
'{escape_sql_string(data_json_str)}'
)"""
    result = d1_query(cf_token, account_id, sql)
    changes = result.get("meta", {}).get("changes", 0)
    return changes > 0


def verify_in_consultores(cf_token, account_id, doc_id):
    """Comprueba que la fila se proyectó en consultores (trigger AFTER INSERT)."""
    sql = f"SELECT slug, nombre, tipo FROM consultores WHERE id = '{escape_sql_string(doc_id)}'"
    result = d1_query(cf_token, account_id, sql)
    rows = result.get("results", [])
    return rows[0] if rows else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="JSON con shape {empresas: [...]}")
    ap.add_argument("--dry-run", action="store_true", help="Solo mostrar dedup y NO insertar")
    args = ap.parse_args()

    cf_token, account_id = load_cf_creds()

    input_data = json.load(open(args.input))
    empresas = input_data["empresas"]
    print(f"📥 Cargadas {len(empresas)} candidatas del input\n")

    existing_slugs, existing_webs, existing_ids, existing_names = load_existing_dedup()
    print(f"📊 Catálogo D1 actual: {len(existing_slugs)} slugs, {len(existing_webs)} webs, {len(existing_ids)} ids, {len(existing_names)} nombres\n")

    # Pre-computar dominios raíz y nombres raíz del catálogo actual
    existing_root_domains = set()
    for w in existing_webs:
        rd = extract_root_domain(w)
        if rd and len(rd) > 5:  # Evitar matches espurios tipo "es" o "com"
            existing_root_domains.add(rd)
    existing_name_roots = set()
    for n in existing_names:
        nr = normalize_name(n)
        if len(nr) >= 4:
            existing_name_roots.add(nr)

    # Fail closed: fetch permanent opt-outs before accepting any import.
    exclusions = d1_query(cf_token, account_id,
        "SELECT id, data FROM app_documents WHERE collection = 'bajas_asetemyt'").get('results', [])
    blocked_domains = set()
    blocked_slugs = set()
    for record in exclusions:
        item = json.loads(record['data'])
        raw = item.get('domain') or item.get('dominio') or record['id']
        host = urlsplit(raw if '://' in raw else 'https://' + raw).hostname or ''
        blocked_domains.add(re.sub(r'^www\.', '', host.lower()))
        if item.get('slug'): blocked_slugs.add(item['slug'])

    # Conteo antes
    count_before = d1_query(cf_token, account_id, "SELECT COUNT(*) AS n FROM consultores")["results"][0]["n"]
    print(f"📊 Conteo consultores ANTES: {count_before}\n")

    # Dedup + validación
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000+00:00")
    accepted = []
    skipped = []
    seen_in_batch_slugs = set()
    seen_in_batch_names = set()
    seen_in_batch_webs = set()

    for e in empresas:
        slug = normalize_slug(e["slug"])
        nombre = e["nombre"]
        web = normalize_web(e.get("contacto", {}).get("web", ""))
        email = e.get("contacto", {}).get("email", "").strip()
        desc_len = len(e.get("descripcion", ""))
        servicios_n = len(e.get("servicios", []))

        hosts = []
        for candidate in [e.get('contacto', {}).get('web', ''), email.split('@')[-1] if '@' in email else '']:
            if candidate:
                hosts.append((urlsplit(candidate if '://' in candidate else 'https://' + candidate).hostname or '').lower())
        if slug in blocked_slugs or any(host == domain or host.endswith('.' + domain) for host in hosts for domain in blocked_domains if domain):
            raise RuntimeError(f"Importación cancelada: {nombre} figura en bajas_asetemyt. No publicar ni contactar.")

        # Nombre raíz para dedupe intra-batch e inter-batch
        name_root = normalize_name(nombre)
        # Dominio raíz
        root_domain = extract_root_domain(web)

        reasons = []
        # 1. Dedupe contra catálogo existente (D1)
        if slug in existing_slugs:
            reasons.append(f"slug duplicado en D1")
        if web and web in existing_webs:
            reasons.append(f"web duplicada en D1 ({web})")
        if root_domain and root_domain in existing_root_domains:
            reasons.append(f"dominio raíz duplicado en D1 ({root_domain})")
        if name_root and name_root in existing_name_roots:
            reasons.append(f"nombre duplicado en D1 (raíz={name_root})")
        # 2. Dedupe intra-batch
        if slug in seen_in_batch_slugs:
            reasons.append("slug duplicado dentro del batch")
        if web and web in seen_in_batch_webs:
            reasons.append(f"web duplicada dentro del batch")
        if name_root and name_root in seen_in_batch_names:
            reasons.append(f"nombre duplicado dentro del batch (raíz={name_root})")
        # 3. Validaciones de calidad
        if not email and not e.get("contacto", {}).get("linkedin"):
            reasons.append("sin email NI linkedin")
        if desc_len < 600:
            reasons.append(f"desc corta ({desc_len}c)")
        if servicios_n < 6:
            reasons.append(f"pocos servicios ({servicios_n})")

        if reasons:
            skipped.append({"nombre": nombre, "slug": slug, "web": web, "reasons": reasons})
        else:
            # Marcar como vistos en este batch
            seen_in_batch_slugs.add(slug)
            seen_in_batch_webs.add(web)
            seen_in_batch_names.add(name_root)
            existing_slugs.add(slug)
            if web: existing_webs.add(web)
            if root_domain: existing_root_domains.add(root_domain)
            if name_root: existing_name_roots.add(name_root)

            # Generar id único
            while True:
                doc_id = gen_id()
                if doc_id not in existing_ids:
                    existing_ids.add(doc_id)
                    break
            accepted.append({"doc_id": doc_id, "empresa": e})

    print(f"✅ Aceptadas: {len(accepted)} | ⏭️  Saltadas: {len(skipped)}\n")
    if skipped:
        print("Saltadas (motivos):")
        for s in skipped:
            print(f"  ⏭️  {s['nombre']} ({s['slug']}): {', '.join(s['reasons'])}")
        print()

    if args.dry_run:
        print("🔍 DRY-RUN: no se insertó nada.")
        return

    if not accepted:
        print("❌ Nada que insertar.")
        return

    # Insertar
    inserted = []
    for item in accepted:
        e = item["empresa"]
        doc_id = item["doc_id"]
        data = build_data(e, doc_id, now_iso)
        data_json_str = json.dumps(data, ensure_ascii=False)
        try:
            ok = insert_one(cf_token, account_id, doc_id, data_json_str)
            if ok:
                # Verificar proyección en consultores
                proj = verify_in_consultores(cf_token, account_id, doc_id)
                if proj:
                    print(f"✅ {e['nombre']}  →  id={doc_id}  → proyectada a consultores")
                    inserted.append({"nombre": e["nombre"], "slug": e["slug"], "id": doc_id})
                else:
                    print(f"⚠️  {e['nombre']} insertada en app_documents pero NO proyectada")
            else:
                print(f"❌ {e['nombre']} sin cambios en D1")
        except Exception as ex:
            print(f"❌ Error insertando {e['nombre']}: {ex}")
        time.sleep(0.2)

    # Conteo después
    time.sleep(1)
    count_after = d1_query(cf_token, account_id, "SELECT COUNT(*) AS n FROM consultores")["results"][0]["n"]
    print(f"\n📊 Conteo consultores DESPUÉS: {count_after} (delta: +{count_after - count_before})")

    # Guardar log
    log_path = Path("/tmp/d1_insert_log.json")
    with open(log_path, "w") as f:
        json.dump({
            "timestamp": now_iso,
            "count_before": count_before,
            "count_after": count_after,
            "inserted": inserted,
            "skipped": skipped,
        }, f, indent=2, ensure_ascii=False)
    print(f"📝 Log en {log_path}")


if __name__ == "__main__":
    main()
