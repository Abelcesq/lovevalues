'use client';

/**
 * ACCOUNTS — the local seam.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE CHANGING ANYTHING HERE.
 *
 * There is no server behind this yet. Everything below runs in the browser and
 * writes to localStorage, exactly like `lib/store.ts`. That is a deliberate
 * placeholder, not an oversight, and it has two hard consequences:
 *
 *   1. This is NOT authentication. Anyone with access to the device has access
 *      to the account. It cannot gate anything of value and must never be
 *      described to a user as if it does.
 *   2. When the real backend lands, THIS FILE is the single thing to replace —
 *      the pages call `createAccount` / `signIn` / `loadAccount` and nothing
 *      else. Keep it that way.
 *
 * Passwords are hashed with SHA-256 and a per-account random salt before being
 * written. That is *not* good enough for a server (a real backend needs bcrypt
 * or argon2 and a slow work factor), but it does mean a password typed here is
 * never sitting in plaintext in localStorage — which matters, because people
 * reuse passwords and this is a beta.
 * ────────────────────────────────────────────────────────────────────────────
 */

const KEY = 'lovevalues.account.v1';

export type Plan = 'trial' | 'once' | 'monthly';

export type Account = {
  firstName: string;
  lastName: string;
  email: string;
  /** 'password' | 'google' | 'facebook' | 'instagram' */
  provider: string;
  /** Base64 SHA-256 of salt+password. Absent for social sign-in. */
  passwordHash?: string;
  salt?: string;
  plan: Plan | null;
  /** ISO date the 7-day trial ends. Informational only until billing is real. */
  trialEndsAt: string | null;
  createdAt: string;
};

export const TRIAL_DAYS = 7;

export function loadAccount(): Account | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

function save(account: Account): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(account));
  } catch {
    /* Private browsing or quota. The session still works in memory. */
  }
}

export function signOut(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}

/* ---- password hashing (placeholder — see the header) ---- */

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

async function hash(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

/* ---- the API the pages use ---- */

export type NewAccount = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export async function createAccount(input: NewAccount): Promise<Account> {
  const salt = randomSalt();
  const account: Account = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    provider: 'password',
    passwordHash: await hash(input.password, salt),
    salt,
    plan: null,
    trialEndsAt: null,
    createdAt: new Date().toISOString(),
  };
  save(account);
  return account;
}

export async function signIn(email: string, password: string): Promise<Account | null> {
  const existing = loadAccount();
  if (!existing || existing.email !== email.trim().toLowerCase()) return null;
  if (!existing.salt || !existing.passwordHash) return null;
  const candidate = await hash(password, existing.salt);
  return candidate === existing.passwordHash ? existing : null;
}

/** Records which plan was chosen and stamps the trial window. */
export function startTrial(plan: Plan): Account | null {
  const existing = loadAccount();
  if (!existing) return null;
  const ends = new Date();
  ends.setDate(ends.getDate() + TRIAL_DAYS);
  const next: Account = { ...existing, plan, trialEndsAt: ends.toISOString() };
  save(next);
  return next;
}

/** Edits the profile fields a user is allowed to change themselves. */
export function updateAccount(patch: Partial<Pick<Account, 'firstName' | 'lastName' | 'email'>>) {
  const existing = loadAccount();
  if (!existing) return null;
  const next: Account = {
    ...existing,
    ...patch,
    email: (patch.email ?? existing.email).trim().toLowerCase(),
  };
  save(next);
  return next;
}

/**
 * Ends the subscription.
 *
 * Local only, and that is a real limitation rather than a detail: with no
 * Stripe customer and no webhook, this clears the plan on THIS DEVICE and
 * nothing else. Once billing is live, cancelling has to go through Stripe —
 * otherwise a user "cancels" here, sees a confirmation, and is charged anyway,
 * which is the single worst bug this product could ship.
 */
export function cancelPlan(): Account | null {
  const existing = loadAccount();
  if (!existing) return null;
  const next: Account = { ...existing, plan: null, trialEndsAt: null };
  save(next);
  return next;
}

/** Whole days left in the trial. Negative once it has lapsed. */
export function trialDaysLeft(account: Account): number | null {
  if (!account.trialEndsAt) return null;
  const ms = new Date(account.trialEndsAt).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function displayName(account: Account): string {
  return account.firstName || account.email.split('@')[0] || 'there';
}
