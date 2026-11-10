import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Optional React development mode. The recommended launcher bundles React into
// Spring Boot so the full app is available at https://localhost:8080.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://localhost:8080',
        changeOrigin: true,
        secure: false, // local self-signed development certificate only
      },
    },
  },
});
