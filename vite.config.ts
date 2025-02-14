import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
  }
}); 