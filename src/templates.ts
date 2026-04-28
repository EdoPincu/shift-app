import type { Template } from './types';

export const PALETTE = [
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#ec4899', // pink
  '#a855f7', // violet
  '#4f46e5', // indigo
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#84cc16', // lime
];

export const DEFAULT_SHIFT_COLOR = '#475569';

export const DEFAULT_TEMPLATES: Template[] = [
  { id: 'default-morning', name: 'משמרת בוקר', start: '06:50', end: '15:00', color: '#f59e0b' },
  { id: 'default-evening', name: 'משמרת ערב', start: '14:50', end: '23:00', color: '#a855f7' },
  { id: 'default-night', name: 'משמרת לילה', start: '22:50', end: '07:00', color: '#4f46e5' },
];
