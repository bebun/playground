// @ts-check
import { defineConfig } from 'astro/config';

// Builds to a single self-contained index.html (CSS + JS inlined),
// so it works from any sub-path: GitHub Pages, a static host, or opened locally.
export default defineConfig({
  output: 'static',
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      // Astro inlines processed <script>s smaller than this limit.
      assetsInlineLimit: 1024 * 1024,
    },
    define: {
      // Injected at build time from Vercel's Supabase integration (sensitive
      // env vars — only readable inside the Vercel build, never via CLI/API).
      __SUPABASE_URL__: JSON.stringify(process.env.cbc_sb_SUPABASE_URL ?? ''),
      __SUPABASE_ANON_KEY__: JSON.stringify(process.env.cbc_sb_SUPABASE_ANON_KEY ?? ''),
    },
  },
});
