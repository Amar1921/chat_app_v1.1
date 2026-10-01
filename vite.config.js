// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  if (!['development', 'production'].includes(mode)) throw new Error('Mode Vite attendu : development ou production.')
  const env = loadEnv(mode, root, 'VITE_')
  if (!env.VITE_API_URL) throw new Error(`VITE_API_URL manquant dans .env.${mode}`)
  if (mode === 'development') {
    const api = new URL(env.VITE_API_URL)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) {
      throw new Error('En développement, VITE_API_URL doit viser le backend local. Vérifier .env.development et les variables du terminal.')
    }
  }
  console.info(`[frontend] mode=${mode} ; configuration=.env.${mode} ; API=${env.VITE_API_URL}`)
  return {
    envDir: root,
    plugins: [react()],
    server: { port: 5173, strictPort: true },
  }
})
