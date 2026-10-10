import { useSyncExternalStore } from 'react';

// Favorite restaurants (♡ on cards; shown as "Favorites" in the UI). Kept in this
// browser only: a demo convenience, not an account feature. Favoriting also sends an
// Algolia conversion event (see RestaurantCard), a preference signal Personalization
// can learn from.
const STORAGE_KEY = 'saved-restaurants'; // original key kept so existing favorites survive

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set(); // storage blocked (private mode etc.): start empty
  }
}

let favorites = read();
const listeners = new Set<() => void>();

function write(next: Set<string>) {
  favorites = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Not persisted, but still works for this visit.
  }
  listeners.forEach((l) => l());
}

export function toggleFavorite(objectID: string) {
  const next = new Set(favorites);
  if (next.has(objectID)) next.delete(objectID);
  else next.add(objectID);
  write(next);
  return next.has(objectID);
}

/** Re-renders every card when a favorite is added or removed. */
export function useFavorites() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => favorites,
  );
}
