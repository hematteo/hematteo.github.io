import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// The homepage's arXiv-style margin stamp shows the build date, e.g. "25 Sep 2026".
const now = new Date()
const buildDate = `${now.getUTCDate()} ${'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[now.getUTCMonth()]} ${now.getUTCFullYear()}`

// Deployed as a GitHub user site at https://hematteo.github.io/ , so base is '/'.
export default defineConfig({
  base: '/',
  plugins: [{ name: 'build-date', transformIndexHtml: html => html.replace('%BUILD_DATE%', buildDate) }],
  build: {
    rollupOptions: {
      input: {
        profile: fileURLToPath(new URL('./index.html', import.meta.url)),
        drawer: fileURLToPath(new URL('./drawer/index.html', import.meta.url)),
        trajectories: fileURLToPath(new URL('./research/trajectories/index.html', import.meta.url)),
        prism: fileURLToPath(new URL('./research/prism/index.html', import.meta.url)),
      },
    },
    target: 'es2020',
    chunkSizeWarningLimit: 1200, // three.js is large and intentionally bundled
  },
})
