import type { AnnotatedShift, Shift } from '../types';
import { endsNextDay } from '../dateUtils';
import { DEFAULT_SHIFT_COLOR } from '../templates';

type Props = {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  shifts: AnnotatedShift[];
  colorByTemplateId: Record<string, string>;
  onAddShift: (date: Date) => void;
  onEditShift: (shift: Shift) => void;
};

export function DayCell({
  date,
  inCurrentMonth,
  isToday,
  isWeekend,
  shifts,
  colorByTemplateId,
  onAddShift,
  onEditShift,
}: Props) {
  const classes =
    `day-cell${inCurrentMonth ? '' : ' day-cell--muted'}` +
    `${isToday ? ' day-cell--today' : ''}` +
    `${isWeekend && inCurrentMonth ? ' day-cell--weekend' : ''}`;

  return (
    <button type="button" className={classes} onClick={() => onAddShift(date)}>
      <span className="day-cell__num">{date.getDate()}</span>
      <div className="day-cell__shifts">
        {shifts.map((s) => {
          const color = (s.templateId && colorByTemplateId[s.templateId]) || DEFAULT_SHIFT_COLOR;
          return (
            <span
              key={s.id}
              className={`shift-chip${s.isStreak ? ' shift-chip--streak' : ''}`}
              style={{ background: color }}
              onClick={(e) => {
                e.stopPropagation();
                onEditShift(s);
              }}
              title={s.isStreak ? 'רצף משמרות' : undefined}
            >
              {s.name ? (
                <span className="shift-chip__name">{s.name}</span>
              ) : (
                <span className="shift-chip__time">
                  {s.startTime}–{s.endTime}
                  {endsNextDay(s.startTime, s.endTime) && (
                    <span className="shift-chip__next">→</span>
                  )}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </button>
  );
}
