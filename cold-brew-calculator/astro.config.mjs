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
  },
});
