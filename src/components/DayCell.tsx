import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { AnnotatedShift, Shift } from '../types';
import { DEFAULT_SHIFT_COLOR } from '../templates';
import {
  shiftDurationMinutes,
  shiftSalary,
  groupIntoBlocks,
} from '../dateUtils';

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
  hourlyRate: number;
  onAddShift: (date: Date) => void;
  onEditShift: (shift: Shift) => void;
};

/* ── Tooltip ──────────────────────────────────────────────────── */

type TooltipState = { shift: AnnotatedShift; rect: DOMRect };

function ShiftTooltip({ shift, rate, rect }: { shift: AnnotatedShift; rate: number; rect: DOMRect }) {
  const dur = shiftDurationMinutes(shift.startTime, shift.endTime);
  const wholeH = Math.floor(dur / 60);
  const partialMin = dur % 60;

  // Build per-hour blocks; default 100% for each hour if no multipliers set
  const multipliers = shift.multipliers ?? Array(wholeH).fill(100);
  const blocks = groupIntoBlocks(multipliers);
  const total = shiftSalary(shift.startTime, shift.endTime, rate, shift.multipliers, shift.partialMultiplier);

  // Position above the chip; flip below if too close to top of viewport
  const spaceAbove = rect.top;
  const above = spaceAbove > 220;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: rect.left + rect.width / 2,
    top: above ? rect.top - 8 : rect.bottom + 8,
    transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    zIndex: 9999,
  };

  const showMoney = rate > 0;

  return createPortal(
    <div className="shift-tooltip" style={style} dir="rtl">
      {/* Header: name + time */}
      <div className="shift-tooltip__header">
        {shift.name && <span className="shift-tooltip__name">{shift.name}</span>}
        <span className="shift-tooltip__time">{shift.startTime}–{shift.endTime}</span>
      </div>

      {/* Total duration */}
      <div className="shift-tooltip__duration">
        {wholeH > 0 && `${wholeH} שעות`}
        {wholeH > 0 && partialMin > 0 && ' ו‑'}
        {partialMin > 0 && `${partialMin} דקות`}
        {dur === 0 && '—'}
      </div>

      {/* Per-block breakdown */}
      {showMoney && (
        <>
          <div className="shift-tooltip__divider" />
          <div className="shift-tooltip__rows">
            {blocks.map((b, i) => (
              <div key={i} className="shift-tooltip__row">
                <span className="shift-tooltip__row-label">
                  {b.hours} שע׳ × {b.percentage}%
                </span>
                <span className="shift-tooltip__row-value">
                  ₪{Math.round(rate * b.hours * (b.percentage / 100)).toLocaleString('he-IL')}
                </span>
              </div>
            ))}
            {partialMin > 0 && (
              <div className="shift-tooltip__row">
                <span className="shift-tooltip__row-label">
                  {partialMin} דק׳ × {shift.partialMultiplier ?? 100}%
                </span>
                <span className="shift-tooltip__row-value">
                  ₪{Math.round((partialMin / 60) * rate * ((shift.partialMultiplier ?? 100) / 100)).toLocaleString('he-IL')}
                </span>
              </div>
            )}
          </div>
          <div className="shift-tooltip__divider" />
          <div className="shift-tooltip__total">
            <span>סה״כ</span>
            <span>₪{Math.round(total).toLocaleString('he-IL')}</span>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

/* ── DayCell ──────────────────────────────────────────────────── */

export function DayCell({
  date,
  inCurrentMonth,
  isToday,
  isWeekend,
  chips,
  colorByTemplateId,
  hourlyRate,
  onAddShift,
  onEditShift,
}: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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
            s.color ||
            (s.templateId && colorByTemplateId[s.templateId]) ||
            DEFAULT_SHIFT_COLOR;
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
                {s.startTime}
                <span className="shift-chip__arrow"> →</span>
              </span>
            );
          } else if (c.segment === 'end') {
            timeLabel = (
              <span className="shift-chip__time">
                <span className="shift-chip__arrow">← </span>
                {s.endTime}
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
              onMouseEnter={(e) => {
                setTooltip({ shift: s, rect: e.currentTarget.getBoundingClientRect() });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {s.name && c.segment !== 'end' ? (
                <span className="shift-chip__name">
                  {s.name}
                  {c.segment === 'start' && <span className="shift-chip__arrow"> →</span>}
                </span>
              ) : s.name && c.segment === 'end' ? (
                <span className="shift-chip__name">
                  <span className="shift-chip__arrow">← </span>
                  {s.name}
                </span>
              ) : (
                timeLabel
              )}
            </span>
          );
        })}
      </div>

      {/* Tooltip portal — rendered outside the clipped day-cell */}
      {tooltip && (
        <ShiftTooltip shift={tooltip.shift} rate={hourlyRate} rect={tooltip.rect} />
      )}
    </button>
  );
}
