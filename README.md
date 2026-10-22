# Pulse Theory: fitness coach landing page

A conversion-focused landing page for **Pulse Theory**, a *fictional* online strength and performance coaching brand. The goal of the page is to get visitors to book a free consultation.

Built with **Bootstrap 5.3 customized through Sass** and **vanilla JavaScript**, with a hand-written build (no framework, no bundler config) that keeps the CSS and JS small.

> **Demo project.** Pulse Theory and "Coach Mateo Ríos" do not exist. Testimonials are labeled as samples, the booking form sends no data, and the WhatsApp number is a fictional 555 number.

- **Live:** https://pulse.renzzogg.com (once deployed)
- **Author:** Renzzo Gracia Gomez · [renzzogg.com](https://renzzogg.com)

## Highlights

**Bootstrap, customized at the source**
- Brand tokens (palette, typography, radii, spacing, focus ring) set as Sass variables *before* Bootstrap's own, so every component, utility and `--bs-*` CSS variable inherits them.
- Only the modules the page uses are imported (down to individual `forms/*` submodules). Unused theme colors, utility families and responsive variants are trimmed through the Utility API, and the unused "valid" form state is removed.
- Dark mode through Bootstrap 5.3's official `data-bs-theme="dark"` and the `*-dark` variables, not by overriding components.
- The only Bootstrap JavaScript is the Collapse plugin (navbar and FAQ accordion), imported from Bootstrap's ES module source so the bundle can be tree-shaken.

**Interactions in vanilla JS (14.3 KB minified in total, Collapse included)**
- Monthly/annual pricing toggle: JS only flips one `data-*` attribute; CSS keyframes animate the price swap, staggered per card.
- Booking form validated with the native Constraint Validation API and Bootstrap's validation styles: inline errors, focus on the first error, and messages linked with `aria-describedby`.
- Scroll reveal with `IntersectionObserver`, plus a CSS failsafe so content never stays hidden if the script fails to load.
- Every animation respects `prefers-reduced-motion`.

**Performance**
- CSS 122.6 KB minified / **19.3 KB gzip**, compared with 231.8 KB / 30.9 KB for the full Bootstrap build.
- Responsive images (AVIF, WebP and JPEG at 480/800/1200 px). A phone downloads 39 KB of images instead of 237 KB (−83%).
- Self-hosted fonts (WOFF2, Latin subset, `font-display: swap`, critical files preloaded). No third-party requests.
- Content-hashed filenames (e.g. `main.50aa78f3.css`) for safe long-term caching behind a CDN.

**Accessibility**
- WCAG AA contrast checked for every color pair, visible focus states, a skip link and keyboard-operable menu, accordion, switch and form (Esc closes the mobile menu).
- Semantic landmarks, one `h1` and an ordered heading hierarchy, and labels on every field.

**Quality checks without a browser**
- `npm run verify`: [html-validate](https://html-validate.org/) plus a project audit of the production build (anchors and ARIA references, landmarks, image attributes, meta/Open Graph tags and broken asset references).
- `npm run check`: every class used in the HTML must exist in the compiled CSS, which catches utilities that were trimmed by mistake.

## Tech stack

| | |
|---|---|
| UI | Bootstrap 5.3.8 (Sass source), custom SCSS |
| JavaScript | Vanilla ES modules, bundled with esbuild |
| CSS build | Dart Sass, PostCSS + Autoprefixer |
| Images | sharp (responsive variants, icons, Open Graph image) |
| Fonts | Space Grotesk and DM Sans via Fontsource, self-hosted |
| Validation | html-validate, plus custom Node scripts |

## Getting started

Requires Node.js 22.22+ or 24.8+ (see `engines` in `package.json`).

```bash
npm install
npm run dev       # development server with watch → http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the production build → http://localhost:4173
```

| Script | What it does |
|---|---|
| `npm run build` | Copies static files and fonts, generates images and icons, compiles and minifies CSS and JS, and adds content hashes |
| `npm run verify` | Validates `dist/index.html` and audits the production build |
| `npm run check` | Fails if an HTML class has no matching CSS rule |
| `npm run size` | Prints CSS and JS size, minified and gzipped |
| `npm run og` | Regenerates the 1200×630 Open Graph image |

The canonical domain is read from `SITE_URL` (default `https://pulse.renzzogg.com`):

```bash
SITE_URL=https://example.com npm run build
```

## Project structure

```
src/
  index.html            page markup (asset paths without hashes)
  scss/                 _variables.scss (tokens) → selective Bootstrap imports → components/
  js/                   main.js + one module per feature
  img/                  source photos
  static/               favicon, OG image, manifest, robots.txt
scripts/                build, dev server, images, OG image, hashing, checks
docs/DESIGN.md          design decisions and phase plan (Spanish)
docs/CREDITS.md         photo and icon credits
```

## Credits

- Photos from [Pexels](https://www.pexels.com/license/) by Dishant Babariya and Andres Ayrton. Only shots without identifiable people are used, so nobody appears to endorse the fictional brand. Details are in [docs/CREDITS.md](docs/CREDITS.md).
- WhatsApp icon from [Simple Icons](https://simpleicons.org/) (CC0).
- Fonts: Space Grotesk and DM Sans (SIL Open Font License), via Fontsource.
