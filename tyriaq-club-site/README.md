# TYRIAQ CLUB — نادي ترياق

Static single-page site. No build step: open `index.html`, or serve the folder.

```bash
python3 -m http.server 4173
```

## Replacing placeholders
- **Activity photos** — drop real files at `assets/img/activity-1.jpg` … `activity-5.jpg`
  (same names, any ratio; they are cropped by the organic frames). Until a file exists the
  frame shows a red organic placeholder with its label — nothing breaks.
- **Activity text** — each `<article class="act">` in `index.html` holds a `.tag`, `<h3>` and `<p>`.
- **Social links / email** — `.foot__social` in `index.html`.
- **Join links** — the buttons in `#join` point at `#`; swap in the real registration URL.
- **Branch copy** — `#branches`, three `<article class="bp">` blocks.

## Fonts
Latin is **Poppins** (Google Fonts). Arabic headline face is **NOOR**: put
`Noor-Bold.woff2` / `Noor-Regular.woff2` in `assets/fonts/` and the `@font-face`
rules at the top of `styles.css` pick them up automatically. Until then Tajawal
stands in — no other families are used.

## Palette (the whole system)
`#BF0036` red · `#191919` ink · `#FFFFFF` white · `#FF9AA6` pink · `#FF0040` bright red.
Defined once as CSS variables in `:root`. Do not extend.
