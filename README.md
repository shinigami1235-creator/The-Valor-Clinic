# Valor Clinic website

English rebuild of thevalorclinic.com for Valor Clinic, Iyara Tower, Sathorn, Bangkok. A Thai version comes next.

Live preview: https://shinigami1235-creator.github.io/the-valor-clinic/

## Pages
- `index.html`: 3D skin hero (28 days or 4), Look Beyond Your Skin body map, services, psoriasis Q&A videos, testimonials, Google reviews, team, videos, social links, contact
- `skin.html`, `metabolic-care.html`, `about.html`, `videos.html`, `contact.html`

## Where the content came from
- Text: the current English and Thai pages of thevalorclinic.com, translated from Thai where only Thai exists
- Videos: the clinic's YouTube channel (@thevalorclinic) and TikTok (@valorclinic)
- Reviews: the clinic's Google Business profile, 4.9 from 18 reviews (Nov 2026)
- All video data, Q&A answers and reviews live in `js/data.js`

## Editing
Page bodies are in `tools/pages/`. Shared header, footer and icons are in `tools/partials.py`. After editing, run:

    python3 tools/build.py

That rewrites the six HTML files in the root folder.

## Stack
Static HTML, CSS and JavaScript on GitHub Pages. three.js 0.170 and GSAP 3 are in `vendor/`, the Prompt font in `fonts/`.
