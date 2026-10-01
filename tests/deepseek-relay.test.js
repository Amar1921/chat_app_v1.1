import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import axios from 'axios';
import pool from '../backend/models/db.js';
import router from '../backend/routes/chat.js';
import { consumeChatStream } from '../src/utils/chatStream.js';

test('DeepSeek → Express → navigateur conserve le texte de la capture et vérifie la fin', async () => {
  const originalExecute = pool.execute;
  const originalPost = axios.post;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'test-only-not-a-real-key';
  try {
    for (const terminated of [true, false]) {
      const upstream = new PassThrough();
      const response = new EventEmitter();
      let savedContent;
      let output = '';
      const ended = new Promise(resolve => {
        response.writeHead = () => {};
        response.write = chunk => { output += chunk; };
        response.end = () => { response.writableEnded = true; resolve(); };
      });
      pool.execute = async (sql, params) => {
        if (sql.startsWith('SELECT * FROM conversations')) return [[{ id: 'conversation', user_id: 'user', title: 'Test', model: 'deepseek-chat' }]];
        if (sql.startsWith('SELECT role, content')) return [[]];
        if (sql.includes('INSERT INTO messages') && params[3] === 'assistant') savedContent = params[4];
        return [{ affectedRows: 1 }];
      };
      axios.post = async (_url, request) => {
        assert.equal(request.stream, true);
        assert.equal(request.stream_options.include_usage, true);
        return { data: upstream };
      };
      const handler = router.stack.find(layer => layer.route?.path === '/:conversationId').route.stack.at(-1).handle;
      await handler({ params: { conversationId: 'conversation' }, body: { content: 'Question', stream: true }, user: { id: 'user' } }, response);
      const chunks = [
        { choices: [{ delta: { role: 'assistant', content: '' }, finish_reason: null }] },
        { choices: [{ delta: { reasoning_content: 'Réflexion' }, finish_reason: null }] },
        ...['- **Contin', 'uez à parler**', ' (téléphone, rencontres).'].map(content => ({ choices: [{ delta: { content }, finish_reason: null }] })),
        { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 20 } },
      ];
      const bytes = Buffer.from(chunks.map(chunk => `data: ${JSON.stringify(chunk)}\r\n\r\n`).join('') + (terminated ? 'data: [DONE]\n\n' : ''));
      for (const byte of bytes) upstream.write(Buffer.from([byte]));
      upstream.end();
      await ended;
      let visible = '';
      let final;
      const browserStream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(output)); controller.close(); } });
      const consume = consumeChatStream(browserStream, { onChunk: chunk => { visible += chunk; }, onDone: event => { final = event; } });
      if (terminated) {
        await consume;
        assert.equal(savedContent, '- **Continuez à parler** (téléphone, rencontres).');
        assert.equal(visible, savedContent);
        assert.equal(final.content, savedContent);
        assert.equal(final.tokens.total, 30);
        assert.equal(final.reasoning_content, 'Réflexion');
      } else {
        await assert.rejects(consume, /interrompue/);
        assert.equal(savedContent, undefined);
        assert.equal(final, undefined);
        assert.equal(visible, '- **Continuez à parler** (téléphone, rencontres).');
      }
    }
  } finally {
    pool.execute = originalExecute;
    axios.post = originalPost;
    if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = originalKey;
  }
});
