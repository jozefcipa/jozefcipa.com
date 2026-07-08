# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal website/blog (jozefcipa.com) built with Hugo and a heavily customized, vendored copy of the PaperMod theme. Deployed on Vercel (`vercel.json` redirects `blog.jozefcipa.com` → `/blog`).

## Commands

- `make run` — start the local dev server (`hugo serve`)
- Hugo **v0.91.x is required** (newer versions break the theme). A pinned `hugo` binary (v0.91.2) is committed at the repo root — use `./hugo serve` / `./hugo` if the globally installed version doesn't match.
- There are no tests or linters.

## Architecture

### Content

- `content/blog/` contains posts in two formats:
  - `.md` — regular Markdown posts.
  - `.html` — posts written in Notion, exported as HTML, and converted by `.bin/notion-processor.js`. The HTML body is kept verbatim (Notion markup, `id` attributes and all) below a YAML front matter block.
- Front matter: `title`, `tags`, `date`, `slug`, `draft`.
- `content/about.md`, `content/work.md`, `content/projects.md` are **empty placeholders** that only exist so the routes render. Their real content lives in theme partials (see below).
- Post images are hosted externally at `assets.jozefcipa.com`; a few older ones live in `content/blog/img/`.

### Theme (`themes/papermod/`)

The theme is committed directly (no git submodule) and customized — edit it in place:

- `layouts/_default/baseof.html` dispatches `/work/`, `/about/`, and `/projects/` to partials by URL: `partials/work.html`, `partials/about.html`, `partials/projects.html`. To update those pages, edit the partials, not the content files.
- `partials/homepage.html` renders the profile-mode home page.

### Notion publishing pipeline (`.bin/`)

Separate small Node project (`cd .bin && npm install`):

- `notion-processor.js <exported.html>` — converts a Notion HTML export into a blog post: strips the Notion header, decodes URLs, converts Google Maps links to iframes, removes injected Prism `<script>`/`<link>` tags, adds image lazy loading, and writes `content/blog/<slug>.html` with generated/merged front matter. **The article's `title`, `slug`, and `tags` are hardcoded constants near the bottom of the script** — edit them there before running.
- `image-preview.js <inputDir>` — generates small blurred preview images (for lazy loading) from a directory of images using sharp, output to `.bin/previews/`.

## Site config

`config.yaml` holds the menu, taxonomy (tags only), and PaperMod params. `public/` is generated output (gitignored).
