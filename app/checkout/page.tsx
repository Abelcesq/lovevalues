"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Lock,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Footer, Nav } from "@/components/Chrome";
import Steps from "@/components/Steps";
import { loadAccount, startTrial } from "@/lib/account";
import { LATER_COSTS, PRICE_MONTHLY, TRIAL_DAYS, money } from "@/lib/plan";

/**
 * Step 2 of 3 — start the 7 days.
 *
 * There is ONE membership at $9.99/month. The $29.99 values report and the
 * $9.99-per-report match analysis are separate purchases that come later,
 * disclosed below the button. See lib/plan.ts — that file is the single
 * definition of the billing model and every page quotes it.
 *
 * The card itself is collected by Stripe, on Stripe's domain — see the header
 * of app/api/checkout/route.ts for why there is no card form here and why you
 * should not add one.
 *
 * When Stripe is not configured the route answers 503, and this page turns
 * that into a working trial instead of a dead end. That is deliberate: the
 * thing this product needs next is a stranger going through the method, and a
 * pay wall that cannot take payment would block exactly that.
 */
export default function Checkout() {
  const router = useRouter();
  /* There is one membership, so there is nothing to choose. Kept as a
     constant rather than deleted because /api/checkout and startTrial both
     still take a plan name. */
  const plan = "monthly" as const;
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const account = loadAccount();
    if (!account) {
      router.replace("/signup");
      return;
    }
    setEmail(account.email);
    setChecked(true);
  }, [router]);

  async function start() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email }),
      });
      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }

      // Payments not live yet — start the trial and let them into the method.
      startTrial(plan);
      setNotice(
        data.message ??
          "Payments are not switched on yet. Your 7 days start now.",
      );
      setTimeout(() => router.push("/begin"), 1400);
    } catch {
      startTrial(plan);
      router.push("/begin");
    }
  }

  if (!checked) return null;

  const ends = new Date();
  ends.setDate(ends.getDate() + TRIAL_DAYS);

  return (
    <>
      <Nav variant="flow" />
      <main className="journey">
        <div className="auth auth-wide">
          <Steps current={2} />

          <div className="auth-head">
            <h1>Start your {TRIAL_DAYS} days free</h1>
            <p>
              Nothing is charged today. Cancel any time before{" "}
              <strong>
                {ends.toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })}
              </strong>{" "}
              and you pay nothing at all.
            </p>
          </div>

          {/* ONE membership, not a choice between plans.
              This used to offer $9.99/mo and $29.99 side by side as
              alternatives, which misrepresented the product: the membership is
              access, and the report is a separate purchase ON TOP of it. The
              two later costs are disclosed below the button rather than sold
              here, because nobody can buy them yet — the report needs the four
              modules finished, and match analysis needs a second person. */}
          <div className="plans plans-single">
            <PlanCard
              id="monthly"
              selected
              onSelect={() => {}}
              tag="Your membership"
              name="Membership"
              price={money(PRICE_MONTHLY)}
              cadence="per month, after your free week"
              features={[
                "Ongoing access to your profile — edit and update anytime",
                "Access to your unique, personal value assessment — regenerate a new one or request a match analysis",
                "Cancel in one click",
              ]}
            />
          </div>

          <div className="pay-box">
            <p className="pay-head">
              <CreditCard aria-hidden="true" />
              Payment details
            </p>
            <p className="pay-body">
              We hand you to Stripe to enter your card — it never touches our
              servers. You will come straight back here afterwards.
            </p>

            {notice && <p className="pay-notice">{notice}</p>}

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={start}
              disabled={busy}
            >
              {busy ? "One moment…" : `Start my ${TRIAL_DAYS} days free`}
              {!busy && <ArrowRight aria-hidden="true" />}
            </button>

            <ul className="pay-assurances">
              <li>
                <Lock aria-hidden="true" /> Card handled by Stripe, never by us
              </li>
              <li>
                <ShieldCheck aria-hidden="true" /> Cancel any time, in one click
              </li>
            </ul>

            {/* The two purchases that come later. Disclosed here, before anyone
                pays anything, rather than sprung on them at the moment they
                want a report — a person who finds out about a $29.99 charge
                only after finishing four modules has been misled, however
                accurate the fine print was. Collapsed by default so the page
                still reads as one simple decision. */}
            <div className="later-costs">
              <p className="later-costs-head">
                Other costs, when you&apos;re ready
              </p>
              {LATER_COSTS.map((c) => (
                <div key={c.id} className="later-cost">
                  <button
                    type="button"
                    className="later-cost-btn"
                    aria-expanded={open === c.id}
                    onClick={() => setOpen(open === c.id ? null : c.id)}
                  >
                    <span className="later-cost-price">{money(c.price)}</span>
                    <span className="later-cost-title">{c.title}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={open === c.id ? "flip" : ""}
                    />
                  </button>
                  {open === c.id && (
                    <p className="later-cost-body">
                      <strong>{c.when}.</strong> {c.body}
                    </p>
                  )}
                </div>
              ))}
              <p className="later-cost-note">
                Neither is charged today, and neither is part of your
                membership. Your membership keeps your profile open and
                editable; these are billed separately, only if and when you ask
                for them.
              </p>
            </div>
          </div>

          <p className="auth-alt">
            <Link href="/how-it-works">What am I actually getting?</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function PlanCard({
  id,
  name,
  price,
  cadence,
  features,
  tag,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  price: string;
  cadence: string;
  features: string[];
  tag?: string;
  selected: boolean;
  onSelect: (p: string) => void;
}) {
  return (
    <button
      type="button"
      className={`plan${selected ? " sel" : ""}`}
      onClick={() => onSelect(id)}
      aria-pressed={selected}
    >
      {tag && <span className="tag">{tag}</span>}
      <span className="plan-name">{name}</span>
      <span className="price-n">{price}</span>
      <span className="price-sub">{cadence}</span>
      <ul>
        {features.map((f) => (
          <li key={f}>
            <Check aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}
