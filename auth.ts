/**
 * Authentication.
 *
 * Three ways in — Google, Meta, and email/password — all landing on one user
 * record. The whole file is written to DEGRADE RATHER THAN CRASH: none of the
 * providers are configured yet, and a signup page that throws a 500 because an
 * environment variable is missing is worse than one that says "not connected".
 * Each provider switches itself on only when its keys are present.
 *
 * WHY JWT SESSIONS AND NOT DATABASE SESSIONS. Auth.js cannot use database
 * sessions together with the Credentials provider — it is a documented
 * limitation, not a configuration mistake, and choosing `database` here breaks
 * email/password sign-in with an error that points nowhere near the cause.
 * Users and OAuth links are still persisted through the adapter; it is only
 * the session itself that lives in a signed cookie.
 *
 * WHAT A SESSION CONTAINS: an id, a name, an email, an avatar URL. It does not
 * and must not carry answers, values, or anything from the method. The session
 * cookie travels on every request; treat it as public.
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import PostgresAdapter from "@auth/pg-adapter";
import { dbConfigured, pool } from "@/lib/db";
import { verifyCredentials } from "@/lib/users";

/** Which sign-in methods are actually usable right now. The signup page reads
 *  this so its buttons can tell the truth instead of failing on click. */
export const authStatus = {
  database: dbConfigured,
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  /* One integration, not two. Standalone Instagram login no longer exists for
     a product like this — consumer login runs through Meta, so the Instagram
     button and the Facebook button are the same credentials underneath. */
  meta: Boolean(
    process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET,
  ),
} as const;

const providers: NextAuthConfig["providers"] = [];

if (authStatus.google) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      /* Ask for nothing beyond identity. Any additional scope drags the app
         into Google's lengthy verification review, and this product has no use
         for a user's calendar or contacts. */
      authorization: { params: { scope: "openid email profile" } },
    }),
  );
}

if (authStatus.meta) {
  providers.push(
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    }),
  );
}

/* Email/password. Available whenever a database is, which today is the only
   path that actually works. */
if (authStatus.database) {
  providers.push(
    Credentials({
      name: "Email",
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email || !password) return null;

        const user = await verifyCredentials(email, password);
        if (!user) return null;

        /* Only these four fields. Whatever is returned here is what ends up in
           the token and then the session cookie. */
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  /* The adapter still persists users and OAuth account links even under the
     JWT session strategy — it is only `sessions` that goes unused. */
  adapter: dbConfigured ? PostgresAdapter(pool) : undefined,
  providers,
  session: { strategy: "jwt" },
  /* Heroku terminates TLS at its router, so the app sees an http request with
     the real scheme in x-forwarded-proto. Without trustHost, Auth.js refuses
     to build the callback URL and every sign-in fails with an untrusted-host
     error — the same class of trap as the middleware redirect. */
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = String(token.uid);
      }
      return session;
    },
  },
});
