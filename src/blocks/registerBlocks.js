import './styles.css';
import { registerBPVMiniCard } from './bpv-mini-card/index.js';
import { registerPersonalMiniCard } from './personal-mini-card/index.js';
import { registerSchoolCurrentProjectBlock } from './school-current-project/index.js';
import { registerSchoolMilestonesBlock } from './school-milestones/index.js';
import { registerSchoolSkillTrackerBlock } from './school-skill-tracker/index.js';
import { registerSchoolConceptVaultBlock } from './school-concept-vault/index.js';

export function registerDefaultBlocks(registry) {
  registerBPVMiniCard(registry);
  registerPersonalMiniCard(registry);

  registerSchoolCurrentProjectBlock(registry);
  registerSchoolMilestonesBlock(registry);
  registerSchoolSkillTrackerBlock(registry);
  registerSchoolConceptVaultBlock(registry);
}
