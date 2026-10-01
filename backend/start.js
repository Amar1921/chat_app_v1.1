const mode = process.argv[2] || process.env.NODE_ENV || 'development';
if (!['development', 'production'].includes(mode)) {
  throw new Error('Utilisation : node backend/start.js development|production');
}
process.env.NODE_ENV = mode;
await import('./server.js');
