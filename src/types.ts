export type SalaryBlock = { hours: number; percentage: number };

export type TemplateSlot = {
  start: string;
  end: string;
  multipliers?: number[];
  partialMultiplier?: number;
  name?: string;
  color?: string;
  sameDay?: boolean;
};

export type Shift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  name?: string;
  color?: string;
  multipliers?: number[];
  partialMultiplier?: number;
  templateId?: string;
  templateSlotIndex?: number;
};

export type ShiftDraft = Omit<Shift, 'id'>;

export type AnnotatedShift = Shift & { isStreak: boolean };

export type Template = {
  id: string;
  name: string;
  color?: string;
  slots: TemplateSlot[];
};

export type TemplateDraft = Omit<Template, 'id'>;
