// Simple localStorage-backed storage with the same shape as the
// Claude-artifact window.storage API, so the rest of the app doesn't
// need to change when moving from an artifact to a real deployment.
//
// Swap this file out later for a real backend (e.g. calls to your own
// API backed by Postgres/Supabase/etc.) if you want data to sync
// across devices instead of living in one browser.

const PREFIX = "snapbite:";

export const storage = {
  async get(key) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw === null) return null;
      return { key, value: raw };
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, value);
      return { key, value };
    } catch {
      return null;
    }
  },

  async delete(key) {
    try {
      window.localStorage.removeItem(PREFIX + key);
      return { key, deleted: true };
    } catch {
      return null;
    }
  },

  async list(prefix = "") {
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) {
          keys.push(k.slice(PREFIX.length));
        }
      }
      return { keys, prefix };
    } catch {
      return null;
    }
  },
};
