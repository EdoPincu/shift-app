import { useMemo } from 'react';
import type { AnnotatedShift, Template } from '../types';
import {
  formatHoursDecimal,
  formatILS,
  formatShiftDate,
  groupShiftsByStreak,
  monthEarnedSalary,
  monthLabel,
  monthTotalMinutes,
  monthTotalSalary,
  shiftsInMonth,
  streakCountInMonth,
  upcomingShifts,
} from '../dateUtils';
import { DEFAULT_SHIFT_COLOR } from '../templates';

type Props = {
  shifts: AnnotatedShift[];
  templates: Template[];
  cursor: Date;
  hourlyRate: number;
  onHourlyRateChange: (rate: number) => void;
};

export function Dashboard({
  shifts,
  templates,
  cursor,
  hourlyRate,
  onHourlyRateChange,
}: Props) {
  const totalMin = useMemo(() => monthTotalMinutes(shifts, cursor), [shifts, cursor]);
  const count = useMemo(() => shiftsInMonth(shifts, cursor).length, [shifts, cursor]);
  const totalSalary = useMemo(
    () => monthTotalSalary(shifts, cursor, hourlyRate),
    [shifts, cursor, hourlyRate],
  );
  const earnedSalary = useMemo(
    () => monthEarnedSalary(shifts, cursor, hourlyRate),
    [shifts, cursor, hourlyRate],
  );
  const earnedPct = totalSalary > 0 ? Math.min(100, (earnedSalary / totalSalary) * 100) : 0;
  const streakCount = useMemo(
    () => streakCountInMonth(shifts, cursor),
    [shifts, cursor],
  );

  const colorByTemplateId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of templates) {
      if (t.color) map[t.id] = t.color;
    }
    return map;
  }, [templates]);

  const upcoming = useMemo(() => upcomingShifts(shifts, 3), [shifts]);
  const upcomingGroups = useMemo(() => groupShiftsByStreak(upcoming), [upcoming]);

  const renderShiftRow = (s: AnnotatedShift) => {
    const color =
      (s.templateId && colorByTemplateId[s.templateId]) || DEFAULT_SHIFT_COLOR;
    return (
      <li
        key={s.id}
        className={`upcoming-list__item${s.isStreak ? ' upcoming-list__item--streak' : ''}`}
      >
        <span
          className="upcoming-list__dot"
          style={{ background: color }}
          aria-hidden="true"
        />
        <div className="upcoming-list__info">
          <div className="upcoming-list__date">{formatShiftDate(s.date)}</div>
          <div className="upcoming-list__time">
            {s.name ?? `${s.startTime}–${s.endTime}`}
          </div>
        </div>
      </li>
    );
  };

  return (
    <aside className="dashboard">
      <section className="dashboard__card">
        <h2 className="dashboard__title">שעות עבודה החודש</h2>
        <div className="dashboard__total">{formatHoursDecimal(totalMin)}</div>
        <div className="dashboard__sub">
          {count} {count === 1 ? 'משמרת' : 'משמרות'} ב{monthLabel(cursor)}
        </div>
      </section>

      <section className="dashboard__card">
        <h2 className="dashboard__title">שכר ברוטו (משוער)</h2>
        <div className="dashboard__total dashboard__total--money">
          {formatILS(totalSalary)}
        </div>
        <label className="dashboard__rate">
          <span className="field__label">תעריף שעתי</span>
          <div className="dashboard__rate-input">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              value={hourlyRate || ''}
              placeholder="0"
              onChange={(e) => onHourlyRateChange(Number(e.target.value) || 0)}
            />
            <span className="dashboard__rate-unit">₪/שעה</span>
          </div>
        </label>
        {totalSalary > 0 && (
          <div className="earned-progress">
            <div className="earned-progress__bar-track">
              <div
                className="earned-progress__bar-fill"
                style={{ width: `${earnedPct}%` }}
                aria-valuenow={earnedPct}
                aria-valuemin={0}
                aria-valuemax={100}
                role="progressbar"
              />
            </div>
            <div className="earned-progress__label">
              <span>הרווחת {formatILS(earnedSalary)} החודש</span>
              <span className="earned-progress__pct">{Math.round(earnedPct)}%</span>
            </div>
          </div>
        )}
      </section>

      <section className="dashboard__card dashboard__card--streak">
        <h2 className="dashboard__title">רצפים החודש</h2>
        <div className="dashboard__total dashboard__total--streak">{streakCount}</div>
        <div className="dashboard__sub">
          {streakCount === 1 ? 'רצף משמרות פעיל' : 'רצפי משמרות פעילים'}
        </div>
      </section>

      <section className="dashboard__card">
        <h2 className="dashboard__title">המשמרות הבאות</h2>
        {upcoming.length > 0 ? (
          <ul className="upcoming-list">
            {upcomingGroups.map((g, gi) => {
              if (g.type === 'streak') {
                return (
                  <li key={`streak-${gi}`} className="upcoming-list__streak-group">
                    <div className="upcoming-list__streak-label">רצף</div>
                    <ul className="upcoming-list__streak-items">
                      {g.shifts.map((s) => renderShiftRow(s))}
                    </ul>
                  </li>
                );
              }
              return renderShiftRow(g.shift);
            })}
          </ul>
        ) : (
          <div className="dashboard__sub">אין משמרות מתוכננות</div>
        )}
      </section>
    </aside>
  );
}
