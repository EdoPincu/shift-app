import { useCallback, useEffect, useState } from 'react';
import type { Template, TemplateDraft } from '../types';
import { loadTemplates, saveTemplates } from '../storage';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>(() => loadTemplates());

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  const addTemplate = useCallback((draft: TemplateDraft) => {
    setTemplates((prev) => [...prev, { ...draft, id: makeId() }]);
  }, []);

  const updateTemplate = useCallback((id: string, patch: Partial<TemplateDraft>) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { templates, addTemplate, updateTemplate, deleteTemplate };
}
