"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/**
 * The reCAPTCHA widget, for the signup and login forms.
 *
 * SUPPORTS BOTH VERSIONS ON PURPOSE. v2 draws the "I'm not a robot" checkbox;
 * v3 is invisible and scores the session. Which one a site key belongs to is
 * not something you can tell by looking at the key, and using the wrong mode
 * fails in the worst way available — for v3-mode-with-a-v2-key, silently, with
 * no widget and no error, so nobody can sign up and nothing is logged. One
 * component that can do either costs about forty lines and removes that whole
 * class of outage. Set NEXT_PUBLIC_RECAPTCHA_VERSION (or RECAPTCHA_VERSION) to
 * "v3" to switch; anything else means v2.
 *
 * WHY v2 IS THE DEFAULT. A v3 score is a verdict with no appeal: a real person
 * on a VPN, a privacy browser, or a shared office address is simply told no,
 * with nothing to click and no way through. The people most likely to be
 * turned away are the privacy-conscious, which on this product is not a
 * coincidence — it is the audience. The checkbox is slower and more honest.
 *
 * THIS COMPONENT PROVES NOTHING BY ITSELF. The token it produces is only worth
 * something after lib/captcha.ts has had Google confirm it. Never gate
 * anything on this component alone.
 */

/* Minimal shape of what Google's script puts on `window`. Typed narrowly
   rather than `any` so a misuse shows up at compile time. */
type Grecaptcha = {
  ready: (cb: () => void) => void;
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => number;
  reset: (widgetId?: number) => void;
  getResponse: (widgetId?: number) => string;
  execute: (sitekey: string, opts: { action: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
const IS_V3 = (process.env.NEXT_PUBLIC_RECAPTCHA_VERSION ?? "") === "v3";

/**
 * Whether a captcha should appear at all.
 *
 * With no site key the forms render and behave exactly as they did before this
 * feature existed. That is the same posture as Stripe on /checkout: a
 * half-configured protection must never be the thing that stops someone
 * creating an account.
 */
export const captchaEnabled = Boolean(SITE_KEY);

/**
 * Shown when Google's script never arrived.
 *
 * It names the likeliest cause and gives two things to try, because the
 * alternative is a person staring at a form that will not let them in and has
 * not told them why. Defined here so the component and both pages say the
 * same sentence.
 */
export const BLOCKED_MESSAGE =
  "The security check couldn’t load — ad blockers and privacy extensions often block it. Please allow this page in your blocker, or try a different browser.";

/**
 * Why this is three outcomes and not a nullable string.
 *
 * "No token" has two completely different causes that need two completely
 * different things said to the person:
 *
 *   · unsolved — the checkbox is sitting there untouched. "Please tick it."
 *   · blocked  — Google's script never loaded, so there is nothing to tick.
 *     Ad blockers and privacy extensions block reCAPTCHA as a matter of
 *     course, so this is common, not exotic.
 *
 * Collapsed into null, both produce "please complete the security check
 * below" — pointing at empty space, for a person who cannot comply no matter
 * how many times they try. Found by running this page where Google is
 * unreachable, which is precisely what the blocked case looks like.
 */
export type TokenResult =
  | { status: "ok"; token: string }
  | { status: "unsolved" }
  | { status: "blocked" }
  | { status: "off" };

export type CaptchaHandle = {
  getToken: () => Promise<TokenResult>;
  /** Throw away the current token. MUST be called after a failed submit. */
  reset: () => void;
};

const SCRIPT_ID = "recaptcha-script";

/** Load Google's script once per page, no matter how many widgets ask. */
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve());
      /* If it already loaded between the check above and this listener,
         nothing will fire. Resolve anyway and let the caller's grecaptcha
         check decide. */
      existing.addEventListener("error", () => resolve());
    });
  }

  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    /* v3 needs the key up front so it can start scoring; v2 does not. */
    s.src = IS_V3
      ? `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`
      : "https://www.google.com/recaptcha/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    /* A blocked or failed script must not wedge the form. getToken returns
       null, the server sees no token — and with no secret configured the
       server waves it through, which is the correct behaviour while this is
       being rolled out. */
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

const Captcha = forwardRef<CaptchaHandle, { action: string }>(function Captcha(
  { action },
  ref,
) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!captchaEnabled) return;
    let cancelled = false;

    loadScript().then(() => {
      if (cancelled) return;
      const g = window.grecaptcha;
      if (!g) {
        setFailed(true);
        return;
      }
      if (IS_V3) return; // nothing to draw

      g.ready(() => {
        /* React 19 StrictMode mounts effects twice in development. Rendering
           the widget twice into the same node throws, and the thrown error
           looks like a reCAPTCHA configuration problem rather than a React
           one. Guard on the id we already hold. */
        if (cancelled || widgetId.current !== null || !boxRef.current) return;
        try {
          widgetId.current = g.render(boxRef.current, { sitekey: SITE_KEY });
        } catch {
          setFailed(true);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const getToken = useCallback(async (): Promise<TokenResult> => {
    if (!captchaEnabled) return { status: "off" };

    const g = window.grecaptcha;
    /* No script object at all: it was blocked, or the network ate it. */
    if (!g) return { status: "blocked" };

    if (IS_V3) {
      try {
        /* v3 tokens expire after about two minutes, so one is fetched per
           submit rather than held from mount. */
        const token = await g.execute(SITE_KEY, { action });
        return token ? { status: "ok", token } : { status: "blocked" };
      } catch {
        /* v3 has no checkbox, so a failure here is never the person's doing. */
        return { status: "blocked" };
      }
    }

    if (widgetId.current === null) return { status: "blocked" };

    try {
      const token = g.getResponse(widgetId.current);
      return token ? { status: "ok", token } : { status: "unsolved" };
    } catch {
      return { status: "blocked" };
    }
  }, [action]);

  const reset = useCallback(() => {
    if (!captchaEnabled || IS_V3) return;
    try {
      window.grecaptcha?.reset(widgetId.current ?? undefined);
    } catch {
      /* Nothing to reset. */
    }
  }, []);

  useImperativeHandle(ref, () => ({ getToken, reset }), [getToken, reset]);

  if (!captchaEnabled) return null;

  /* v3 draws nothing, but Google's terms require the disclosure wherever the
     badge is hidden — and the badge is hidden here because a floating square
     over the corner of a signup form looks like a defect. */
  if (IS_V3) {
    return (
      <p className="captcha-note">
        Protected by reCAPTCHA. Google&apos;s{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>{" "}
        and{" "}
        <a
          href="https://policies.google.com/terms"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms
        </a>{" "}
        apply.
      </p>
    );
  }

  return (
    <div className="captcha">
      <div ref={boxRef} />
      {failed && <p className="captcha-note">{BLOCKED_MESSAGE}</p>}
    </div>
  );
});

export default Captcha;
