import type { SalaryBlock } from '../types';
import { blocksTotalHours, wholeHoursOfShift } from '../dateUtils';

const PCT_MIN = 100;
const PCT_MAX = 350;
const PCT_STEP = 10;

type Props = {
  durationMinutes: number;
  blocks: SalaryBlock[];
  onChange: (next: SalaryBlock[]) => void;
};

export function HourlyMultipliers({ durationMinutes, blocks, onChange }: Props) {
  const wholeHours = wholeHoursOfShift(durationMinutes);
  if (wholeHours === 0) return null;

  const totalAssigned = blocksTotalHours(blocks);
  const remaining = wholeHours - totalAssigned;

  const incHours = (i: number) => {
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, hours: b.hours + 1 } : b)));
  };

  const decHours = (i: number) => {
    if (blocks[i].hours <= 1) return;
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, hours: b.hours - 1 } : b)));
  };

  const incPct = (i: number) => {
    if (blocks[i].percentage >= PCT_MAX) return;
    onChange(
      blocks.map((b, idx) =>
        idx === i ? { ...b, percentage: b.percentage + PCT_STEP } : b,
      ),
    );
  };

  const decPct = (i: number) => {
    if (blocks[i].percentage <= PCT_MIN) return;
    onChange(
      blocks.map((b, idx) =>
        idx === i ? { ...b, percentage: b.percentage - PCT_STEP } : b,
      ),
    );
  };

  const removeRow = (i: number) => {
    if (blocks.length <= 1) return;
    onChange(blocks.filter((_, idx) => idx !== i));
  };

  const addRow = () => {
    const newRowHours = remaining > 0 ? remaining : 1;
    onChange([...blocks, { hours: newRowHours, percentage: 100 }]);
  };

  let counterText: string;
  let counterClass = '';
  if (remaining > 0) {
    counterText = `נותרו ${remaining} שעות מתוך ${wholeHours}`;
  } else if (remaining === 0) {
    counterText = `כל ${wholeHours} השעות הוגדרו`;
    counterClass = ' salary-blocks__remaining--ok';
  } else {
    counterText = `הגדרת ${Math.abs(remaining)} שעות מעל סך המשמרת (${wholeHours})`;
    counterClass = ' salary-blocks__remaining--over';
  }

  return (
    <div className="field">
      <span className="field__label">תעריף לפי שעות</span>
      <div className="salary-blocks">
        <div className="salary-blocks__header">
          <span>שעות</span>
          <span>אחוזים</span>
          <span aria-hidden="true" />
        </div>

        {blocks.map((b, i) => (
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
                onClick={() => decPct(i)}
                disabled={b.percentage <= PCT_MIN}
                aria-label="הפחת אחוזים"
              >
                −
              </button>
              <span className="salary-pill__value">{b.percentage}%</span>
              <button
                type="button"
                className="salary-pill__btn"
                onClick={() => incPct(i)}
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
              disabled={blocks.length <= 1}
              aria-label="הסר שורה"
            >
              ×
            </button>
          </div>
        ))}

        <button type="button" className="ghost-btn ghost-btn--small" onClick={addRow}>
          + הוסף שורה
        </button>

        <p className={`salary-blocks__remaining${counterClass}`}>{counterText}</p>
      </div>
    </div>
  );
}
