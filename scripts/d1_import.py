"""Generate an additive D1 import from a plain JSON document backup.

Input: {"collections": {"collection_name": [{"id": "doc-id", "data": {...}}]}}
Existing fields in D1 win, including explicit nulls. Missing fields are imported.
This command writes SQL only; it never reads credentials or changes a remote DB.
"""
import argparse
import json
from datetime import date, datetime
from pathlib import Path


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def json_value(value):
    return json.dumps(value, ensure_ascii=False, default=lambda item: item.isoformat() if isinstance(item, (date, datetime)) else str(item))


def document_sql(collection, doc_id, data):
    if not isinstance(data, dict):
        raise ValueError('Document data must be an object')
    sql = [f'INSERT INTO app_documents (collection,id,data) VALUES ({quote(collection)},{quote(doc_id)},{quote(json_value(data))}) ON CONFLICT(collection,id) DO NOTHING;']
    for key, value in data.items():
        if '"' in key:
            raise ValueError('Unsupported quote in field name')
        path = '$.' + json.dumps(key, ensure_ascii=False)
        sql.append(f'UPDATE app_documents SET data=json_set(data,{quote(path)},json({quote(json_value(value))})) WHERE collection={quote(collection)} AND id={quote(doc_id)} AND json_type(data,{quote(path)}) IS NULL;')
    return '\n'.join(sql)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--complete', action='store_true', help='Mark the historical private-data import complete; use only with a complete backup')
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error('Input and output must be different files')
    backup = json.loads(args.input.read_text(encoding='utf-8-sig'))
    collections = backup['collections']
    statements = ['-- Additive import: existing D1 fields are preserved.']
    count = 0
    for collection, documents in collections.items():
        for doc in documents:
            statements.append(document_sql(collection, doc['id'], doc['data']))
            count += 1
    if args.complete:
        statements.append("UPDATE app_migration_state SET value='true' WHERE name='legacy_private_data_imported';")
    with args.output.open('x', encoding='utf-8') as output:
        output.write('\n'.join(statements) + '\n')
    print(f'Generated SQL for {count} documents. No database was modified.')


if __name__ == '__main__':
    main()
