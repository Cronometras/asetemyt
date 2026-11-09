"""Import private Hermes Markdown reports into the existing D1 document store.

Usage: python scripts/import-prospecting-reports.py REPORTS_DIRECTORY --credentials ENV_FILE
Idempotent: unchanged content is skipped; existing filenames are updated in place.
"""
import argparse
import hashlib
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--credentials', required=True, type=Path)
    args = parser.parse_args()
    values = {}
    for line in args.credentials.read_text(encoding='utf-8-sig').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.removeprefix('export ').split('=', 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    endpoint = ('https://api.cloudflare.com/client/v4/accounts/' + values['CLOUDFLARE_ACCOUNT_ID']
                + '/d1/database/9047e833-5b98-4859-b234-774905843e78/query')

    def query(sql, params=None):
        request = urllib.request.Request(endpoint,
            data=json.dumps({'sql': sql, 'params': params or []}).encode(),
            headers={'Authorization': 'Bearer ' + values['CLOUDFLARE_API_TOKEN'], 'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.load(response)
        if not result.get('success'):
            raise RuntimeError('D1 rejected report import')
        return result['result'][0]['results']

    existing = {row['id']: row['hash'] for row in query(
        "SELECT id, json_extract(data, '$.contentHash') AS hash FROM app_documents WHERE collection = ?",
        ['informes_prospeccion'])}
    imported = skipped = 0
    files = sorted(args.directory.glob('*.md'))
    if not files:
        raise SystemExit('No Markdown reports found')
    for path in files:
        if not re.fullmatch(r'[\w-]+\.md', path.name):
            raise ValueError('Invalid report filename')
        content = path.read_text(encoding='utf-8-sig')
        digest = hashlib.sha256(content.encode('utf-8')).hexdigest()
        if existing.get(path.name) == digest:
            skipped += 1
            continue
        heading = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        date = re.search(r'\d{4}-\d{2}-\d{2}', path.name)
        if not date:
            raise ValueError('Report filename has no date')
        document = {'filename': path.name, 'date': date[0], 'title': heading[1].strip() if heading else path.stem,
                    'content': content, 'contentHash': digest, 'source': 'Hermes',
                    'importedAt': datetime.now(timezone.utc).isoformat()}
        query('INSERT INTO app_documents (collection,id,data) VALUES (?,?,?) '
              'ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data',
              ['informes_prospeccion', path.name, json.dumps(document, ensure_ascii=False)])
        imported += 1
    print(json.dumps({'imported': imported, 'unchanged': skipped, 'total_files': len(files)}))


if __name__ == '__main__':
    main()
