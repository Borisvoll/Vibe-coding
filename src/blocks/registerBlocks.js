import './styles.css';
import { registerBPVMiniCard } from './bpv-mini-card/index.js';
import { registerSchoolMiniCard } from './school-mini-card/index.js';
import { registerPersonalMiniCard } from './personal-mini-card/index.js';

export function registerDefaultBlocks(registry) {
  registerBPVMiniCard(registry);
  registerSchoolMiniCard(registry);
  registerPersonalMiniCard(registry);
}
