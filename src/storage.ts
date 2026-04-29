import type { Shift, Template, TemplateSlot } from './types';
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
        name:
          typeof s.name === 'string'
            ? s.name
            : typeof s.templateName === 'string'
              ? s.templateName
              : undefined,
        multipliers: Array.isArray(s.multipliers)
          ? s.multipliers.filter((n: unknown) => typeof n === 'number')
          : undefined,
        partialMultiplier:
          typeof s.partialMultiplier === 'number' ? s.partialMultiplier : undefined,
        templateId: typeof s.templateId === 'string' ? s.templateId : undefined,
        templateSlotIndex:
          typeof s.templateSlotIndex === 'number' ? s.templateSlotIndex : undefined,
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

function parseSlot(raw: unknown): TemplateSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.start !== 'string' || typeof r.end !== 'string') return null;
  return {
    start: r.start,
    end: r.end,
    multipliers: Array.isArray(r.multipliers)
      ? (r.multipliers as unknown[]).filter((n): n is number => typeof n === 'number')
      : undefined,
    partialMultiplier:
      typeof r.partialMultiplier === 'number' ? r.partialMultiplier : undefined,
  };
}

export function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TEMPLATES;
    const mapped: (Template | null)[] = parsed
      .filter((t) => t && typeof t.id === 'string' && typeof t.name === 'string')
      .map((t) => {
        let slots: TemplateSlot[] = [];
        if (Array.isArray(t.slots) && t.slots.length > 0) {
          slots = t.slots
            .map(parseSlot)
            .filter((s: TemplateSlot | null): s is TemplateSlot => s !== null);
        } else if (typeof t.start === 'string' && typeof t.end === 'string') {
          slots = [
            {
              start: t.start,
              end: t.end,
              multipliers: Array.isArray(t.multipliers)
                ? t.multipliers.filter((n: unknown) => typeof n === 'number')
                : undefined,
              partialMultiplier:
                typeof t.partialMultiplier === 'number' ? t.partialMultiplier : undefined,
            },
          ];
        }
        if (slots.length === 0) return null;
        return {
          id: t.id,
          name: t.name,
          color: typeof t.color === 'string' ? t.color : undefined,
          slots,
        } satisfies Template;
      });
    const valid: Template[] = mapped.filter(
      (t): t is Template => t !== null,
    );
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
