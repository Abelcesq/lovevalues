"use client";

import {
  ArrowRight,
  BookOpen,
  CreditCard,
  Download,
  FileText,
  LifeBuoy,
  LogOut,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Footer, Nav } from "@/components/Chrome";
import {
  TRIAL_DAYS,
  type Account,
  cancelPlan,
  displayName,
  loadAccount,
  signOut,
  trialDaysLeft,
  updateAccount,
} from "@/lib/account";
import {
  PRICE_MATCH,
  PRICE_MONTHLY,
  PRICE_PROFILE,
  PRICE_PROFILE_UPDATE,
  money,
} from "@/lib/plan";
import {
  MODULES,
  QUESTIONS,
  VALUE_CARDS,
  allValueCards,
  isQuestionVisible,
} from "@/lib/method";
import { downloadProfile } from "@/lib/store";
import { useProfile } from "@/lib/useProfile";

/**
 * The dashboard — the hub a returning person lands on.
 *
 * Five jobs, which is exactly what the CEO asked for:
 *   1. progress through the questions, per module,
 *   2. get to the report,
 *   3. change your own details,
 *   4. change or cancel billing,
 *   5. find the whole site — the method, privacy, terms, support.
 *
 * A note on (4): cancelling here clears the plan on this device and nothing
 * else, because there is no Stripe customer and no webhook yet. That is
 * spelled out on the page. A cancel button that looks like it worked but
 * doesn't stop a charge is the worst bug this product could ship, so it says
 * what it actually does.
 */
