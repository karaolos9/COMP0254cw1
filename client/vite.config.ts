import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Create a plugin to handle MetaMask SDK debug requests
const handleMetaMaskDebug = (): Plugin => ({
  name: 'handle-metamask-debug',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith('/debug')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      next();
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    handleMetaMaskDebug()
  ],
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
