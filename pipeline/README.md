# Blog publishing pipeline

Telegram bot + durable workflow that turns a Notion page into a published post on
jozefcipa.com. Built with [Workflow DevKit](https://useworkflow.dev) and
[grammY](https://grammy.dev), deployed as its own Vercel project rooted at
`pipeline/`. The bot is stateless — the workflow's durable review hook is the
only state, so there is no database or Redis.

## How it works

```
you (Telegram)          bot (this app)                    site repo / Vercel
─────────────           ─────────────────────────────     ──────────────────
send Notion link  ───▶  start publishArticle workflow
                        ├─ import page via Notion API → Markdown
                        ├─ download images → S3 (blog/<slug>/… + previews/)
                        ├─ generate summary + tags (Claude via OpenRouter)
                        ├─ generate cover image (locked outline style)
                        ├─ commit draft to branch  ──▶    draft/<slug> branch
                        ├─ wait for preview deploy ◀──    Vercel preview URL
   review message ◀──── └─ post cover + meta + preview link, then SUSPEND
"change the tags" ───▶  revise (LLM interprets) → recommit → new review
"publish"         ───▶  single clean commit to master ──▶ live on the site
                        └─ draft branch deleted (preview gone)
```

The workflow suspends at the review step — it can wait days for your reply at
zero cost. Replies are routed to the waiting run via a durable hook
(`review:<chatId>`). The hook token also acts as a per-chat mutex: a second
Notion link sent while a review is open is rejected immediately.

Front matter written for each post: `title`, `tags`, `date`, `slug`, `summary`,
`cover`, `draft: false`. Blur-up previews live at
`blog/<slug>/previews/<image>` by convention (width 100, blur 8 — same as the
old `.bin/image-preview.js`).

## Commands in Telegram

- **a Notion URL** — start the pipeline for that page (one review at a time)
- **publish / ship it / lgtm** — publish the draft under review
- **cancel** — discard the draft under review
- anything else during review — treated as a revision request
  (title/slug/tags/summary changes, "different cover image", "I updated the
  article in Notion" → re-import)

## Setup

1. `npm install`, copy `.env.example` → `.env.local` and fill it in:
   - **Telegram**: create a bot via [@BotFather](https://t.me/botfather); get
     your own user id from [@userinfobot](https://t.me/userinfobot).
   - **Notion**: create an internal integration at notion.so/my-integrations
     and **share your article pages with it** (page ⋯ menu → Connections).
   - **GitHub**: fine-grained PAT, this repo only, Contents read/write.
   - **AWS**: IAM user with `s3:PutObject` on `arn:aws:s3:::<bucket>/blog/*`.
   - **OpenRouter**: API key from openrouter.ai/settings/keys. The image
     model must support image output via chat completions (default:
     `google/gemini-2.5-flash-image`).
2. Create the Vercel project: root directory `pipeline`, framework Next.js.
   Add all env vars. In the **site** project settings, set an
   [ignored build step](https://vercel.com/docs/project-configuration/git-settings#ignored-build-step)
   so it skips commits that only touch `pipeline/`
   (e.g. `git diff --quiet HEAD^ HEAD -- ':!pipeline'`).
3. Point Telegram at the deployed webhook:

   ```sh
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -d "url=https://<pipeline-deployment>/api/telegram" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET_TOKEN>"
   ```

4. DM the bot a Notion link.

## Development

```sh
npm run dev        # Next.js dev server (workflow runtime included)
npm run typecheck
npx workflow web   # local dashboard of workflow runs
```

For local Telegram testing either use a tunnel (`vercel dev` + `ngrok`) and
point `setWebhook` at it, or temporarily switch the adapter to long-polling
mode (`createTelegramAdapter({ mode: 'polling' })`).

## Notes & known limitations

- **One review at a time** per Telegram chat (the hook token is derived from
  the chat id). Send `cancel` before starting another article.
- The preview URL is computed as
  `https://<SITE_VERCEL_PROJECT_NAME>-git-<branch>-<VERCEL_TEAM_SLUG>.vercel.app`;
  Vercel truncates hosts longer than 63 chars — keep article titles/slugs sane.
- On revision the branch URL keeps serving the previous deployment while the
  new one builds; the workflow sleeps 1 minute before re-polling, so
  double-check the preview if your site build is unusually slow.
- Re-sending a Notion link for an **already published** article works as an
  update: the original front-matter `date` is preserved.
- If a run fails, the bot sends a ❌ message with the reason and the run's
  review hook dies with it — just send the Notion link again. Any leftover
  draft branch is reused on retry; there is no external state to clean up.
