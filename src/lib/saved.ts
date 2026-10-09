import { useSyncExternalStore } from 'react';

// Saved restaurants (♡ on cards). Kept in this browser only: a demo convenience, not an
// account feature. Saving also sends an Algolia conversion event (see RestaurantCard),
// a preference signal Personalization can learn from.
const STORAGE_KEY = 'saved-restaurants';

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set(); // storage blocked (private mode etc.): start empty
  }
}

let saved = read();
const listeners = new Set<() => void>();

function write(next: Set<string>) {
  saved = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Not persisted, but still works for this visit.
  }
  listeners.forEach((l) => l());
}

export function toggleSaved(objectID: string) {
  const next = new Set(saved);
  if (next.has(objectID)) next.delete(objectID);
  else next.add(objectID);
  write(next);
  return next.has(objectID);
}

/** Re-renders every card when anything is saved or unsaved. */
export function useSaved() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => saved,
  );
}
