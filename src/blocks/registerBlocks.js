import './styles.css';
import '../ui/collapsible-section.css';
import '../ui/command-palette.css';
import './inbox/styles.css';
import './inbox-screen/styles.css';
import './bpv-log-summary/styles.css';
import './bpv-quick-log/styles.css';
import './bpv-weekly-overview/styles.css';
import './school-dashboard/styles.css';
import './personal-dashboard/styles.css';
import './weekly-review/styles.css';
import './daily-outcomes/styles.css';
import './daily-todos/styles.css';
import './daily-reflection/styles.css';
import './projects/styles.css';
import './dashboard/styles.css';
import './daily-cockpit/styles.css';
import './lijsten/styles.css';
import './lijsten-screen/styles.css';
import './two-min-launcher/styles.css';
import './done-list/styles.css';
import './boundaries/styles.css';
import './brain-state/styles.css';
import './worry-dump/styles.css';
import './conversation-debrief/styles.css';
import './context-checklist/styles.css';
import './project-detail/styles.css';
import '../ui/theme-studio.css';
import { registerBPVTodayBlock } from './bpv-today/index.js';
import { registerSchoolDashboardBlock } from './school-dashboard/index.js';
import { registerPersonalDashboardBlock } from './personal-dashboard/index.js';
import { registerSchoolTodayBlock } from './school-today/index.js';
import { registerPersonalTodayBlock } from './personal-today/index.js';
import { registerInboxBlock } from './inbox/index.js';
import { registerInboxScreenBlock } from './inbox-screen/index.js';
import { registerBPVLogSummaryBlock } from './bpv-log-summary/index.js';
import { registerBPVQuickLogBlock } from './bpv-quick-log/index.js';
import { registerBPVWeeklyOverviewBlock } from './bpv-weekly-overview/index.js';
import { registerDailyOutcomesBlock } from './daily-outcomes/index.js';
import { registerDailyTodosBlock } from './daily-todos/index.js';
import { registerDailyReflectionBlock } from './daily-reflection/index.js';
import { registerProjectsBlock } from './projects/index.js';
import { registerWeeklyReviewBlock } from './weekly-review/index.js';
import { registerDashboardBlock } from './dashboard/index.js';
import { registerDailyCockpitBlock } from './daily-cockpit/index.js';
import { registerLijstenBlock } from './lijsten/index.js';
import { registerLijstenScreenBlock } from './lijsten-screen/index.js';
import { registerTwoMinLauncherBlock } from './two-min-launcher/index.js';
import { registerDoneListBlock } from './done-list/index.js';
import { registerBoundariesBlock } from './boundaries/index.js';
import { registerBrainStateBlock } from './brain-state/index.js';
import { registerWorryDumpBlock } from './worry-dump/index.js';
import { registerConversationDebriefBlock } from './conversation-debrief/index.js';
import { registerContextChecklistBlock } from './context-checklist/index.js';
import { registerProjectDetailBlock } from './project-detail/index.js';

export function registerDefaultBlocks(registry) {
  // Level 1 — Focus (Today): hero + cockpit + tasks
  registerDailyCockpitBlock(registry);
  registerDailyOutcomesBlock(registry);
  registerDailyTodosBlock(registry);
  registerDoneListBlock(registry);
  registerTwoMinLauncherBlock(registry);
  registerBrainStateBlock(registry);
  registerContextChecklistBlock(registry);

  // Level 2 — Projects & Lists: active work + capture
  registerInboxBlock(registry);
  registerProjectsBlock(registry);
  registerLijstenBlock(registry);
  registerLijstenScreenBlock(registry);
  registerInboxScreenBlock(registry);
  registerWorryDumpBlock(registry);

  // Level 3 — Context & Review: mode-specific + reflection + archive
  registerDailyReflectionBlock(registry);
  registerConversationDebriefBlock(registry);
  registerWeeklyReviewBlock(registry);

  // Mode-specific context blocks (vandaag-mode)
  registerSchoolDashboardBlock(registry);
  registerSchoolTodayBlock(registry);
  registerPersonalDashboardBlock(registry);
  registerPersonalTodayBlock(registry);
  registerBPVTodayBlock(registry);
  registerBPVQuickLogBlock(registry);
  registerBPVLogSummaryBlock(registry);
  registerBPVWeeklyOverviewBlock(registry);
  registerBoundariesBlock(registry);

  // Planning tab — project detail view
  registerProjectDetailBlock(registry);

  // Main dashboard (synopsis widgets — max 3 cards: dashboard + inbox + lijsten)
  registerDashboardBlock(registry);
}
