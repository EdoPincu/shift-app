import type { AnnotatedShift, SalaryBlock, Shift } from './types';

const PCT_MIN = 100;
const PCT_MAX = 350;
const PCT_STEP = 10;

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return PCT_MIN;
  if (n < PCT_MIN) return PCT_MIN;
  if (n > PCT_MAX) return PCT_MAX;
  return Math.round(n / PCT_STEP) * PCT_STEP;
}

export function groupIntoBlocks(multipliers: number[]): SalaryBlock[] {
  const out: SalaryBlock[] = [];
  for (const raw of multipliers) {
    const pct = clampPct(raw);
    const last = out[out.length - 1];
    if (last && last.percentage === pct) {
      last.hours += 1;
    } else {
      out.push({ hours: 1, percentage: pct });
    }
  }
  return out;
}

export function flattenBlocks(blocks: SalaryBlock[]): number[] {
  const out: number[] = [];
  for (const b of blocks) {
    for (let i = 0; i < b.hours; i++) out.push(b.percentage);
  }
  return out;
}

export function blocksTotalHours(blocks: SalaryBlock[]): number {
  return blocks.reduce((s, b) => s + b.hours, 0);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 5 || day === 6;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(d);
}

export const HEBREW_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export function buildMonthGrid(monthStart: Date): Date[] {
  const cells: Date[] = [];
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstWeekday);
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export function endsNextDay(startTime: string, endTime: string): boolean {
  return endTime <= startTime;
}

export function isOvernight(shift: { startTime: string; endTime: string }): boolean {
  return endsNextDay(shift.startTime, shift.endTime);
}

export function nextISODate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + 1));
}

export function shiftDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  ) {
    return 0;
  }
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  return endMin - startMin;
}

export function formatHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function shiftsInMonth(shifts: Shift[], cursor: Date): Shift[] {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  return shifts.filter((s) => {
    const [sy, sm] = s.date.split('-').map(Number);
    return sy === y && sm - 1 === m;
  });
}

export function monthTotalMinutes(shifts: Shift[], cursor: Date): number {
  return shiftsInMonth(shifts, cursor).reduce(
    (acc, s) => acc + shiftDurationMinutes(s.startTime, s.endTime),
    0,
  );
}

/**
 * Minutes of the shift that fall inside the Shabbat window
 * (Friday 18:00 → Saturday 23:00).
 * Works in "minutes-from-midnight-of-shiftDate" space to avoid timezone issues.
 * Checks both the current week's window and the next week's window
 * so multi-day shifts are handled correctly.
 */
export function shabbatOverlapMinutes(
  shiftDate: string,
  startTime: string,
  endTime: string,
): number {
  const [y, m, d] = shiftDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay(); // 0=Sun … 5=Fri, 6=Sat

  const [sh, sm] = startTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const duration = shiftDurationMinutes(startTime, endTime);
  const endMin = startMin + duration;

  // daysSinceFriday: 0 on Fri, 1 on Sat, 2 on Sun, …, 6 on Thu
  const daysSinceFriday = (dayOfWeek - 5 + 7) % 7;

  // Shabbat window expressed in minutes from midnight of shiftDate
  // Fri 18:00 → Sat 23:00 = 29 hours
  const winStart = -daysSinceFriday * 24 * 60 + 18 * 60;
  const winEnd = winStart + 29 * 60;

  const overlap = (s: number, e: number, ws: number, we: number) =>
    Math.max(0, Math.min(e, we) - Math.max(s, ws));

  // Current week's Shabbat + next week's (for shifts > ~7h on Thu/other edge days)
  return (
    overlap(startMin, endMin, winStart, winEnd) +
    overlap(startMin, endMin, winStart + 7 * 24 * 60, winEnd + 7 * 24 * 60)
  );
}

/**
 * Total "display minutes" for the month's hours counter:
 * Shabbat minutes (Fri 18:00–Sat 23:00) are doubled; all other minutes are 1×.
 * Salary calculations are unaffected by this weighting.
 */
export function monthTotalWeightedMinutes(shifts: Shift[], cursor: Date): number {
  return shiftsInMonth(shifts, cursor).reduce((acc, s) => {
    const dur = shiftDurationMinutes(s.startTime, s.endTime);
    const shabbat = shabbatOverlapMinutes(s.date, s.startTime, s.endTime);
    return acc + dur + shabbat; // shabbat minutes counted once extra = doubled
  }, 0);
}

export const HOURS_LIMIT = 254;

export function wholeHoursOfShift(durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return Math.floor(durationMinutes / 60);
}

export function shiftPartialMinutes(durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return durationMinutes - Math.floor(durationMinutes / 60) * 60;
}

export function shiftPartialFraction(durationMinutes: number): number {
  return shiftPartialMinutes(durationMinutes) / 60;
}

export function formatHoursDecimal(durationMinutes: number): string {
  return (Math.max(0, durationMinutes) / 60).toFixed(2);
}

export function shiftSalary(
  startTime: string,
  endTime: string,
  rate: number,
  multipliers: number[] | undefined,
  partialMultiplier: number | undefined,
): number {
  const totalMin = shiftDurationMinutes(startTime, endTime);
  const wholeHours = Math.floor(totalMin / 60);
  const partialMin = totalMin - wholeHours * 60;

  let total = 0;
  for (let i = 0; i < wholeHours; i++) {
    total += rate * ((multipliers?.[i] ?? 100) / 100);
  }
  if (partialMin > 0) {
    total += (partialMin / 60) * rate * ((partialMultiplier ?? 100) / 100);
  }
  return total;
}

