#!/usr/bin/env python3
"""
generate-comparison-json.py — Regenera public/data/software-comparison.json
como espejo de las fichas enriquecidas de D1.

El comparador (/comparador) ya lee /api/directorio/software en vivo; este fichero
se mantiene sincronizado porque además lo sirve /api/admin/content y puede seguir
enganchado a él algún cliente. Se genera con el MISMO shape histórico:

  name, slug, pricing, platform, methods, features, languages, targetSize,
  freeTrial, videoSupport, apiIntegration, notes

Uso:
  python3 scripts/generate-comparison-json.py            # escribe el fichero
  python3 scripts/generate-comparison-json.py --stdout   # solo imprime resumen
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import importlib.util

_spec = importlib.util.spec_from_file_location("adb", str(Path(__file__).parent / "add-d1-batch.py"))
adb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(adb)

OUT = Path(__file__).parent.parent / "public" / "data" / "software-comparison.json"

LICENSE = {
    "suscripcion": "Suscripción",
    "licencia-perpetua": "Licencia perpetua",
    "gratuito": "Gratuito",
    "freemium": "Freemium",
    "por-contacto": "Contacto comercial",
}
TRIAL = {"si": "Sí", "no": "No", "demo-a-solicitud": "Demo a solicitud"}


def yn(v):
    return v == "si"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stdout", action="store_true")
    args = ap.parse_args()

    cf_token, acct = adb.load_cf_creds()
    rows = adb.d1_query(cf_token, acct,
        "SELECT id, slug, nombre, descripcion, categorias, funcionalidades, pricing, "
        "fabricante, parametros FROM software ORDER BY nombre ASC")["results"]

    software = []
    for r in rows:
        p = _json(r.get("parametros"), {})
        pr = _json(r.get("pricing"), {})
        if not p and not _json(r.get("categorias"), []):
            continue  # ficha todavía sin enriquecer: se queda fuera del espejo
        software.append({
            "name": r["nombre"],
            "slug": r["slug"],
            "pricing": " · ".join(filter(None, [
                LICENSE.get(pr.get("modelo", ""), ""),
                pr.get("precio_desde", ""),
                (TRIAL.get(pr.get("prueba_gratuita", ""), "") or ""),
            ])) or "Contacto",
            "platform": p.get("plataforma", "") or "—",
            "methods": p.get("metodos", []) or [],
            "features": _json(r.get("funcionalidades"), []),
            "languages": p.get("idiomas", []) or [],
            "targetSize": {
                "consultor": "Consultores", "pyme": "PYME", "gran-empresa": "Gran empresa",
                "pyme-gran-empresa": "PYME y gran empresa",
            }.get(p.get("target", ""), ""),
            "freeTrial": TRIAL.get(pr.get("prueba_gratuita", ""), "") or "—",
            "videoSupport": yn(p.get("video")),
            "apiIntegration": yn(p.get("api")),
            "notes": pr.get("notas", "") or "",
            "dataStorage": p.get("datos", ""),
            "deployment": p.get("despliegue", ""),
        })

    doc = {
        "lastUpdated": date.today().isoformat(),
        "note": "Espejo generado automáticamente desde las fichas del directorio "
                "(scripts/generate-comparison-json.py). La fuente de verdad son las "
                "fichas en D1; el comparador público lee /api/directorio/software.",
        "fields": {
            "name": "Nombre del software",
            "slug": "Slug en el directorio",
            "pricing": "Modelo de precios",
            "platform": "Plataforma (web/desktop/mobile/SaaS)",
            "methods": ["Métodos soportados"],
            "features": ["Funciones clave"],
            "languages": ["Idiomas disponibles"],
            "targetSize": "Tamaño de empresa objetivo",
            "freeTrial": "Disponibilidad de prueba gratuita",
            "videoSupport": "Soporte de vídeo",
            "apiIntegration": "API o integraciones",
            "notes": "Notas adicionales",
            "dataStorage": "Dónde se guardan los datos (nube/local/hibrido)",
            "deployment": "Dónde se ejecuta (nube/local/hibrido)",
        },
        "software": software,
    }

    if args.stdout:
        print(f"{len(software)} fichas con parámetros")
        return
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✅ {OUT} — {len(software)} fichas (de {len(rows)})")


def _json(v, fallback):
    if isinstance(v, (dict, list)):
        return v
    if not v:
        return fallback
    try:
        return json.loads(v)
    except Exception:
        return fallback


if __name__ == "__main__":
    main()
