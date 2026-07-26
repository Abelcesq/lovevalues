# Deploying Love Values to Heroku

Everything below is run by you, from PowerShell, in the repo folder. Paste any
error back and it can be diagnosed.

**Before you start, one thing worth being clear about:** deploying does not move
user answers onto a server. This app is local-first — each person's answers stay
in their own browser. What deploying gives you is a URL other people can reach,
real HTTPS (which the microphone requires), and your API key living on Heroku
rather than your laptop. Storing answers server-side is a separate, larger
decision — see `skills/legal-duty-of-care/SKILL.md`.

---

## 1. One-time setup

Install the Heroku CLI from <https://devcenter.heroku.com/articles/heroku-cli>,
then:

```powershell
heroku login
```

## 2. Create the app

Heroku app names are globally unique, so `lovevalues` is probably taken. Pick
something specific — the name only appears in the `.herokuapp.com` URL, and the
real domain is attached in step 5.

```powershell
cd "$env:USERPROFILE\OneDrive\Desktop\CODING PROJECTS\lovevalues"
git pull                                   # get the latest branch
heroku create lovevalues-app               # try; use another name if taken
```

That adds a `heroku` git remote automatically. Confirm:

```powershell
git remote -v
```

## 3. Configure

```powershell
heroku config:set ANTHROPIC_API_KEY=sk-ant-... -a lovevalues-app
heroku config:set NEXT_PUBLIC_SITE_URL=https://www.lovevalues.com -a lovevalues-app
```

The Anthropic key is read server-side only, in `app/api/synthesize/route.ts`.
Never give it a `NEXT_PUBLIC_` prefix — that would ship it to the browser.

**Use a key created for this app**, not the one `mytaskapp` uses. If one leaks
you rotate one app instead of two, and per-key spend tells you what a synthesis
actually costs — which is the input to whether $29.99 is the right price.

## 4. Deploy

```powershell
git push heroku claude/new-app-voice-input-0q1w0a:main
heroku open -a lovevalues-app
```

Heroku's Node buildpack installs dependencies, runs `next build`, then starts
the process in the `Procfile`. No release phase and no migrations — there is no
database.

**If the build fails on a missing TypeScript type**, the buildpack pruned dev
dependencies too early:

```powershell
heroku config:set NPM_CONFIG_PRODUCTION=false -a lovevalues-app
git commit --allow-empty -m "rebuild" ; git push heroku claude/new-app-voice-input-0q1w0a:main
```

**What success looks like.** The push streams a build log for one to three
minutes and ends with `Verifying deploy... done.` and a line reading
`* [new branch]  HEAD -> main`. Those two lines are the confirmation.

> ⚠️ Those are *output to read*, not commands to run. Pasting a line beginning
> `remote:` back into PowerShell produces a red
> `The term 'remote:' is not recognized` error, which looks alarming and means
> nothing — the deploy already succeeded.

**After a successful deploy, hard-refresh the browser** (Ctrl+Shift+R). Heroku's
"Welcome to your new app!" placeholder caches, so a normal reload can keep
showing it after your app is live.

**Watch the logs** if anything looks wrong:

```powershell
heroku logs --tail -a lovevalues-app
```

## 5. Connect lovevalues.com

```powershell
heroku domains:add www.lovevalues.com -a lovevalues-app
heroku certs:auto:enable -a lovevalues-app
heroku domains -a lovevalues-app
```

The last command prints a **DNS target** ending in `.herokudns.com`. In GoDaddy
→ your domain → **DNS**:

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | the `...herokudns.com` target Heroku printed |

Then handle the apex (`lovevalues.com` with no `www`). GoDaddy cannot CNAME an
apex, so use **Forwarding** → forward `lovevalues.com` to
`https://www.lovevalues.com`, permanent (301) — the same arrangement as
ezaitask.com.

Certificates take a few minutes. Check with:

```powershell
heroku certs:auto -a lovevalues-app
```

### ⚠️ The apex-forwarding trap — read before adding any webhook

GoDaddy's forwarding converts **POST into GET**. A webhook posted to the apex
therefore arrives as a GET, the endpoint returns 405, and the sender retries
into the void. This cost real debugging time on ezaitask.com.

**Every** webhook URL — Stripe above all — must use `https://www.lovevalues.com/...`,
never the bare apex. Same for any callback URL you register anywhere.

## Common stumbles

**"fatal: not a git repository"** — you are not in the project folder. Every
`git` command has to run from the repo; `heroku` commands work anywhere as long
as they carry `-a <app>`.

```powershell
cd "$env:USERPROFILE\OneDrive\Desktop\CODING PROJECTS\lovevalues"
```

**No `heroku` git remote** — `heroku create` only adds the remote when it is run
*inside* a git repo. If it was run elsewhere, wire it up after the fact:

```powershell
heroku git:remote -a lovevalues
git remote -v          # should now list a heroku remote
```

**The key got set to the placeholder.** Pasting the command with `sk-ant-...`
still left in stores the literal dots, and Heroku happily reports success. The
app then fails at synthesis time with an authentication error that looks like a
code bug. Always read it back:

```powershell
heroku config:get ANTHROPIC_API_KEY -a lovevalues
```

That must print a long `sk-ant-api03-...` string. If it prints `sk-ant-...`,
set it again with the real value.

## 6. Verify

- [ ] Home page loads over `https://www.lovevalues.com`
- [ ] `/journey` runs, answers persist across a refresh
- [ ] **The microphone appears and dictates** — this is the one that proves
      HTTPS is correct end to end. On plain HTTP it silently will not exist.
- [ ] `/support` loads, and "Talk to someone" is in the nav
- [ ] `/profile` → *Generate my profile* returns a reflection (needs the key)
- [ ] Open it on a phone. Most of the stranger test will happen there.

## Dyno sizing

Eco dynos sleep after 30 minutes idle, and the first request then waits for a
cold start. For a product asking strangers to be vulnerable, a slow blank screen
is a bad first impression. Basic is the safer choice once you start sending
people to it.

Unlike EZAITASK, this app needs no memory tuning — the gunicorn worker/thread
settings in that Procfile exist to keep Django under the 512MB Eco limit, and
Next.js sits well below it.
