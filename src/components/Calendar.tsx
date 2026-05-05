import { useMemo } from 'react';
import type { AnnotatedShift, Shift, Template } from '../types';
import {
  HEBREW_WEEKDAYS,
  addMonths,
  buildMonthGrid,
  isOvernight,
  isSameDay,
  isWeekend,
  monthLabel,
  nextISODate,
  toISODate,
} from '../dateUtils';
import { DayCell, type DayChip } from './DayCell';

type Props = {
  shifts: AnnotatedShift[];
  templates: Template[];
  cursor: Date;
  hourlyRate: number;
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
  hourlyRate,
  onCursorChange,
  onNewShift,
  onAddShiftForDate,
  onEditShift,
  onManageTemplates,
}: Props) {
  const cells = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const chipsByDate = useMemo(() => {
    const map = new Map<string, DayChip[]>();
    const push = (date: string, chip: DayChip) => {
      const arr = map.get(date) ?? [];
      arr.push(chip);
      map.set(date, arr);
    };
    for (const s of shifts) {
      if (isOvernight(s)) {
        push(s.date, { shift: s, segment: 'start' });
        push(nextISODate(s.date), { shift: s, segment: 'end' });
      } else {
        push(s.date, { shift: s, segment: 'full' });
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        // 'end' segments (continuation from prev day) sort first within a day
        const aKey = a.segment === 'end' ? '00:00' : a.shift.startTime;
        const bKey = b.segment === 'end' ? '00:00' : b.shift.startTime;
        return aKey.localeCompare(bKey);
      });
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
            chips={chipsByDate.get(toISODate(date)) ?? []}
            colorByTemplateId={colorByTemplateId}
            hourlyRate={hourlyRate}
            onAddShift={onAddShiftForDate}
            onEditShift={onEditShift}
          />
        ))}
      </div>
    </div>
  );
}
