import { useState } from 'react';
import type { SalaryBlock, Template, TemplateDraft, TemplateSlot } from '../types';
import {
  blocksTotalHours,
  flattenBlocks,
  groupIntoBlocks,
  shiftDurationMinutes,
  shiftPartialMinutes,
  wholeHoursOfShift,
} from '../dateUtils';
import { PALETTE } from '../templates';
import { HourlyMultipliers } from './HourlyMultipliers';
import { ColorPicker } from './ColorPicker';

type Props = {
  open: boolean;
  templates: Template[];
  shiftsCountByTemplate: Record<string, number>;
  onClose: () => void;
  onAdd: (draft: TemplateDraft) => void;
  onUpdate: (id: string, draft: TemplateDraft, applyToShifts: boolean) => void;
  onDelete: (id: string) => void;
};

type SlotEditState = {
  start: string;
  end: string;
  wholeBlocks: SalaryBlock[];
  partialPct: number;
  name: string;
  color: string;
  sameDay: boolean;
};

type EditState =
  | { mode: 'idle' }
  | {
      mode: 'editing';
      id: string;
      name: string;
      color: string;
      slots: SlotEditState[];
    }
  | {
      mode: 'creating';
      name: string;
      color: string;
      slots: SlotEditState[];
    };

type PendingApply = {
  id: string;
  draft: TemplateDraft;
  affectedCount: number;
};

function defaultWholeBlocksFor(start: string, end: string): SalaryBlock[] {
  const wh = wholeHoursOfShift(shiftDurationMinutes(start, end));
  return wh > 0 ? [{ hours: wh, percentage: 100 }] : [];
}

function slotToEditState(slot: TemplateSlot): SlotEditState {
  return {
    start: slot.start,
    end: slot.end,
    wholeBlocks:
      slot.multipliers && slot.multipliers.length > 0
        ? groupIntoBlocks(slot.multipliers)
        : defaultWholeBlocksFor(slot.start, slot.end),
    partialPct: slot.partialMultiplier ?? 100,
    name: slot.name ?? '',
    color: slot.color ?? '',
    sameDay: slot.sameDay ?? false,
  };
}

function newEmptySlot(): SlotEditState {
  return {
    start: '07:00',
    end: '15:00',
    wholeBlocks: defaultWholeBlocksFor('07:00', '15:00'),
    partialPct: 100,
    name: '',
    color: '',
    sameDay: false,
  };
}

