import unittest
import sqlite3
from pathlib import Path
from d1_import import document_sql

class ImportTest(unittest.TestCase):
    def test_import_adds_missing_fields_without_replacing_d1_edits(self):
        db = sqlite3.connect(':memory:')
        for name in ['0001_consultores.sql', '0002_software.sql', '0003_app_documents.sql']:
            db.executescript(Path('migrations', name).read_text(encoding='utf-8'))
        db.executescript(document_sql('directorio_consultores_asetemyt', 'one', {
            'slug': 'one', 'nombre': 'Edited in D1', 'tipo': 'consultor', 'optional': None,
        }))
        sql = document_sql('directorio_consultores_asetemyt', 'one', {
            'slug': 'old-slug', 'nombre': 'Old Firestore name', 'tipo': 'consultor',
            'ownerUid': 'private-owner', 'optional': 'old value', 'tags': ['a', 'b'],
        })
        db.executescript(sql)
        db.executescript(sql)
        import json
        data = json.loads(db.execute('SELECT data FROM app_documents').fetchone()[0])
        self.assertEqual(data['nombre'], 'Edited in D1')
        self.assertEqual(data['slug'], 'one')
        self.assertEqual(data['ownerUid'], 'private-owner')
        self.assertIsNone(data['optional'])
        self.assertEqual(data['tags'], ['a', 'b'])
        self.assertEqual(db.execute('SELECT nombre FROM consultores').fetchone()[0], 'Edited in D1')
        db.close()

if __name__ == '__main__':
    unittest.main()
