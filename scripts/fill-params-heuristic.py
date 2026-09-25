#!/usr/bin/env python3
"""
fill-params-heuristic.py — Segunda pasada de parámetros sobre las fichas enriquecidas.

Rellena SOLO parámetros vacíos y SOLO con evidencia literal del texto descargado de la
web oficial. Reglas conservadoras tras auditoría de muestreo (2026-09-25): se han
eliminado las inferencias de país de origen, modelo de precio y precio desde, que daban
falsos positivos con menús de idioma, listas de países del pie y enlaces "Contact Us".

Uso:
  python3 scripts/fill-params-heuristic.py --dry-run   # resumen de cobertura
  python3 scripts/fill-params-heuristic.py             # escribe /tmp/enrich/fill/out_heuristic.json
"""
import argparse
import glob
import json
import re
from pathlib import Path

BASE = Path("/tmp/enrich")
PAGES = BASE / "pages"
OUT = BASE / "fill" / "out_heuristic.json"

# Evidencia DURA (aparece de forma literal en la página)
HARD = {
    "pwa": r"\bPWA\b|progressive web app|aplicaci[oó]n web progresiva",
    "saas": r"\bSaaS\b|software as a service",
    "nube": r"en la nube|almacenamiento en la nube|datos en la nube|soluci[oó]n en la nube|100 ?% ?(en la nube|cloud)",
    "local": r"on-?premise|servidor propio|instalaci[oó]n local|se instala en su|aplicaci[oó]n de escritorio|software de escritorio",
    "offline": r"funciona sin conexi[oó]n|modo sin conexi[oó]n|sin conexi[oó]n a internet|\boffline\b",
    "mobile": r"app m[oó]vil|aplicaci[oó]n m[oó]vil|para iOS y Android|en Google Play|en la App Store",
    "api": r"\bAPI REST\b|\bREST API\b|api p[uú]blica|webhook|API de integraci[oó]n|integraci[oó]n v[íi]a API|API docs|documentaci[oó]n de la API",
    "opensource": r"c[oó]digo abierto|open source|licencia (GPL|MIT|Apache|AGPL)",
    "pyme": r"\bpymes?\b|peque[nñ]as y medianas empresas",
    "gran_empresa": r"grandes empresas|para grandes corporaciones|enterprise-?grade",
    "precio_eur": r"(?:desde\s+)?[0-9]{1,5}(?:[.,][0-9]{1,3})?\s*(?:€|EUR)(?:\s*(?:/|al|por)\s*(?:mes|a[nñ]o|usuario|usuario y mes))",
    "precio_usd": r"(?:from\s+|desde\s+)?\$?[0-9]{1,5}(?:[.,][0-9]{1,3})?\s*(?:USD|\$)(?:\s*(?:/|per|por)\s*(?:month|year|mes|a[nñ]o|user))?",
    "trial": r"prueba gratuita de [0-9]+ d[ií]as|[0-9]+ d[ií]as de prueba gratuita|free trial of [0-9]+ days|trial gratuito de [0-9]+",
    "demo": r"solicita (una )?demo|pide (una )?demo|demo gratuita|book a demo|request a demo|agendar una demo",
    "gratuito": r"es gratuito|es gratis|uso gratuito|gratuito para siempre|free forever|plan gratuito",
    "suscripcion": r"precio (mensual|por suscripci[oó]n)|tarifa mensual|suscripci[oó]n mensual|monthly subscription|per month",
}

# País solo con mención inequívoca del país (nunca "Español" de idioma, ni "Italy" de menús)
PAISES = {
    "España": r"\bEspa[nñ]a\b|empresa espa[nñ]ola|sede en Espa[nñ]a|made in Spain",
    "Alemania": r"\bAlemania\b|German company|sede en Alemania",
    "Francia": r"\bFrancia\b|French company|sede en Francia",
    "Estados Unidos": r"Estados Unidos|EE\. ?UU\.|United States headquartered|empresa estadounidense",
    "Italia": r"\bItalia\b|Italian company|sede en Italia",
    "Reino Unido": r"Reino Unido|United Kingdom|empresa brit[aá]nica",
    "Países Bajos": r"Pa[ií]ses Bajos|Netherlands",
    "Suecia": r"\bSuecia\b|Sweden|empresa sueca",
    "Japón": r"\bJap[oó]n\b|Japan",
    "Israel": r"\bIsrael\b",
    "Canadá": r"\bCanad[aá]\b",
    "Portugal": r"\bPortugal\b",
}


