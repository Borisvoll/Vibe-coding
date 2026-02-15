const KEY = "vibe_coding_state_v1";

export function loadState(defaultState) {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : defaultState;
  } catch {
    return defaultState;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage kan vol zitten of geblokkeerd zijn
  }
}
