import { useState } from 'react';
import type { SalaryBlock, Template, TemplateDraft } from '../types';
import {
  blocksTotalHours,
  flattenBlocks,
  groupIntoBlocks,
  shiftDurationMinutes,
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

type EditState =
  | { mode: 'idle' }
  | {
      mode: 'editing';
      id: string;
      name: string;
      start: string;
      end: string;
      blocks: SalaryBlock[];
      color: string;
    }
  | {
      mode: 'creating';
      name: string;
      start: string;
      end: string;
      blocks: SalaryBlock[];
      color: string;
    };

type PendingApply = {
  id: string;
  draft: TemplateDraft;
  affectedCount: number;
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
      start: t.start,
      end: t.end,
      blocks: blocksFromMultipliers(t.multipliers, t.start, t.end),
      color: t.color ?? PALETTE[0],
    });
  };

  const startCreate = () => {
    setPendingApply(null);
    setError(null);
    setEdit({
      mode: 'creating',
      name: '',
      start: '07:00',
      end: '15:00',
      blocks: defaultBlocksFor('07:00', '15:00'),
      color: PALETTE[1],
    });
  };

  const cancelEdit = () => {
    setEdit({ mode: 'idle' });
    setPendingApply(null);
    setError(null);
  };

  const saveEdit = () => {
    if (edit.mode === 'idle') return;
    if (!edit.name.trim() || !edit.start || !edit.end) return;

    const wholeHours = wholeHoursOfShift(shiftDurationMinutes(edit.start, edit.end));
    const totalAssigned = blocksTotalHours(edit.blocks);
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
      savedMultipliers = flattenBlocks(edit.blocks);
    }
    setError(null);

    const draft: TemplateDraft = {
      name: edit.name.trim(),
      start: edit.start,
      end: edit.end,
      multipliers: savedMultipliers,
      color: edit.color,
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
  const editorDuration =
    edit.mode === 'idle' ? 0 : shiftDurationMinutes(edit.start, edit.end);

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
                        <div className="template-list__name">{t.name}</div>
                        <div className="template-list__time">
                          {t.start}–{t.end}
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
            <div className="field-row">
              <label className="field">
                <span className="field__label">שעת התחלה</span>
                <input
                  type="time"
                  value={edit.start}
                  onChange={(e) => setEdit({ ...edit, start: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field__label">שעת סיום</span>
                <input
                  type="time"
                  value={edit.end}
                  onChange={(e) => setEdit({ ...edit, end: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span className="field__label">צבע</span>
              <ColorPicker
                value={edit.color}
                onChange={(color) => setEdit({ ...edit, color })}
              />
            </label>
            <HourlyMultipliers
              durationMinutes={editorDuration}
              blocks={edit.blocks}
              onChange={(blocks) => {
                setEdit({ ...edit, blocks });
                setError(null);
              }}
            />
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
