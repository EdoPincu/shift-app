import { useState } from 'react';
import type { SalaryBlock } from '../types';
import {
  blocksTotalHours,
  shiftPartialFraction,
  shiftPartialMinutes,
  wholeHoursOfShift,
} from '../dateUtils';

const PCT_MIN = 100;
const PCT_MAX = 350;
const PCT_STEP = 5;

function clamp(n: number): number {
  if (!Number.isFinite(n)) return PCT_MIN;
  return Math.max(PCT_MIN, Math.min(PCT_MAX, Math.round(n)));
}

function snapUp(n: number): number {
  // Snap n to next multiple of PCT_STEP. If already aligned, advance by PCT_STEP.
  const next = n % PCT_STEP === 0 ? n + PCT_STEP : Math.ceil(n / PCT_STEP) * PCT_STEP;
  return clamp(next);
}

function snapDown(n: number): number {
  const prev = n % PCT_STEP === 0 ? n - PCT_STEP : Math.floor(n / PCT_STEP) * PCT_STEP;
  return clamp(prev);
}

type Props = {
  durationMinutes: number;
  wholeBlocks: SalaryBlock[];
  partialPct: number;
  onWholeBlocksChange: (next: SalaryBlock[]) => void;
  onPartialPctChange: (next: number) => void;
};

