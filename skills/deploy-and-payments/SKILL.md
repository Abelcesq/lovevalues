# SKILL — Deploy & Payments

**Purpose.** Get Love Values in front of strangers, and — later, separately —
take money. The CEO has chosen **Heroku** for hosting and the **existing Stripe
account**, so this skill records how that works here and carries forward the
gotchas already paid for in EZAITASK.

## The sequencing, and why it is not negotiable

**Deploy first. Payments second. They are separate decisions and separate
weeks.**

Deploying needs nothing new: the app is local-first, so a stranger can complete
the entire journey with no account, no database, and nothing of theirs on our
server. That unblocks the only thing that currently matters — *not tested on a
single stranger*.

Payments are different, because **payment implies accounts, and accounts imply
storing this data category on a server.** That is the point where the product
starts holding people's psyche-level answers, and it should not happen on the
same afternoon as a Stripe key. Hormozi's own rule applies literally here:
prove the offer before scaling it. A paywall in front of an unvalidated method
buys faster proof it wasn't ready.

So: ship it, watch 10–25 people use it, *then* decide accounts.

---

## Deploying (no accounts, no database)

The repo carries a `Procfile` and pins Node via `engines`. The Node buildpack
runs `npm run build` automatically; there is no release phase because there is
nothing to migrate yet.

```bash
heroku create lovevalues            # separate app from mytaskapp
heroku config:set ANTHROPIC_API_KEY=sk-ant-... -a lovevalues
git push heroku claude/new-app-voice-input-0q1w0a:main
```

**Gotchas specific to this app:**

1. **HTTPS is not optional — it is the feature.** The Web Speech API requires a
   secure context, so the microphone does not exist over plain HTTP. Heroku
   gives HTTPS by default; just never let anyone test over an `http://` link.
2. **Eco dynos sleep.** A cold start on a first impression is a bad trade for a
   product asking strangers to be vulnerable. Basic dyno, or accept the delay
   knowingly.
3. **`ANTHROPIC_API_KEY` is server-side only.** It is read in
   `app/api/synthesize/route.ts` and must never be exposed to the browser. Do
   not prefix it `NEXT_PUBLIC_`.
4. **Memory is fine.** EZAITASK needed careful gunicorn tuning (1 worker, 4
   threads, `--preload`) to stay under the 512MB Eco limit. Next.js in
   production sits well below it — do not copy that tuning across.

---

## When payments land — gotchas already paid for

These come from EZAITASK's production experience. Each cost real debugging
time there and applies here.

### The one that will definitely bite

**The Stripe webhook URL must use `www.`** GoDaddy forwards the apex domain to
`www` by converting POST → GET, which makes a `@require_POST` webhook return
405 and Stripe silently retry into the void. `lovevalues.com` is registered the
same way, so the endpoint must be
`https://www.lovevalues.com/api/stripe/webhook`, never the apex.

### Stripe API and SDK

- **`current_period_end` moved.** API version `2026-04-22.dahlia` relocated it
  from the Subscription root to `subscription.items[0]`. Read from
  `items[0].current_period_end` with a fallback to the top level. This is a
  server-side API change, so it applies regardless of SDK language.
- **Stripe SDK v15 broke `.get()` on StripeObject** (`__getattr__` is
  overridden). EZAITASK re-parses the verified payload with `json.loads()` to
  get a plain dict. The Node SDK does not share this bug, but the lesson does:
  after `constructEvent` verifies the signature, treat the payload as data, not
  as a live SDK object.
- **Live mode rejects test cards.** `4242 4242 4242 4242` will fail against a
  live key. Keep a test-mode key for development.

### Account structure

The **same Stripe account** is correct — no reason to open a second one. But
Love Values needs its **own Products and Prices**, distinct from EZAITASK's
Lite/Pro:

| Item | Price |
|---|---|
| Values profile | $29.99 one-time |
| Living profile + match analysis | $9.99 / month, first 7 days waived |
| Match compatibility analysis | $9.99 per user |

Put these constants in **one file** and import them everywhere — templates,
checkout, webhook. EZAITASK does this in `accounts/pricing.py` and it is the
right pattern; a price that lives in two places will disagree in production.

**Separate webhook endpoints per app.** One Stripe account can serve both, but
each needs its own endpoint and its own `STRIPE_WEBHOOK_SECRET`. Do not reuse
`mytaskapp`'s secret.

### Email

Resend already has a verified domain for EZAITASK. `lovevalues.com` needs its
own DKIM/SPF records before it can send — this is a DNS change with propagation
delay, so start it before the day you need it.

---

## The decision this skill does not make

**Where a paying user's answers live.** Right now they are in the user's
browser and nowhere else, which is the strongest privacy posture this product
will ever have and is worth giving up only deliberately.

Before that changes, `skills/legal-duty-of-care/SKILL.md` has to be satisfied:
consent records, a deletion path, a breach process, and a security
professional. None of those exist yet. Do not let a Stripe integration quietly
drag server-side persistence in behind it.


## The checkout route (added 2026-07-27)

`app/api/checkout/route.ts` creates a Stripe Checkout Session and returns its
URL. Three things about it that are decisions, not accidents:

- **Stripe-hosted Checkout, not an inline card form.** A card field we render is
  a card field we are responsible for, and it drags this app into PCI scope for
  no benefit. Do not "improve" it into an inline form.
- **It calls Stripe's REST API with `fetch`** rather than adding the `stripe`
  SDK. One less dependency, and the request is four lines of `URLSearchParams`.
- **It 503s with a reason when unconfigured**, and the client turns that into a
  working 7-day trial rather than a dead end. A pay wall that cannot take
  payment, in front of a method nobody has validated, is the worst of both
  worlds — it blocks the stranger test *and* earns nothing.

Config it needs:

```
STRIPE_SECRET_KEY      sk_live_… or sk_test_…
STRIPE_PRICE_MONTHLY   price_… recurring $9.99/mo
STRIPE_PRICE_ONCE      price_… one-time $29.99
```

The trial is `subscription_data[trial_period_days]=7` and only exists on the
subscription — the one-time $29.99 profile is charged immediately, which is
worth saying out loud on the page before anyone clicks.

**Still missing before this can take real money:** the webhook endpoint (mind
the `www.` trap above), a real account system to attach a subscription to, and
a decision on what happens when a trial lapses mid-journey. Today `plan` is a
string in `localStorage` — it gates nothing and must never be described as if
it does.
