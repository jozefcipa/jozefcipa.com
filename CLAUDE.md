# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal website/blog (jozefcipa.com) built with Hugo and a heavily customized, vendored copy of the PaperMod theme. Deployed on Vercel (`vercel.json` redirects `blog.jozefcipa.com` → `/blog`).

## Commands

- `make run` — start the local dev server (`hugo serve`; requires Hugo ≥ 0.164, installed via Homebrew)
- There are no tests or linters.
- When upgrading Hugo, also bump `HUGO_VERSION` in the Vercel project settings.

## Architecture

### Content

- `content/blog/` contains **Markdown posts only** (the old Notion-export `.html` posts were migrated to Markdown in July 2026; see git history).
- Front matter: `title`, `tags`, `date`, `slug`, `draft` (the pipeline also writes `summary` and `cover`).
- Posts may use the theme shortcodes `columns` (side-by-side content, separated by `<--->`), `callout` (emoji note box), and `gist`, plus raw `<iframe>`/`<video>` HTML (goldmark `unsafe` is enabled).
- Code highlighting is build-time Chroma (highlight.js is disabled via `params.assets.disableHLJS`).
- `content/about.md`, `content/work.md`, `content/projects.md` are **empty placeholders** that only exist so the routes render. Their real content lives in theme partials (see below).
- Post images are hosted externally at `assets.jozefcipa.com`; a few older ones live in `content/blog/img/`.

### Theme (`themes/pixel/`)

Custom theme built July 2026 from a Lovable design (Blueprint blue scheme, light/dark via `data-mode` on `<html>`, pixel-art accents). Hand-written Go templates + vanilla CSS (`static/css/main.css`), no build tooling.

- Post covers are inline SVGs: `partials/post-cover.html` renders a named scene from `partials/covers/*.html` (front matter `cover: monitor|chip|lock|…`), an `<img>` when `cover` is a URL/map, or a deterministic pixel fallback.
- Work/projects/about pages: layouts `_default/{work,about,projects}.html` selected via `layout:` front matter; their data lives in `data/{work,projects,speaking}.yaml`; about prose is `content/about.md`.
- Tag filtering = links to taxonomy term pages (`_default/term.html`); the "+N more" pills and code-copy buttons use `static/js/main.js`.
- `themes/papermod/` is the old theme, kept for reference — delete once the redesign has shipped.

### Publishing pipeline (`pipeline/`)

Next.js app deployed as a **separate Vercel project** (root directory `pipeline/`). A Telegram bot (grammY) + durable workflow (Workflow DevKit) that imports a Notion page, converts it to Markdown, uploads images to S3, generates summary/tags/cover via OpenRouter (`@openrouter/sdk`), commits a `draft/<slug>` branch (Vercel preview = draft review), and on Telegram approval commits the post to `master`. See `pipeline/README.md` for setup and flow. It supersedes the legacy `.bin/` scripts below.

### Legacy Notion publishing scripts (`.bin/`)

Separate small Node project (`cd .bin && npm install`):

- `notion-processor.js <exported.html>` — converts a Notion HTML export into a blog post: strips the Notion header, decodes URLs, converts Google Maps links to iframes, removes injected Prism `<script>`/`<link>` tags, adds image lazy loading, and writes `content/blog/<slug>.html` with generated/merged front matter. **The article's `title`, `slug`, and `tags` are hardcoded constants near the bottom of the script** — edit them there before running.
- `image-preview.js <inputDir>` — generates small blurred preview images (for lazy loading) from a directory of images using sharp, output to `.bin/previews/`.

## Site config

`config.yaml` holds the menu, taxonomy (tags only), and PaperMod params. `public/` is generated output (gitignored).
