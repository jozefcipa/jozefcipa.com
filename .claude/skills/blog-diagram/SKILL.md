---
name: blog-diagram
description: Generate a diagram image for a blog article from a text description, using OpenRouter and the Gemini Flash image model, in the site's engineering-sketch style (white background, gray line work, single #1565C0 blue accent). Use when the author asks for a diagram, architecture drawing, or flow illustration for an article. Saves images to ./tmp for manual upload to Notion.
---

# Generate a blog diagram

You are generating a **diagram** for a jozefcipa.com blog article. Diagrams share the
visual language of the pipeline's AI-generated covers (`pipeline/steps/images.ts`) —
a minimal engineering sketch in grays with one cobalt-blue accent, matching the site
theme (`--accent: #1565C0`) — but with two differences:

- **More objects are allowed.** A cover is capped at ~5 objects; a diagram may use as
  many boxes, devices, arrows and connections as it needs to be clear.
- **Short labels are allowed.** Covers are strictly wordless; diagrams may carry
  one-or-two-word labels where they genuinely help. Never sentences, titles or captions.

## Workflow

1. **Write an explicit scene description.** The model draws what's described — vague
   descriptions produce vague diagrams. Turn the author's request into a description
   that spells out:
   - every object in the scene (e.g. "a laptop, a phone, a small server box, a
     Raspberry Pi board")
   - the connections/arrows between them and their direction
   - which element(s) get the blue accent — pick the one thing the diagram is *about*
   - the exact labels to render, each 1–2 words (e.g. labels: "Traefik", "tailnet",
     "Caddy") — fewer is better, and the model spells them exactly as given
2. **Run the generator script** (from the repo root):

   ```sh
   $ node .claude/skills/blog-diagram/generate-diagram.ts "<description>" --name <short-slug>
   ```

   It prints the output file path, e.g. `tmp/bastion-architecture-1752566400000.png`.
3. **Show the result to the author and stop.** Mention the file path (they upload
   images to Notion manually). Read the generated image yourself and point out any
   defects you notice (misspelled labels, style drift, wrong arrows) — but do NOT
   regenerate on your own judgment. One generation per turn, then wait for the
   author's verdict.
4. **Iterate only on the author's feedback.** When the author rejects a version,
   re-run with the *same description* and the *same `--name`* plus
   `--feedback "<the author's words>"` — the script then attaches the latest
   generated image for that name, so the model edits the previous attempt instead
   of drawing a new one from scratch. Refine the description itself when the
   author says the scene (not the style) is wrong. Then show the new version and
   stop again.

## Script notes

- `--name <slug>` controls the file name prefix; otherwise it's derived from the
  description. Output always goes to `./tmp/` (gitignored).
- `--no-examples` skips attaching the cover style examples
  (`pipeline/lib/cover-examples.ts`) — try it if the examples' sparseness bleeds into
  a diagram that needs to be dense.
- Every image gets a small gray `jozefcipa.com` watermark in the bottom-right corner,
  drawn programmatically with sharp (from `pipeline/node_modules`) after generation —
  it's never part of the AI prompt. Skip it with `--no-watermark`.
- `--feedback` sends the latest image for the given `--name` back to the model as an
  edit base (pre-watermark originals are kept in `tmp/.raw/` for this), so iteration
  refines the previous attempt instead of rolling a fresh composition. Always reuse
  the same `--name` across iterations of one diagram.
- The API key is read from `OPENROUTER_API_KEY`, falling back to `pipeline/.env`.
  The model defaults to `google/gemini-2.5-flash-image` (override with `IMAGE_MODEL`).
- The style contract lives in the prompt inside `generate-diagram.ts` — keep it in
  sync with the cover prompt in `pipeline/steps/images.ts` if the theme changes.
