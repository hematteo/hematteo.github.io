import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// The homepage's arXiv-style stamp and submission history: one version per commit on the
// deployed branch (the deploy workflow checks out full history), dated in UTC.
function siteVersions () {
  try {
    return execSync('git log --first-parent --format=%H%x09%cI', { encoding: 'utf8' }).trim().split('\n')
      .map(line => { const [hash, iso] = line.split('\t'); return { hash, date: new Date(iso) } })
      .reverse()
  } catch {
    return []
  }
}
const versions = siteVersions()
const latest = versions.at(-1)?.date ?? new Date()
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
const DAYS = 'Sun Mon Tue Wed Thu Fri Sat'.split(' ')
const pad = n => String(n).padStart(2, '0')
const stampDate = d => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
const historyDate = d => `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
const history = versions.map((v, i) =>
  `<li><b>[v${i + 1}]</b> ${historyDate(v.date)} <a href="https://github.com/hematteo/hematteo.github.io/commit/${v.hash}">${v.hash.slice(0, 7)}</a></li>`).join('')

// Deployed as a GitHub user site at https://hematteo.github.io/ , so base is '/'.
export default defineConfig({
  base: '/',
  plugins: [{
    name: 'submission-history',
    transformIndexHtml: html => html
      .replace('%BUILD_DATE%', stampDate(latest))
      .replace('%SITE_VERSION%', `v${Math.max(versions.length, 1)}`)
      .replace('%SUBMISSION_HISTORY%', history),
  }],
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
