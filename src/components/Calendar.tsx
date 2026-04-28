import { useMemo } from 'react';
import type { Shift, Template } from '../types';
import {
  HEBREW_WEEKDAYS,
  addMonths,
  buildMonthGrid,
  isSameDay,
  isWeekend,
  monthLabel,
  toISODate,
} from '../dateUtils';
import { DayCell } from './DayCell';

type Props = {
  shifts: Shift[];
  templates: Template[];
  cursor: Date;
  onCursorChange: (cursor: Date) => void;
  onNewShift: () => void;
  onAddShiftForDate: (date: Date) => void;
  onEditShift: (shift: Shift) => void;
  onManageTemplates: () => void;
};

export function Calendar({
  shifts,
  templates,
  cursor,
  onCursorChange,
  onNewShift,
  onAddShiftForDate,
  onEditShift,
  onManageTemplates,
}: Props) {
  const cells = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [shifts]);

  const colorByTemplateId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of templates) {
      if (t.color) map[t.id] = t.color;
    }
    return map;
  }, [templates]);

  const today = new Date();

  return (
    <div className="calendar">
      <header className="calendar__header">
        <div className="calendar__nav">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onCursorChange(addMonths(cursor, 1))}
            aria-label="חודש הבא"
          >
            ›
          </button>
          <h1 className="calendar__title">{monthLabel(cursor)}</h1>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onCursorChange(addMonths(cursor, -1))}
            aria-label="חודש קודם"
          >
            ‹
          </button>
        </div>
        <div className="calendar__header-actions">
          <button type="button" className="ghost-btn" onClick={onManageTemplates}>
            תבניות
          </button>
          <button type="button" className="primary-btn" onClick={onNewShift}>
            + משמרת חדשה
          </button>
        </div>
      </header>

      <div className="calendar__weekdays">
        {HEBREW_WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`calendar__weekday${i === 5 || i === 6 ? ' calendar__weekday--weekend' : ''}`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="calendar__grid">
        {cells.map((date) => (
          <DayCell
            key={date.toISOString()}
            date={date}
            inCurrentMonth={date.getMonth() === cursor.getMonth()}
            isToday={isSameDay(date, today)}
            isWeekend={isWeekend(date)}
            shifts={shiftsByDate.get(toISODate(date)) ?? []}
            colorByTemplateId={colorByTemplateId}
            onAddShift={onAddShiftForDate}
            onEditShift={onEditShift}
          />
        ))}
      </div>
    </div>
  );
}
