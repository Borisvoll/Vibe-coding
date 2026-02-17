import { getBlockFlag } from './featureFlags.js';

export function createBlockRegistry() {
  const blocks = new Map();

  function register(block) {
    if (!block || !block.id) {
      throw new Error('Block registration requires an id.');
    }
    blocks.set(block.id, block);
  }

  function unregister(blockId) {
    blocks.delete(blockId);
  }

  function get(blockId) {
    return blocks.get(blockId) || null;
  }

  function getAll() {
    return [...blocks.values()];
  }

  function getEnabled() {
    return getAll().filter((block) => {
      if (typeof block.enabled === 'boolean') return block.enabled;
      return getBlockFlag(block.id);
    });
  }

  return {
    register,
    unregister,
    get,
    getAll,
    getEnabled,
  };
}
