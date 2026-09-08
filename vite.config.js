import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const { endpoint } = JSON.parse(readFileSync(new URL('./contact.config.json', import.meta.url), 'utf8'))
// An opaque public form ID belongs here, never an address or secret API key.
if (typeof endpoint !== 'string' || (endpoint && !/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint))) {
  throw new Error('Contact endpoint must be empty or an HTTPS Formspree /f/ form-ID URL.')
}

// Deployed as a GitHub user site at https://hematteo.github.io/ , so base is '/'.
export default defineConfig(({ command }) => ({
  base: '/',
  plugins: [{
    name: 'contact-form-configuration',
    transformIndexHtml: {
      order: 'pre',
      handler: html => html
        .replaceAll('%CONTACT_ENDPOINT%', endpoint || '#contact')
        .replaceAll('%CONTACT_DISABLED%', endpoint ? '' : 'disabled')
        .replaceAll('%CONTACT_VISIBILITY%', endpoint || command === 'serve' ? '' : 'hidden')
        .replaceAll('%CONTACT_PREVIEW_VISIBILITY%', endpoint ? 'hidden' : ''),
    },
  }],
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
}))
