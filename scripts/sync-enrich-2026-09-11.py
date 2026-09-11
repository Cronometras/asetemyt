#!/usr/bin/env python3
"""sync-enrich-2026-09-11.py — Force-update D1 app_documents for enriched fichas.

The regular sync-firestore-to-d1.py is ADDITIVE (json_set only on null fields)
to preserve any manual D1 edits. But for enrichment rounds we WANT to overwrite
descripcion/servicios. This script reads from Firestore and force-writes to D1
via UPDATE on app_documents (the trigger then projects to consultores/software).
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SA_PATH = Path(__file__).parent / ".sa-asetemyt.json"

# Fichas from tanda 1 + tanda 2 + tanda 3 (enriched 2026-09-11)
ENRICHED_SLUGS = [
    # tanda 1
    'ipyc-consultoria','ad-consultores','ep-ingenieria-proceso','ab-brain','logistalfa',
    'itemsa-mtm-specialist-technical-institute','abaron-consultoria','oyeregui-industrial',
    'nexus-industrial','veleon-consulting','jpl-operations','innogem','mtm-productivity-services',
    'induscor-partners','dit-consultoria','team-and-time','prosimtec','fluenzia',
    'skingenieros','speaker-consultores','inprocesa','kaizen-institute-espana',
    'the-manufacturing-industrial-engineer','wnfactor','idelt',
    # tanda 2
    'g3m-operational-consulting','metodologia-y-tiempos','shinka-management-latinoamerica',
    'proacit','dr-consultoria','riba-nogues','industrissimus','cbtecnia','resultae',
    'ingenia2','lpm-logistics','opticore360','enginyers-bosch','miguel-gonzalez-deya-ingenieria',
    # tanda 3
    'sixsigma-us','society-of-manufacturing-engineers-sme','lean-institute-africa',
    'industrial-timestudy-institute-iti','ingenio-ostudio','mapex','iassc-spain',
    'ireno','dt-consultores','know-industrial-engineering-factovare-llp','refa-international',
    'magenta-management','tecnitasa','lean-institute-poland','twi-the-welding-institute',
    'zadecon','tlsi-tecnologias-logisticas-de-sistemas-inteligent','h2w-systems',
    'faber-infinite','uk-mtm-methods-time-measurement',
    # tanda 4
    'scott-grant-limited','ingeniia','coiiaoccidental','lean-institute-turkey',
    's-a-partners','grupo-desarrolla','simplilearn-six-sigma','rethink-productivity',
    'timingsense','nadico','ayo-consulting',
    # tanda 5
    'daniel-penn','pa-consulting','camara-badajoz-f','kaizen-integral','tmg-consulting',
    # tanda 6 (final, ad-hoc)
    'movint','proyecta79',
    # tanda 7: Class 2 freelancers with real names (honest descriptions, no LinkedIn guessed)
    'rosa-maria-gutierrez-alonso','maria-del-carmen-rico-berenguer','meritxell-bosch-clua',
    'jorge-ruiz-consultor-oee','miguel-angel-herrero-procesos','lucia-pons-villalonga',
    'antonio-ferrandez-martinez','antonio-rivas-molina','marta-iborra-santolaria',
    'francisco-javier-artieda-aliaga','ricardo-gomez-peiro','koldo-etxeberria-lekuona',
    'carlos-domenech-ferrer','javier-calatayud-ortuno','nuria-ferre-ballester',
    'miguel-angel-martin-consultor-lean','isabel-navarro-campos','anna-maria-torra-pla',
    'pilar-ruiz-lafuente','juan-carlos-herrero-velasco','francisco-javier-torres-vega',
    'pau-vidal-farre','marta-sole-castellvi','andreu-mascaro-ferragut',
    'carlos-mendez-lean','elena-delgado-martinez','lucia-fernandez-moreno',
    'rafael-gomez-pena','javier-ruiz-simulacion','jordi-pujol-masip',
    'laura-sanchez-ergonomia','pedro-gutierrez-oee','ignacio-sanchez-catalan',
    'maria-del-carmen-pena-serrano','ainhoa-ruiz-de-larramendi','juan-manuel-castillo-ruiz',
    'mikel-aldama-etxebarria',
    # tanda 8: scraping batch 1+2 OI sector (4 reales scrapeados)
    'productionteam-tpt','ergotime','technical-change-associates','know-industrial-engineering-factovare-llp',
]


def _sql_escape(s):
    if s is None: return ""
    return str(s).replace("'", "''")


def _json_value(v):
    return json.dumps(v, ensure_ascii=False)


def fetch_one(env_collection, slug):
    """Fetch a single Firestore doc by slug."""
    from firebase_admin import credentials, firestore, initialize_app
    cred = credentials.Certificate(str(SA_PATH))
    try: initialize_app(cred)
    except ValueError: pass
    db = firestore.client()
    docs = db.collection(env_collection).where('slug', '==', slug).limit(1).get()
    if not docs: return None
    d = docs[0]
    dd = d.to_dict()
    dd['_id'] = d.id
    return dd


def build_update_sql(collection, doc_id, data):
    """Build DELETE + INSERT that replaces the entire app_documents row.

    Simpler than partial json_set and works correctly for the enriched fields
    (descripcion, servicios, updatedAt) plus preserves everything else by
    merging the existing data with the new data before re-inserting.
    """
    # Fetch existing data to preserve non-enriched fields
    # (we need to merge: existing + new values for enriched fields only)
    return None  # not used; see build_replace_sql below


def build_replace_sql(collection, doc_id, data):
    """Build a single DELETE + INSERT that fully replaces the app_documents row
    with the supplied data dict (which should contain all fields from Firestore)."""
    # Embed the full data as a JSON string, then use json() function in SQL
    full_json = json.dumps(data, ensure_ascii=False, default=str)
    parts = [
        f"-- Replace {doc_id}",
        f"DELETE FROM app_documents WHERE collection='{_sql_escape(collection)}' AND id='{_sql_escape(doc_id)}';",
        f"INSERT INTO app_documents (collection, id, data) VALUES ('{_sql_escape(collection)}', '{_sql_escape(doc_id)}', json('{_sql_escape(full_json)}'));",
    ]
    return '\n'.join(parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--collection', default='directorio_consultores_asetemyt')
    parser.add_argument('--local', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    print(f"=== sync-enrich {args.collection} → D1 (force overwrite) ===", file=sys.stderr)
    print(f"    slugs: {len(ENRICHED_SLUGS)}", file=sys.stderr)

    if not SA_PATH.exists():
        sys.exit(f"ERROR: {SA_PATH} not found")

    lines = []
    not_found = []
    for slug in ENRICHED_SLUGS:
        data = fetch_one(args.collection, slug)
        if not data:
            print(f"  SKIP {slug}: not in Firestore", file=sys.stderr)
            not_found.append(slug)
            continue
        sql = build_replace_sql(args.collection, data['_id'], data)
        lines.append(sql)
        desc_len = len(data.get('descripcion') or '')
        serv_n = len(data.get('servicios') or [])
        print(f"  {slug:50s} desc={desc_len}c servs={serv_n}", file=sys.stderr)

    full_sql = '\n'.join(lines) + '\n'
    if args.dry_run:
        sys.stdout.write(full_sql)
        return

    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        f.write(full_sql)
        sql_path = f.name
    flag = '--local' if args.local else '--remote'
    try:
        proc = subprocess.run(
            ['npx', 'wrangler', 'd1', 'execute', 'DB', flag, '--yes', '--file', sql_path],
            cwd=Path(__file__).parent.parent,
            capture_output=True, text=True,
        )
        sys.stdout.write(proc.stdout)
        sys.stderr.write(proc.stderr)
        if proc.returncode != 0:
            sys.exit(f"ERROR: wrangler exited {proc.returncode}")
    finally:
        os.unlink(sql_path)

    print(f"\n=== done. Not found: {not_found} ===", file=sys.stderr)


if __name__ == "__main__":
    main()
