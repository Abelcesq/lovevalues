/**
 * Delete accounts. Carefully.
 *
 *   heroku run "npm run db:prune" -a lovevalues                  # shows, deletes nothing
 *   heroku run "npm run db:prune -- --ids 1,34,67" -a lovevalues # deletes those three
 *
 * WHY THIS IS A SCRIPT AND NOT A DELETE STATEMENT. Seven bot signups needed
 * removing from production, and the obvious way to do it — paste a DELETE
 * into a console — is a one-keystroke distance from deleting a real member.
 * There is no undo on a Heroku Postgres essential plan worth relying on, and
 * the rows cascade: a user takes their profile, their activities, their
 * subscription and their OAuth links with them.
 *
 * THREE RULES, EACH LEARNED FROM HOW THIS GOES WRONG:
 *
 * 1. DRY RUN BY DEFAULT. Running it with no arguments shows what exists and
 *    changes nothing. You have to name ids to delete anything.
 *
 * 2. IDS ONLY — NEVER A FILTER. It is tempting to offer `--all-unpaid`,
 *    because every bot here is unpaid. So is every legitimate member during
 *    their free week, and so is the owner's own brand-new account. A filter
 *    that is correct today silently includes the wrong people tomorrow. Name
 *    the rows.
 *
 * 3. A PAID ACCOUNT IS NEVER DELETED, and there is no --force. If a row has
 *    a Stripe id or an active subscription, this refuses and says so. Taking
 *    money from someone and then deleting their account by script is not a
 *    mistake worth leaving reachable; that case is a conversation, not a
 *    command.
 *
 * Emails print masked, as in db-check.mjs — this output lands in screenshots.
 */

import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

/* `npm run db:prune -- --ids 1,2` passes the flags through to argv. */
const args = process.argv.slice(2);
const idArg = args.find((a) => a.startsWith('--ids'));
const raw = idArg?.includes('=')
  ? idArg.split('=')[1]
  : idArg
    ? args[args.indexOf(idArg) + 1]
    : '';

const ids = (raw ?? '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n > 0);

const isLocal = /localhost|127\.0\.0\.1|@\/|host=\/|\/tmp/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});
await client.connect();

const mask = (email) => {
  if (!email) return '(no email)';
  const [name, domain] = email.split('@');
  if (!domain) return '(malformed)';
  return `${name.slice(0, 2)}…@${domain}`;
};

/* "Paid" is deliberately generous: any Stripe footprint at all, or a status
   that is not a trial. Erring toward refusing to delete is the right error. */
const PAID = `(s.stripe_customer_id IS NOT NULL
             OR s.stripe_subscription_id IS NOT NULL
             OR s.status IN ('active','past_due'))`;

const { rows: all } = await client.query(`
  SELECT u.id, u.email, u.created_at,
         COALESCE(s.plan,'(none)')   AS plan,
         COALESCE(s.status,'(none)') AS status,
         ${PAID} AS paid
    FROM users u
    LEFT JOIN subscriptions s ON s."userId" = u.id
   ORDER BY u.id
`);

console.log('\nACCOUNTS ON THIS DATABASE');
for (const u of all) {
  const when = new Date(u.created_at).toISOString().slice(0, 10);
  const flag = u.paid ? '  ** PAID — will never be deleted **' : '';
  console.log(
    `  #${u.id}  ${mask(u.email)}  ${u.plan}/${u.status}  created ${when}${flag}`,
  );
}

if (ids.length === 0) {
  console.log(`
NOTHING WAS DELETED. This was a dry run.

To delete, name the ids explicitly:
  heroku run "npm run db:prune -- --ids 1,34,67" -a lovevalues

There is deliberately no "delete everything unpaid" option: every bot here is
unpaid, and so is every real member during their free week.
`);
  await client.end();
  process.exit(0);
}

const wanted = all.filter((u) => ids.includes(u.id));
const missing = ids.filter((i) => !all.some((u) => u.id === i));
const paid = wanted.filter((u) => u.paid);
const deletable = wanted.filter((u) => !u.paid);

if (missing.length) {
  console.log(`\n  note: no such account: ${missing.join(', ')}`);
}
if (paid.length) {
  console.log(
    `\n  REFUSING to delete paid account(s): ${paid.map((u) => `#${u.id}`).join(', ')}`,
  );
}
if (deletable.length === 0) {
  console.log('\nNothing to delete.\n');
  await client.end();
  process.exit(0);
}

const targets = deletable.map((u) => u.id);

/* What goes with them. Counted BEFORE the delete so the report is real
   rather than a guess about what cascades. */
const { rows: counts } = await client.query(
  `SELECT
     (SELECT COUNT(*)::int FROM subscriptions     WHERE "userId" = ANY($1)) AS subscriptions,
     (SELECT COUNT(*)::int FROM accounts          WHERE "userId" = ANY($1)) AS oauth_links,
     (SELECT COUNT(*)::int FROM sessions          WHERE "userId" = ANY($1)) AS sessions,
     (SELECT COUNT(*)::int FROM member_profiles   WHERE user_id  = ANY($1)) AS profiles,
     (SELECT COUNT(*)::int FROM member_activities WHERE user_id  = ANY($1)) AS activities`,
  [targets],
);

console.log('\nDELETING');
for (const u of deletable) console.log(`  #${u.id}  ${mask(u.email)}`);
console.log('  cascading:', JSON.stringify(counts[0]));

/* One transaction. A half-deleted user — gone from `users`, lingering in
   `member_activities` — is worse than either outcome. */
try {
  await client.query('BEGIN');
  const res = await client.query('DELETE FROM users WHERE id = ANY($1)', [
    targets,
  ]);
  await client.query('COMMIT');
  console.log(`\nDeleted ${res.rowCount} account(s).\n`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('\nFailed, nothing was deleted:', error.message, '\n');
  process.exitCode = 1;
}

await client.end();
