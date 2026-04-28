export type SalaryBlock = { hours: number; percentage: number };

export type Shift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  name?: string;
  multipliers?: number[];
  templateId?: string;
};

export type ShiftDraft = Omit<Shift, 'id'>;

export type Template = {
  id: string;
  name: string;
  start: string;
  end: string;
  multipliers?: number[];
  color?: string;
};

export type TemplateDraft = Omit<Template, 'id'>;
