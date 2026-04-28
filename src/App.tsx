import { useMemo, useState } from 'react';
import { Calendar } from './components/Calendar';
import { Dashboard } from './components/Dashboard';
import { NewShiftModal } from './components/NewShiftModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { useShifts } from './hooks/useShifts';
import { useTemplates } from './hooks/useTemplates';
import { useHourlyRate } from './hooks/useHourlyRate';
import { startOfMonth } from './dateUtils';
import type { Shift, ShiftDraft, TemplateDraft } from './types';

export function App() {
  const { shifts, addShift, updateShift, deleteShift } = useShifts();
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

  const handleTemplateUpdate = (
    id: string,
    draft: TemplateDraft,
    applyToShifts: boolean,
  ) => {
    updateTemplate(id, draft);
    if (!applyToShifts) return;
    for (const s of shifts) {
      if (s.templateId !== id) continue;
      updateShift(s.id, {
        name: draft.name,
        startTime: draft.start,
        endTime: draft.end,
        multipliers: draft.multipliers,
      });
    }
  };

  return (
    <div className="app">
      <div className="app__main">
        <Calendar
          shifts={shifts}
          templates={templates}
          cursor={cursor}
          onCursorChange={setCursor}
          onNewShift={() => openNew()}
          onAddShiftForDate={(date) => openNew(date)}
          onEditShift={openEdit}
          onManageTemplates={() => setTemplateModalOpen(true)}
        />
        <Dashboard
          shifts={shifts}
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
