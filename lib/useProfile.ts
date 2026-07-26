'use client';

import { useCallback, useEffect, useState } from 'react';
import { EMPTY_PROFILE, loadProfile, saveProfile, type ProfileState } from './store';

/**
 * Single source of truth for the living profile. Every write persists
 * immediately — the user should never lose an answer to a closed tab.
 */
export function useProfile() {
  const [profile, setProfile] = useState<ProfileState>(EMPTY_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setHydrated(true);
  }, []);

  const update = useCallback(
    (mutate: (draft: ProfileState) => ProfileState) => {
      setProfile((current) => {
        const next = mutate(current);
        saveProfile(next);
        return next;
      });
    },
    [],
  );

  const setAnswer = useCallback(
    (questionId: string, value: string) => {
      update((p) => ({ ...p, answers: { ...p.answers, [questionId]: value } }));
    },
    [update],
  );

  return { profile, hydrated, update, setAnswer };
}
