import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Force HTTPS.
 *
 * This is not a general best-practice gesture — it is load-bearing for this
 * specific product. Browsers refuse `getUserMedia` on an insecure origin
 * *silently*: no prompt, no error, the API simply is not there. So a visitor
 * arriving on `http://` gets a site that looks entirely functional and has no
 * microphone, with nothing explaining why. Voice is the feature most likely to
 * get an honest answer out of someone, and it would fail invisibly.
 *
 * Heroku terminates TLS at its router and forwards the original scheme in
 * `x-forwarded-proto`.
 *
 * TWO THINGS HERE WERE FOUND BY TESTING, NOT BY REASONING. Both would have
 * shipped as bugs:
 *
 * 1. **The header alone is not a sufficient test.** `next start` sets
 *    `x-forwarded-proto: http` itself, so a header-only check redirects local
 *    runs to an `https` URL nothing is listening on — `npm start` breaks on
 *    every developer machine. The host must be checked too, and localhost is
 *    never redirected whatever the header claims.
 *
 * 2. **The host must come from the HEADER, not `request.nextUrl`.** `nextUrl`
 *    is built from the server's own socket, so it reports `localhost`
 *    regardless of which host the client actually asked for. A check against
 *    it silently never fires in production — the worst kind of failure,
 *    because the code looks correct and does nothing.
 */

const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

/**
 * THE MEMBER AREA. Everything behind here needs a signed-in member.
 *
 * WHY THIS LIST EXISTS AT ALL (audit, 2026-11-13). Until today nothing in
 * this app checked a session — not one page called `auth()`. The dashboard,
 * the answers, the reflection and the whole four-module journey were reachable
 * by typing the URL, from any browser, signed in or not. What looked like a
 * member portal was a set of pages that read `localStorage` and redirected if
 * they did not like what they found, which is a suggestion, not a gate.
 *
 * It is a prefix list rather than a decorator on each page deliberately: a
 * new page under /dashboard is protected the moment it exists, whereas a
 * per-page check protects only the pages someone remembered to add it to.
 *
 * NOT LISTED, ON PURPOSE: /, /how-it-works, /support, /privacy, /terms,
 * /login, /signup. Someone in distress must reach /support without an
 * account — hard rule 5 — and a crisis page behind a login is worse than no
 * crisis page.
 */
const MEMBER_PREFIXES = [
  '/dashboard',
  '/me',
  '/journey',
  '/review',
  '/profile',
  '/begin',
  '/unlock',
  '/checkout',
];

const isMemberPath = (pathname: string) =>
  MEMBER_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

export async function middleware(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto');
  const rawHost = request.headers.get('host') ?? '';
  const host = rawHost.split(':')[0].toLowerCase();

  /* NO APEX -> WWW REDIRECT HERE, AND THAT IS A DECISION. One was added on
     2026-11-19 and removed within the hour, unshipped to anyone.

     The reasoning was that the apex is forwarded by the registrar and that
     forwarding turns a POST into a GET, so a form served from the apex loses
     its body. The first half is true and is why DEPLOY.md warns about OAuth
     callbacks. The second half did not apply: a form on an apex page POSTs to
     the apex directly, with no forwarding in between.

     And the direction was wrong. www.lovevalues.com currently redirects TO
     the apex, upstream of this app. An apex -> www rule here would have met
     that head on and produced an infinite redirect — not a bug on one page,
     an outage on every page.

     If the canonical host is ever settled, do it in DNS where one side can
     see the other, not in middleware where this file only ever sees its own
     half of the loop. */

  if (proto === 'http' && host && !LOCAL.has(host) && !host.endsWith('.local')) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    // Clear the port BEFORE setting the hostname. Per the URL spec the `host`
    // setter only changes the port when the new value contains one, so
    // assigning a bare hostname leaves the old port in place — which on Heroku
    // is the internal dyno port (3815). That produces
    // `https://www.lovevalues.com:3815/`, which nothing can reach. Caught in
    // testing; it would not have been visible until the site was live.
    url.port = '';
    url.hostname = host;
    // 308 rather than 302: permanent, and it preserves the method and body.
    // A 302 on a POST silently downgrades it to GET — the same class of bug as
    // the GoDaddy apex-forwarding trap in skills/deploy-and-payments.
    return NextResponse.redirect(url, 308);
  }

  /* The member gate. HTTPS first, deliberately: redirecting to a sign-in page
     over http would send the session cookie that follows it in the clear. */
  const { pathname } = request.nextUrl;
  if (isMemberPath(pathname)) {
    /* Read the cookie rather than calling auth(). This file runs on the Edge
       runtime, where the Auth.js adapter's Postgres driver cannot run at all
       — importing `@/auth` here fails the build. The cookie's PRESENCE is
       what is checked, and that is enough for a redirect: it is a signed
       token, every route that returns real data verifies it properly through
       auth(), and the worst a forged cookie buys is a page that then asks the
       server for data and is told no. */
    const signedIn =
      request.cookies.has('authjs.session-token') ||
      request.cookies.has('__Secure-authjs.session-token');

    if (!signedIn) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      /* Come back here after signing in, rather than dumping them on a
         generic dashboard having forgotten what they were doing. */
      url.searchParams.set('next', pathname);

      /* THE SAME TRAP AS THE HTTPS BLOCK ABOVE, and it was shipped once.
         `request.nextUrl` is built from the server's own socket, so on Heroku
         it reads `localhost:<dyno port>` — a port only the dyno can reach.
         The first version of this gate sent every signed-out member straight
         to `http://localhost:16050/login`, which the browser reports as
         ERR_CONNECTION_REFUSED with nothing pointing at a redirect.

         Port cleared BEFORE the hostname, for the reason the block above
         explains: per the URL spec a bare hostname leaves the old port in
         place. */
      if (host && !LOCAL.has(host)) {
        url.port = '';
        url.hostname = host;
        url.protocol = 'https:';
      }
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  /* Everything except Next's own static output and the favicon. Static assets
     are already served over whichever scheme the page used, so redirecting
     them adds a round trip for no gain. */
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
