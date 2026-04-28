import type { SalaryBlock, Shift } from './types';

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

export function wholeHoursOfShift(durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return Math.max(1, Math.floor(durationMinutes / 60));
}

export function shiftHourBuckets(durationMinutes: number): number[] {
  if (durationMinutes <= 0) return [];
  const fullHours = Math.max(1, Math.floor(durationMinutes / 60));
  const buckets: number[] = [];
  for (let i = 0; i < fullHours; i++) {
    if (i < fullHours - 1) {
      buckets.push(60);
    } else {
      buckets.push(durationMinutes - i * 60);
    }
  }
  return buckets;
}

export function shiftSalary(
  startTime: string,
  endTime: string,
  rate: number,
  multipliers: number[] | undefined,
): number {
  const totalMin = shiftDurationMinutes(startTime, endTime);
  const buckets = shiftHourBuckets(totalMin);
  let total = 0;
  for (let i = 0; i < buckets.length; i++) {
    const pct = multipliers?.[i] ?? 100;
    total += (buckets[i] / 60) * rate * (pct / 100);
  }
  return total;
}

export function monthTotalSalary(shifts: Shift[], cursor: Date, rate: number): number {
  return shiftsInMonth(shifts, cursor).reduce(
    (acc, s) => acc + shiftSalary(s.startTime, s.endTime, rate, s.multipliers),
    0,
  );
}

export function upcomingShifts(shifts: Shift[], n: number, now: Date = new Date()): Shift[] {
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
