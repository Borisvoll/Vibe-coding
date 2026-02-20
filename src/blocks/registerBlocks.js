import './styles.css';
import '../ui/collapsible-section.css';
import './inbox/styles.css';
import './inbox-screen/styles.css';
import './tasks/styles.css';
import './bpv-log-summary/styles.css';
import './bpv-quick-log/styles.css';
import './bpv-weekly-overview/styles.css';
import './school-dashboard/styles.css';
import './personal-dashboard/styles.css';
import './weekly-review/styles.css';
import './daily-outcomes/styles.css';
import './daily-todos/styles.css';
import './daily-reflection/styles.css';
import './schedule-placeholder/styles.css';
import './projects/styles.css';
import './dashboard/styles.css';
import './daily-cockpit/styles.css';
import './lijsten/styles.css';
import './lijsten-screen/styles.css';
import { registerBPVMiniCard } from './bpv-mini-card/index.js';
import { registerBPVTodayBlock } from './bpv-today/index.js';
import { registerPersonalMiniCard } from './personal-mini-card/index.js';
import { registerSchoolDashboardBlock } from './school-dashboard/index.js';
import { registerSchoolMiniCard } from './school-mini-card/index.js';
import { registerPersonalDashboardBlock } from './personal-dashboard/index.js';
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
import { registerInboxScreenBlock } from './inbox-screen/index.js';
import { registerTasksBlock } from './tasks/index.js';
import { registerBPVLogSummaryBlock } from './bpv-log-summary/index.js';
import { registerBPVQuickLogBlock } from './bpv-quick-log/index.js';
import { registerBPVWeeklyOverviewBlock } from './bpv-weekly-overview/index.js';
import { registerDailyOutcomesBlock } from './daily-outcomes/index.js';
import { registerDailyTodosBlock } from './daily-todos/index.js';
import { registerDailyReflectionBlock } from './daily-reflection/index.js';
import { registerSchedulePlaceholderBlock } from './schedule-placeholder/index.js';
import { registerProjectsBlock } from './projects/index.js';
import { registerWeeklyReviewBlock } from './weekly-review/index.js';
import { registerDashboardBlock } from './dashboard/index.js';
import { registerDailyCockpitBlock } from './daily-cockpit/index.js';
import { registerLijstenBlock } from './lijsten/index.js';
import { registerLijstenScreenBlock } from './lijsten-screen/index.js';

export function registerDefaultBlocks(registry) {
  // Today page — cockpit + MVP blocks
  registerDailyCockpitBlock(registry);
  registerDailyOutcomesBlock(registry);
  registerDailyTodosBlock(registry);
  registerInboxBlock(registry);
  registerProjectsBlock(registry);
  registerTasksBlock(registry);
  registerSchedulePlaceholderBlock(registry);
  registerBPVLogSummaryBlock(registry);
  registerDailyReflectionBlock(registry);

  // BPV mode blocks
  registerBPVMiniCard(registry);
  registerBPVTodayBlock(registry);
  registerBPVQuickLogBlock(registry);
  registerBPVWeeklyOverviewBlock(registry);

  // School mode blocks
  registerSchoolDashboardBlock(registry);
  registerSchoolMiniCard(registry);
  registerSchoolCurrentProjectBlock(registry);
  registerSchoolMilestonesBlock(registry);
  registerSchoolSkillTrackerBlock(registry);
  registerSchoolConceptVaultBlock(registry);
  registerSchoolTodayBlock(registry);

  // Personal mode blocks
  registerPersonalDashboardBlock(registry);
  registerPersonalMiniCard(registry);
  registerPersonalTodayBlock(registry);
  registerPersonalEnergyBlock(registry);
  registerPersonalWeeklyReflectionBlock(registry);
  registerPersonalWeekPlanningBlock(registry);

  // Lijsten (all modes — Todoist-style persistent lists)
  registerLijstenBlock(registry);
  registerLijstenScreenBlock(registry);

  // Weekly review (all modes)
  registerWeeklyReviewBlock(registry);

  // Inbox screen (full-page processing)
  registerInboxScreenBlock(registry);

  // Main dashboard (synopsis widgets)
  registerDashboardBlock(registry);
}
