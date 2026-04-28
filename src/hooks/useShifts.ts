import { useCallback, useEffect, useState } from 'react';
import type { Shift, ShiftDraft } from '../types';
import { loadShifts, saveShifts } from '../storage';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useShifts() {
  const [shifts, setShifts] = useState<Shift[]>(() => loadShifts());

  useEffect(() => {
    saveShifts(shifts);
  }, [shifts]);

  const addShift = useCallback((draft: ShiftDraft) => {
    setShifts((prev) => [...prev, { ...draft, id: makeId() }]);
  }, []);

  const updateShift = useCallback((id: string, patch: Partial<ShiftDraft>) => {
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const deleteShift = useCallback((id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { shifts, addShift, updateShift, deleteShift };
}
