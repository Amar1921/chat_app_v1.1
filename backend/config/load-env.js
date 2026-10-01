import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import dotenv from 'dotenv';

export function loadBackendEnv({ target = process.env, directory = fileURLToPath(new URL('../', import.meta.url)) } = {}) {
  const mode = target.NODE_ENV || 'development';
  if (!['development', 'production'].includes(mode)) {
    throw new Error('NODE_ENV doit être development ou production.');
  }
  const path = join(directory, `.env.${mode}`);
  let values;
  try { values = dotenv.parse(readFileSync(path)); }
  catch { throw new Error(`Configuration manquante : ${path}. Copier le fichier .example correspondant.`); }
  if (values.NODE_ENV && values.NODE_ENV !== mode) {
    throw new Error(`NODE_ENV incohérent dans ${path}.`);
  }
  // Les variables du service/hébergeur restent prioritaires sur le fichier.
  for (const [key, value] of Object.entries(values)) {
    if (target[key] === undefined) target[key] = value;
  }
  target.NODE_ENV = mode;
  for (const key of ['PORT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'JWT_SECRET', 'DEEPSEEK_API_KEY', 'DEEPSEEK_API_URL', 'FRONTEND_URL']) {
    if (!target[key]?.trim()) throw new Error(`Variable ${key} manquante dans ${path} ou l'environnement du service.`);
  }
  for (const key of ['PORT', 'DB_PORT']) {
    const value = Number(target[key]);
    if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`Port ${key} invalide dans ${path}.`);
  }
  return { mode, path };
}
