# Jozef's Writing Style Guide

Distilled from the 10 most recent articles on jozefcipa.com/blog (2025–2026):
iMac-to-monitor conversion, USB HID device with Pi Pico & TinyGo, iPod Classic upgrade,
Nordkapp motorcycle journey, EDC collection, Raspberry Pi OS backups, Lua scripting in Go,
HomeKit thermostat, GitHub stars via Telegram, Upptime monitoring.

This file is the source of truth for voice, tone, and structure. Consult it before writing
any section of an article, and re-check drafts against it.

**This is a living document.** The write-article skill keeps refining it: insights from
brainstorming sessions, draft corrections, and post-article retrospectives get folded into
the relevant sections below (see "Reflective learning" in SKILL.md). The author's latest
signals override older lines.

## Who is writing

Jozef is a software engineer who tinkers. He builds things to learn something new and to
have fun, not to show off. He mods hardware (iPods, iMacs, thermostats), runs a homelab,
rides a motorcycle across countries, loves the Apple ecosystem and compact gadgets, and
prefers cheap DIY solutions over expensive products. Almost every project starts with
curiosity ("I was always intrigued…") or a small personal itch ("I wanted X for a long
time, but it was too expensive").

## Topics and interests

- DIY hardware & electronics: ESP32, Raspberry Pi (Zero/Pico), soldering, 3D-printed parts, device mods
- Retro tech revival: iPod Classic, old iMacs, nostalgia + making old gadgets useful today
- Programming: Go (and TinyGo), Lua, TypeScript/Deno, C on embedded, serverless (Cloudflare Workers)
- Homelab, automation, self-hosted tools, small personal utilities
- Apple ecosystem: HomeKit, AirTags, AirPods, Find My, iPhone
- Gadgets & EDC gear
- Motorcycle travel and road trips (journal-style posts)

## Article types

1. **Project write-up** (most common) — narrative of building/modding something.
   Origin story → research → the idea/parts → steps or components → conclusion with lessons learned.
2. **Tutorial / how-to** — a concrete problem solved with commands and code, written so the
   reader can follow along ("How to do Raspberry Pi OS backups").
3. **Short discovery / TIL** — found a cool tool, quick setup notes, why it's useful ("Monitoring your website with Upptime").
4. **Travel journal** — day-by-day entries with distances, costs, small mishaps, and feelings.
5. **Gear roundup** — item-by-item list with a personal verdict on each ("My EDC collection").

## Voice and tone

- **First person, conversational, honest.** Writes like telling a friend about a project over a beer.
- **Curiosity-driven framing.** The "why" is always personal: a dream, an itch, an idea that
  wouldn't let go. "And on top of that, as always, there has to be something new that I could learn about."
- **Self-deprecating humor**, lightly sprinkled: "many mental breakdowns while trying to make
  things work :)", "I can't help but check the repo at least once a day 😅",
  "Great start to the trip 😅."
- **Honest about problems and downsides.** Every project admits what went wrong or what's
  imperfect: the pinkish display edges, Nordkapp being a touristy rip-off, Denoflare being
  "a bit of a pain in the ass to work with", the Zippo being impractical. Never a flawless
  success story — this honesty is a core part of the voice.
- **Occasionally blunt/informal**: "pain in the ass", "what a rip-off", "quite shitty" (rare, but it happens).
- **Gives credit generously.** Links to the videos, articles, gists, and people that helped
  ("the one made by Quinn Nelson from Snazzy Labs was by far the best", "thanks to @dideler for this awesome Github gist").
- **Enthusiastic but grounded.** Excitement shows through small exclamations ("Neat!",
  "This one is really cool!", "This is great!") — never through marketing superlatives.
- **Reflective endings.** Conclusions zoom out: what was learned, whether it was worth it,
  what's next. Often a warm, simple closing sentence: "Anyway, it was a cool project, I
  enjoyed the process, and now I finally have the classic 27" iMac sitting on my desk."

## Language and mechanics

- Simple, direct vocabulary. Short-to-medium sentences. Paragraphs of 2–5 sentences.
- Contractions always ("didn't", "it's", "I'd").
- Frequent sentence starters: "So", "Also", "Luckily", "Unfortunately", "Turns out",
  "Obviously", "After that", "Next", "On top of that", "Honestly", "To be honest".
- Em dashes for asides — like this — and for tacked-on explanations.
- Intensifiers: "super" ("super easy", "super happy"), "really", "pretty", "fairly",
  "quite a challenge", "surprisingly".
- Rhetorical questions appear in his titles/openers ("Why would anyone buy an iPod in 2025?")
  but use them **sparingly** — at most one per article. He prefers straight-to-the-point
  statements over a rhetorical question as a setup (explicit correction, July 2026).
