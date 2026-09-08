import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Deployed as a GitHub user site at https://hematteo.github.io/ , so base is '/'.
export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        profile: fileURLToPath(new URL('./index.html', import.meta.url)),
        drawer: fileURLToPath(new URL('./drawer/index.html', import.meta.url)),
      },
    },
    target: 'es2020',
    chunkSizeWarningLimit: 1200, // three.js is large and intentionally bundled
  },
})
