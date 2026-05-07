# Sb Marketing Website

Static marketing website for Sb Marketing, exported from Webflow and maintained as deployable HTML/CSS/JS.

## Tech Stack

- Static HTML pages
- Webflow-generated CSS and JavaScript
- GSAP, ScrollTrigger, SplitText, MorphSVG, Swiper, and jQuery
- Static assets in `images/`, `media/`, and `fonts/`
- GitHub Pages/custom-domain friendly deployment via the repository root

## Installation

```bash
npm install
```

There are no external npm runtime dependencies. `npm install` creates the lockfile used for consistent maintenance scripts.

## Development

```bash
npm run dev
```

This starts a local static server at `http://localhost:5173`.

## Build / Validation

```bash
npm run build
```

The build command validates local asset references across HTML, CSS, JS, and XML files. This project does not compile into a separate `dist/` folder because the repository root is the deployable static site.

## Deployment Notes

- Keep `CNAME`, `robots.txt`, `sitemap.xml`, and the route folders at the repository root.
- Deploy the repository root as the public web root.
- Do not move `css/`, `js/`, `images/`, `media/`, or `fonts/` without updating every relative reference in the exported pages.

## Folder Structure

```text
.
├── index.html
├── contact/
├── projets/
├── blog/
├── outreach/
├── css/
├── js/
├── images/
│   └── Projects/
├── media/
├── fonts/
├── scripts/
├── docs/
├── CNAME
├── robots.txt
└── sitemap.xml
```

Route folders contain page-level `index.html` files. Shared production assets stay in the root-level asset folders to match the static export paths.
