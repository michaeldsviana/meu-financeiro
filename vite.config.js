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
    // Alvo conservador: cobre iPhones com iOS 14 em diante.
    // Sem isso, um Safari mais antigo não consegue nem ler o arquivo
    // e a página fica em branco, sem nenhuma mensagem de erro.
    target: ['es2019', 'safari14', 'chrome80', 'firefox78'],
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
