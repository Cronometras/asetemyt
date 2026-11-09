import importlib.util
import json
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('signals', Path(__file__).with_name('integrate-prospecting-signals.py'))
signals = importlib.util.module_from_spec(spec)
spec.loader.exec_module(signals)


class IntegrationTests(unittest.TestCase):
    def test_aliases_do_not_merge_distinct_businesses(self):
        self.assertEqual(signals.company_key('Escribano EM&E'), signals.company_key('EM&E Group'))
        self.assertEqual(signals.company_key('CLIA (Clúster Industrial de Aguascalientes)'), signals.company_key('Clúster Industrial de Aguascalientes (CLIA)'))
        self.assertNotEqual(signals.company_key('Siemens'), signals.company_key('Siemens Energy'))
        self.assertNotEqual(signals.company_key('Bosch Mobility Electronics'), signals.company_key('Bosch Home Comfort'))

    def test_append_preserves_contact_history_and_is_idempotent(self):
        existing = [{'id': 'op-copreci', 'data': json.dumps({'empresa': 'Copreci', 'etapa': 'respondido',
            'body': 'Original sent email', 'contactoEmail': 'person@example.com', 'sentAt': '2026-10-13',
            'replied': True, 'notes': 'Keep these notes'})}]
        signal = {'empresa': 'Copreci', 'key': 'source-1', 'reportId': '2026-11-03.md', 'senal': 'New evidence'}
        changes, _ = signals.build_plan(existing, [signal], [])
        self.assertEqual(len(changes), 1)
        self.assertFalse(changes[0]['new'])
        self.assertEqual(set(changes[0]['patch']), {'senalesInformes', 'informeIds'})
        document = json.loads(existing[0]['data'])
        document.update(changes[0]['patch'])
        self.assertEqual(document['etapa'], 'respondido')
        self.assertEqual(document['body'], 'Original sent email')
        self.assertEqual(document['notes'], 'Keep these notes')
        existing[0]['data'] = json.dumps(document)
        second, _ = signals.build_plan(existing, [signal], [])
        self.assertEqual(second, [])

    def test_new_signals_do_not_claim_contact_or_verification(self):
        signal = dict(empresa='New Factory', key='signal-1', reportId='2026-11-03.md',
            dominio='example.com (verificar)', pais='ES', sector='Assembly', categoria='A',
            senal='New production line', fuente='Press', fuenteUrl='', fechaSenal='2026-10', cargo='Plant manager')
        changes, _ = signals.build_plan([], [signal, dict(signal, key='signal-2', reportId='2026-10-27.md')], [])
        self.assertEqual(len(changes), 1)
        doc = changes[0]['patch']
        self.assertEqual(doc['etapa'], 'detectada')
        self.assertEqual(doc['dominio'], '')
        self.assertTrue(doc['revisionPendiente'])
        self.assertNotIn('sentAt', doc)
        self.assertEqual(len(doc['senalesInformes']), 2)


if __name__ == '__main__':
    unittest.main()
