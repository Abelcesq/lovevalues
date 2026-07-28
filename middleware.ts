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

export function middleware(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto');
  const rawHost = request.headers.get('host') ?? '';
  const host = rawHost.split(':')[0].toLowerCase();

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

  return NextResponse.next();
}

export const config = {
  /* Everything except Next's own static output and the favicon. Static assets
     are already served over whichever scheme the page used, so redirecting
     them adds a round trip for no gain. */
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
