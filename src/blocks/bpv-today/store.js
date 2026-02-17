import { getAll, getSetting, setSetting } from '../../db.js';
import { getToday } from '../../utils.js';

const TIMER_KEY = 'os_bpv_timer_state';
const REFLECTION_KEY = 'os_bpv_today_reflectie';

export async function getBPVTodaySnapshot() {
  const today = getToday();
  const [plans, hours, learningMoments, goals, assignments] = await Promise.all([
    getAll('dailyPlans').catch(() => []),
    getAll('hours').catch(() => []),
    getAll('learningMoments').catch(() => []),
    getAll('goals').catch(() => []),
    getAll('assignments').catch(() => []),
  ]);

  const todayPlan = plans.find((item) => item.date === today);
  const todayHours = hours.find((item) => item.date === today);
  const todayLearning = learningMoments
    .filter((item) => item.date === today)
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0] || null;
  const activeGoal = goals.find((item) => item.status !== 'done' && item.status !== 'afgerond') || null;
  const activeProject = assignments.find((item) => !item.completedAt) || null;

  return {
    topTasks: Array.isArray(todayPlan?.top3) ? todayPlan.top3.slice(0, 3) : [],
    netHours: todayHours?.net || todayHours?.total || null,
    learningMoment: todayLearning,
    activeGoal,
    activeProject,
  };
}

export async function getTimerState() {
  return (await getSetting(TIMER_KEY)) || { running: false, paused: false };
}

export async function setTimerState(state) {
  return setSetting(TIMER_KEY, { ...state, updatedAt: new Date().toISOString() });
}

export async function getQuickReflection() {
  return (await getSetting(REFLECTION_KEY)) || '';
}

export async function saveQuickReflection(value) {
  return setSetting(REFLECTION_KEY, String(value || '').trim());
}
