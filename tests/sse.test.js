import test from 'node:test';
import assert from 'node:assert/strict';
import { createSseDecoder } from '../backend/utils/sse.js';

test('conserve chaque accent, emoji et événement pour toutes les coupures réseau', () => {
  const lines = ['data: {"choices":[{"delta":{"content":"été, cœur, Sénégal 👋"}}]}', 'data: [DONE]'];
  const bytes = Buffer.from(lines.join('\r\n') + '\r\n');
  for (let split = 1; split < bytes.length; split++) {
    const result = [];
    const parser = createSseDecoder(line => result.push(line));
    parser.write(bytes.subarray(0, split));
    parser.write(bytes.subarray(split));
    parser.end();
    assert.deepEqual(result, lines);
  }
});

test('supporte un flux reçu octet par octet et une dernière ligne sans saut', () => {
  const result = [];
  const parser = createSseDecoder(line => result.push(line));
  for (const byte of Buffer.from('data: {"content":"é😀"}\n\ndata: [DONE]')) parser.write(Buffer.from([byte]));
  parser.end();
  assert.deepEqual(result, ['data: {"content":"é😀"}', '', 'data: [DONE]']);
});
