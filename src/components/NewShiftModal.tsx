import { useEffect, useMemo, useState } from 'react';
import type { SalaryBlock, Shift, ShiftDraft, Template } from '../types';
import {
  blocksTotalHours,
  flattenBlocks,
  groupIntoBlocks,
  shiftDurationMinutes,
  toISODate,
  wholeHoursOfShift,
} from '../dateUtils';
import { HourlyMultipliers } from './HourlyMultipliers';

type Props = {
  open: boolean;
  initialDate: Date;
  editing: Shift | null;
  templates: Template[];
  onClose: () => void;
  onSave: (draft: ShiftDraft) => void;
  onDelete: (id: string) => void;
};

function defaultBlocksFor(start: string, end: string): SalaryBlock[] {
  const wh = wholeHoursOfShift(shiftDurationMinutes(start, end));
  return wh > 0 ? [{ hours: wh, percentage: 100 }] : [];
}

function blocksFromMultipliers(
  multipliers: number[] | undefined,
  start: string,
  end: string,
): SalaryBlock[] {
  if (multipliers && multipliers.length > 0) return groupIntoBlocks(multipliers);
  return defaultBlocksFor(start, end);
}

export function NewShiftModal({
  open,
  initialDate,
  editing,
  templates,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [date, setDate] = useState<string>(toISODate(initialDate));
  const [startTime, setStartTime] = useState<string>('07:00');
  const [endTime, setEndTime] = useState<string>('15:00');
  const [name, setName] = useState<string>('');
  const [blocks, setBlocks] = useState<SalaryBlock[]>([]);
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setDate(editing.date);
      setStartTime(editing.startTime);
      setEndTime(editing.endTime);
      setName(editing.name ?? '');
      setBlocks(blocksFromMultipliers(editing.multipliers, editing.startTime, editing.endTime));
      setTemplateId(editing.templateId);
    } else {
      setDate(toISODate(initialDate));
      setStartTime('07:00');
      setEndTime('15:00');
      setName('');
      setBlocks(defaultBlocksFor('07:00', '15:00'));
      setTemplateId(undefined);
    }
  }, [open, editing, initialDate]);

  const durationMinutes = useMemo(
    () => shiftDurationMinutes(startTime, endTime),
    [startTime, endTime],
  );

  if (!open) return null;

  const applyTemplate = (t: Template) => {
    setStartTime(t.start);
    setEndTime(t.end);
    setName(t.name);
    setBlocks(blocksFromMultipliers(t.multipliers, t.start, t.end));
    setTemplateId(t.id);
    setError(null);
  };

  const handleBlocksChange = (next: SalaryBlock[]) => {
    setBlocks(next);
    setError(null);
  };

  const handleSave = () => {
    if (!date || !startTime || !endTime) return;

    const wholeHours = wholeHoursOfShift(durationMinutes);
    const totalAssigned = blocksTotalHours(blocks);
    let savedMultipliers: number[] | undefined;

    if (totalAssigned === 0) {
      savedMultipliers = undefined;
    } else if (totalAssigned < wholeHours) {
      setError('לא הגדרת משכורת לכל השעות במשמרת');
      return;
    } else if (totalAssigned > wholeHours) {
      setError('הגדרת יותר שעות ממה שיש במשמרת');
      return;
    } else {
      savedMultipliers = flattenBlocks(blocks);
    }

    onSave({
      date,
      startTime,
      endTime,
      name: name.trim() || undefined,
      multipliers: savedMultipliers,
      templateId,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'עריכת משמרת' : 'משמרת חדשה'}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title">{editing ? 'עריכת משמרת' : 'משמרת חדשה'}</h2>

        {templates.length > 0 && (
          <div className="templates">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`template-btn${templateId === t.id ? ' template-btn--active' : ''}`}
                onClick={() => applyTemplate(t)}
              >
                <span className="template-btn__name">{t.name}</span>
                <span className="template-btn__time">
                  {t.start}–{t.end}
                </span>
              </button>
            ))}
          </div>
        )}

        <label className="field">
          <span className="field__label">שם המשמרת (אופציונלי)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setTemplateId(undefined);
            }}
            placeholder="לדוגמה: עבודה אצל דני"
          />
        </label>

        <label className="field">
          <span className="field__label">תאריך</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field__label">שעת התחלה</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setTemplateId(undefined);
              }}
            />
          </label>
          <label className="field">
            <span className="field__label">שעת סיום</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setTemplateId(undefined);
              }}
            />
          </label>
        </div>

        <HourlyMultipliers
          durationMinutes={durationMinutes}
          blocks={blocks}
          onChange={handleBlocksChange}
        />

        {error && <p className="salary-blocks__error">{error}</p>}

        <div className="modal__actions">
          {editing && (
            <button
              type="button"
              className="danger-btn"
              onClick={() => onDelete(editing.id)}
            >
              מחק
            </button>
          )}
          <div className="modal__actions-right">
            <button type="button" className="ghost-btn" onClick={onClose}>
              ביטול
            </button>
            <button type="button" className="primary-btn" onClick={handleSave}>
              סיום
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
