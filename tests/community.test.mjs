/**
 * The safety layer: blocks, and double consent.
 *
 * Two properties are worth a test here, and both are the kind that pass
 * inspection and fail in practice:
 *
 * 1. A BLOCK WORKS IN BOTH DIRECTIONS. The obvious implementation hides the
 *    blocked person from the blocker and stops there — leaving the blocker
 *    still visible to someone they wanted away from. That is the opposite of
 *    what they asked for, and it is invisible until it matters to somebody.
 *
 * 2. A CONNECTION NEEDS BOTH PEOPLE. A pending request must never read as a
 *    connection, and only the addressee may answer one. Otherwise "double
 *    consent" is a label on a single consent.
 */

import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import {
  REPORT_REASONS,
  areConnected,
  blockMember,
  reportMember,
  requestConnection,
  respondToConnection,
  unblockMember,
  visibleMembers,
} from "../lib/community.ts";
import { pool } from "../lib/db.ts";

const url = process.env.DATABASE_URL;

test("every report reason has an id and a human label", () => {
  for (const r of REPORT_REASONS) {
    assert.ok(r.id && r.label, JSON.stringify(r));
  }
  // Someone frightened enough to report must not be forced into a category
  // that does not fit, or they will not report at all.
  assert.ok(REPORT_REASONS.some((r) => r.id === "other"));
  assert.ok(REPORT_REASONS.some((r) => r.id === "underage"));
});

if (!url) {
  test("community tests SKIPPED — no DATABASE_URL", { skip: true }, () => {});
} else {
  const client = new pg.Client({ connectionString: url });
  let a = 0;
  let b = 0;

  const makeUser = async (tag) => {
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash) VALUES ($1,'x') RETURNING id`,
      [`${tag}-${Date.now()}-${Math.random()}@example.com`],
    );
    await client.query(
      `INSERT INTO member_profiles (user_id, display_name, visible_in_matching)
       VALUES ($1,$2,TRUE)`,
      [rows[0].id, tag],
    );
    return rows[0].id;
  };

  test("setup", async () => {
    await client.connect();
    a = await makeUser("ava");
    b = await makeUser("ben");
  });

  test("both members can see each other to begin with", async () => {
    const seen = await visibleMembers(a);
    assert.ok(seen.some((m) => m.userId === b), "ben should be listed for ava");
    const back = await visibleMembers(b);
    assert.ok(back.some((m) => m.userId === a), "ava should be listed for ben");
  });

  test("nobody is listed to themselves", async () => {
    const seen = await visibleMembers(a);
    assert.ok(!seen.some((m) => m.userId === a));
  });

  test("a block hides BOTH people from each other", async () => {
    // The load-bearing one. Ava blocks Ben; Ben must also stop seeing Ava.
    await blockMember(a, b);

    const avaSees = await visibleMembers(a);
    assert.ok(!avaSees.some((m) => m.userId === b), "ava must not see ben");

    const benSees = await visibleMembers(b);
    assert.ok(
      !benSees.some((m) => m.userId === a),
      "ben must not see ava either — a one-way block is not a block",
    );
  });

  test("a blocked person cannot send a connection request", async () => {
    const r = await requestConnection(b, a);
    assert.equal(r.ok, false);
  });

  test("unblocking restores visibility", async () => {
    await unblockMember(a, b);
    const avaSees = await visibleMembers(a);
    assert.ok(avaSees.some((m) => m.userId === b));
  });

  test("a pending request is NOT a connection", async () => {
    assert.equal(await requestConnection(a, b).then((r) => r.ok), true);
    assert.equal(
      await areConnected(a, b),
      false,
      "asking is not the same as being accepted",
    );
  });

  test("only the addressee may accept", async () => {
    // The requester accepting their own request would make double consent
    // a single consent wearing a second name.
    assert.equal(await respondToConnection(a, b, "accepted"), false);
    assert.equal(await areConnected(a, b), false);
  });

  test("the addressee accepting makes it mutual, read from either side", async () => {
    assert.equal(await respondToConnection(b, a, "accepted"), true);
    assert.equal(await areConnected(a, b), true);
    assert.equal(await areConnected(b, a), true);
  });

  test("blocking tears down the connection, not just the view", async () => {
    // Otherwise a blocked person keeps whatever the connection granted.
    await blockMember(a, b);
    assert.equal(await areConnected(a, b), false);
    await unblockMember(a, b);
    assert.equal(await areConnected(a, b), false, "and it does not come back");
  });

  test("a repeat report is accepted, never refused", async () => {
    // A person reporting someone who frightened them must not be told "you
    // already did that". The second report is itself a signal.
    assert.equal((await reportMember(a, b, "harassment", "once")).ok, true);
    assert.equal((await reportMember(a, b, "harassment", "again")).ok, true);
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM reports WHERE reporter_id=$1 AND reported_id=$2`,
      [a, b],
    );
    assert.equal(rows[0].n, 2);
  });

  test("an unknown report reason is stored as 'other', not rejected", async () => {
    await reportMember(a, b, "<script>", "x");
    const { rows } = await client.query(
      `SELECT reason FROM reports WHERE reported_id=$1 ORDER BY id DESC LIMIT 1`,
      [b],
    );
    assert.equal(rows[0].reason, "other");
  });

  test("a report outlives the reporter deleting their account", async () => {
    // The report is about the reported person's conduct. It must not vanish
    // because the person who raised it left.
    await client.query(`DELETE FROM users WHERE id = $1`, [a]);
    const { rows } = await client.query(
      `SELECT reporter_id FROM reports WHERE reported_id = $1`,
      [b],
    );
    assert.ok(rows.length > 0, "the reports are still there");
    assert.equal(rows[0].reporter_id, null, "and are now anonymous");
  });

  test("teardown", async () => {
    await client.query(`DELETE FROM users WHERE id = ANY($1)`, [[a, b]]);
    await client.end();
    await pool.end();
  });
}
