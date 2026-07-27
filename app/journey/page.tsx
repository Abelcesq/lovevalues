'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { Footer, Nav } from '@/components/Chrome';
import QuestionField from '@/components/QuestionField';
import ValuesCardSort from '@/components/ValuesCardSort';
import {
  MODULES,
  isQuestionVisible,
  questionsForModule,
  type ModuleId,
} from '@/lib/method';
import { useProfile } from '@/lib/useProfile';

/** Screens per module. Values gets four card-sort passes before its questions. */
const SCREENS: Record<ModuleId, string[]> = {
  values: ['sort', 'top-ten', 'core', 'operationalize', 'questions'],
  roots: ['questions'],
  patterns: ['questions'],
  habits: ['questions'],
};

const ORDER: ModuleId[] = ['values', 'roots', 'patterns', 'habits'];

export default function JourneyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Journey />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="loading">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}

function Journey() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile, hydrated, update, setAnswer } = useProfile();

  const moduleId = (params.get('m') as ModuleId) || 'values';
  const module = MODULES.find((m) => m.id === moduleId) ?? MODULES[0];
  const screens = SCREENS[module.id];
  const screenIndex = Math.min(Math.max(Number(params.get('s') ?? 0), 0), screens.length - 1);
  const screen = screens[screenIndex];

  const visibleQuestions = useMemo(
    () => questionsForModule(module.id).filter((q) => isQuestionVisible(q, profile.answers)),
    [module.id, profile.answers],
  );

  const go = (m: ModuleId, s: number) => {
    router.push(`/journey?m=${m}&s=${s}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const moduleIdx = ORDER.indexOf(module.id);
  const isFirstScreen = moduleIdx === 0 && screenIndex === 0;
  const isLastScreen = moduleIdx === ORDER.length - 1 && screenIndex === screens.length - 1;

  const back = () => {
    if (screenIndex > 0) return go(module.id, screenIndex - 1);
    const prev = ORDER[moduleIdx - 1];
    if (prev) return go(prev, SCREENS[prev].length - 1);
  };

  const next = () => {
    if (screenIndex < screens.length - 1) return go(module.id, screenIndex + 1);
    const upcoming = ORDER[moduleIdx + 1];
    if (upcoming) return go(upcoming, 0);
    router.push('/profile');
  };

  if (!hydrated) return <Loading />;

  return (
    <>
      <Nav />
      <main className="journey">
        <div className="wrap">
          {/* module rail */}
          <nav className="rail" aria-label="Your progress">
            {MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`rail-item ${m.id === module.id ? 'active' : ''} ${
                  ORDER.indexOf(m.id) < moduleIdx ? 'done' : ''
                }`}
                onClick={() => go(m.id, 0)}
              >
                <span className="n">{m.number}</span>
                {m.title}
              </button>
            ))}
          </nav>

          {/* module opening, on the first screen only */}
          {screenIndex === 0 && (
            <div className="module-open">
              <span className="eyebrow">Module {module.number}</span>
              <h1>{module.title}</h1>
              <p>{module.opening}</p>
            </div>
          )}

          {screen === 'questions' ? (
            <>
              {visibleQuestions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={profile.answers[q.id] ?? ''}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              ))}
            </>
          ) : (
            <ValuesCardSort profile={profile} update={update} pass={screenIndex} />
          )}

          <div className="controls">
            {!isFirstScreen && (
              <button type="button" className="btn btn-ghost btn-lg" onClick={back}>
                Back
              </button>
            )}
            <button type="button" className="btn btn-primary btn-lg" onClick={next}>
              {isLastScreen ? 'See your reflection' : 'Continue'}
            </button>
            <Link className="btn btn-ghost btn-lg" href="/review">
              Review everything
            </Link>
          </div>

          <p className="save-note">
            Saved on this device as you go. You can leave and come back — and change any answer,
            anytime.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
