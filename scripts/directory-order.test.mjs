import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const { compareDirectoryEntries, validDirectoryOrder } = await server.ssrLoadModule('/src/lib/directory-order.ts');
after(() => server.close());
const entries = [
 { slug: 'a', nombre: 'Alfa', destacado: true, createdAt: '2025-01-01' },
 { slug: 'z', nombre: 'Zulu', verificado: true, createdAt: '2026-01-01' },
 { slug: 'b', nombre: 'Beta', createdAt: null },
 { slug: 'c', nombre: 'Ceta', createdAt: 'invalid' },
];
test('directory orders prioritize verification by default and respect explicit name/date choices', () => {
 const order = value => [...entries].sort((a,b) => compareDirectoryEntries(a,b,value)).map(e => e.slug);
 assert.deepEqual(order('recommended'), ['z','a','b','c']);
 assert.deepEqual(order('newest'), ['z','a','b','c']);
 assert.deepEqual(order('oldest'), ['a','z','b','c']);
 assert.deepEqual(order('name-asc'), ['a','b','c','z']);
 assert.deepEqual(order('name-desc'), ['z','c','b','a']);
 assert.equal(validDirectoryOrder('unknown'), 'recommended');
});
