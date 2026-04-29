import { useEffect, useMemo, useState } from 'react';
import type { SalaryBlock, Shift, ShiftDraft, Template } from '../types';
import {
  blocksTotalHours,
  flattenBlocks,
  groupIntoBlocks,
  shiftDurationMinutes,
  shiftPartialMinutes,
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
  onApplyMultiSlotTemplate: (template: Template, date: string) => void;
};

function defaultWholeBlocksFor(start: string, end: string): SalaryBlock[] {
  const wh = wholeHoursOfShift(shiftDurationMinutes(start, end));
  return wh > 0 ? [{ hours: wh, percentage: 100 }] : [];
}

function wholeBlocksFromMultipliers(
  multipliers: number[] | undefined,
  start: string,
  end: string,
): SalaryBlock[] {
  if (multipliers && multipliers.length > 0) return groupIntoBlocks(multipliers);
  return defaultWholeBlocksFor(start, end);
}

export function NewShiftModal({
  open,
  initialDate,
  editing,
  templates,
  onClose,
  onSave,
  onDelete,
  onApplyMultiSlotTemplate,
}: Props) {
  const [date, setDate] = useState<string>(toISODate(initialDate));
  const [startTime, setStartTime] = useState<string>('07:00');
  const [endTime, setEndTime] = useState<string>('15:00');
  const [name, setName] = useState<string>('');
  const [wholeBlocks, setWholeBlocks] = useState<SalaryBlock[]>([]);
  const [partialPct, setPartialPct] = useState<number>(100);
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [templateSlotIndex, setTemplateSlotIndex] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setDate(editing.date);
      setStartTime(editing.startTime);
      setEndTime(editing.endTime);
      setName(editing.name ?? '');
      setWholeBlocks(
        wholeBlocksFromMultipliers(editing.multipliers, editing.startTime, editing.endTime),
      );
      setPartialPct(editing.partialMultiplier ?? 100);
      setTemplateId(editing.templateId);
      setTemplateSlotIndex(editing.templateSlotIndex);
    } else {
      setDate(toISODate(initialDate));
      setStartTime('07:00');
      setEndTime('15:00');
      setName('');
      setWholeBlocks(defaultWholeBlocksFor('07:00', '15:00'));
      setPartialPct(100);
      setTemplateId(undefined);
      setTemplateSlotIndex(undefined);
    }
  }, [open, editing, initialDate]);

  const durationMinutes = useMemo(
    () => shiftDurationMinutes(startTime, endTime),
    [startTime, endTime],
  );

  if (!open) return null;

  const applyTemplate = (t: Template) => {
    if (t.slots.length > 1) {
      // Multi-slot template — inject all shifts on the modal's current date.
      onApplyMultiSlotTemplate(t, date);
      return;
    }
    const slot = t.slots[0];
    if (!slot) return;
    setStartTime(slot.start);
    setEndTime(slot.end);
    setName(t.name);
    setWholeBlocks(wholeBlocksFromMultipliers(slot.multipliers, slot.start, slot.end));
    setPartialPct(slot.partialMultiplier ?? 100);
    setTemplateId(t.id);
    setTemplateSlotIndex(0);
    setError(null);
  };

  const handleWholeBlocksChange = (next: SalaryBlock[]) => {
    setWholeBlocks(next);
    setError(null);
  };

  const handlePartialPctChange = (next: number) => {
    setPartialPct(next);
    setError(null);
  };

  const handleSave = () => {
    if (!date || !startTime || !endTime) return;

    const wholeHours = wholeHoursOfShift(durationMinutes);
    const partialMin = shiftPartialMinutes(durationMinutes);
    const totalAssigned = blocksTotalHours(wholeBlocks);

    if (wholeHours > 0) {
      if (totalAssigned < wholeHours) {
        setError('לא הגדרת משכורת לכל השעות במשמרת');
        return;
      }
      if (totalAssigned > wholeHours) {
        setError('הגדרת יותר שעות ממה שיש במשמרת');
        return;
      }
    }

    const savedMultipliers =
      wholeBlocks.length > 0 ? flattenBlocks(wholeBlocks) : undefined;
    const savedPartialMultiplier = partialMin > 0 ? partialPct : undefined;

    onSave({
      date,
      startTime,
      endTime,
      name: name.trim() || undefined,
      multipliers: savedMultipliers,
      partialMultiplier: savedPartialMultiplier,
      templateId,
      templateSlotIndex,
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
            {templates.map((t) => {
              const multi = t.slots.length > 1;
              const firstSlot = t.slots[0];
              const isActive = templateId === t.id && !multi;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`template-btn${isActive ? ' template-btn--active' : ''}${multi ? ' template-btn--multi' : ''}`}
                  onClick={() => applyTemplate(t)}
                  title={multi ? `הוסף ${t.slots.length} משמרות בו זמנית` : undefined}
                >
                  <span className="template-btn__name">
                    {t.name}
                    {multi && (
                      <span className="template-btn__badge">{t.slots.length} משמרות</span>
                    )}
                  </span>
                  <span className="template-btn__time">
                    {multi
                      ? t.slots.map((s) => `${s.start}–${s.end}`).join(' · ')
                      : firstSlot
                        ? `${firstSlot.start}–${firstSlot.end}`
                        : ''}
                  </span>
                </button>
              );
            })}
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
              setTemplateSlotIndex(undefined);
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
                setTemplateSlotIndex(undefined);
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
                setTemplateSlotIndex(undefined);
              }}
            />
          </label>
        </div>

        <HourlyMultipliers
          durationMinutes={durationMinutes}
          wholeBlocks={wholeBlocks}
          partialPct={partialPct}
          onWholeBlocksChange={handleWholeBlocksChange}
          onPartialPctChange={handlePartialPctChange}
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