export function monthTotalSalary(shifts: Shift[], cursor: Date, rate: number): number {
  return shiftsInMonth(shifts, cursor).reduce(
    (acc, s) =>
      acc + shiftSalary(s.startTime, s.endTime, rate, s.multipliers, s.partialMultiplier),
    0,
  );
}

export function monthEarnedSalary(
  shifts: Shift[],
  cursor: Date,
  rate: number,
  now: Date = new Date(),
): number {
  const today = toISODate(now);
  return shiftsInMonth(shifts, cursor)
    .filter((s) => s.date <= today)
    .reduce(
      (acc, s) =>
        acc + shiftSalary(s.startTime, s.endTime, rate, s.multipliers, s.partialMultiplier),
      0,
    );
}

export function upcomingShifts<T extends Shift>(
  shifts: T[],
  n: number,
  now: Date = new Date(),
): T[] {
  const today = toISODate(now);
  return [...shifts]
    .filter((s) => s.date >= today)
    .sort((a, b) =>
      a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
    )
    .slice(0, n);
}

export function formatShiftDate(isoDate: string, now: Date = new Date()): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'מחר';
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatILS(amount: number): string {
  return `₪ ${Math.round(amount).toLocaleString('he-IL')}`;
}

/* ---------------- Streaks ---------------- */

export const STREAK_THRESHOLD_MINUTES = 7 * 60 + 37; // 457
const FIRST_SHIFT_MIN_HOUR_MIN = 13 * 60; // 13:00

function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftAbsoluteStartMinutes(shift: Shift): number {
  const date = parseISODateLocal(shift.date);
  const dayMinutes = Math.round(date.getTime() / 60000);
  const [sh, sm] = shift.startTime.split(':').map(Number);
  return dayMinutes + sh * 60 + sm;
}

export function shiftAbsoluteEndMinutes(shift: Shift): number {
  const start = shiftAbsoluteStartMinutes(shift);
  return start + shiftDurationMinutes(shift.startTime, shift.endTime);
}

export function shiftTouchesWeekend(shift: Shift): boolean {
  const date = parseISODateLocal(shift.date);
  const startDay = date.getDay();
  if (startDay === 5 || startDay === 6) return true;
  if (endsNextDay(shift.startTime, shift.endTime)) {
    const endDay = (startDay + 1) % 7;
    if (endDay === 5 || endDay === 6) return true;
  }
  return false;
}

export function isStreakPair(a: Shift, b: Shift): boolean {
  // a must be chronologically before b
  const gap = shiftAbsoluteStartMinutes(b) - shiftAbsoluteEndMinutes(a);
  if (gap < 0 || gap >= STREAK_THRESHOLD_MINUTES) return false;
  if (shiftTouchesWeekend(a) || shiftTouchesWeekend(b)) return false;
  const [sh, sm] = a.startTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  if (startMin < FIRST_SHIFT_MIN_HOUR_MIN) return false;
  return true;
}

function sortShiftsChronologically(shifts: Shift[]): Shift[] {
  return [...shifts].sort(
    (a, b) => shiftAbsoluteStartMinutes(a) - shiftAbsoluteStartMinutes(b),
  );
}

export type StreakPair = { firstId: string; secondId: string };

export function findStreakPairs(shifts: Shift[]): StreakPair[] {
  const sorted = sortShiftsChronologically(shifts);
  const pairs: StreakPair[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (isStreakPair(sorted[i], sorted[i + 1])) {
      pairs.push({ firstId: sorted[i].id, secondId: sorted[i + 1].id });
    }
  }
  return pairs;
}

export function streakIdSet(shifts: Shift[]): Set<string> {
  const ids = new Set<string>();
  for (const p of findStreakPairs(shifts)) {
    ids.add(p.firstId);
    ids.add(p.secondId);
  }
  return ids;
}

/**
 * Returns a new array of shifts each annotated with `isStreak: boolean`.
 * `isStreak` is true if the shift is part of any streak pair detected via `findStreakPairs`.
 * Streak detection considers the *full* shift list, so cross-month and multi-day pairs
 * (e.g. Sun 22:00→Mon 06:00 → Mon 13:00→…) are picked up correctly.
 */
export function annotateShiftsWithStreak(shifts: Shift[]): AnnotatedShift[] {
  const ids = streakIdSet(shifts);
  return shifts.map((s) => ({ ...s, isStreak: ids.has(s.id) }));
}

export function streakCountInMonth(shifts: Shift[], cursor: Date): number {
  const monthShifts = shiftsInMonth(shifts, cursor);
  return findStreakPairs(monthShifts).length;
}

/* Group consecutive sorted shifts that form streak chains (length >= 2). */
export type DisplayGroup<T extends Shift = Shift> =
  | { type: 'single'; shift: T }
  | { type: 'streak'; shifts: T[] };

export function groupShiftsByStreak<T extends Shift>(shifts: T[]): DisplayGroup<T>[] {
  const sorted = [...shifts].sort(
    (a, b) => shiftAbsoluteStartMinutes(a) - shiftAbsoluteStartMinutes(b),
  );
  const groups: DisplayGroup<T>[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && isStreakPair(sorted[j], sorted[j + 1])) {
      j++;
    }
    if (j > i) {
      groups.push({ type: 'streak', shifts: sorted.slice(i, j + 1) });
      i = j + 1;
    } else {
      groups.push({ type: 'single', shift: sorted[i] });
      i++;
    }
  }
  return groups;
}
