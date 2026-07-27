'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type TocEntry = { id: string; label: string };

/**
 * The sticky table of contents.
 *
 * It exists for one reason: the home page is long-form on purpose, and a long
 * page without a map is a page people bounce off. The rail tells a reader
 * up-front what the whole argument is and lets them jump to the part they
 * actually came for — usually "what it costs" or "what happens to what I
 * write".
 *
 * Highlighting uses the LAST heading that has passed the top of the viewport
 * rather than IntersectionObserver's "is visible" test. Visibility is the
 * wrong signal here: two short sections are on screen at once, so the observer
 * flickers between them as you scroll.
 */
export default function Toc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState(entries[0]?.id ?? '');

  useEffect(() => {
    const onScroll = () => {
      let current = entries[0]?.id ?? '';
      for (const entry of entries) {
        const el = document.getElementById(entry.id);
        if (!el) continue;
        // 120px allows for the sticky header plus a little breathing room, so
        // a section counts as "current" just before its heading hits the nav.
        if (el.getBoundingClientRect().top <= 120) current = entry.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [entries]);

  return (
    <aside className="toc-rail">
      <p className="toc-label">On this page</p>
      <ul className="toc-list">
        {entries.map((e) => (
          <li key={e.id}>
            <a href={`#${e.id}`} className={active === e.id ? 'on' : undefined}>
              {e.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="rail-cta">
        <p>Free for your first 30 days.</p>
        <Link className="btn btn-primary" href="/begin">
          Begin
        </Link>
      </div>
    </aside>
  );
}