export function TemplateManagerModal({
  open,
  templates,
  shiftsCountByTemplate,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [edit, setEdit] = useState<EditState>({ mode: 'idle' });
  const [pendingApply, setPendingApply] = useState<PendingApply | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const startEdit = (t: Template) => {
    setPendingApply(null);
    setError(null);
    setEdit({
      mode: 'editing',
      id: t.id,
      name: t.name,
      color: t.color ?? PALETTE[0],
      slots: t.slots.map(slotToEditState),
    });
  };

  const startCreate = () => {
    setPendingApply(null);
    setError(null);
    setEdit({
      mode: 'creating',
      name: '',
      color: PALETTE[1],
      slots: [newEmptySlot()],
    });
  };

  const cancelEdit = () => {
    setEdit({ mode: 'idle' });
    setPendingApply(null);
    setError(null);
  };

  const updateSlot = (idx: number, patch: Partial<SlotEditState>) => {
    if (edit.mode === 'idle') return;
    setEdit({
      ...edit,
      slots: edit.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    });
    setError(null);
  };

  const addSlot = () => {
    if (edit.mode === 'idle') return;
    setEdit({ ...edit, slots: [...edit.slots, newEmptySlot()] });
    setError(null);
  };

  const removeSlot = (idx: number) => {
    if (edit.mode === 'idle' || edit.slots.length <= 1) return;
    setEdit({ ...edit, slots: edit.slots.filter((_, i) => i !== idx) });
    setError(null);
  };

  const saveEdit = () => {
    if (edit.mode === 'idle') return;
    if (!edit.name.trim()) return;

    const slotDrafts: TemplateSlot[] = [];
    for (let i = 0; i < edit.slots.length; i++) {
      const slot = edit.slots[i];
      if (!slot.start || !slot.end) {
        setError(`חסרות שעות בתבנית ${i + 1}`);
        return;
      }
      const durationMin = shiftDurationMinutes(slot.start, slot.end);
      const wholeHours = wholeHoursOfShift(durationMin);
      const partialMin = shiftPartialMinutes(durationMin);
      const totalAssigned = blocksTotalHours(slot.wholeBlocks);
      if (wholeHours > 0) {
        if (totalAssigned < wholeHours) {
          setError(`לא הגדרת משכורת לכל השעות במשמרת ${i + 1}`);
          return;
        }
        if (totalAssigned > wholeHours) {
          setError(`הגדרת יותר שעות ממה שיש במשמרת ${i + 1}`);
          return;
        }
      }
      slotDrafts.push({
        start: slot.start,
        end: slot.end,
        multipliers: slot.wholeBlocks.length > 0 ? flattenBlocks(slot.wholeBlocks) : undefined,
        partialMultiplier: partialMin > 0 ? slot.partialPct : undefined,
        name: slot.name.trim() || undefined,
        color: i > 0 ? (slot.color || undefined) : undefined,
        sameDay: i > 0 && slot.sameDay ? true : undefined,
      });
    }
    setError(null);

    const draft: TemplateDraft = {
      name: edit.name.trim(),
      color: edit.color,
      slots: slotDrafts,
    };
    if (edit.mode === 'creating') {
      onAdd(draft);
      setEdit({ mode: 'idle' });
      return;
    }
    const affectedCount = shiftsCountByTemplate[edit.id] ?? 0;
    if (affectedCount > 0) {
      setPendingApply({ id: edit.id, draft, affectedCount });
      return;
    }
    onUpdate(edit.id, draft, false);
    setEdit({ mode: 'idle' });
  };

  const resolveApply = (applyToShifts: boolean) => {
    if (!pendingApply) return;
    onUpdate(pendingApply.id, pendingApply.draft, applyToShifts);
    setPendingApply(null);
    setEdit({ mode: 'idle' });
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    if (edit.mode === 'editing' && edit.id === id) {
      setEdit({ mode: 'idle' });
      setPendingApply(null);
      setError(null);
    }
  };

  const editorOpen = edit.mode !== 'idle';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="ניהול תבניות"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title">ניהול תבניות</h2>

        <ul className="template-list">
          {templates.map((t) => {
            const isEditingThis = edit.mode === 'editing' && edit.id === t.id;
            const slotCount = t.slots.length;
            return (
              <li key={t.id} className="template-list__item">
                {isEditingThis ? null : (
                  <>
                    <div className="template-list__info">
                      <span
                        className="template-list__dot"
                        style={{ background: t.color ?? '#475569' }}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="template-list__name">
                          {t.name}
                          {slotCount > 1 && (
                            <span className="template-list__badge">{slotCount} משמרות</span>
                          )}
                        </div>
                        <div className="template-list__time">
                          {t.slots.map((s, i) => (
                            <span key={i}>
                              {i > 0 && ' · '}
                              {s.start}–{s.end}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="template-list__actions">
                      <button
                        type="button"
                        className="ghost-btn ghost-btn--small"
                        onClick={() => startEdit(t)}
                        disabled={editorOpen}
                      >
                        ערוך
                      </button>
                      <button
                        type="button"
                        className="danger-btn danger-btn--small"
                        onClick={() => handleDelete(t.id)}
                        disabled={editorOpen}
                      >
                        מחק
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {edit.mode === 'idle' ? (
          <button type="button" className="ghost-btn" onClick={startCreate}>
            + תבנית חדשה
          </button>
        ) : pendingApply ? (
          <div className="template-confirm">
            <h3 className="template-confirm__title">
              {pendingApply.affectedCount}{' '}
              {pendingApply.affectedCount === 1 ? 'משמרת קיימת נוצרה' : 'משמרות קיימות נוצרו'}{' '}
              מהתבנית הזו
            </h3>
            <p className="template-confirm__body">
              להחיל את השינויים גם עליהן? (השעות, האחוזים, השם והצבע יוחלפו)
            </p>
            <div className="modal__actions-right">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => resolveApply(false)}
              >
                לא, רק על משמרות עתידיות
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => resolveApply(true)}
              >
                כן, החל גם עליהן
              </button>
            </div>
          </div>
        ) : (
          <div className="template-editor">
            <h3 className="template-editor__title">
              {edit.mode === 'editing' ? 'עריכת תבנית' : 'תבנית חדשה'}
            </h3>
            <label className="field">
              <span className="field__label">שם</span>
              <input
                type="text"
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                placeholder="לדוגמה: משמרת בוקר"
              />
            </label>
            <label className="field">
              <span className="field__label">צבע</span>
              <ColorPicker
                value={edit.color}
                onChange={(color) => setEdit({ ...edit, color })}
              />
            </label>

            <div className="template-slots">
              {edit.slots.map((slot, i) => (
                <div key={i} className="template-slot">
                  <div className="template-slot__header">
                    <h4 className="template-slot__title">משמרת {i + 1}</h4>
                    {edit.slots.length > 1 && (
                      <button
                        type="button"
                        className="salary-block__remove"
                        onClick={() => removeSlot(i)}
                        aria-label="הסר משמרת מהתבנית"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {i > 0 && (
                    <div className="template-slot__day-toggle">
                      <span className="field__label">יום</span>
                      <div className="segmented-control">
                        <button
                          type="button"
                          className={`segmented-control__btn${slot.sameDay ? ' segmented-control__btn--active' : ''}`}
                          onClick={() => updateSlot(i, { sameDay: true })}
                        >
                          באותו יום
                        </button>
                        <button
                          type="button"
                          className={`segmented-control__btn${!slot.sameDay ? ' segmented-control__btn--active' : ''}`}
                          onClick={() => updateSlot(i, { sameDay: false })}
                        >
                          יום למחרת
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="field-row">
                    <label className="field">
                      <span className="field__label">שעת התחלה</span>
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateSlot(i, { start: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span className="field__label">שעת סיום</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateSlot(i, { end: e.target.value })}
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span className="field__label">שם משמרת (ריק = שם התבנית)</span>
                    <input
                      type="text"
                      value={slot.name}
                      onChange={(e) => updateSlot(i, { name: e.target.value })}
                      placeholder={edit.name || 'שם התבנית'}
                    />
                  </label>

                  {i > 0 && (
                    <label className="field">
                      <span className="field__label">צבע (ריק = צבע התבנית)</span>
                      <div className="template-slot__color-row">
                        <ColorPicker
                          value={slot.color || edit.color}
                          onChange={(color) =>
                            updateSlot(i, { color: color === edit.color ? '' : color })
                          }
                        />
                        {slot.color && (
                          <button
                            type="button"
                            className="ghost-btn ghost-btn--small"
                            onClick={() => updateSlot(i, { color: '' })}
                          >
                            איפוס
                          </button>
                        )}
                      </div>
                    </label>
                  )}

                  <HourlyMultipliers
                    durationMinutes={shiftDurationMinutes(slot.start, slot.end)}
                    wholeBlocks={slot.wholeBlocks}
                    partialPct={slot.partialPct}
                    onWholeBlocksChange={(wholeBlocks) =>
                      updateSlot(i, { wholeBlocks })
                    }
                    onPartialPctChange={(partialPct) => updateSlot(i, { partialPct })}
                  />
                </div>
              ))}

              <button
                type="button"
                className="ghost-btn ghost-btn--small"
                onClick={addSlot}
              >
                + הוסף משמרת לתבנית
              </button>
            </div>

            {error && <p className="salary-blocks__error">{error}</p>}

            <div className="modal__actions-right">
              <button type="button" className="ghost-btn" onClick={cancelEdit}>
                ביטול
              </button>
              <button type="button" className="primary-btn" onClick={saveEdit}>
                שמור
              </button>
            </div>
          </div>
        )}

        <div className="modal__actions">
          <div className="modal__actions-right">
            <button type="button" className="ghost-btn" onClick={onClose}>
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
