const DEFAULT_FLAGS = {
  enableNewOS: true,
};

const BLOCK_FLAGS = {
  dashboard: false,
  vandaag: false,
  planning: false,
  reflectie: false,
  archief: false,
};

const STORAGE_PREFIX = 'ff_';

function readStorageFlag(key) {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw === null) return null;
    return raw === 'true';
  } catch {
    return null;
  }
}

export function getFeatureFlag(key) {
  const stored = typeof window !== 'undefined' ? readStorageFlag(key) : null;
  if (stored !== null) return stored;
  return DEFAULT_FLAGS[key] ?? false;
}

export function setFeatureFlag(key, value) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(Boolean(value)));
  } catch {
    // Ignore storage issues and keep runtime behavior stable.
  }
}

export function getBlockFlag(blockId) {
  const key = `block_${blockId}`;
  const stored = typeof window !== 'undefined' ? readStorageFlag(key) : null;
  if (stored !== null) return stored;
  return BLOCK_FLAGS[blockId] ?? false;
}

export function getDefaultFlags() {
  return { ...DEFAULT_FLAGS };
}

export function getDefaultBlockFlags() {
  return { ...BLOCK_FLAGS };
}