export function HourlyMultipliers({
  durationMinutes,
  wholeBlocks,
  partialPct,
  onWholeBlocksChange,
  onPartialPctChange,
}: Props) {
  // Local draft strings for the percentage inputs — lets the user type freely;
  // the parent state is only updated on blur.
  const [pctDrafts, setPctDrafts] = useState<Record<number, string>>({});
  const [partialDraft, setPartialDraft] = useState<string | null>(null);

  const wholeHours = wholeHoursOfShift(durationMinutes);
  const partialMin = shiftPartialMinutes(durationMinutes);
  const partialFraction = shiftPartialFraction(durationMinutes);
  const hasPartial = partialMin > 0;

  if (wholeHours === 0 && !hasPartial) return null;

  const totalAssignedWhole = blocksTotalHours(wholeBlocks);
  const remaining = wholeHours - totalAssignedWhole;
  const targetTotal = wholeHours + partialFraction;

  const incHours = (i: number) => {
    onWholeBlocksChange(
      wholeBlocks.map((b, idx) => (idx === i ? { ...b, hours: b.hours + 1 } : b)),
    );
  };

  const decHours = (i: number) => {
    if (wholeBlocks[i].hours <= 1) return;
    onWholeBlocksChange(
      wholeBlocks.map((b, idx) => (idx === i ? { ...b, hours: b.hours - 1 } : b)),
    );
  };

  const stepPct = (i: number, dir: 'up' | 'down') => {
    const cur = wholeBlocks[i].percentage;
    const next = dir === 'up' ? snapUp(cur) : snapDown(cur);
    if (next === cur) return;
    onWholeBlocksChange(
      wholeBlocks.map((b, idx) => (idx === i ? { ...b, percentage: next } : b)),
    );
  };

  // onChange: just buffer the raw string, don't clamp yet
  const setPctTyped = (i: number, raw: string) => {
    setPctDrafts((d) => ({ ...d, [i]: raw }));
  };

  // onBlur: clamp, commit to parent, clear draft
  const commitPct = (i: number, raw: string) => {
    setPctDrafts((d) => {
      const next = { ...d };
      delete next[i];
      return next;
    });
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    onWholeBlocksChange(
      wholeBlocks.map((b, idx) => (idx === i ? { ...b, percentage: clamp(parsed) } : b)),
    );
  };

  const removeRow = (i: number) => {
    if (wholeBlocks.length <= 1) return;
    onWholeBlocksChange(wholeBlocks.filter((_, idx) => idx !== i));
  };

  const addRow = () => {
    const newRowHours = remaining > 0 ? remaining : 1;
    onWholeBlocksChange([...wholeBlocks, { hours: newRowHours, percentage: 100 }]);
  };

  const stepPartial = (dir: 'up' | 'down') => {
    const next = dir === 'up' ? snapUp(partialPct) : snapDown(partialPct);
    if (next === partialPct) return;
    onPartialPctChange(next);
  };

  const setPartialTyped = (raw: string) => {
    setPartialDraft(raw);
  };

  const commitPartial = (raw: string) => {
    setPartialDraft(null);
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) onPartialPctChange(clamp(parsed));
  };

  const formattedTarget = hasPartial ? targetTotal.toFixed(2) : String(wholeHours);

  let counterText: string;
  let counterClass = '';
  if (remaining > 0) {
    counterText = `נותרו ${remaining} שעות מתוך ${formattedTarget}`;
  } else if (remaining === 0) {
    counterText = `כל ${formattedTarget} השעות הוגדרו`;
    counterClass = ' salary-blocks__remaining--ok';
  } else {
    counterText = `הגדרת ${Math.abs(remaining)} שעות מעל סך המשמרת (${formattedTarget})`;
    counterClass = ' salary-blocks__remaining--over';
  }

  const canAddRow = wholeHours > 0;

  return (
    <div className="field">
      <span className="field__label">תעריף לפי שעות</span>
      <div className="salary-blocks">
        <div className="salary-blocks__header">
          <span>שעות</span>
          <span>אחוזים</span>
          <span aria-hidden="true" />
        </div>

        {wholeBlocks.map((b, i) => (
          <div className="salary-block" key={i}>
            <div className="salary-pill">
              <button
                type="button"
                className="salary-pill__btn"
                onClick={() => decHours(i)}
                disabled={b.hours <= 1}
                aria-label="הפחת שעות"
              >
                −
              </button>
              <span className="salary-pill__value">{b.hours}</span>
              <button
                type="button"
                className="salary-pill__btn"
                onClick={() => incHours(i)}
                aria-label="הוסף שעה"
              >
                +
              </button>
            </div>

            <div className="salary-pill">
              <button
                type="button"
                className="salary-pill__btn"
                onClick={() => stepPct(i, 'down')}
                disabled={b.percentage <= PCT_MIN}
                aria-label="הפחת אחוזים"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                className="salary-pill__input"
                min={PCT_MIN}
                max={PCT_MAX}
                value={i in pctDrafts ? pctDrafts[i] : String(b.percentage)}
                onChange={(e) => setPctTyped(i, e.target.value)}
                onBlur={(e) => commitPct(i, e.target.value)}
                aria-label="אחוזים"
              />
              <span className="salary-pill__suffix">%</span>
              <button
                type="button"
                className="salary-pill__btn"
                onClick={() => stepPct(i, 'up')}
                disabled={b.percentage >= PCT_MAX}
                aria-label="הוסף אחוזים"
              >
                +
              </button>
            </div>

            <button
              type="button"
              className="salary-block__remove"
              onClick={() => removeRow(i)}
              disabled={wholeBlocks.length <= 1}
              aria-label="הסר שורה"
            >
              ×
            </button>
          </div>
        ))}

        {hasPartial && (
          <div className="salary-block salary-block--partial">
            <div className="salary-pill salary-pill--locked">
              <button type="button" className="salary-pill__btn" disabled aria-label="נעול">
                −
              </button>
              <span className="salary-pill__value" title={`${partialMin} דקות`}>
                {partialFraction.toFixed(2)}
              </span>
              <button type="button" className="salary-pill__btn" disabled aria-label="נעול">
                +
              </button>
            </div>

            <div className="salary-pill">
              <button
                type="button"
                className="salary-pill__btn"
                onClick={() => stepPartial('down')}
                disabled={partialPct <= PCT_MIN}
                aria-label="הפחת אחוזים"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                className="salary-pill__input"
                min={PCT_MIN}
                max={PCT_MAX}
                value={partialDraft !== null ? partialDraft : String(partialPct)}
                onChange={(e) => setPartialTyped(e.target.value)}
                onBlur={(e) => commitPartial(e.target.value)}
                aria-label="אחוזים"
              />
              <span className="salary-pill__suffix">%</span>
              <button
                type="button"
                className="salary-pill__btn"
                onClick={() => stepPartial('up')}
                disabled={partialPct >= PCT_MAX}
                aria-label="הוסף אחוזים"
              >
                +
              </button>
            </div>

            <span className="salary-block__partial-tag" aria-hidden="true">
              חלקי
            </span>
          </div>
        )}

        {canAddRow && (
          <button type="button" className="ghost-btn ghost-btn--small" onClick={addRow}>
            + הוסף שורה
          </button>
        )}

        <p className={`salary-blocks__remaining${counterClass}`}>{counterText}</p>
      </div>
    </div>
  );
}
