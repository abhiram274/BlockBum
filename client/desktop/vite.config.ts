import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for Electron to resolve assets with file:// protocol
  server: {
    port: 5173
  }
});
