# Cold Brew Calculator

A small Astro app for dialing in cold brew: bean → brew → water → add-ons, with saved recipes.

## Run

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs dist/index.html (single self-contained file)
```

`dist/index.html` has all CSS and JS inlined, so it works from any sub-path
(GitHub Pages, a static host, or opened straight from disk).

## Structure

```
src/
  lib/data.ts        origins, processes, altitude bands, water types, element presets
  lib/calc.ts        recipe model + all math (ratio sync, yield, suggestion, elements)
  lib/store.ts       saved recipes + draft in localStorage (name max 25 chars)
  scripts/app.ts     UI wiring, rendering, routing (#saved, #r/<id>)
  components/        Bean, Brew, Water, Elements, SaveBar, SavedView, AppHeader
  layouts/Base.astro tokens + global styles (light/dark)
  pages/index.astro  page composition
```

## Assumptions baked in

| Rule | Value | Source |
|---|---|---|
| Base ratio | 1:14 | Your 40 g Kintamani washed test, no bloom |
| Process adjustment | washed 0, honey +0.5, natural +1, wet-hulled +0.5, fermented +1, co-fermented +1.5 | Heuristic |
| Altitude adjustment | <1,200 masl +0.5, ≥1,800 masl −0.5 | Heuristic |
| Grounds absorb | 2 ml per g coffee | Rule of thumb |
| Hot bloom | 1.5 × coffee weight at 90°C, off by default | See in-app research note |
| Water | SCA target TDS 150 ppm (75–250) | SCA water standard |

Change any of these in `src/lib/data.ts` or `src/lib/calc.ts`.

## Storage

Saved recipes live in the browser's localStorage. They don't sync between devices or browsers.
