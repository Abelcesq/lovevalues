/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * The reCAPTCHA SITE key, made visible to the browser.
   *
   * It is a public value by design — it ships inside every page that renders
   * the widget — but Next only inlines variables whose names start with
   * NEXT_PUBLIC_, and the key was set on Heroku as RECAPTCHA_SITE_KEY. Rather
   * than depend on someone remembering to rename a config var, accept either
   * spelling and map it here. The SECRET key is deliberately absent: it is
   * read only in lib/captcha.ts, on the server, and putting it in this block
   * would publish it to every visitor.
   *
   * HEROKU NOTE: this is resolved at BUILD time, not at boot. Heroku exposes
   * config vars to the build, so setting the var and redeploying works — but
   * changing the var alone does not. The new value only reaches the browser
   * after the next build.
   */
  env: {
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY:
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ??
      process.env.RECAPTCHA_SITE_KEY ??
      "",
    NEXT_PUBLIC_RECAPTCHA_VERSION:
      process.env.NEXT_PUBLIC_RECAPTCHA_VERSION ??
      process.env.RECAPTCHA_VERSION ??
      "",
  },
};

export default nextConfig;
