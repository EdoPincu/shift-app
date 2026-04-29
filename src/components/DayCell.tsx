import type { ReactNode } from 'react';
import type { AnnotatedShift, Shift } from '../types';
import { DEFAULT_SHIFT_COLOR } from '../templates';

export type DayChip = {
  shift: AnnotatedShift;
  segment: 'full' | 'start' | 'end';
};

type Props = {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  chips: DayChip[];
  colorByTemplateId: Record<string, string>;
  onAddShift: (date: Date) => void;
  onEditShift: (shift: Shift) => void;
};

export function DayCell({
  date,
  inCurrentMonth,
  isToday,
  isWeekend,
  chips,
  colorByTemplateId,
  onAddShift,
  onEditShift,
}: Props) {
  const hasStreak = chips.some((c) => c.shift.isStreak);

  const classes =
    `day-cell${inCurrentMonth ? '' : ' day-cell--muted'}` +
    `${isToday ? ' day-cell--today' : ''}` +
    `${isWeekend && inCurrentMonth ? ' day-cell--weekend' : ''}` +
    `${hasStreak && inCurrentMonth ? ' day-cell--streak' : ''}`;

  return (
    <button type="button" className={classes} onClick={() => onAddShift(date)}>
      {hasStreak && inCurrentMonth && (
        <span className="day-cell__streak-badge" aria-label="רצף משמרות">
          רצף
        </span>
      )}
      <span className="day-cell__num">{date.getDate()}</span>
      <div className="day-cell__shifts">
        {chips.map((c) => {
          const s = c.shift;
          const color =
            (s.templateId && colorByTemplateId[s.templateId]) || DEFAULT_SHIFT_COLOR;
          const segmentClass =
            c.segment === 'start'
              ? ' shift-chip--seg-start'
              : c.segment === 'end'
                ? ' shift-chip--seg-end'
                : '';
          const key = `${s.id}-${c.segment}`;
          let timeLabel: ReactNode;
          if (c.segment === 'start') {
            timeLabel = (
              <span className="shift-chip__time">
                {s.startTime}–24:00
                <span className="shift-chip__next">→</span>
              </span>
            );
          } else if (c.segment === 'end') {
            timeLabel = (
              <span className="shift-chip__time">
                <span className="shift-chip__prev">←</span>
                00:00–{s.endTime}
              </span>
            );
          } else {
            timeLabel = (
              <span className="shift-chip__time">
                {s.startTime}–{s.endTime}
              </span>
            );
          }
          return (
            <span
              key={key}
              className={`shift-chip${s.isStreak ? ' shift-chip--streak' : ''}${segmentClass}`}
              style={{ background: color }}
              onClick={(e) => {
                e.stopPropagation();
                onEditShift(s);
              }}
              title={s.isStreak ? 'רצף משמרות' : undefined}
            >
              {s.name && c.segment !== 'end' ? (
                <span className="shift-chip__name">
                  {s.name}
                  {c.segment === 'start' && <span className="shift-chip__next"> →</span>}
                </span>
              ) : s.name && c.segment === 'end' ? (
                <span className="shift-chip__name">
                  <span className="shift-chip__prev">← </span>
                  {s.name}
                </span>
              ) : (
                timeLabel
              )}
            </span>
          );
        })}
      </div>
    </button>
  );
}
