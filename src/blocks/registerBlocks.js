import './styles.css';
import './inbox/styles.css';
import './tasks/styles.css';
import './bpv-log-summary/styles.css';
import { registerBPVMiniCard } from './bpv-mini-card/index.js';
import { registerBPVTodayBlock } from './bpv-today/index.js';
import { registerPersonalMiniCard } from './personal-mini-card/index.js';
import { registerSchoolCurrentProjectBlock } from './school-current-project/index.js';
import { registerSchoolMilestonesBlock } from './school-milestones/index.js';
import { registerSchoolSkillTrackerBlock } from './school-skill-tracker/index.js';
import { registerSchoolConceptVaultBlock } from './school-concept-vault/index.js';
import { registerSchoolTodayBlock } from './school-today/index.js';
import { registerPersonalTodayBlock } from './personal-today/index.js';
import { registerPersonalEnergyBlock } from './personal-energy/index.js';
import { registerPersonalWeeklyReflectionBlock } from './personal-weekly-reflection/index.js';
import { registerPersonalWeekPlanningBlock } from './personal-week-planning/index.js';
import { registerInboxBlock } from './inbox/index.js';
import { registerTasksBlock } from './tasks/index.js';
import { registerBPVLogSummaryBlock } from './bpv-log-summary/index.js';

export function registerDefaultBlocks(registry) {
  // Core blocks (order matters for today-sections)
  registerInboxBlock(registry);
  registerTasksBlock(registry);
  registerBPVLogSummaryBlock(registry);

  // BPV mode blocks
  registerBPVMiniCard(registry);
  registerBPVTodayBlock(registry);

  // School mode blocks
  registerSchoolCurrentProjectBlock(registry);
  registerSchoolMilestonesBlock(registry);
  registerSchoolSkillTrackerBlock(registry);
  registerSchoolConceptVaultBlock(registry);
  registerSchoolTodayBlock(registry);

  // Personal mode blocks
  registerPersonalMiniCard(registry);
  registerPersonalTodayBlock(registry);
  registerPersonalEnergyBlock(registry);
  registerPersonalWeeklyReflectionBlock(registry);
  registerPersonalWeekPlanningBlock(registry);
}
