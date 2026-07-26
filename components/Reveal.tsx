'use client';

import { useEffect } from 'react';

/** Scroll-reveal for `.reveal` elements. Respects reduced-motion. */
export default function Reveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.14 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return null;
}
