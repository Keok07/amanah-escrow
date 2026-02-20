import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseBool,
  parseKeyValueList,
  parseCsvList,
  parseJsonOrBase64,
} from '../lib/parse.js';

test('parseBool honors fallback and truthy values', () => {
  assert.equal(parseBool(undefined, true), true);
  assert.equal(parseBool('', false), false);
  assert.equal(parseBool('true', false), true);
  assert.equal(parseBool(' YES ', false), true);
  assert.equal(parseBool('off', true), false);
});

test('parseKeyValueList parses key:value and key=value pairs', () => {
  const parsed = parseKeyValueList('a:1,b=2,invalid,:nope,keyonly:');
  assert.deepEqual(parsed, [
    ['a', '1'],
    ['b', '2'],
  ]);
});

test('parseCsvList returns trimmed entries or null', () => {
  assert.equal(parseCsvList(''), null);
  assert.deepEqual(parseCsvList(' one, two ,, three '), ['one', 'two', 'three']);
});

test('parseJsonOrBase64 parses JSON and base64 JSON', () => {
  assert.deepEqual(parseJsonOrBase64('{"ok":true}'), { ok: true });

  const encoded = Buffer.from('{"name":"amanah"}', 'utf8').toString('base64');
  assert.deepEqual(parseJsonOrBase64(encoded), { name: 'amanah' });
});

test('parseJsonOrBase64 supports b64 prefix and object passthrough', () => {
  const prefixed = `b64:${Buffer.from('{"v":1}', 'utf8').toString('base64')}`;
  assert.deepEqual(parseJsonOrBase64(prefixed, { base64Prefix: 'b64:' }), { v: 1 });

  const obj = { invite: true };
  assert.equal(parseJsonOrBase64(obj, { allowObject: true }), obj);
});

test('parseJsonOrBase64 supports @file with resolver', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amanah-parse-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const file = path.join(dir, 'welcome.json');
  fs.writeFileSync(file, '{"hello":"world"}');

  const parsed = parseJsonOrBase64('@welcome.json', {
    allowFile: true,
    filePathResolver: (relativePath) => path.join(dir, relativePath),
  });
  assert.deepEqual(parsed, { hello: 'world' });
});

test('parseJsonOrBase64 returns null on invalid JSON-like input', () => {
  assert.equal(parseJsonOrBase64('{invalid json}'), null);
  assert.equal(parseJsonOrBase64('@missing.json', { allowFile: true }), null);
});
