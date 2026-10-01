import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadBackendEnv } from '../backend/config/load-env.js';

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'chat-env-'));
  for (const mode of ['development', 'production']) {
    writeFileSync(join(directory, `.env.${mode}`), `NODE_ENV=${mode}\nPORT=${mode === 'development' ? 5002 : 5001}\nDB_HOST=localhost\nDB_PORT=3306\nDB_USER=test\nDB_NAME=${mode}\nJWT_SECRET=test-${mode}\nDEEPSEEK_API_KEY=fixture\nDEEPSEEK_API_URL=https://api.deepseek.com/v1\nFRONTEND_URL=http://localhost:5173\n`);
  }
  writeFileSync(join(directory, '.env'), 'PORT=9999\nDB_NAME=wrong-common-file\n');
  return directory;
}

test('le backend lit seulement le fichier du mode choisi et ignore le .env commun', () => {
  const directory = fixture();
  try {
    for (const mode of ['development', 'production']) {
      const target = { NODE_ENV: mode };
      const result = loadBackendEnv({ directory, target });
      assert.equal(target.DB_NAME, mode);
      assert.equal(target.JWT_SECRET, `test-${mode}`);
      assert.equal(result.path, join(directory, `.env.${mode}`));
    }
    const target = {};
    assert.equal(loadBackendEnv({ directory, target }).mode, 'development');
    assert.equal(target.PORT, '5002');
  } finally { rmSync(directory, { recursive: true }); }
});

test('les variables du service sont prioritaires, sans charger un autre mode', () => {
  const directory = fixture();
  try {
    const target = { NODE_ENV: 'production', PORT: '7000', JWT_SECRET: 'service-value' };
    loadBackendEnv({ directory, target });
    assert.equal(target.PORT, '7000');
    assert.equal(target.JWT_SECRET, 'service-value');
    assert.equal(target.DB_NAME, 'production');
  } finally { rmSync(directory, { recursive: true }); }
});

test('mode inconnu, configuration manquante et secrets vides arrêtent le démarrage', () => {
  const directory = fixture();
  try {
    assert.throws(() => loadBackendEnv({ directory, target: { NODE_ENV: 'staging' } }), /NODE_ENV/);
    rmSync(join(directory, '.env.production'));
    assert.throws(() => loadBackendEnv({ directory, target: { NODE_ENV: 'production' } }), /Configuration manquante/);
    assert.throws(() => loadBackendEnv({ directory, target: { JWT_SECRET: '' } }), /JWT_SECRET/);
    assert.throws(() => loadBackendEnv({ directory, target: { PORT: 'not-a-port' } }), /Port PORT/);
  } finally { rmSync(directory, { recursive: true }); }
});
