import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // loadEnv with '' prefix loads ALL vars — including non-VITE_ ones.
  // These are available here in Node.js only; they are never injected into the browser bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5000,
      proxy: {
        '/api': {
          target: env.API_URL || 'http://localhost:3000',
          changeOrigin: true,
          // Key is added here by the Vite dev server (Node.js), never touches the browser
          headers: { 'X-API-Key': env.INTERNAL_API_KEY || '' },
        },
      },
    },
  };
});
