import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env.METAMASK_SDK_DEBUG': false,
    'process.env.NODE_DEBUG': false
  },
  server: {
    proxy: {
      '/api/pinata': {
        target: 'https://api.pinata.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pinata/, ''),
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      },
      '/debug': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
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
