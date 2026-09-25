#!/usr/bin/env python3
"""
add-d1-software.py — Inserta fichas NUEVAS de software en D1 (colección
`directorio_software_asetemyt`). El trigger app_software_insert las proyecta a la
tabla pública `software`, que es la que leen /api/directorio/software, /comparador
y /directorio/<slug>.

Uso:
  python3 scripts/add-d1-software.py --input /tmp/es_tanda/out_1.json [--dry-run]

El input es un array de fichas (ver /tmp/es_tanda/GOAL_TANDA.txt para el shape).
Valida antes de escribir: vocabulario de categorías/métodos, enums, longitud de la
descripción y dedupe contra el catálogo vivo (slug + dominio raíz + nombre raíz).
"""
import argparse
import importlib.util
import json
import re
import sys
import time
from pathlib import Path

HERE = Path(__file__).parent
_spec = importlib.util.spec_from_file_location("adb", str(HERE / "add-d1-batch.py"))
adb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(adb)

VOCAB = json.loads((HERE / "parametros_vocab.json").read_text())
COLLECTION = "directorio_software_asetemyt"
REQUIRED = ["id", "slug", "nombre", "descripcion", "categorias", "funcionalidades",
            "pricing", "parametros", "contacto", "lang", "tipo"]


def regdomain(u):
    u = (u or "").strip().lower()
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^www\.", "", u)
    host = u.split("/")[0].split(":")[0]
    p = host.split(".")
    if len(p) > 2 and p[-2] in ("co", "com", "org", "net", "gov", "ac", "edu"):
        return ".".join(p[-3:])
    return ".".join(p[-2:]) if len(p) >= 2 else host


def name_root(n):
    s = (n or "").lower()
    for suf in (" software", " sistemas", " soluciones", " sl", " sa", " studio"):
        if s.endswith(suf):
            s = s[:-len(suf)]
    return re.sub(r"[^a-z0-9]", "", s)


def validate(rec):
    errs = []
    for k in REQUIRED:
        if k not in rec:
            errs.append(f"falta {k}")
    d = (rec.get("descripcion") or "").strip()
    if not 700 <= len(d) <= 1300:
        errs.append(f"descripcion {len(d)} car.")
    if not re.search(r"[.!?]$", d):
        errs.append("descripcion sin punto final")
    if "…" in d or re.search(r"\b(QR|NFC)\b", d):
        errs.append("contenido prohibido")
    if re.search(r"\b(podés|tenés|querés|decime|contame)\b", d, re.I):
        errs.append("voseo")
    cats = rec.get("categorias") or []
    if not 0 <= len(cats) <= 3 or any(c not in VOCAB["categorias"] for c in cats):
        errs.append(f"categorias {cats}")
    fns = rec.get("funcionalidades") or []
    if not 5 <= len(fns) <= 9 or any(not (15 <= len(f) <= 170) for f in fns):
        errs.append("funcionalidades")
    p = rec.get("parametros") or {}
    for k in ("plataforma", "despliegue", "datos", "offline", "app_movil", "idiomas", "api",
              "target", "video", "codigo_abierto", "pais_origen", "metodos", "integraciones"):
        if k not in p:
            errs.append(f"parametros.{k}")
    for k in ("plataforma", "despliegue", "datos", "offline", "app_movil", "api", "target",
              "video", "codigo_abierto"):
        if p.get(k, "«x»") not in VOCAB["enums"].get(k, [p.get(k)]):
            errs.append(f"enum {k}={p.get(k)}")
    for m in p.get("metodos") or []:
        if m not in VOCAB["metodos"]:
            errs.append(f"metodo {m}")
    pr = rec.get("pricing") or {}
    for k in ("modelo", "precio_desde", "prueba_gratuita", "notas"):
        if k not in pr:
            errs.append(f"pricing.{k}")
    if pr.get("modelo", "«x»") not in VOCAB["enums"]["pricing.modelo"]:
        errs.append(f"pricing.modelo={pr.get('modelo')}")
    if pr.get("prueba_gratuita", "«x»") not in VOCAB["enums"]["pricing.prueba_gratuita"]:
        errs.append(f"pricing.prueba={pr.get('prueba_gratuita')}")
    return errs


def to_row(rec):
    """Construye el objeto `data` de app_documents (el trigger lee $.campo)."""
    return {
        "id": rec["id"], "_id": rec["id"],
        "slug": rec["slug"], "nombre": rec["nombre"], "tipo": rec.get("tipo", "software"),
        "lang": rec.get("lang", "es"), "seccion": "software",
        "descripcion": rec["descripcion"],
        "categorias": rec.get("categorias", []),
        "funcionalidades": rec.get("funcionalidades", []),
        "pricing": rec.get("pricing", {}),
        "parametros": rec.get("parametros", {}),
        "fabricante": rec.get("fabricante", ""),
        "contacto": rec.get("contacto", {}),
        "logo": rec.get("logo", ""),
        "verificado": bool(rec.get("verificado", False)),
        "destacado": bool(rec.get("destacado", False)),
        "createdAt": rec.get("createdAt"),
        "updatedAt": rec.get("createdAt"),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    recs = json.loads(Path(args.input).read_text())
    cf_token, acct = adb.load_cf_creds()

    existing = adb.d1_query(cf_token, acct,
        f"SELECT id, data FROM app_documents WHERE collection='{COLLECTION}'")["results"]
    cat = [(r["id"], json.loads(r["data"])) for r in existing]
    domains = {regdomain((d.get("contacto") or {}).get("web")) for _, d in cat}
    slugs = {d.get("slug") for _, d in cat}
    roots = {name_root(d.get("nombre")) for _, d in cat}
    ids = {i for i, _ in cat}
    print(f"catálogo actual: {len(cat)} fichas")

    ok, bad, dup = [], [], []
    for rec in recs:
        errs = validate(rec)
        if errs:
            bad.append((rec.get("slug"), errs)); continue
        d = regdomain((rec.get("contacto") or {}).get("web"))
        if rec["slug"] in slugs or d in domains or name_root(rec["nombre"]) in roots \
           or rec["id"] in ids:
            dup.append(rec["slug"]); continue
        if not (rec["id"] and rec["slug"] and rec["nombre"]):
            bad.append((rec.get("slug"), ["id/slug/nombre vacíos"])); continue
        slugs.add(rec["slug"]); domains.add(d); roots.add(name_root(rec["nombre"])); ids.add(rec["id"])
        ok.append(rec)

    print(f"✅ listas: {len(ok)} | ⏭ duplicadas: {len(dup)} | ✗ inválidas: {len(bad)}")
    for s in dup:
        print("   ⏭", s)
    for s, e in bad:
        print("   ✗", s, "->", "; ".join(e))
    if args.dry_run or not ok:
        print("🔍 DRY-RUN: no se insertó nada.")
        return

    n = 0
    for rec in ok:
        sql = "INSERT INTO app_documents (collection, id, data) VALUES (?, ?, ?)"
        try:
            adb.d1_query(cf_token, acct, sql,
                         [COLLECTION, rec["id"], json.dumps(to_row(rec), ensure_ascii=False)])
            n += 1
            print(f"   ✓ {rec['slug']}")
        except Exception as e:
            print(f"   ✗ {rec['slug']}: {str(e)[:150]}")
        time.sleep(0.12)

    time.sleep(1)
    total = adb.d1_query(cf_token, acct, "SELECT COUNT(*) AS n FROM software")["results"][0]["n"]
    print(f"\n✍️  {n} insertadas — software total: {total}")


if __name__ == "__main__":
    main()
