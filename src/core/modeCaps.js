export const MODE_TASK_CAPS = {
  BPV: 3,
  School: 3,
  Personal: 5,
};

export function getTaskCap(mode) {
  return MODE_TASK_CAPS[mode] ?? 5;
}
