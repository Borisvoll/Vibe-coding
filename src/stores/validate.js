import { isValidModeSync } from '../core/modeConfig.js';
const VALID_MODES = ['BPV', 'School', 'Personal']; // fallback; actual validation uses config
const VALID_TASK_STATUSES = ['todo', 'done'];
const VALID_INBOX_STATUSES = ['inbox', 'promoted', 'archived'];
const VALID_DAY_TYPES = ['work', 'sick', 'absent', 'holiday'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_RE = /^\d{4}-W\d{2}$/;

export class ValidationError extends Error {
  constructor(field, message) {
    super(`${field}: ${message}`);
    this.name = 'ValidationError';
    this.field = field;
  }
}

function requireString(value, field, { minLength = 1, maxLength = 10000 } = {}) {
  if (typeof value !== 'string' || value.trim().length < minLength) {
    throw new ValidationError(field, `must be a non-empty string`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(field, `must be at most ${maxLength} characters`);
  }
}

function requireOneOf(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new ValidationError(field, `must be one of: ${allowed.join(', ')}`);
  }
}

function requireDate(value, field) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new ValidationError(field, `must be a date string (YYYY-MM-DD)`);
  }
}

function requireWeek(value, field) {
  if (typeof value !== 'string' || !WEEK_RE.test(value)) {
    throw new ValidationError(field, `must be a week string (YYYY-Wnn)`);
  }
}

function optionalDate(value, field) {
  if (value != null) requireDate(value, field);
}

function requireNumber(value, field, { min, max } = {}) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError(field, `must be a number`);
  }
  if (min != null && value < min) {
    throw new ValidationError(field, `must be >= ${min}`);
  }
  if (max != null && value > max) {
    throw new ValidationError(field, `must be <= ${max}`);
  }
}

function requireArray(value, field) {
  if (!Array.isArray(value)) {
    throw new ValidationError(field, `must be an array`);
  }
}

function requireValidMode(value, field) {
  if (!isValidModeSync(value)) {
    throw new ValidationError(field, `must be a valid mode`);
  }
}

export function validateInboxItem(data) {
  requireString(data.text, 'text');
  if (data.mode != null) requireValidMode(data.mode, 'mode');
}

export function validateTask(data) {
  requireString(data.text, 'text');
  requireValidMode(data.mode, 'mode');
  if (data.status != null) requireOneOf(data.status, VALID_TASK_STATUSES, 'status');
  if (data.date != null) requireDate(data.date, 'date');
}

export function validateDailyEntry(data) {
  requireDate(data.date, 'date');
  requireArray(data.tasks, 'tasks');
  for (let i = 0; i < data.tasks.length; i++) {
    const t = data.tasks[i];
    if (typeof t !== 'object' || t === null) {
      throw new ValidationError(`tasks[${i}]`, 'must be an object');
    }
    requireString(t.text, `tasks[${i}].text`);
    if (typeof t.done !== 'boolean') {
      throw new ValidationError(`tasks[${i}].done`, 'must be a boolean');
    }
  }
}

export function validateHoursEntry(data) {
  requireDate(data.date, 'date');
  requireWeek(data.week, 'week');
  requireOneOf(data.type, VALID_DAY_TYPES, 'type');
  requireNumber(data.value, 'value', { min: 0, max: 24 });
}

export function validateLogbookEntry(data) {
  requireDate(data.date, 'date');
  requireWeek(data.week, 'week');
  requireString(data.text, 'text');
  requireArray(data.tags, 'tags');
}
