#!/usr/bin/env python3
import glob
import json
import sqlite3
import sys
import urllib.request

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    d1_files = glob.glob('.wrangler/state/v3/d1/**/*.sqlite', recursive=True)
    if not d1_files:
        print("No local D1 sqlite file found in .wrangler/state/v3/d1/")
        sys.exit(1)

    db_path = d1_files[0]
    print(f"Connecting to local D1 SQLite: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    print("Fetching consultores from https://asetemyt.com/api/directorio/consultores ...")
    consultores_data = fetch_json('https://asetemyt.com/api/directorio/consultores')
    consultores = consultores_data.get('consultores', [])
    print(f"Found {len(consultores)} consultores.")

    for c in consultores:
        cur.execute('''
            INSERT OR REPLACE INTO consultores (
                id, slug, nombre, tipo, lang, descripcion, especialidades, servicios,
                ubicacion, contacto, logo, verificado, destacado, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            c.get('id'),
            c.get('slug', ''),
            c.get('nombre', ''),
            c.get('tipo', 'empresa'),
            c.get('lang', ''),
            c.get('descripcion', ''),
            json.dumps(c.get('especialidades', []), ensure_ascii=False),
            json.dumps(c.get('servicios', []), ensure_ascii=False),
            json.dumps(c.get('ubicacion', {}), ensure_ascii=False),
            json.dumps(c.get('contacto', {}), ensure_ascii=False),
            c.get('logo', ''),
            1 if c.get('verificado') else 0,
            1 if c.get('destacado') else 0,
            c.get('createdAt', ''),
            c.get('updatedAt', '')
        ))

    print("Fetching software from https://asetemyt.com/api/directorio/software ...")
    software_data = fetch_json('https://asetemyt.com/api/directorio/software')
    softwares = software_data.get('software', [])
    print(f"Found {len(softwares)} software.")

    for s in softwares:
        cur.execute('''
            INSERT OR REPLACE INTO software (
                id, slug, nombre, tipo, lang, descripcion, categorias, funcionalidades,
                pricing, fabricante, contacto, logo, verificado, destacado, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            s.get('id'),
            s.get('slug', ''),
            s.get('nombre', ''),
            s.get('tipo', ''),
            s.get('lang', ''),
            s.get('descripcion', ''),
            json.dumps(s.get('categorias', []), ensure_ascii=False),
            json.dumps(s.get('funcionalidades', []), ensure_ascii=False),
            json.dumps(s.get('pricing', {}), ensure_ascii=False),
            s.get('fabricante', ''),
            json.dumps(s.get('contacto', {}), ensure_ascii=False),
            s.get('logo', ''),
            1 if s.get('verificado') else 0,
            1 if s.get('destacado') else 0,
            s.get('createdAt', ''),
            s.get('updatedAt', '')
        ))

    conn.commit()

    cur.execute("SELECT COUNT(*) FROM consultores")
    c_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM software")
    s_count = cur.fetchone()[0]
    print(f"Success! Local D1 has {c_count} consultores and {s_count} software.")
    conn.close()

if __name__ == '__main__':
    main()
