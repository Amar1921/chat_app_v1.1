import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeChatStream } from '../src/utils/chatStream.js';

function stream(parts) {
  return new ReadableStream({ start(controller) {
    for (const part of parts) controller.enqueue(part);
    controller.close();
  } });
}
const encode = text => new TextEncoder().encode(text);
const done = { type: 'done', message_id: 'assistant', user_message_id: 'user', content: '**Continuez à parler** (téléphone, rencontres).', finish_reason: 'stop' };

test('le navigateur conserve les fragments de mots et les espaces à toute frontière réseau', async () => {
  const events = [{ type: 'content', content: '**Contin' }, { type: 'content', content: 'uez à parler**' }, { type: 'content', content: ' (téléphone, rencontres).' }, done];
  const bytes = encode(events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join(''));
  for (let i = 1; i < bytes.length; i++) {
    let text = '';
    let final;
    await consumeChatStream(stream([bytes.slice(0, i), bytes.slice(i)]), { onChunk: value => { text += value; }, onDone: event => { final = event; } });
    assert.equal(text, done.content);
    assert.deepEqual(final, done);
  }
});

test('le dernier événement sans saut de ligne est traité et le raisonnement reste séparé', async () => {
  let reasoning = '';
  let final;
  const bytes = encode(`data:{"type":"reasoning","content":"réfléchir 😀"}\n\ndata:${JSON.stringify(done)}`);
  await consumeChatStream(stream([...bytes].map(byte => Uint8Array.of(byte))), { onReasoning: value => { reasoning += value; }, onDone: event => { final = event; } });
  assert.equal(reasoning, 'réfléchir 😀');
  assert.deepEqual(final, done);
});

test('une coupure ou un JSON invalide ne valide pas silencieusement une réponse partielle', async () => {
  for (const tail of ['', '\ndata: [DONE]\n', '\ndata: {"type":"content"']) {
    let text = '';
    let completed = false;
    await assert.rejects(consumeChatStream(stream([encode('data: {"type":"content","content":"Contin"}\n' + tail)]), { onChunk: value => { text += value; }, onDone: () => { completed = true; } }));
    assert.equal(text, 'Contin');
    assert.equal(completed, false);
  }
});

test('une erreur fournisseur conserve les fragments reçus et remonte une erreur', async () => {
  let text = '';
  await assert.rejects(consumeChatStream(stream([encode('data: {"type":"content","content":"Bonjour"}\n\ndata: {"type":"error","error":"Interruption"}\n\n')]), { onChunk: value => { text += value; } }), /Interruption/);
  assert.equal(text, 'Bonjour');
});
