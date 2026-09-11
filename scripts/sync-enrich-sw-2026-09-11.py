#!/usr/bin/env python3
"""sync-enrich-sw-2026-09-11.py — Force-update D1 app_documents for software enrichments.

Same approach as the consultores version but for software collection.
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

# Software enriched 2026-09-11
ENRICHED_SLUGS = [
    'standardtime','machinemetrics','ignition-inductive-automation',
    'manhattan-associates-wms','mvp-plant-cmms-data-group',
    'delmia-quintiq-dassault','cin7-omni','korber-wms','google-cloud-iot-core',
    'emaint-cmms-fluke','apromore','etq-reliance-hexagon','quetech-work-measurement',
    'iise-institute-of-industrial-engineers','fanuc-robotics',
    'keyence-inspection-systems','upkeep-cmms','celonis-process-mining',
    'ergoiq-intoware','kuka-robotics',
    # sw tanda 2
    'renishaw-metrology','prodcont','ergofellow-human-solutions',
    'erpnext-manufacturing','aws-iot-sitewise','6sigmastudy-smec','qualio-eqms',
    'ptc-windchill','litmus-edge','abbyy-timeline','asprova-aps','ibm-maximo',
    'maintenance-connection-accruent','uipath-process-mining','thingworx-ptc',
    'emulate3d','qpr-processanalyzer','eci-m1-erp','fulcrum-pro','aveva','ibm-process-mining',
    # sw tanda 3
    'catia-dassault','aris-process-mining-software-ag','creo-ptc',
    'humancad-nexgen-ergonomics','flexsche-aps','universal-robots-cobots',
    'kinaxis-rapidresponse','honeywell-forge','schedlyzer-lillyworks',
    'mrpeasy','limble-cmms','fishbowl-manufacturing','critical-manufacturing-mes',
    # sw tanda 4
    'coursera-lean-six-sigma','katana-mrp','the-lean-six-sigma-company',
    'realwear','rockwell-automation','azure-iot-central','sepasoft-mes-suite',
    'odoo-manufacturing','oracle-advanced-supply-chain-planning','jobboss-eci','zebra-technologies',
]


def _sql_escape(s):
    if s is None: return ""
    return str(s).replace("'", "''")


def fetch_one(env_collection, slug):
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


def build_replace_sql(collection, doc_id, data):
    full_json = json.dumps(data, ensure_ascii=False, default=str)
    parts = [
        f"-- Replace {doc_id}",
        f"DELETE FROM app_documents WHERE collection='{_sql_escape(collection)}' AND id='{_sql_escape(doc_id)}';",
        f"INSERT INTO app_documents (collection, id, data) VALUES ('{_sql_escape(collection)}', '{_sql_escape(doc_id)}', json('{_sql_escape(full_json)}'));",
    ]
    return '\n'.join(parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--collection', default='directorio_software_asetemyt')
    parser.add_argument('--local', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    print(f"=== sync-enrich-sw {args.collection} → D1 (force overwrite) ===", file=sys.stderr)
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
