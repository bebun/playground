# NWM Portfolio

Personal design portfolio. Built with [Astro](https://astro.build) — static output, publishable anywhere (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

## Commands

```bash
npm install      # install deps
npm run dev      # local dev → http://localhost:4321
npm run build    # static build → dist/
npm run preview  # preview the production build
```

## Publish

`npm run build` outputs static files to `dist/`. Deploy that folder to any static host. (Netlify/Vercel: point at this repo, build command `npm run build`, publish dir `dist`.)

## Structure

```
src/
  layouts/Base.astro     # <head>, fonts, global styles
  pages/index.astro      # AmarthaFin case study
  styles/
    tokens.css           # design tokens (colors, type) — design-system seed
    global.css           # reset + shared type primitives + the scaling stage
public/img/              # exported visuals from Figma
```

## How the case study is built

The page is a faithful 1:1 reproduction of the Figma desktop frame (1920 × 5873).
Every block is absolutely positioned at its exact Figma coordinate inside `.stage`,
and a small inline script in `index.astro` scales `.stage` to fit the viewport width
(capped at 1×), so the design renders identically at any screen size without reflowing.

- **Prose** (headings, paragraphs, lists, stats, footer) is real, selectable HTML text
  using Manrope / Finlandica from Google Fonts.
- **Graphical blocks** (hero, process card images, post-it photo, before/after screens,
  components showcase) are PNGs exported from Figma at 2× into `public/img/`.

## Next steps (planned)

- Main navigation across multiple case-study pages.
- Grow `src/styles/tokens.css` into a proper design system + reusable components.
- Responsive (reflowing) layouts as the system matures — currently the comp scales
  uniformly to preserve the original design exactly.