- Direct reader address: "you", "if you're planning a similar build", "Hopefully, you'll
  find something inspiring here."
- Pronoun switching: "I" for the narrative and decisions, "we" when walking the reader
  through code or steps ("First we need to locate our memory card").
- **Emoji, sparingly**: 😅 is the signature (self-irony), plus 🎉 (success), 🙃 😏 😀 😢 💯 😆 🤯
  and ASCII ":)". Roughly one emoji every few paragraphs in casual posts; near zero in
  dense technical explainer sections; more in travel journals. Never more than one per sentence.
- Prices in euros with the € sign ("for 40€", "~76€", "€1.40 vs €1.70").
- Minor imperfection is authentic. Don't over-polish into sterile, uniform prose.

## Structure conventions

- **Openings**: 1–3 paragraphs of personal backstory *before any technical content*.
  How the idea was born, why it mattered, what the itch was. Often ends with a scope
  sentence: "In this post I'll do a quick breakdown of how the whole project went."
- **Explainer section early on** when a niche technology is central: "What is USB HID?",
  "What is Lua?" — teaches the background in plain words. Analogies compare tech to tech
  ("something between Arduino and Raspberry Pi", "works similarly to ngrok"); avoid cute
  real-world metaphors ("both sides show their ID at the door" was explicitly rejected).
- **Headings are plain and functional**: "The idea", "Step 1: Opening the iMac", "Firmware",
  "Wrapping up", "Conclusion", "Final thoughts". No clever/clickbait headings, no colons-with-taglines.
- **Steps or components** as the body: either numbered steps (Step 1…5) or one section per
  component/concern (HomeKit / Measuring temperature / LCD / WiFi provisioning).
- **Parts list with prices** for hardware projects.
- **Travel journals**: "Day N - Title" sections, each ending with
  "Today's leg - A → B (NNNkm)".
- **Code**: shell commands prefixed with `$`, expected output shown, small complete
  snippets with inline comments, prose explanation *before* the code block. Longer
  flows get a "a simplified version looks like this" snippet rather than a full dump.
  JS/TS examples use single quotes and no semicolons.
- **Images/diagrams** appear after the paragraph that references them.
- **Endings**: many posts close with a link to the code ("you can find everything on
  Github"), a takeaway, or an invitation ("if you've got any favorite pocket gear of your
  own, I'd love to hear about it!").

## Recurring narrative beats (use as checklist)

1. Personal origin story — the itch, dream, or accident that started it
2. Research phase — "I read a couple of articles and watched some videos…", crediting sources
3. "The idea" / "So what are we building?" — goals and constraints stated plainly
4. An honest hard part — "This was definitely the scariest part", "a lot of head-scratching"
5. The moment of truth — did it work? ("Thankfully, the display turned on and everything worked surprisingly well on the first try.")
6. Honest limitations/disclaimers — what's still imperfect, what to watch out for
7. Reflective wrap-up — lessons learned, was it worth it, link to code/repo

## Don'ts

- No corporate or marketing tone; no buzzwords ("leverage synergies", "game-changer",
  "seamless experience", "robust solution").
- No AI-flavored prose: avoid "delve", "dive into", "In conclusion", "It's worth noting
  that", "Furthermore/Moreover" chains, rule-of-three sentence patterns, or bolded
  keyword-listicles in place of prose.
- No exaggerated hype — excitement is small and genuine, not breathless.
- No long walls of text; no deeply nested bullet hierarchies. Prose first, bullets only
  for genuine lists (parts, alternatives, options).
- Don't hide failures or gloss over rough edges — the honesty is the brand.
- Don't invent facts, experiences, feelings, prices, or opinions the author didn't provide.
- Don't overuse the emoji or the verbal tics listed above — one 😅 lands; five per section
  reads as parody.
- No silly metaphors or personification when explaining technical concepts — explain
  directly, in plain technical words. No rhetorical-question scaffolding ("And who decides
  X? You do.") — just state it.

## Front matter (Hugo)

```yaml
---
title: <Sentence case, plain and descriptive, may include prices/numbers>
tags:
  - <existing tags preferred>
date: '<ISO 8601>'
slug: <kebab-case-of-title>
draft: true
---
```

Known tag vocabulary: apple, imac, monitor, diy, raspberry-pi, golang, gadgets, travelling,
roadtrip, motorcycle, homelab, scripting, lua, C, homekit, iot, esp32, LVGL, api, frontend,
today-i-learned, cloudflare-workers, deno, github, telegram. Check
`grep -h 'tags:' -A5 content/blog/*.{md,html}` before inventing a new tag.
