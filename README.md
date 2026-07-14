# jozefcipa.com

Personal website and blog, built with [Hugo](https://gohugo.io) and deployed on
[Vercel](https://vercel.com). Articles are written in Notion and published
through a Telegram-driven pipeline (see `pipeline/`).

## The 2026 upgrade — what changed

Notes from the big summer 2026 revamp.

### New design — custom "pixel" theme

- **Designed in Lovable, hand-built as a Hugo theme** (`themes/pixel/`) — the
  React/Tailwind prototype was treated as a mockup only; the final theme is
  plain Go templates + one vanilla CSS file, no build tooling, no JS framework.
- **Blueprint color scheme**: three primitives per mode (background, ink,
  cobalt-blue accent `#1565C0`), everything else derived via `color-mix`.
  Light/dark mode with a manual toggle, system preference as default, applied
  before first paint so there's no flash.
- **Pixel-art accents**: 8-bit sprites rendered from ASCII-art strings by a
  tiny Hugo partial, stepped link-underline hover, hard-edged "pixel" card
  shadows, a glitching pixel 404 page, and a pixel "JC" favicon generated
  from a 16×16 SVG grid.
- **Typography-first**: Inter for text, Chakra Petch for the hero, JetBrains
  Mono for all meta (dates, tags, nav) — the mono font is part of the identity.
- Old PaperMod-based theme fully retired; work/about/projects content moved
  out of theme partials into `data/*.yaml` + `content/about.md`.

### Blog page revamp

- **Tile grid** (3 per row, responsive to 2/1) with cover image, date, reading
  time, summary, and tag pills on every card.
- **Tag map**: pills sorted by post count with counts shown, top 12 visible,
  the long tail behind a "+N more" expander. Filtering = plain links to Hugo
  taxonomy term pages styled identically to the blog page.
- Posts without a cover get a **deterministic pixel-pattern fallback** —
  seeded by hashing the post title, so each post's pattern is unique and
  stable across builds, and recolors with the theme.

### Content migration

- All **25 Notion-HTML posts converted to clean Markdown** with a one-off
  jsdom + turndown script (verified 1:1 image and code-block parity).
  One content format for the whole archive now.
- Notion-specific markup became Hugo shortcodes: `columns` (side-by-side
  images), `callout` (emoji note box), plus raw `<iframe>`/`<video>` embeds.
- **Hugo upgraded 0.91.2 → 0.164.0** (config + removed-API migrations), code
  highlighting moved from runtime highlight.js to build-time Chroma, and all
  bare ``` code fences got proper language tags.

### Publishing pipeline (`pipeline/`)

- **Write in Notion → text a Telegram bot → article goes live.** A Next.js
  app on Vercel: grammY handles Telegram, Vercel Workflow DevKit provides a
  durable workflow that can suspend for days while waiting for review.

```
📝 Notion article ──link──▶ Telegram bot
                                │
                                ▼
                     import page → Markdown
                                │
                                ▼
                  mirror images to S3 (+ previews)
                                │
                                ▼
                   AI: summary, tags, cover ◀────────────┐
                                │                        │
                                ▼                        │
                     commit to blog-draft                │
                                │                        │
                                ▼                        │
              preview @ blog-draft.jozefcipa.com         │
                                │                        │
                                ▼                        │
                      review in Telegram ──feedback──────┘
                          │           │    (edit meta, new cover, …)
                      "publish"   "cancel"
                          │           │
                          ▼           ▼
             🎉 commit to main    🗑 draft discarded
              → live on the site
```

- **Stateless by design**: the workflow's durable review hook doubles as a
  per-chat mutex — no database, no Redis. Failures send a ❌ Telegram message
  with the reason; retrying = resending the link.
- LLM access via OpenRouter (`@openrouter/sdk`): Claude for text,
  Gemini 2.5 Flash Image for covers.

### Generated summaries & covers

- **Summaries**: high-level 3–4 sentences per post for the card grid and
  meta descriptions — same prompt/voice for new posts and the back catalog.
- **Covers**: monochromatic "engineering sketch" illustrations — thin gray
  outlines on white with exactly one cobalt-blue accent, max 5 objects,
  strictly no text. The image model gets **few-shot example images** (five of
  the theme's original SVG cover scenes rendered to PNG) attached to every
  request to lock the style.
- A **backfill script** (`pipeline/scripts/backfill-covers.mts`) runs the
  same steps over the entire back catalog: fills in missing summaries and
  covers and syncs blur-up previews to S3. Idempotent, dry-runnable,
  resumable per slug.

### Lazy-loaded images (blur-up)

- Every S3-hosted image has a pre-blurred ~100px twin at
  `…/previews/<file>`; the page ships the preview as the `src` and swaps in
  the full image via IntersectionObserver just before it scrolls into view.
- Native `loading="lazy"` everywhere, an extra CSS blur that clears with a
  stepped transition on load, and graceful fallbacks (missing preview → full
  image, no IntersectionObserver → immediate swap).

### Draft previews & protection

- Drafts live on a fixed **`blog-draft` branch**; Vercel builds it as a
  preview deployment served at **blog-draft.jozefcipa.com** — the pipeline
  never runs Hugo itself, publishing is purely git.
- The draft subdomain is locked down with **Vercel Deployment Protection
  (Vercel Authentication)** — only my Vercel account can open it. The
  pipeline's preview poller authenticates via the Protection Bypass for
  Automation secret (`x-vercel-protection-bypass` header).

### Odds and ends

- Proper social sharing meta: post covers become `og:image` /
  `twitter:image` with `summary_large_image` cards, per-post descriptions
  from the generated summaries.
- CSS/JS served fingerprinted through Hugo pipes (content-hashed URLs, no
  stale caches).
- Two Vercel projects from one repo: the Hugo site (root) and the pipeline
  (`pipeline/`), each with its own build settings.

## Development

- `make run` — local dev server (requires Hugo ≥ 0.164)
- `pipeline/README.md` — pipeline setup, Telegram commands, and deployment
