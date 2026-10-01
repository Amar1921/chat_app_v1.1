import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../backend/models/db.js';
import conversations from '../backend/routes/conversations.js';
import stats from '../backend/routes/stats.js';

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function handler(router, path, method) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route;
  return route.stack.at(-1).handle;
}

test('les statistiques et paramètres d’une conversation étrangère ne sont pas divulgués', async () => {
  const original = pool.query;
  pool.query = async sql => {
    if (sql.includes('FROM prompt_templates')) return [[{ content: '{}' }]];
    if (sql.startsWith('UPDATE')) return [{ affectedRows: 0 }];
    return [sql.includes('user_id = ?') ? [] : [{ id: 'victim', system_prompt: 'private' }]];
  };
  try {
    for (const [path, method] of [['/:id/stats', 'get'], ['/:id/apply-template', 'post']]) {
      const res = response();
      await handler(conversations, path, method)({ params: { id: 'victim' }, user: { id: 'attacker' }, body: { templateId: 'public' } }, res, error => { throw error; });
      assert.equal(res.statusCode, 404);
      assert.equal(res.body.conversation, undefined);
      assert.equal(res.body.stats, undefined);
    }
  } finally { pool.query = original; }
});

test('la modification d’un dossier étranger ne retourne pas ses informations', async () => {
  const original = pool.execute;
  pool.execute = async sql => [sql.startsWith('UPDATE') ? { affectedRows: 0 } : sql.includes('user_id = ?') ? [] : [{ id: 'victim', name: 'private' }]];
  try {
    const res = response();
    await handler(stats, '/folders/:id', 'put')({ params: { id: 'victim' }, user: { id: 'attacker' }, body: { name: 'test' } }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.folder, undefined);
  } finally { pool.execute = original; }
});
