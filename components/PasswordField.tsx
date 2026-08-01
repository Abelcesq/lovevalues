"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/**
 * A password input with a show/hide toggle.
 *
 * Shared by /signup and /login rather than written twice, so the two can't
 * drift into behaving differently — the moment they do, one of them ends up
 * without the toggle after a refactor and nobody notices.
 *
 * Details that matter more than they look:
 *
 * · `type="button"`. Inside a <form>, a button with no type defaults to
 *   "submit" — tapping the eye would submit the signup form with a
 *   half-typed password and show a validation error instead of revealing
 *   anything.
 *
 * · The `type` attribute flips on the SAME input node; the input is never
 *   swapped for a different element. Password managers key off the field's
 *   identity, and replacing the node makes some of them lose track of it or
 *   re-prompt to save.
 *
 * · `autoComplete` stays on the input in both states, so the browser's own
 *   password manager keeps working while the password is visible.
 *
 * · The toggle is not in the tab order between the field and the submit
 *   button by accident — it sits after the input deliberately, so keyboard
 *   users reach Show before Continue rather than skipping past it.
 *
 * · `aria-pressed` communicates the on/off state, and the label says what the
 *   button will DO next ("Show password" / "Hide password") rather than what
 *   the state currently is. Screen reader users otherwise hear the two halves
 *   contradict each other.
 *
 * Revealing a password is a deliberate trade: it is the single most effective
 * fix for typos in a field nobody can proofread, and this product asks for a
 * 10-character passphrase. The risk is someone reading over a shoulder, which
 * is why it always starts hidden and never persists across page loads.
 */
export default function PasswordField({
  id = "password",
  label = "Password",
  hint,
  value,
  onChange,
  autoComplete = "current-password",
}: {
  id?: string;
  label?: string;
  hint?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input
          id={id}
          name={id}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          /* Password managers and browsers sometimes auto-capitalise or
             autocorrect a revealed password, silently changing what was
             typed. Off in both states. */
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-controls={id}
          aria-label={shown ? "Hide password" : "Show password"}
          title={shown ? "Hide password" : "Show password"}
        >
          {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          <span className="pw-toggle-text">{shown ? "Hide" : "Show"}</span>
        </button>
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
