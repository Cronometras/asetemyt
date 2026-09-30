#!/usr/bin/env python3
"""
enrich-software-parametros.py — Fusiona los lotes enriquecidos en D1 (app_documents)
de las fichas de software del directorio ASETEMYT.

El trigger app_software_update proyecta cada fila a la tabla pública `software`,
que es la que leen /api/directorio/software, /comparador y /directorio/<slug>.

Uso:
  python3 scripts/enrich-software-parametros.py --input /tmp/enrich/batch_output_1.json [--dry-run]
  python3 scripts/enrich-software-parametros.py --all           # todos los batch_output_*.json

Sobrescribe SOLO: descripcion, categorias, funcionalidades, pricing, parametros, lang
(si estaba vacío) y updatedAt. El resto de campos de la ficha (contacto, logo,
ubicacion, servicios, especialidades, verificado, destacado, createdAt, _id…) se
conservan tal cual.
"""
import argparse
import glob
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import importlib.util

_spec = importlib.util.spec_from_file_location("adb", str(Path(__file__).parent / "add-d1-batch.py"))
adb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(adb)

COLLECTION = "directorio_software_asetemyt"
CHUNK = 6  # statements por llamada (máx. 100 bound params por query D1)


def load_records(paths):
    recs = []
    for p in sorted(paths):
        data = json.loads(Path(p).read_text())
        recs.extend(data)
    return recs


def fetch_current(cf_token, acct):
    rows = adb.d1_query(cf_token, acct,
        f"SELECT id, data FROM app_documents WHERE collection = '{COLLECTION}'")["results"]
    return {r["id"]: json.loads(r["data"]) for r in rows}


def merge(current, rec, now_iso):
    data = dict(current)  # conserva todo lo existente
    data["descripcion"] = rec["descripcion"]
    data["categorias"] = rec["categorias"]
    data["funcionalidades"] = rec["funcionalidades"]
    data["pricing"] = rec["pricing"]
    data["parametros"] = rec["parametros"]
    if not data.get("lang"):
        data["lang"] = "es"
    data["updatedAt"] = now_iso
    return data


def write_chunks(cf_token, acct, items):
    """items: [(id, data_dict)] → un UPDATE por ficha.

    D1 rechaza params con múltiples statements ("params with multiple statements
    is not supported"), así que no se pueden agrupar.
    """
    ok, failed = 0, []
    for n, (_id, data) in enumerate(items, 1):
        sql = "UPDATE app_documents SET data = ? WHERE collection = ? AND id = ?"
        try:
            adb.d1_query(cf_token, acct, sql,
                         [json.dumps(data, ensure_ascii=False), COLLECTION, _id])
            ok += 1
        except Exception as e:
            failed.append((_id, str(e)[:200]))
            print(f"  ✗ id {_id}: {e}")
        if n % 25 == 0:
            print(f"  … {n}/{len(items)}")
        time.sleep(0.1)
    if failed:
        print(f"⚠️  {len(failed)} UPDATEs fallidos")
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", action="append", default=[])
    ap.add_argument("--all", action="store_true", help="todos /tmp/enrich/batch_output_*.json + batch_eco_output.json")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    paths = list(args.input)
    if args.all:
        paths += sorted(glob.glob("/tmp/enrich/batch_output_*.json"))
        paths += sorted(glob.glob("/tmp/enrich/batch_eco_output.json"))
    if not paths:
        ap.error("indica --input o --all")

    recs = load_records(paths)
    print(f"📥 {len(recs)} registros de {len(paths)} archivo(s)")

    cf_token, acct = adb.load_cf_creds()
    current = fetch_current(cf_token, acct)
    print(f"🗄️  {len(current)} fichas de software en app_documents")

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000+00:00")
    items, missing, unchanged = [], [], 0
    for rec in recs:
        cur = current.get(rec["id"])
        if cur is None:
            missing.append(rec["slug"])
            continue
        merged = merge(cur, rec, now_iso)
        items.append((rec["id"], merged))

    if missing:
        print("⚠️  ids no encontrados:", missing)
    print(f"✅ {len(items)} fichas listas para escribir")

    if args.dry_run:
        s = recs[0]
        print("\n🔍 DRY-RUN — ejemplo de fusión (primer registro):")
        print(json.dumps({k: items[0][1].get(k) for k in
                          ("slug", "descripcion", "categorias", "pricing", "parametros", "lang", "updatedAt")},
                         ensure_ascii=False, indent=1)[:1800])
        return

    n = write_chunks(cf_token, acct, items)
    print(f"✍️  {n} UPDATEs ejecutados")

    # Verificación de proyección en la tabla pública `software`
    time.sleep(1)
    check = adb.d1_query(cf_token, acct,
        "SELECT COUNT(*) AS n FROM software WHERE parametros IS NOT NULL AND parametros != '{}'")["results"][0]["n"]
    print(f"📊 software.parametros rellenados: {check}")

    for rec in recs[:3]:
        row = adb.d1_query(cf_token, acct,
            f"SELECT slug, LENGTH(descripcion) AS dl, LENGTH(parametros) AS pl FROM software WHERE id = '{rec['id']}'")["results"]
        print("   muestra:", row)


if __name__ == "__main__":
    main()
