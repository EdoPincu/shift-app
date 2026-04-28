import { useMemo } from 'react';
import type { Shift } from '../types';
import {
  formatHM,
  formatILS,
  monthLabel,
  monthTotalMinutes,
  monthTotalSalary,
  shiftsInMonth,
} from '../dateUtils';

type Props = {
  shifts: Shift[];
  cursor: Date;
  hourlyRate: number;
  onHourlyRateChange: (rate: number) => void;
};

export function Dashboard({ shifts, cursor, hourlyRate, onHourlyRateChange }: Props) {
  const totalMin = useMemo(() => monthTotalMinutes(shifts, cursor), [shifts, cursor]);
  const count = useMemo(() => shiftsInMonth(shifts, cursor).length, [shifts, cursor]);
  const totalSalary = useMemo(
    () => monthTotalSalary(shifts, cursor, hourlyRate),
    [shifts, cursor, hourlyRate],
  );

  return (
    <aside className="dashboard">
      <section className="dashboard__card">
        <h2 className="dashboard__title">שעות עבודה החודש</h2>
        <div className="dashboard__total">{formatHM(totalMin)}</div>
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
      </section>
    </aside>
  );
}
