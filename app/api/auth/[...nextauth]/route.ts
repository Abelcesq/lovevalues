/**
 * The Auth.js endpoint. Every sign-in, callback, and sign-out passes through
 * here — including the OAuth redirect URIs registered with Google and Meta:
 *
 *   https://www.lovevalues.com/api/auth/callback/google
 *   https://www.lovevalues.com/api/auth/callback/facebook
 *
 * The `www.` is load-bearing. The bare apex forwards through GoDaddy, and that
 * forwarding turns a POST into a GET — an OAuth callback arriving that way is
 * rejected with an error that looks nothing like a DNS problem. Same trap as
 * the Stripe webhook note in DEPLOY.md.
 */

import { handlers } from '@/auth';

export const { GET, POST } = handlers;