export default function Dashboard() {
  const router = useRouter();
  const { profile, hydrated } = useProfile();
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const found = loadAccount();
    if (!found) {
      router.replace("/signup");
      return;
    }
    setAccount(found);
    setReady(true);
  }, [router]);

  if (!ready || !account || !hydrated) return null;

  const visible = QUESTIONS.filter((q) =>
    isQuestionVisible(q, profile.answers),
  );
  const answered = visible.filter((q) => profile.answers[q.id]?.trim()).length;
  const overall = visible.length
    ? Math.round((answered / visible.length) * 100)
    : 0;
  const daysLeft = trialDaysLeft(account);
  const coreLabels = allValueCards(profile.customValues)
    .filter((c) => profile.coreValues.includes(c.id))
    .map((c) => c.label);

  return (
    <>
      <Nav />
      <main className="journey">
        <div className="wrap dash">
          <header className="dash-head">
            <div>
              <span className="eyebrow">Your dashboard</span>
              <h1>Hello, {displayName(account)}</h1>
              <p>
                {overall === 0
                  ? "Nothing answered yet — the first module takes about fifteen minutes."
                  : overall === 100
                    ? "Every question answered. Your profile is ready whenever you are."
                    : `You’re ${overall}% of the way through.`}
              </p>
            </div>
            <Link
              className="btn btn-primary btn-lg"
              href={
                overall === 0
                  ? "/begin"
                  : overall === 100
                    ? "/profile"
                    : "/journey"
              }
            >
              {overall === 0
                ? "Start"
                : overall === 100
                  ? "See my profile"
                  : "Continue"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          {/* ---- 1. progress ---- */}
          <section className="dash-section">
            <h2>Your progress</h2>
            <div className="dash-overall">
              <span className="bar">
                <span style={{ width: `${overall}%` }} />
              </span>
              <span className="c">
                {answered} of {visible.length} answered
              </span>
            </div>

            <div className="progress-grid">
              {MODULES.map((m) => {
                const qs = visible.filter((q) => q.moduleId === m.id);
                const done = qs.filter((q) =>
                  profile.answers[q.id]?.trim(),
                ).length;
                const pct = qs.length
                  ? Math.round((done / qs.length) * 100)
                  : 0;
                return (
                  <Link
                    key={m.id}
                    className={`progress-tile${pct === 100 ? " full" : ""}`}
                    href={`/journey?m=${m.id}`}
                  >
                    <span className="n">{m.number}</span>
                    <span className="t">{m.title}</span>
                    <span className="bar">
                      <span style={{ width: `${pct}%` }} />
                    </span>
                    <span className="c">
                      {done} of {qs.length}
                    </span>
                  </Link>
                );
              })}
            </div>

            {coreLabels.length > 0 && (
              <p className="dash-note">
                <strong>Your core values:</strong> {coreLabels.join(" · ")}
              </p>
            )}
          </section>

          <div className="dash-cols">
            {/* ---- 2. the report ---- */}
            <section className="dash-card">
              <span className="c-mark">
                <FileText aria-hidden="true" />
              </span>
              <h2>Your report</h2>
              <p>
                {/* "Regenerate any time" was true when it was free. It now
                    costs, so the price belongs in the same sentence as the
                    invitation — not discovered on the next screen. */}
                {profile.synthesis
                  ? `Generated ${new Date(profile.synthesis.generatedAt).toLocaleDateString()}. Editing your answers is always free; generating a fresh report once they have changed is ${money(PRICE_PROFILE_UPDATE)}.`
                  : `Not generated yet. Answer what you can — your first report is ${money(PRICE_PROFILE)}, charged when you ask to see it.`}
              </p>
              <div className="c-actions">
                <Link className="btn btn-ghost" href="/profile">
                  {profile.synthesis ? "View my report" : "Generate my report"}
                </Link>
                <Link className="btn btn-ghost" href="/review">
                  Edit my answers
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => downloadProfile(profile)}
                >
                  <Download aria-hidden="true" /> Export
                </button>
              </div>
            </section>

            {/* ---- 3. your details ---- */}
            <section className="dash-card">
              <span className="c-mark">
                <Pencil aria-hidden="true" />
              </span>
              <h2>Your details</h2>

              {editing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    const next = updateAccount({
                      firstName: String(data.get("firstName") ?? ""),
                      lastName: String(data.get("lastName") ?? ""),
                      email: String(data.get("email") ?? ""),
                    });
                    if (next) setAccount(next);
                    setEditing(false);
                  }}
                >
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="firstName">First name</label>
                      <input
                        id="firstName"
                        name="firstName"
                        defaultValue={account.firstName}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="lastName">Last name</label>
                      <input
                        id="lastName"
                        name="lastName"
                        defaultValue={account.lastName}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={account.email}
                    />
                  </div>
                  <div className="c-actions">
                    <button type="submit" className="btn btn-primary">
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <dl className="dash-dl">
                    <dt>Name</dt>
                    <dd>
                      {account.firstName} {account.lastName}
                    </dd>
                    <dt>Email</dt>
                    <dd>{account.email}</dd>
                    <dt>Signed in with</dt>
                    <dd>
                      {account.provider === "password"
                        ? "Email and password"
                        : account.provider}
                    </dd>
                  </dl>
                  <div className="c-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setEditing(true)}
                    >
                      Edit my details
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        signOut();
                        router.push("/");
                      }}
                    >
                      <LogOut aria-hidden="true" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* ---- 4. billing ---- */}
            <section className="dash-card">
              <span className="c-mark">
                <CreditCard aria-hidden="true" />
              </span>
              <h2>Plan and billing</h2>

              {account.plan ? (
                <>
                  <dl className="dash-dl">
                    <dt>Membership</dt>
                    <dd>{`${money(PRICE_MONTHLY)} / month`}</dd>
                    <dt>Trial</dt>
                    <dd>
                      {daysLeft === null
                        ? "—"
                        : daysLeft > 0
                          ? `${daysLeft} of ${TRIAL_DAYS} days left`
                          : "Ended"}
                    </dd>
                  </dl>

                  {confirmCancel ? (
                    <div className="notice" style={{ margin: "4px 0 14px" }}>
                      <p style={{ marginBottom: 12 }}>
                        Billing is not switched on yet, so this only clears the
                        membership saved in this browser — there is nothing to
                        charge and nothing to stop. When payments go live,
                        cancelling will happen through Stripe, and it will stop
                        future charges only: if you are still inside your free{" "}
                        {TRIAL_DAYS} days you are never charged, and if you have
                        already been billed your membership runs to the end of
                        that month.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          const next = cancelPlan();
                          setAccount(next);
                          setConfirmCancel(false);
                        }}
                      >
                        I understand — cancel
                      </button>{" "}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep my plan
                      </button>
                    </div>
                  ) : (
                    <div className="c-actions">
                      <Link className="btn btn-ghost" href="/checkout">
                        Manage membership
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setConfirmCancel(true)}
                      >
                        Cancel membership
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p>
                    You don&apos;t have a membership yet. The first {TRIAL_DAYS}{" "}
                    days are free.
                  </p>
                  <div className="c-actions">
                    <Link className="btn btn-primary" href="/checkout">
                      Start my free {TRIAL_DAYS} days
                    </Link>
                  </div>
                </>
              )}

              {/* Separate from the membership on purpose. Someone reading their
                  billing panel should be able to see every charge this product
                  can ever make, not just the recurring one. */}
              <div className="later-costs">
                <p className="later-costs-head">
                  Separate, only if you ask for them
                </p>
                <dl className="dash-dl">
                  <dt>Values analysis</dt>
                  <dd>{`${money(PRICE_PROFILE)}, once — charged when you ask to see it, after the four parts are complete`}</dd>
                  <dt>An updated values analysis</dt>
                  <dd>{`${money(PRICE_PROFILE_UPDATE)} for each new one, once your answers have changed`}</dd>
                  <dt>Match analysis</dt>
                  <dd>{`${money(PRICE_MATCH)} for each report generated`}</dd>
                </dl>
                <p className="later-cost-note">
                  Neither is part of your membership, and editing your answers
                  is always free.
                </p>
              </div>
            </section>

            {/* ---- 5. the whole site ---- */}
            <section className="dash-card">
              <span className="c-mark">
                <BookOpen aria-hidden="true" />
              </span>
              <h2>About &amp; the method</h2>
              <p>Everything this product is, in plain language.</p>
              <ul className="dash-links">
                <li>
                  <Link href="/how-it-works#what">What Love Values is</Link>
                </li>
                <li>
                  <Link href="/how-it-works#why">Why values, not photos</Link>
                </li>
                <li>
                  <Link href="/how-it-works#how">How the four parts work</Link>
                </li>
                <li>
                  <Link href="/how-it-works#mirror">
                    A mirror, not a verdict
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works#voice">You can just talk</Link>
                </li>
                <li>
                  <Link href="/how-it-works#privacy">
                    What happens to what you write
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works#not">What this is not</Link>
                </li>
                <li>
                  <Link href="/how-it-works#cost">What it costs</Link>
                </li>
                <li>
                  <Link href="/how-it-works#match">
                    When you&apos;re ready to be seen
                  </Link>
                </li>
              </ul>
              <div className="c-actions">
                <Link className="btn btn-ghost" href="/privacy">
                  <ShieldCheck aria-hidden="true" /> Privacy
                </Link>
                <Link className="btn btn-ghost" href="/terms">
                  Terms
                </Link>
              </div>
            </section>
          </div>

          {/* Care is never buried behind a tab. */}
          <Link className="dash-care" href="/support">
            <LifeBuoy aria-hidden="true" />
            <span>
              <strong>
                Feelings can surface in this work, and that is normal.
              </strong>{" "}
              If you would like to talk to someone, the resources are here —
              always, and without having to explain yourself first.
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
