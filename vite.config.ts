import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({
    // Otimizar React Fast Refresh
    fastRefresh: true,
    // Reduzir overhead de desenvolvimento
    babel: {
      compact: false
    }
  })],
  root: '.',
  
  // Otimizações de desenvolvimento
  server: {
    port: 3000,
    host: true,
    // Desativar HMR para evitar recarregamentos enquanto digita
    hmr: false,
    // Headers otimizados para desenvolvimento
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    // Configurações de proxy se necessário
    cors: true
  },

  // Otimizações de build
  build: {
    outDir: 'dist',
    // Melhorar performance de build
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        
        // Code splitting otimizado
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          utils: ['date-fns', 'lodash']
        }
      }
    },
    
    // Configurações de chunk
    chunkSizeWarningLimit: 1000
  },

  // Otimizar dependências
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'firebase/app', 
      'firebase/firestore',
      'firebase/auth'
    ],
    // Forçar pré-bundling de dependências comuns
    force: false
  },

  // Resolver aliases para melhor performance
  resolve: {
    alias: {
      '@': '/mvsat',
    }
  },

  // Configurações de CSS
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      // Configurações para preprocessadores se necessário
    }
  },

  // Configurações de desenvolvimento
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
});



