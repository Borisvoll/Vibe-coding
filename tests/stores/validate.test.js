import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateInboxItem,
  validateTask,
  validateDailyEntry,
  validateHoursEntry,
  validateLogbookEntry,
} from '../../src/stores/validate.js';

describe('validateInboxItem', () => {
  it('accepts valid thought', () => {
    expect(() => validateInboxItem({ text: 'Hello world' })).not.toThrow();
  });

  it('accepts valid item with mode', () => {
    expect(() => validateInboxItem({ text: 'Task idea', mode: 'BPV' })).not.toThrow();
  });

  it('rejects empty text', () => {
    expect(() => validateInboxItem({ text: '' })).toThrow(ValidationError);
    expect(() => validateInboxItem({ text: '  ' })).toThrow(ValidationError);
  });

  it('rejects invalid mode', () => {
    expect(() => validateInboxItem({ text: 'ok', mode: 'invalid' })).toThrow(ValidationError);
  });

  it('allows null mode', () => {
    expect(() => validateInboxItem({ text: 'ok', mode: null })).not.toThrow();
  });
});

describe('validateTask', () => {
  it('accepts valid task', () => {
    expect(() => validateTask({ text: 'Do something', mode: 'BPV' })).not.toThrow();
  });

  it('accepts task with date', () => {
    expect(() => validateTask({ text: 'Do it', mode: 'School', date: '2026-02-19' })).not.toThrow();
  });

  it('rejects empty text', () => {
    expect(() => validateTask({ text: '', mode: 'BPV' })).toThrow(ValidationError);
  });

  it('rejects missing mode', () => {
    expect(() => validateTask({ text: 'Do something' })).toThrow(ValidationError);
  });

  it('rejects invalid mode', () => {
    expect(() => validateTask({ text: 'Do something', mode: 'Work' })).toThrow(ValidationError);
  });

  it('rejects invalid date format', () => {
    expect(() => validateTask({ text: 'Do', mode: 'BPV', date: '19-02-2026' })).toThrow(ValidationError);
  });

  it('accepts null date', () => {
    expect(() => validateTask({ text: 'Do', mode: 'BPV', date: null })).not.toThrow();
  });
});

describe('validateDailyEntry', () => {
  it('accepts valid daily entry', () => {
    expect(() => validateDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Task 1', done: false }, { text: 'Task 2', done: true }],
    })).not.toThrow();
  });

  it('rejects invalid date', () => {
    expect(() => validateDailyEntry({ date: 'bad', tasks: [] })).toThrow(ValidationError);
  });

  it('rejects non-array tasks', () => {
    expect(() => validateDailyEntry({ date: '2026-02-19', tasks: 'not array' })).toThrow(ValidationError);
  });

  it('rejects task without text', () => {
    expect(() => validateDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: '', done: false }],
    })).toThrow(ValidationError);
  });

  it('rejects task without boolean done', () => {
    expect(() => validateDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'ok', done: 'yes' }],
    })).toThrow(ValidationError);
  });

  it('accepts empty tasks array', () => {
    expect(() => validateDailyEntry({ date: '2026-02-19', tasks: [] })).not.toThrow();
  });
});

describe('validateHoursEntry', () => {
  it('accepts valid work entry with times', () => {
    expect(() => validateHoursEntry({
      date: '2026-02-19', week: '2026-W08', type: 'work',
      startTime: '08:00', endTime: '16:30', breakMinutes: 45,
    })).not.toThrow();
  });

  it('accepts work entry without times (null)', () => {
    expect(() => validateHoursEntry({
      date: '2026-02-19', week: '2026-W08', type: 'work',
    })).not.toThrow();
  });

  it('accepts non-work type without times', () => {
    expect(() => validateHoursEntry({
      date: '2026-02-19', week: '2026-W08', type: 'sick',
    })).not.toThrow();
  });

  it('rejects invalid startTime format', () => {
    expect(() => validateHoursEntry({
      date: '2026-02-19', week: '2026-W08', type: 'work', startTime: 'abc',
    })).toThrow(ValidationError);
  });

  it('rejects endTime before startTime', () => {
    expect(() => validateHoursEntry({
      date: '2026-02-19', week: '2026-W08', type: 'work',
      startTime: '16:00', endTime: '08:00',
    })).toThrow(ValidationError);
  });

  it('rejects negative breakMinutes', () => {
    expect(() => validateHoursEntry({
      date: '2026-02-19', week: '2026-W08', type: 'work', breakMinutes: -10,
    })).toThrow(ValidationError);
  });

  it('rejects invalid day type', () => {
    expect(() => validateHoursEntry({
      date: '2026-02-19', week: '2026-W08', type: 'vacation',
    })).toThrow(ValidationError);
  });

  it('rejects invalid week format', () => {
    expect(() => validateHoursEntry({
      date: '2026-02-19', week: 'week8', type: 'work',
    })).toThrow(ValidationError);
  });
});

describe('validateLogbookEntry', () => {
  it('accepts valid logbook entry', () => {
    expect(() => validateLogbookEntry({
      date: '2026-02-19', week: '2026-W08', text: 'Worked on CNC', tags: ['CNC'],
    })).not.toThrow();
  });

  it('rejects empty text', () => {
    expect(() => validateLogbookEntry({
      date: '2026-02-19', week: '2026-W08', text: '', tags: [],
    })).toThrow(ValidationError);
  });

  it('rejects non-array tags', () => {
    expect(() => validateLogbookEntry({
      date: '2026-02-19', week: '2026-W08', text: 'ok', tags: 'CNC',
    })).toThrow(ValidationError);
  });
});
