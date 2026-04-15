# Tourdubloc — Marketing Website Clone

A static clone of the [Tourdubloc](https://www.tourdubloc.com) marketing agency website. Tourdubloc is a French-Canadian agency offering rapid, predictable growth: content creation, lead generation, and prospect-to-appointment conversion.

## Project Structure

```
SBMarketing Clone/
├── index.html          # Main page (single-page site)
├── css/
│   └── tourdubloc-3e0b2f.shared.9a219fb46.css   # All styles
├── js/
│   ├── gsap.min.js                  # GSAP animation library
│   ├── ScrollTrigger.min.js         # GSAP ScrollTrigger plugin
│   ├── SplitText.min.js             # GSAP SplitText plugin
│   ├── MorphSVGPlugin.min.js        # GSAP MorphSVG plugin
│   ├── swiper-bundle.min.js         # Swiper slider
│   ├── jquery-3.5.1.min.dc5e7f18c8.js
│   └── tourdubloc-3e0b2f.*.js      # Webflow-generated scripts
├── images/             # Static images and WebP assets
├── media/              # Video assets (MP4/WebM)
└── fonts/              # Web fonts
```

## Tech Stack

- **Framework**: Webflow (exported static HTML)
- **Animations**: GSAP (ScrollTrigger, SplitText, MorphSVG)
- **Slider**: Swiper.js
- **Analytics**: Google Tag Manager, Meta Pixel, Hotjar
- **Language**: French (fr-CA)

## Brand Colors

| Token | Hex |
|-------|-----|
| Primary / Black | `#041020` |

## Usage

Open `index.html` directly in a browser. No build step required — this is a fully self-contained static export.

> **Note:** Some dynamic content (CMS items, form submissions) requires the original Webflow backend to function.
