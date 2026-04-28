import { useCallback, useEffect, useState } from 'react';
import { loadHourlyRate, saveHourlyRate } from '../storage';

export function useHourlyRate() {
  const [rate, setRate] = useState<number>(() => loadHourlyRate());

  useEffect(() => {
    saveHourlyRate(rate);
  }, [rate]);

  const updateRate = useCallback((next: number) => {
    setRate(Number.isFinite(next) && next >= 0 ? next : 0);
  }, []);

  return { rate, setRate: updateRate };
}
