#!/usr/bin/env python3
"""
validate-enrich-software.py — Valida los lotes de enriquecimiento de fichas de software
antes de escribirlos en D1.

Uso:
  python3 scripts/validate-enrich-software.py /tmp/enrich/batch_output_1.json [/tmp/enrich/batch_output_2.json ...]

Comprueba: claves obligatorias, id/slug contra el inventario (/tmp/sw_inventory.json),
longitud y cierre de la descripción, vocabularios de categorías y métodos,
enums de pricing y parametros, ISO 639-1 de idiomas, y ausencia de afirmaciones
prohibidas (voseo, QR/NFC en fichas del ecosistema).

Devuelve 0 si todo es válido; 1 si hay errores (imprime el detalle).
"""
import json
import re
import sys
from pathlib import Path

VOCAB = json.loads(Path(__file__).with_name("parametros_vocab.json").read_text())
INVENTORY = Path("/tmp/sw_inventory.json")

REQUIRED = ["id", "slug", "descripcion", "categorias", "funcionalidades", "pricing", "parametros"]
PARAM_KEYS = ["plataforma", "despliegue", "datos", "offline", "app_movil", "idiomas", "api",
              "integraciones", "target", "video", "codigo_abierto", "pais_origen", "metodos"]
PRICING_KEYS = ["modelo", "precio_desde", "prueba_gratuita", "notas"]
VOSEO = re.compile(r"\b(podés|tenés|querés|sabés|decime|contame|avisame|haceme|mirá|estáte)\b", re.I)


def main(paths):
    inv = {r["id"]: r for r in json.loads(INVENTORY.read_text())}
    errors, warns, total = [], [], 0
    seen_ids = set()

    for p in paths:
        data = json.loads(Path(p).read_text())
        if not isinstance(data, list):
            errors.append(f"{p}: el contenido no es una lista")
            continue
        for i, rec in enumerate(data):
            total += 1
            ref = f"{Path(p).name}[{i}] {rec.get('slug', '?')}"
            for k in REQUIRED:
                if k not in rec:
                    errors.append(f"{ref}: falta la clave '{k}'")
            rid = rec.get("id")
            if rid not in inv:
                errors.append(f"{ref}: id '{rid}' no está en el inventario")
                continue
            if rid in seen_ids:
                errors.append(f"{ref}: id duplicado")
            seen_ids.add(rid)
            if rec.get("slug") != inv[rid]["slug"]:
                errors.append(f"{ref}: slug '{rec.get('slug')}' != inventario '{inv[rid]['slug']}'")

            # --- descripción
            d = (rec.get("descripcion") or "").strip()
            if not 700 <= len(d) <= 1300:
                errors.append(f"{ref}: descripción de {len(d)} caracteres (700-1300)")
            if not re.search(r"[.!?]$", d):
                errors.append(f"{ref}: la descripción no termina en punto")
            if "…" in d or "..." in d:
                errors.append(f"{ref}: la descripción contiene puntos suspensivos")
            if re.search(r"\s{2,}", d):
                warns.append(f"{ref}: espacios dobles en la descripción")
            if VOSEO.search(d):
                errors.append(f"{ref}: voseo en la descripción")
            for bad in ("QR", "NFC"):
                if re.search(rf"\b{bad}\b", d):
                    errors.append(f"{ref}: menciona {bad} en la descripción")

            # --- categorias / metodos
            cats = rec.get("categorias") or []
            if not 0 <= len(cats) <= 3:
                errors.append(f"{ref}: {len(cats)} categorías (0-3)")
            if not cats:
                warns.append(f"{ref}: sin categoría (fuente no permite clasificarlo)")
            for c in cats:
                if c not in VOCAB["categorias"]:
                    errors.append(f"{ref}: categoría fuera de vocabulario '{c}'")
            par = rec.get("parametros") or {}
            for k in PARAM_KEYS:
                if k not in par:
                    errors.append(f"{ref}: parametros sin la clave '{k}'")
            met = par.get("metodos") or []
            if not 0 <= len(met) <= 6:
                errors.append(f"{ref}: {len(met)} métodos (0-6)")
            if not met and "medicion-tiempos" in cats:
                warns.append(f"{ref}: es medición de tiempos pero sin métodos")
            for m in met:
                if m not in VOCAB["metodos"]:
                    errors.append(f"{ref}: método fuera de vocabulario '{m}'")

            # --- enums
            for key in ("despliegue", "datos", "offline", "app_movil", "api", "target",
                        "video", "codigo_abierto", "plataforma"):
                v = par.get(key, "«ausente»")
                if v not in VOCAB["enums"][key]:
                    errors.append(f"{ref}: {key}='{v}' fuera del vocabulario")
            for lang in (par.get("idiomas") or []):
                if lang not in VOCAB["idiomas_iso639_1"]:
                    errors.append(f"{ref}: idioma '{lang}' no es ISO 639-1 válido")
            if not isinstance(par.get("integraciones"), list):
                errors.append(f"{ref}: integraciones no es lista")

            pr = rec.get("pricing") or {}
            for k in PRICING_KEYS:
                if k not in pr:
                    errors.append(f"{ref}: pricing sin la clave '{k}'")
            for key in ("modelo", "prueba_gratuita"):
                if key in pr and pr[key] not in VOCAB["enums"][f"pricing.{key}"]:
                    errors.append(f"{ref}: pricing.{key}='{pr[key]}' fuera del vocabulario")

            # --- funcionalidades
            fns = rec.get("funcionalidades") or []
            if not 5 <= len(fns) <= 9:
                errors.append(f"{ref}: {len(fns)} funcionalidades (5-9)")
            for f in fns:
                if not isinstance(f, str) or not 15 <= len(f) <= 170:
                    errors.append(f"{ref}: funcionalidad fuera de rango: {str(f)[:60]!r}")
                if VOSEO.search(str(f)):
                    errors.append(f"{ref}: voseo en funcionalidad")

            if not rec.get("fuentes"):
                warns.append(f"{ref}: sin fuentes")

    print(f"\nFichas validadas: {total} | errores: {len(errors)} | avisos: {len(warns)}")
    for e in errors[:80]:
        print("  ✗", e)
    if len(errors) > 80:
        print(f"  … y {len(errors) - 80} errores más")
    for w in warns[:20]:
        print("  ⚠", w)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
