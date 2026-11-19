/**
 * Sending email. One provider, one function, inert without a key.
 *
 * Resend over HTTP rather than SMTP: the EZAITASK build uses Resend through
 * Django's SMTP backend, which is the right call there because Django brings
 * the mail layer with it. Here there is no mail layer, and adding one — plus
 * an SMTP library and its connection handling — to send one kind of message
 * is more moving parts than a POST.
 *
 * NOT CONFIGURED IS NOT AN ERROR TO SWALLOW. Without RESEND_API_KEY the link
 * is written to the dyno log and the caller is told it was not delivered.
 * That keeps local development working, and on a real deployment it means a
 * password reset that cannot be delivered says so instead of silently
 * promising an email that will never arrive — which is the failure a person
 * waits twenty minutes to be sure of.
 */

export const emailConfigured = Boolean(process.env.RESEND_API_KEY);

/** Who it comes from. Must be a domain verified in Resend, or every send is
    rejected with an error that reads like a bad key. */
const FROM =
  process.env.EMAIL_FROM ?? "Love Values <noreply@lovevalues.com>";

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<SendResult> {
  if (!emailConfigured) {
    /* The link, where a developer can reach it. Never in production — the
       absence of a key there is the thing that needs fixing, and the log
       line is how you find out. */
    console.warn(
      `email: RESEND_API_KEY not set, nothing sent. To=${to} Subject=${subject}\n${text}`,
    );
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("email: provider rejected", res.status, detail.slice(0, 300));
      return { ok: false, error: `provider_${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.error("email: could not reach provider", error);
    return { ok: false, error: "unreachable" };
  }
}

/**
 * The reset email.
 *
 * Plain text, deliberately. A reset link is exactly the shape of a phishing
 * message, and an HTML email with a styled button is the shape people have
 * been taught to distrust — and that spam filters treat accordingly. It also
 * says what to do if they did not ask for it, which is the sentence that
 * matters most to the one person receiving this who did not request it.
 */
export function resetEmailBody(link: string, minutes: number): string {
  return `Someone asked to reset the password for your Love Values account.

Open this link to choose a new one:

${link}

The link works once and expires in ${minutes} minutes.

If this wasn't you, you can ignore this email — your password has not been
changed and nobody has been given access to your account.

— Love Values
`;
}