def scan(text):
    return {k: bool(re.search(p, text, re.I)) for k, p in HARD.items()}


def detect(rec, text):
    if not text:
        return {}
    hit = scan(text)
    cur = rec.get("parametros") or {}
    pr = rec.get("pricing") or {}
    out = {}

    # plataforma — solo evidencia dura
    if not cur.get("plataforma"):
        if hit["pwa"]:
            out["plataforma"] = "PWA"
        elif hit["local"] and not hit["nube"] and not hit["saas"]:
            out["plataforma"] = "Escritorio"
        elif hit["saas"] and not hit["local"]:
            out["plataforma"] = "Web (SaaS)"
        elif hit["nube"] and hit["local"]:
            out["plataforma"] = "Híbrido"
        elif hit["mobile"] and (hit["nube"] or hit["saas"]):
            out["plataforma"] = "Móvil + web"
        elif hit["nube"]:
            out["plataforma"] = "Web (SaaS)"

    if not cur.get("despliegue"):
        nube, loc = hit["nube"] or hit["saas"], hit["local"]
        if nube and loc:
            out["despliegue"] = "hibrido"
        elif nube:
            out["despliegue"] = "nube"
        elif loc:
            out["despliegue"] = "local"

    if not cur.get("datos"):
        if hit["offline"] and (hit["nube"] or hit["saas"]):
            out["datos"] = "hibrido"
        elif hit["nube"]:
            out["datos"] = "nube"
        elif hit["offline"] and hit["local"]:
            out["datos"] = "local"

    if not cur.get("offline") and hit["offline"]:
        out["offline"] = "si"
    if not cur.get("app_movil") and hit["mobile"]:
        out["app_movil"] = "si"
    if not cur.get("api") and hit["api"]:
        out["api"] = "si"
    if not cur.get("codigo_abierto") and hit["opensource"]:
        out["codigo_abierto"] = "si"

    if not cur.get("target"):
        p, g = hit["pyme"], hit["gran_empresa"]
        if p and g:
            out["target"] = "pyme-gran-empresa"
        elif g:
            out["target"] = "gran-empresa"
        elif p:
            out["target"] = "pyme"

    # PAÍS DE ORIGEN y PRECIO: NO se infieren nunca aquí. Auditoría de muestreo
    # (2026-09-25): los selectores de país/idioma del pie, los "Contact Us" y los
    # números sueltos de blogs producían falsos positivos (KUKA→España, Dassault→Reino
    # Unido, precios de cursos). Se quedan en lo que la redacción hubiera verificado.
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    records = []
    for p in sorted(glob.glob(str(BASE / "batch_output_*.json"))):
        records += json.load(open(p))
    eco = BASE / "batch_eco_output.json"
    if eco.exists():
        ids = {r["id"] for r in json.load(open(eco))}
        records = [r for r in records if r["id"] not in ids]

    page_by_slug = {Path(p).stem: p for p in glob.glob(str(PAGES / "*.txt"))}

    results, filled, stats = [], 0, {}
    for rec in records:
        path = page_by_slug.get(rec["slug"])
        text = open(path, encoding="utf-8").read() if path else ""
        d = detect(rec, text)
        results.append({"id": rec["id"], "slug": rec["slug"], **d})
        for k in d:
            stats[k] = stats.get(k, 0) + 1
        filled += len(d)

    if not args.dry_run:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        json.dump(results, open(OUT, "w"), ensure_ascii=False, indent=1)
        print(f"✅ {OUT} — {len(results)} fichas, {filled} huecos rellenos")
    else:
        print(f"rellenaría {filled} huecos en {len(results)} fichas")
    for k, v in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"   {k:18s} +{v}")  # noqa


if __name__ == "__main__":
    main()
