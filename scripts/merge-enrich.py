#!/usr/bin/env python3
"""
merge_all.py — Fusiona descripciones + relleno de parámetros en un único JSON
listo para escribir en D1.

Entradas:
  /tmp/enrich/batch_output_*.json   (descripciones y parámetros base, por lotes)
  /tmp/enrich/batch_eco_output.json (las 5 fichas de ecosistema: TIENEN PRIORIDAD)
  /tmp/enrich/fill/out_*.json       (relleno de parámetros vacíos, opcional)

Reglas:
  - base = batch_output_* (o eco si existe para ese slug)
  - el relleno solo se aplica si el valor base está vacío ("" / [] / ausente)
  - pricing: clave a clave, igual criterio
  - nunca se pisa lo ya relleno

Salida: /tmp/enrich/final_records.json (array) + resumen por pantalla.
"""
import glob
import json
import os
import sys

ECO_SLUGS = {"cronometras", "worksamp", "induly", "prodcont", "balanceo-de-l-neas-prodcont"}
BASE = "/tmp/enrich"
OUT = os.path.join(BASE, "final_records.json")


def empty(v):
    return v in (None, "", [], {})


def main():
    # Se indexa por id (NO por slug): hay slugs duplicados en el directorio
    # (p. ej. dos fichas con slug `timer-pro`), y cada una es un registro distinto.
    records = {}
    for p in sorted(glob.glob(os.path.join(BASE, "batch_output_*.json"))):
        for r in json.load(open(p)):
            records[r["id"]] = dict(r)

    # Fichas de ecosistema: mandan ellas
    eco_path = os.path.join(BASE, "batch_eco_output.json")
    n_eco = 0
    if os.path.exists(eco_path):
        for r in json.load(open(eco_path)):
            records[r["id"]] = dict(r)
            n_eco += 1

    # Relleno de parámetros (solo huecos) — los fills traen slug, se traducen a id
    _slug_to_id = {r["slug"]: r["id"] for r in records.values()}
    n_fill = n_fill_skipped = 0
    for p in sorted(glob.glob(os.path.join(BASE, "fill", "out_*.json"))):
        for f in json.load(open(p)):
            rec = records.get(f.get("id") or _slug_to_id.get(f.get("slug")))
            if rec is None:
                continue
            par = rec.setdefault("parametros", {})
            for k in ("plataforma", "despliegue", "datos", "offline", "app_movil",
                      "idiomas", "api", "target", "codigo_abierto", "pais_origen",
                      "integraciones"):
                if k in f and empty(par.get(k)) and not empty(f[k]):
                    par[k] = f[k]
                    n_fill += 1
            pr = rec.setdefault("pricing", {})
            for src_k, dst_k in (("pricing_modelo", "modelo"), ("pricing_precio", "precio_desde"),
                                 ("pricing_prueba", "prueba_gratuita"), ("pricing_notas", "notas")):
                if src_k in f and empty(pr.get(dst_k)) and not empty(f[src_k]):
                    pr[dst_k] = f[src_k]
                    n_fill += 1
                elif src_k in f and not empty(f[src_k]) and dst_k == "notas":
                    n_fill_skipped += 1

    # Eco must be intact
    for r in json.load(open(eco_path)) if os.path.exists(eco_path) else []:
        records[r["id"]] = dict(r)

    final = list(records.values())
    json.dump(final, open(OUT, "w"), ensure_ascii=False, indent=1)

    print(f"eco: {n_eco} | huecos rellenos: {n_fill} |")
    print(f"total final: {len(final)} fichas → {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
