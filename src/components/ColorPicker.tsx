import { PALETTE } from '../templates';

type Props = {
  value: string | undefined;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="color-picker">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          className={`color-swatch${value === c ? ' color-swatch--active' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`צבע ${c}`}
        />
      ))}
    </div>
  );
}
