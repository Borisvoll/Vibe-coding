const KEY = "vibe_coding_data_v1";

export function loadData(defaultValue = "") {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? defaultValue : JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export function saveData(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // storage kan vol zitten of geblokkeerd zijn
  }
}
