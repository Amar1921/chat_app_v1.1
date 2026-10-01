import { loadBackendEnv } from './load-env.js';

// Importer avant les modules qui lisent process.env (pool SQL, routes API).
export const environment = loadBackendEnv();
