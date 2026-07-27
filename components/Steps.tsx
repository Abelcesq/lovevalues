/**
 * The three-step rail for the sign-up flow: Account → Plan → Begin.
 *
 * Kept as its own component because all three steps need it and none of them
 * should be importing from another page's module.
 */
export default function Steps({ current }: { current: 1 | 2 | 3 }) {
  const labels = ['Account', 'Plan', 'Begin'];
  return (
    <ol className="steps-rail" aria-label="Progress">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        return (
          <li
            key={label}
            className={n < current ? 'done' : n === current ? 'now' : ''}
            aria-current={n === current ? 'step' : undefined}
          >
            <span className="dot" aria-hidden="true">
              {n < current ? '✓' : n}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
