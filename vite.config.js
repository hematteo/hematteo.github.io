import { defineConfig } from 'vite'

// Deployed as a GitHub user site at https://hematteo.github.io/ , so base is '/'.
export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200, // three.js is large and intentionally bundled
  },
})
