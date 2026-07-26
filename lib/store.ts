'use client';

/**
 * Local-first storage for the MVP.
 *
 * Deliberate Phase-0 decision: nothing a user writes here leaves their browser
 * unless they explicitly ask for a synthesis. There is no account system and
 * no server-side persistence yet, because the data/privacy architecture is an
 * open item (Project Container, Part 5) and this is exactly the data category
 * you do not want to store casually. When the real backend lands, this module
 * is the single seam to replace.
 */

import type { SortBucket } from './method';

const KEY = 'lovevalues.profile.v1';

export type Synthesis = {
  /** Duty-of-care routing set by the engine. See lib/care.ts. */
  careFlag?: 'none' | 'gentle' | 'urgent' | 'safety';
  coreValues: { value: string; whyItMatters: string }[];
  operatingSystem: string;
  howYouPresent: string;
  lovingFeedback: string;
  growthPractices: { practice: string; why: string }[];
  generatedAt: string;
};

export type ProfileState = {
  /** Pass 1 of the card sort. */
  sort: Record<string, SortBucket>;
  /** Pass 2 — up to 10 ids carried forward from "very important". */
  topTen: string[];
  /** Pass 3 — the 3–5 that win when values collide. */
  coreValues: string[];
  /** Free-text operationalization, keyed by value id. */
  operationalized: Record<string, { definition: string; dos: string; donts: string }>;
  /** All narrative answers, keyed by question id. */
  answers: Record<string, string>;
  synthesis: Synthesis | null;
  /** "Does this resonate?" — yes | partly | no, plus the correction. */
  resonance: { verdict: 'yes' | 'partly' | 'no'; correction: string } | null;
  updatedAt: string;
};

export const EMPTY_PROFILE: ProfileState = {
  sort: {},
  topTen: [],
  coreValues: [],
  operationalized: {},
  answers: {},
  synthesis: null,
  resonance: null,
  updatedAt: '',
};

export function loadProfile(): ProfileState {
  if (typeof window === 'undefined') return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROFILE;
    return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<ProfileState>) };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function saveProfile(next: ProfileState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...next, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* Quota or private-browsing failure — the session still works in memory. */
  }
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}

/** Export everything as a file the user owns outright. */
export function downloadProfile(profile: ProfileState): void {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'love-values-profile.json';
  a.click();
  URL.revokeObjectURL(url);
}
