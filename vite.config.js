import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/* The absolute origin the social cards and canonical link need. Set
   VITE_SITE_URL for a custom domain; on Vercel the production domain is
   picked up automatically from its system environment. With neither, the
   tags fall back to root-relative URLs. */
const site = (
  process.env.VITE_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '')
).replace(/\/$/, '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', site),
    },
  ],
  build: {
    target: 'es2020',
    reportCompressedSize: false,
  },
})
