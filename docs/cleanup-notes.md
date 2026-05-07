# Cleanup Notes

This repository is a static Webflow export. The deployment root is the repository root, so the page folders and shared asset folders stay at the top level to preserve GitHub Pages and static-host compatibility.

## Production Structure

- `index.html` and route folders such as `contact/`, `projets/`, `blog/`, and `outreach/` contain deployable pages.
- `css/`, `js/`, `images/`, `media/`, and `fonts/` contain shared production assets referenced by the pages.
- `scripts/` contains maintenance tooling for local validation.
- `docs/` contains project notes and cleanup records.

## Cleanup Policy

- Remove OS metadata, cache files, and unused generated blobs.
- Keep Webflow-generated CSS and JavaScript unless reference validation and manual review prove they are unused.
- Keep responsive image variants when they appear in `srcset` attributes.
- Prefer clear names for newly organized assets, especially videos.
