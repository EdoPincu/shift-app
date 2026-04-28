import type { Shift, Template } from './types';
import { DEFAULT_TEMPLATES } from './templates';

const SHIFTS_KEY = 'shifts:v1';
const TEMPLATES_KEY = 'templates:v1';
const RATE_KEY = 'hourlyRate:v1';

export function loadShifts(): Shift[] {
  try {
    const raw = localStorage.getItem(SHIFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s) =>
          s &&
          typeof s.id === 'string' &&
          typeof s.date === 'string' &&
          typeof s.startTime === 'string' &&
          typeof s.endTime === 'string',
      )
      .map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        name: typeof s.name === 'string' ? s.name : typeof s.templateName === 'string' ? s.templateName : undefined,
        multipliers: Array.isArray(s.multipliers) ? s.multipliers.filter((n: unknown) => typeof n === 'number') : undefined,
        templateId: typeof s.templateId === 'string' ? s.templateId : undefined,
      }));
  } catch {
    return [];
  }
}

export function saveShifts(shifts: Shift[]): void {
  try {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  } catch {
    /* ignore */
  }
}

export function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TEMPLATES;
    const valid: Template[] = parsed
      .filter(
        (t) =>
          t &&
          typeof t.id === 'string' &&
          typeof t.name === 'string' &&
          typeof t.start === 'string' &&
          typeof t.end === 'string',
      )
      .map((t) => ({
        id: t.id,
        name: t.name,
        start: t.start,
        end: t.end,
        multipliers: Array.isArray(t.multipliers)
          ? t.multipliers.filter((n: unknown) => typeof n === 'number')
          : undefined,
        color: typeof t.color === 'string' ? t.color : undefined,
      }));
    return valid.length ? valid : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplates(templates: Template[]): void {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    /* ignore */
  }
}

export function loadHourlyRate(): number {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveHourlyRate(rate: number): void {
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    /* ignore */
  }
}
