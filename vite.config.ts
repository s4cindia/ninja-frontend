import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    proxy: {
      '/api/v1': {
        target: 'https://c48ebf88-c2db-4675-9589-90ad84ac1e0a-00-2o7hlystdhu3f.pike.replit.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
