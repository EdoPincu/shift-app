import { useMemo, useState } from 'react';
import { Calendar } from './components/Calendar';
import { Dashboard } from './components/Dashboard';
import { NewShiftModal } from './components/NewShiftModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { useShifts } from './hooks/useShifts';
import { useTemplates } from './hooks/useTemplates';
import { useHourlyRate } from './hooks/useHourlyRate';
import { annotateShiftsWithStreak, startOfMonth, toISODate } from './dateUtils';
import type { Shift, ShiftDraft, Template, TemplateDraft } from './types';

export function App() {
  const { shifts, addShift, addManyShifts, updateShift, deleteShift } = useShifts();
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { rate: hourlyRate, setRate: setHourlyRate } = useHourlyRate();

  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [initialDate, setInitialDate] = useState<Date>(new Date());
  const [editing, setEditing] = useState<Shift | null>(null);

  const shiftsCountByTemplate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of shifts) {
      if (s.templateId) {
        counts[s.templateId] = (counts[s.templateId] ?? 0) + 1;
      }
    }
    return counts;
  }, [shifts]);

  const annotatedShifts = useMemo(() => annotateShiftsWithStreak(shifts), [shifts]);

  const openNew = (date?: Date) => {
    setEditing(null);
    setInitialDate(date ?? new Date());
    setShiftModalOpen(true);
  };

  const openEdit = (shift: Shift) => {
    setEditing(shift);
    setShiftModalOpen(true);
  };

  const closeShiftModal = () => setShiftModalOpen(false);

  const handleSave = (draft: ShiftDraft) => {
    if (editing) {
      updateShift(editing.id, draft);
    } else {
      addShift(draft);
    }
    closeShiftModal();
  };

  const handleDelete = (id: string) => {
    deleteShift(id);
    closeShiftModal();
  };

  const handleApplyMultiSlotTemplate = (template: Template, date: string) => {
    const [y, m, d] = date.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);
    let dayOffset = 0;
    const drafts: ShiftDraft[] = template.slots.map((slot, idx) => {
      if (idx > 0 && !slot.sameDay) dayOffset++;
      const slotDate = new Date(baseDate);
      slotDate.setDate(baseDate.getDate() + dayOffset);
      return {
        date: toISODate(slotDate),
        startTime: slot.start,
        endTime: slot.end,
        name: slot.name || template.name,
        color: slot.color || undefined,
        multipliers: slot.multipliers,
        partialMultiplier: slot.partialMultiplier,
        templateId: template.id,
        templateSlotIndex: idx,
      };
    });
    addManyShifts(drafts);
    closeShiftModal();
  };

  const handleTemplateUpdate = (
    id: string,
    draft: TemplateDraft,
    applyToShifts: boolean,
  ) => {
    updateTemplate(id, draft);
    if (!applyToShifts) return;
    for (const s of shifts) {
      if (s.templateId !== id) continue;
      const slotIdx = s.templateSlotIndex ?? 0;
      const slot = draft.slots[slotIdx];
      if (!slot) continue; // orphan: slot removed by user; leave shift untouched
      updateShift(s.id, {
        name: draft.name,
        startTime: slot.start,
        endTime: slot.end,
        multipliers: slot.multipliers,
        partialMultiplier: slot.partialMultiplier,
      });
    }
  };

  return (
    <div className="app">
      <div className="app__main">
        <Calendar
          shifts={annotatedShifts}
          templates={templates}
          cursor={cursor}
          onCursorChange={setCursor}
          onNewShift={() => openNew()}
          onAddShiftForDate={(date) => openNew(date)}
          onEditShift={openEdit}
          onManageTemplates={() => setTemplateModalOpen(true)}
        />
        <Dashboard
          shifts={annotatedShifts}
          templates={templates}
          cursor={cursor}
          hourlyRate={hourlyRate}
          onHourlyRateChange={setHourlyRate}
        />
      </div>

      <NewShiftModal
        open={shiftModalOpen}
        initialDate={initialDate}
        editing={editing}
        templates={templates}
        onClose={closeShiftModal}
        onSave={handleSave}
        onDelete={handleDelete}
        onApplyMultiSlotTemplate={handleApplyMultiSlotTemplate}
      />
      <TemplateManagerModal
        open={templateModalOpen}
        templates={templates}
        shiftsCountByTemplate={shiftsCountByTemplate}
        onClose={() => setTemplateModalOpen(false)}
        onAdd={addTemplate}
        onUpdate={handleTemplateUpdate}
        onDelete={deleteTemplate}
      />
    </div>
  );
}
