"use client";

import { ArrowRight, Check, Lock, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Footer, Nav } from "@/components/Chrome";
import { loadAccount } from "@/lib/account";
import { money } from "@/lib/plan";
import {
  canGenerate,
  reportKind,
  reportPlan,
  reportPrice,
  grantCredit,
} from "@/lib/reports";
import { useProfile } from "@/lib/useProfile";

/**
 * The charge for the reflection, between Module 4 and the analysis.
 *
 * WHY IT IS HERE AND NOT EARLIER (CEO, 2026-08-03). "See your reflection" is
 * the moment the person is asking for the thing the money is for. Charging at
 * signup would take money before anyone knows whether the method is for them;
 * charging after the analysis has been read is not charging at all.
 *
 * The price depends on whether this is their first report — see lib/reports.ts,
 * which owns that decision and explains why this gate is a display choice
 * rather than a security boundary. Read that header before adding checks here.
 *
 * Two behaviours that are deliberate and should survive edits:
 *
 *   · WITH A CREDIT ALREADY IN HAND, this page does not appear. Someone who
 *     paid and then hit refresh, or came back a day later to a reflection they
 *     have not generated yet, goes straight through. A pay screen shown to
 *     someone who has already paid is the worst screen in any product.
 *
 *   · WITH STRIPE UNCONFIGURED, the route answers 503 and this page grants the
 *     credit anyway and says so on screen. Same fall-through as /checkout, same
 *     reason: the next thing this product needs is a stranger completing the
 *     method, and a pay wall that cannot take payment would block exactly that.
 *     The grant is marked "unconfigured", never "paid", so nothing later
 *     mistakes it for revenue.
 */
export default function UnlockPage() {
  return (
    <Suspense fallback={null}>
      <Unlock />
    </Suspense>
  );
}

function Unlock() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile, hydrated, update } = useProfile();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);

  const kind = reportKind(profile);
  const price = reportPrice(kind);
  const first = kind === "first";
  const paidReturn = params.get("paid") === "1";
  const cancelled = params.get("cancelled") === "1";

  /* Coming back from Stripe. The credit is written here because there is no
     webhook yet — when there is one, THAT is what should grant it, and this
     effect becomes a redirect and nothing more. */
  useEffect(() => {
    if (!hydrated || !paidReturn || granted) return;
    setGranted(true);
    update((p) => grantCredit(p, "paid", new Date().toISOString()));
    router.replace("/profile");
  }, [hydrated, paidReturn, granted, update, router]);

  /* Already holds a credit — nothing to sell. */
  useEffect(() => {
    if (!hydrated || paidReturn) return;
    if (canGenerate(profile)) router.replace("/profile");
  }, [hydrated, paidReturn, profile, router]);

  async function pay() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: reportPlan(kind),
          email: loadAccount()?.email,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.error === "not_configured") {
        update((p) => grantCredit(p, "unconfigured", new Date().toISOString()));
        setNotice(
          "Payments aren’t switched on yet, so nothing has been charged. Taking you to your reflection.",
        );
        setTimeout(() => router.push("/profile"), 1400);
        return;
      }

      setNotice(
        "We couldn’t reach the payment provider. Nothing was charged — please try again in a moment.",
      );
    } catch {
      setNotice(
        "We couldn’t reach the payment provider. Nothing was charged — please try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return null;

  return (
    <>
      <Nav />
      <main className="journey">
        <div className="wrap wrap-narrow">
          <div className="module-open">
            <span className="eyebrow">
              {first ? "Your values report" : "An updated report"}
            </span>
            <h1>
              {first
                ? "Everything you wrote is ready to be read"
                : "Generate a fresh reading"}
            </h1>
            <p>
              {first
                ? "This is the analysis of your own answers — the part that names what you value, how you show up, and what would let someone see you clearly. It is a separate cost from your membership, charged once."
                : "Your first report is already yours to keep. This generates a new one from your answers as they stand today, so you can see what has changed."}
            </p>
          </div>

          {cancelled && (
            <div className="notice">
              Nothing was charged. Your answers are exactly where you left them.
            </div>
          )}

          <div className="pay-box">
            <p className="pay-head">
              <span className="unlock-price">{money(price)}</span>
              {first ? "once, for your first report" : "for this report"}
            </p>

            <ul className="unlock-list">
              <li>
                <Check aria-hidden="true" />
                Your values, named — and why each one matters to you
              </li>
              <li>
                <Check aria-hidden="true" />
                The qualities that work in your favour, and the ones that get in
                the way, each named with the evidence from your own words
              </li>
              <li>
                <Check aria-hidden="true" />
                Practices you can start this week
              </li>
              <li>
                <Check aria-hidden="true" />
                Yours to keep, read again, and print
              </li>
            </ul>

            {notice && <p className="pay-notice">{notice}</p>}

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={pay}
              disabled={busy}
            >
              {busy ? "One moment…" : `Pay ${money(price)} and read it`}
              {!busy && <ArrowRight aria-hidden="true" />}
            </button>

            <ul className="pay-assurances">
              <li>
                <Lock aria-hidden="true" /> Card handled by Stripe, never by us
              </li>
              <li>
                <ShieldCheck aria-hidden="true" /> Charged once — not a
                subscription
              </li>
              <li>
                <Pencil aria-hidden="true" /> Editing your answers is always
                free, and so is asking the analysis to reconsider a section
                while you read it
              </li>
            </ul>
          </div>

          <div className="controls" style={{ border: 0 }}>
            <Link className="btn btn-ghost btn-lg" href="/review">
              Review my answers first
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/dashboard">
              Not right now
            </Link>
          </div>

          <p className="save-note">
            Your answers stay on this device. Nothing here is shared with anyone.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
