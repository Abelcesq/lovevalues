/**
 * Reading and writing the member profile. Server only — this imports the pool.
 *
 * Every function takes a userId that the caller got from a SESSION, never
 * from the request body. That is the whole access-control story for this
 * table: there is no function here that can be asked for "any profile by id",
 * so a route that forgets to check who is asking cannot accidentally hand
 * back someone else's.
 */

import { pool } from "./db.ts";
import {
  EMPTY_MEMBER_PROFILE,
  type MemberProfile,
  validateProfile,
} from "./memberProfile.ts";

type Row = {
  display_name: string | null;
  gender: string | null;
  seeking: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: Date | string | null;
  religion: string | null;
  relationship_type: string | null;
  wants_children: string | null;
  visible_in_matching: boolean | null;
};

/**
 * Postgres `date` comes back as a Date in local time, and calling
 * toISOString() on it can roll the day backwards for anyone west of UTC — so
 * a birthday of the 1st displays as the 31st of the month before, and saving
 * the form then persists the wrong day. Read the parts, do not convert.
 */
function isoDate(value: Date | string | null): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getMemberProfile(userId: number): Promise<MemberProfile> {
  const { rows } = await pool.query<Row>(
    `SELECT display_name, gender, seeking, city, country, date_of_birth,
            religion, relationship_type, wants_children, visible_in_matching
       FROM member_profiles WHERE user_id = $1`,
    [userId],
  );

  const acts = await pool.query<{ activity: string }>(
    `SELECT activity FROM member_activities WHERE user_id = $1 ORDER BY activity`,
    [userId],
  );
  const activities = acts.rows.map((r) => r.activity);

  /* No row yet is a perfectly normal state — it means they have not opened
     the page. Hand back the empty shape rather than null so every caller does
     not have to re-invent "what does a blank profile look like". */
  const row = rows[0];
  if (!row) return { ...EMPTY_MEMBER_PROFILE, activities };

  return {
    displayName: row.display_name ?? "",
    gender: row.gender ?? "",
    seeking: row.seeking ?? "",
    city: row.city ?? "",
    country: row.country ?? "",
    dateOfBirth: isoDate(row.date_of_birth),
    religion: row.religion ?? "",
    relationshipType: row.relationship_type ?? "",
    wantsChildren: row.wants_children ?? "",
    activities,
    visibleInMatching: row.visible_in_matching === true,
  };
}

export type SaveResult =
  | { ok: true; value: MemberProfile }
  | { ok: false; field: string; message: string };

/**
 * Replace a member's profile with a validated version of what they sent.
 *
 * ONE TRANSACTION, because the activities are a separate table: a crash
 * between writing the profile and writing the activities would otherwise
 * leave someone's interests belonging to the previous version of their
 * profile, with nothing to indicate it.
 */
export async function saveMemberProfile(
  userId: number,
  raw: Partial<MemberProfile>,
): Promise<SaveResult> {
  const checked = validateProfile(raw);
  if (!checked.ok) {
    return { ok: false, field: checked.field, message: checked.message };
  }
  const p = checked.value;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO member_profiles
         (user_id, display_name, gender, seeking, city, country, date_of_birth,
          religion, relationship_type, wants_children, visible_in_matching, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,'')::date,$8,$9,$10,$11,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         display_name        = EXCLUDED.display_name,
         gender              = EXCLUDED.gender,
         seeking             = EXCLUDED.seeking,
         city                = EXCLUDED.city,
         country             = EXCLUDED.country,
         date_of_birth       = EXCLUDED.date_of_birth,
         religion            = EXCLUDED.religion,
         relationship_type   = EXCLUDED.relationship_type,
         wants_children      = EXCLUDED.wants_children,
         visible_in_matching = EXCLUDED.visible_in_matching,
         updated_at          = NOW()`,
      [
        userId,
        p.displayName,
        p.gender,
        p.seeking,
        p.city,
        p.country,
        p.dateOfBirth,
        p.religion,
        p.relationshipType,
        p.wantsChildren,
        p.visibleInMatching,
      ],
    );

    await client.query(`DELETE FROM member_activities WHERE user_id = $1`, [
      userId,
    ]);
    if (p.activities.length) {
      /* One statement with an unnested array rather than a loop of inserts:
         a dozen round trips inside a transaction is a dozen chances to hold
         a lock longer than needed. */
      await client.query(
        `INSERT INTO member_activities (user_id, activity)
         SELECT $1, UNNEST($2::varchar[])`,
        [userId, p.activities],
      );
    }

    await client.query("COMMIT");
    return { ok: true, value: p };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
