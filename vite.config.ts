import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Phaser is loaded only after the player chooses to enter the preview.
        manualChunks(id) {
          if (id.replaceAll('\\', '/').includes('/node_modules/phaser/')) return 'phaser';
        },
      },
    },
  },
});
