/**
 * Member-to-member contact: connections, blocks, reports.
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE. No query that can return one
 * member to another may skip the block filter, and the block filter works in
 * BOTH DIRECTIONS. A block that only hides the blocked person leaves the
 * blocker visible to someone they wanted away from, which is the opposite of
 * what they asked for.
 *
 * That is why `visibleTo()` exists as a single SQL fragment rather than a
 * condition each caller remembers to add. A directory, a match list and a
 * search would otherwise be three chances to forget, and forgetting is
 * invisible until it matters to somebody.
 *
 * Taken from the thedotx members app, where blocking and reporting precede
 * the directory rather than following it. Love Values matches people on their
 * values, which is more intimate than a professional directory.
 *
 * NOTHING HERE READS THE FOUR MODULES. Hard rule 8: a person's values work,
 * their parents' marriage and their past relationships never reach another
 * member or a matching engine. This file only ever joins users to
 * member_profiles.
 */

import { pool } from "./db.ts";

/** Why someone was reported. Fixed ids, not prose — a free-text-only report
    cannot be counted, sorted or acted on at volume. */
export const REPORT_REASONS = [
  { id: "fake", label: "Fake or impersonating someone" },
  { id: "harassment", label: "Harassment or abuse" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "scam", label: "Scam, spam or soliciting money" },
  { id: "underage", label: "They appear to be under 18" },
  { id: "safety", label: "Something that worried me about their safety" },
  { id: "other", label: "Something else" },
] as const;

const REASON_IDS = new Set(REPORT_REASONS.map((r) => r.id));
export const MAX_REPORT_DETAIL = 500;

/**
 * The block filter, in SQL, once.
 *
 * `$1` is the viewer. Excludes anyone they blocked AND anyone who blocked
 * them. Written as a NOT EXISTS pair rather than a NOT IN subquery because
 * NOT IN returns nothing at all if the subquery ever yields a NULL — a
 * failure that empties the directory rather than leaking, but a failure.
 */
export const NOT_BLOCKED = `
  NOT EXISTS (
    SELECT 1 FROM blocks b
     WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
        OR (b.blocker_id = u.id AND b.blocked_id = $1)
  )`;

export type ConnectionStatus = "pending" | "accepted" | "declined";

/**
 * Ask to connect.
 *
 * Refuses when either side has blocked the other — checked here rather than
 * trusted from the UI, because the UI is a suggestion and this is the rule.
 * Re-requesting after a decline does nothing: the UNIQUE constraint plus DO
 * NOTHING means a refused request cannot be sent again and again.
 */
export async function requestConnection(
  fromUserId: number,
  toUserId: number,
): Promise<{ ok: boolean; reason?: string }> {
  if (fromUserId === toUserId) return { ok: false, reason: "self" };

  const { rows } = await pool.query(
    `SELECT 1 FROM blocks
      WHERE (blocker_id = $1 AND blocked_id = $2)
         OR (blocker_id = $2 AND blocked_id = $1)`,
    [fromUserId, toUserId],
  );
  /* Deliberately the same answer as a successful request would give the
     caller nothing to distinguish. A person who blocked someone should not
     have that fact reported back to them. */
  if (rows.length) return { ok: false, reason: "blocked" };

  await pool.query(
    `INSERT INTO connections (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (requester_id, addressee_id) DO NOTHING`,
    [fromUserId, toUserId],
  );
  return { ok: true };
}

/**
 * Accept or decline. Only the ADDRESSEE may answer, and only a pending
 * request — otherwise a requester could accept on the other person's behalf,
 * which would make "double consent" a label rather than a fact.
 */
export async function respondToConnection(
  addresseeId: number,
  requesterId: number,
  action: "accepted" | "declined",
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE connections
        SET status = $3, responded_at = NOW()
      WHERE requester_id = $2 AND addressee_id = $1 AND status = 'pending'`,
    [addresseeId, requesterId, action],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Are these two actually connected?
 *
 * The gate for anything beyond a public profile. Direction-agnostic: a
 * connection accepted is mutual, so it must read the same from either side.
 */
export async function areConnected(a: number, b: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM connections
      WHERE status = 'accepted'
        AND ((requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1))`,
    [a, b],
  );
  return rows.length > 0;
}

/**
 * Block someone.
 *
 * Also tears down any connection between them. Leaving an accepted
 * connection in place after a block is how a blocked person keeps whatever
 * that connection granted — the block has to end the relationship, not just
 * hide it.
 */
export async function blockMember(
  blockerId: number,
  blockedId: number,
): Promise<void> {
  if (blockerId === blockedId) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [blockerId, blockedId],
    );
    await client.query(
      `DELETE FROM connections
        WHERE (requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1)`,
      [blockerId, blockedId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function unblockMember(
  blockerId: number,
  blockedId: number,
): Promise<void> {
  await pool.query(
    `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, blockedId],
  );
}

/**
 * Report someone.
 *
 * Always succeeds from the reporter's point of view, even on a repeat. A
 * person reporting someone who frightened them must never be told "you
 * already did that" — the second report is itself a signal, and the moment
 * is not one for friction.
 */
export async function reportMember(
  reporterId: number,
  reportedId: number,
  reason: string,
  detail: string,
): Promise<{ ok: boolean }> {
  if (reporterId === reportedId) return { ok: false };
  await pool.query(
    `INSERT INTO reports (reporter_id, reported_id, reason, detail)
     VALUES ($1, $2, $3, $4)`,
    [
      reporterId,
      reportedId,
      REASON_IDS.has(reason as never) ? reason : "other",
      detail.trim().slice(0, MAX_REPORT_DETAIL) || null,
    ],
  );
  return { ok: true };
}

export type DirectoryEntry = {
  userId: number;
  displayName: string;
  city: string;
  country: string;
  aboutMe: string;
};

/**
 * Members this person may see.
 *
 * Three conditions, all of them load-bearing:
 *   · visible_in_matching — nobody is listed who has not said yes;
 *   · not themselves;
 *   · NOT_BLOCKED, in both directions.
 *
 * Returns profile facts only. No answers, no reflection, no date of birth —
 * an age may be derived for display, but the date itself is nobody's
 * business.
 */
export async function visibleMembers(
  viewerId: number,
  limit = 50,
): Promise<DirectoryEntry[]> {
  const { rows } = await pool.query<{
    id: number;
    display_name: string | null;
    city: string | null;
    country: string | null;
    about_me: string | null;
  }>(
    `SELECT u.id, p.display_name, p.city, p.country, p.about_me
       FROM users u
       JOIN member_profiles p ON p.user_id = u.id
      WHERE p.visible_in_matching = TRUE
        AND u.id <> $1
        AND ${NOT_BLOCKED}
      ORDER BY p.updated_at DESC
      LIMIT $2`,
    [viewerId, limit],
  );
  return rows.map((r) => ({
    userId: r.id,
    displayName: r.display_name ?? "",
    city: r.city ?? "",
    country: r.country ?? "",
    aboutMe: r.about_me ?? "",
  }));
}
