export const DEMO_SCHEMA_VERSION = 1;
export const DEMO_STORAGE_KEY = "temu-kopi:demo-state";

export function deepClone(value) {
  if (value === undefined) return undefined;
  return structuredClone(value);
}

export function createDemoState(seed = {}) {
  return {
    ...deepClone(seed),
    schemaVersion: DEMO_SCHEMA_VERSION,
  };
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function validStoredState(value) {
  return value && typeof value === "object" && value.schemaVersion === DEMO_SCHEMA_VERSION;
}

export function loadDemoState({ storage = browserStorage(), key = DEMO_STORAGE_KEY, seed = {} } = {}) {
  if (!storage) return createDemoState(seed);
  try {
    const raw = storage.getItem(key);
    if (!raw) return createDemoState(seed);
    const parsed = JSON.parse(raw);
    return validStoredState(parsed) ? deepClone(parsed) : createDemoState(seed);
  } catch {
    return createDemoState(seed);
  }
}

export function saveDemoState(state, { storage = browserStorage(), key = DEMO_STORAGE_KEY } = {}) {
  const snapshot = createDemoState(state);
  if (!storage) return snapshot;
  storage.setItem(key, JSON.stringify(snapshot));
  return deepClone(snapshot);
}

export function resetDemoState(seed = {}, { storage = browserStorage(), key = DEMO_STORAGE_KEY } = {}) {
  const fresh = createDemoState(seed);
  if (storage) storage.setItem(key, JSON.stringify(fresh));
  return deepClone(fresh);
}
