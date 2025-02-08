import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/pinata': {
        target: 'https://api.pinata.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pinata/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ethereum: ['ethers', '@metamask/sdk-react-ui'],
          ui: ['./src/components/CartPanel', './src/components/InlineProductDetails']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
