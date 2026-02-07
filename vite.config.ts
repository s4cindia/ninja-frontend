import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Detect environment
const isReplit = process.env.REPL_ID !== undefined;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'csp-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http: wss: https:; object-src 'none';"
          );
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';"
          );
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: isReplit ? 5000 : 5173, // Replit uses 5000, local dev uses 5173
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: isReplit ? {
      clientPort: 443,
    } : undefined,
    proxy: {
      '/api/v1': {
        target: process.env.VITE_BACKEND_URL || (isReplit ? 'http://localhost:3001' : 'http://localhost:5000'),
        changeOrigin: true,
        secure: false,
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
