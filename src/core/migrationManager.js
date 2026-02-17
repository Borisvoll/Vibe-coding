export const CORE_SCHEMA_VERSION = 1;

const migrations = {
  1: async () => {
    // Placeholder for future Boris OS schema bootstrap.
    // Example target stores: os_blocks, os_layouts, os_state.
  },
};

export async function runCoreMigrations({ fromVersion = 0, toVersion = CORE_SCHEMA_VERSION } = {}) {
  for (let version = fromVersion + 1; version <= toVersion; version += 1) {
    const migrate = migrations[version];
    if (migrate) {
      await migrate();
    }
  }

  return { fromVersion, toVersion };
}

export function getCoreMigrationPlan() {
  return {
    currentVersion: CORE_SCHEMA_VERSION,
    versions: Object.keys(migrations).map(Number).sort((a, b) => a - b),
    strategy: 'append-only schema versions; no destructive store migration',
  };
}
