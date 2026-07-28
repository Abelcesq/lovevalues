# Skill — Design system

What the interface looks like, why, and the traps already paid for.

## The brief that produced this

The CEO rejected the first design outright, and the reason is worth keeping:

> "It looks similar to the abelcalderon.com home page and thedotx.com home
> page. **All the 'claude' sites look the same.**"

He was right. All three were dark navy, gold accent, centred column, large
serif headline with one italic accent word. That is the current default house
style of AI-built sites, and Love Values had been built straight into it.

Two references were supplied, and they pull in different directions. Both are
honoured, in different places:

1. **Aurora** (NowTrendin's `frontend/DESIGN_SYSTEM.md`) — for *component
   consistency across the CEO's portfolio*. Type discipline, borderless cards,
   semantic tokens, "don't make me think."
2. **vidaselect.com/billionaire-matchmaker** — for *the home page format*:
   "notice how it is NOT a panel website, the UI flows normally on the scroll
   down."
3. **A JoinMyNet mobile flow mockup** — for *user flows*: a welcome screen that
   offers two clear paths, and a dashboard that shows where you are.

## The rules

### Tokens, never hex

Everything lives in the `@theme` block at the top of `app/globals.css`.
A component that writes a raw hex has broken the system. **Never reintroduce
`--night`, `--ivory`, `--gold`, or `--rose`** — those were the rejected
palette, and stale `var(--gold)` references outliving the redesign is exactly
how a palette half-reverts.

| Token | Use |
|---|---|
| `--color-page` / `--color-page-2` | The tinted wash on `<body>`. The page, everywhere |
| `--color-canvas` `#ffffff` | White surfaces that sit ON something — ghost pills, social buttons |
| `--color-card` `#ffffff` | Card surfaces **inside the app only** |
| `--color-inset` | Wells and chips **inside** a white card |
| `--color-ink` `#0a0a12` | Headings, emphasis |
| `--color-secondary` `#3f4155` | Body copy |
| `--color-muted` `#83849a` | Labels, counts, fine print |
| `--color-brand` `#4f46e5` | The one accent. Links, CTAs, active state |
| `--color-brand-soft` `#eef0ff` | Tinted informational blocks |
| `--color-accent` `#ff5c38` | **Duty of care only.** Nothing else. |

The accent restriction is load-bearing. If coral starts appearing on marketing
copy, the care prompt stops reading as different from the rest of the page.

### One type family

Plus Jakarta Sans, self-hosted through `next/font`. The same family NowTrendin
uses — that is the portfolio consistency the CEO asked for. **The palette is
what distinguishes Love Values, not a second typeface.** Do not pair a serif in.

Type scale is fixed: 12 / 14 / 16 / 18 / 22 / 28 / 32 / 44. The landing page
gets display sizes above 44 for its opening line and nothing else.

### The home page is not a panel page

`/` is a long-form editorial article. One column, one canvas, `h2` sections
that flow straight into each other. **No section is wrapped in a card, a
border, or a filled block.** Separation is whitespace first, a hairline second.

The single exception is `.cta-inline` — a rounded white card dropped *between*
sections. It interrupts the flow; it never contains it. VIDA does the same
thing and it is the reason their page still reads as an article. (It was dark
ink until 2026-07-27; the CEO asked for white once the page background became a
tinted wash, and he was right — a near-black slab on a soft lavender page reads
as a hole rather than a pause.)

A sticky table of contents (`components/Toc.tsx`) maps the page on desktop and
is hidden below 1040px, where it would eat the screen.

**Cards are correct inside the app** — `/journey`, `/review`, `/profile`,
`/support` — because those are forms: discrete, repeated, tappable things.
Aurora's borderless rule applies there in full.

### Hover stays, motion goes

Aurora forbids `:hover` because it is a touch-only app. This is a website
people meet on a laptop, so hover affordances stay — as colour changes only.
Nothing that makes the page jump.

## Gotchas already paid for

1. **Tailwind preflight sets `svg { display: block }.`** Any Lucide icon meant
   to sit inside a line of text drops onto its own line unless you explicitly
   set `display: inline-block`. Icons inside flex containers (buttons, list
   items) are unaffected — which is why this only bites on headings and prose.

2. **`.btn-ghost` must not be filled with `--color-card`.** Ghost buttons sit on
   the canvas in some places and on a card in others; a card-coloured fill makes
   them invisible on the second. They are white with an inset ring instead. This
   was a real regression on `/review`, where every "Answer this" button
   disappeared into the card behind it.

3. **"Talk to someone" must survive the mobile breakpoint.** The nav collapses
   its secondary links below 980px. The care link is excluded from that with
   `.nav-actions .login:not(.care-link)`. Hard rule 5 says support is always one
   click away — a media query is not an exemption.

4. **Entry flow: never show a first-timer a "continue" button.** There are no
   accounts, so "returning" is whatever `localStorage` holds. `BeginCta` and
   `ResumeNotice` both render the first-visit state on the server and swap after
   hydration — otherwise React throws a mismatch and the user sees the wrong CTA
   flash. Do not "simplify" this by reading `localStorage` during render.

5. **Google Fonts is fetched at build time.** `next/font` self-hosts, so there is
   no runtime request — but the *build* needs network access to fonts.googleapis.com.
   A hosting environment that blocks it will fail the build, not degrade.


## The background is a wash, not a glow (2026-07-27)

The splash originally carried a radial gradient pooled in the top-right corner.
The CEO rejected it against vidaselect.com, which carries a constant cream
across the entire page: *"use the second image as a background shade rather
than the corner… apply it to the entire background."*

So the gradient now lives on `<body>` and covers the whole document. Three
things about it that were arrived at the hard way:

1. **No `background-attachment: fixed`.** Fixed anchors the gradient to the
   viewport, so content scrolls past a stationary tint and the bottom of every
   screen is permanently the pale end. Letting it span the document gives one
   continuous tone from nav to footer.

2. **Both stops must be tinted.** A first pass faded to near-white and the
   bottom two-thirds of every page went colourless — which is exactly the
   "glow that runs out" the brief was replacing. `#e7e4f9 → #f2f0fd`.

3. **Cards went white, and that is a consequence, not a preference.** On a
   tinted page a grey card reads as a hole punched in the surface. White reads
   as a card lifted off it. That forced a third token: chips and wells *inside*
   a white card can no longer be white, so they use `--color-inset`.

   The layering is now consistent everywhere and worth stating as a rule:
   **tinted page → white card → tinted inset.**

Do not reintroduce a per-section glow on top of the wash. Two gradients read as
a smudge.
