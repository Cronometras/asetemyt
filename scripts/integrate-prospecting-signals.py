"""Integrate archived Hermes reports into outreach_cronometras without changing CRM history.

Dry run is the default. Pass --apply after reviewing the private plan file.
"""
import argparse
import hashlib
import json
import re
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def norm(value):
    return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFKD', value.lower()).encode('ascii', 'ignore').decode()).strip()


def company_key(name):
    text = norm(re.split(r'\(|—', name)[0])
    aliases = {
        'saic motor mg': 'saic mg', 'saic mg': 'saic mg', 'mg saic motor': 'saic mg',
        'mg': 'saic mg', 'saic motor': 'saic mg', 'eme group': 'escribano eme',
        'em e group': 'escribano eme', 'escribano em e': 'escribano eme',
        'bosch': 'bosch mobility electronics',
        'indra group edge': 'indra', 'chery ebro': 'ebro', 'ebro motors': 'ebro',
        'galletas gullon': 'gullon', 'ford de mexico': 'ford', 'ford mexico': 'ford',
        'linde wiemann': 'linde wiemann', 'grupo cinfa orliman': 'cinfa orliman',
        'grupo cinfa': 'cinfa orliman', 'siemens queretaro': 'siemens',
        'cluster industrial de aguascalientes': 'clia',
        'pangea aerospace pangea propulsion cluster': 'pangea propulsion',
        'seat s a cupra': 'seat cupra',
        'foxconn foxconn interconnect componentes ai': 'foxconn',
    }
    if text in aliases:
        return aliases[text]
    text = re.sub(r'\b(espana|spain|mexico|group|grupo|sa|sl|s a|s l|iberica)\b', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def parse_reports(directory):
    signals, attachments, skipped = [], [], []
    for path in sorted(directory.glob('*.md')):
        content = path.read_text(encoding='utf-8-sig')
        report_date = re.search(r'\d{4}-\d{2}-\d{2}', path.name)[0]
        headers = None
        for line in content.splitlines():
            if not line.startswith('|'):
                headers = None
                continue
            cells = [c.strip().replace('**', '') for c in re.split(r'(?<!\\)\|', line.strip().strip('|'))]
            if 'Empresa' in cells and 'Dominio' in cells:
                headers = cells
                continue
            if not headers or not cells[0].isdigit():
                continue
            if len(cells) != len(headers):
                raise ValueError(f'{path.name}: malformed table row {cells[0]}')
            row = {norm(k): v for k, v in zip(headers, cells)}
            empresa = row['empresa']
            if any(s in norm(empresa) for s in ['identidad no publicada', 'empresa no visible', 'empresas miembro', 'cliente confidencial']):
                skipped.append({'reportId': path.name, 'empresa': empresa, 'reason': 'Empresa no identificada individualmente'})
                continue
            signal = next((v for k, v in row.items() if k.startswith('senal')), '')
            source = row.get('fuente') or row.get('url fuente', '')
            urls = re.findall(r'https?://[^\s<>]+', source)
            date = row.get('fecha') or row.get('fecha fuente', '')
            entry = {'reportId': path.name, 'reportDate': report_date, 'empresa': empresa,
                     'dominio': row.get('dominio', ''), 'pais': row.get('pais', ''), 'sector': row.get('sector', ''),
                     'categoria': row.get('categoria') or row.get('cat', ''), 'senal': signal, 'fuente': source,
                     'fuenteUrl': urls[0].rstrip(');.,') if urls else '', 'fechaSenal': date,
                     'cargo': row.get('cargo') or row.get('cargo objetivo', ''), 'motivo': row.get('motivo', ''),
                     'producto': row.get('producto recomendado') or row.get('producto de entrada', '')}
            entry['key'] = hashlib.sha256((path.name + '\0' + empresa + '\0' + signal).encode()).hexdigest()[:24]
            signals.append(entry)
        if 'curso-mt-linkedin' in path.name or path.name.startswith('envio-'):
            for match in re.finditer(r'^## (.+)\n([\s\S]*?)(?=^## |\Z)', content, re.MULTILINE):
                title, body = match.groups()
                if path.name.startswith('envio-'):
                    if not title.startswith('Email '):
                        continue
                    title = re.sub(r'^Email \d+\s*[—-]\s*', '', title)
                    title = re.sub(r'\s*\(derivación.*', '', title)
                attachments.append({'empresa': title, 'reportId': path.name, 'reportDate': report_date,
                                    'content': body.strip(), 'kind': 'borrador de referencia'})
    return signals, attachments, skipped


def build_plan(existing, signals, attachments):
    docs = {r['id']: json.loads(r['data']) for r in existing}
    original = json.loads(json.dumps(docs))
    index = {}
    ranks = {'ganada': 9, 'perdida': 8, 'propuesta': 7, 'reunion': 6, 'respondido': 5, 'contactado': 4, 'borrador': 2, 'detectada': 1}
    for doc_id, d in sorted(docs.items(), key=lambda r: ranks.get(r[1].get('etapa'), 0)):
        index[company_key(d.get('empresa') or d.get('company', ''))] = doc_id

    def resolve(name):
        key = company_key(name)
        if key in index:
            return index[key]
        return None

    now = datetime.now(timezone.utc).isoformat()
    for signal in signals:
        doc_id = resolve(signal['empresa'])
        if not doc_id:
            key = company_key(signal['empresa'])
            doc_id = 'op-hermes-' + re.sub(r'\s+', '-', key)[:65] + '-' + hashlib.sha256(key.encode()).hexdigest()[:6]
            index[key] = doc_id
            domain = signal['dominio']
            # Do not invent usable websites from placeholders, uncertain domains or prose.
            domain = domain if re.fullmatch(r'[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:/[\w/-]*)?', domain) else ''
            docs[doc_id] = {k: signal[k] for k in ['empresa', 'pais', 'sector', 'categoria', 'senal', 'fuente', 'fuenteUrl', 'fechaSenal', 'cargo']}
            docs[doc_id].update({'dominio': domain, 'etapa': 'detectada', 'createdAt': now,
                                 'revisionPendiente': True, 'origen': 'informes-hermes'})
        doc = docs[doc_id]
        entries = doc.setdefault('senalesInformes', [])
        if not any(e.get('key') == signal['key'] for e in entries):
            entries.append(signal)
        doc.setdefault('informeIds', [])
        if signal['reportId'] not in doc['informeIds']:
            doc['informeIds'].append(signal['reportId'])
    unmatched = []
    for attachment in attachments:
        doc_id = resolve(attachment['empresa'])
        if not doc_id:
            unmatched.append(attachment['empresa'])
            continue
        doc = docs[doc_id]
        entries = doc.setdefault('borradoresInformes', [])
        if not any(e['reportId'] == attachment['reportId'] for e in entries):
            entries.append(attachment)
        doc.setdefault('informeIds', [])
        if attachment['reportId'] not in doc['informeIds']:
            doc['informeIds'].append(attachment['reportId'])
    changes = []
    for doc_id, doc in docs.items():
        if doc != original.get(doc_id):
            # Existing state/contact/email fields are untouched; only provenance is added.
            changes.append({'id': doc_id, 'new': doc_id not in original,
                            'empresa': doc.get('empresa') or doc.get('company'),
                            'patch': doc if doc_id not in original else {k: doc[k] for k in ['senalesInformes', 'borradoresInformes', 'informeIds'] if k in doc}})
    return changes, unmatched


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--credentials', required=True, type=Path)
    parser.add_argument('--plan', required=True, type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    values = {}
    for line in args.credentials.read_text(encoding='utf-8-sig').splitlines():
        s = line.strip()
        if s and not s.startswith('#') and '=' in s:
            key, value = s.removeprefix('export ').split('=', 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    endpoint = 'https://api.cloudflare.com/client/v4/accounts/' + values['CLOUDFLARE_ACCOUNT_ID'] + '/d1/database/9047e833-5b98-4859-b234-774905843e78/query'

    def query(sql, params=None):
        request = urllib.request.Request(endpoint, data=json.dumps({'sql': sql, 'params': params or []}).encode(),
            headers={'Authorization': 'Bearer ' + values['CLOUDFLARE_API_TOKEN'], 'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.load(response)
        if not result.get('success'):
            raise RuntimeError('D1 query failed')
        return result['result'][0]['results']

    existing = query("SELECT id,data FROM app_documents WHERE collection='outreach_cronometras'")
    signals, attachments, skipped = parse_reports(args.directory)
    changes, unmatched = build_plan(existing, signals, attachments)
    summary = {'before': len(existing), 'new': sum(c['new'] for c in changes),
               'enriched': sum(not c['new'] for c in changes), 'table_signals': len(signals),
               'excluded_unidentified': len(skipped), 'unmatched_attachments': unmatched,
               'after': len(existing) + sum(c['new'] for c in changes)}
    args.plan.write_text(json.dumps({'summary': summary, 'changes': changes, 'skipped': skipped,
                                    'before': existing}, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(summary, ensure_ascii=True))
    if args.apply:
        for change in changes:
            if change['new']:
                query('INSERT INTO app_documents(collection,id,data) VALUES (?,?,?) ON CONFLICT(collection,id) DO NOTHING',
                      ['outreach_cronometras', change['id'], json.dumps(change['patch'], ensure_ascii=False)])
            else:
                query('UPDATE app_documents SET data=json_patch(data,?) WHERE collection=? AND id=?',
                      [json.dumps(change['patch'], ensure_ascii=False), 'outreach_cronometras', change['id']])
        print('Applied: CRM history preserved; no messages sent.')


if __name__ == '__main__':
    main()
