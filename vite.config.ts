 import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Main web interface entry
        main: './index.html',
        // Core system routing engine entry
        coreEngine: './core/js/main.js'
      },
      output: {
        // Keeps your exact script paths predictable in the build output
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'coreEngine' ? 'core/js/main.js' : 'assets/[name]-[hash].js';
        }
      }
    }
  }
});
