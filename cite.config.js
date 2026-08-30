import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' mantém o app funcionando tanto em michaeldsviana.github.io/meu-financeiro/
// quanto em um domínio próprio, sem precisar reconfigurar nada.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
})
