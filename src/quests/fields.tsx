import { Input } from '@/components/ui/input';

/** Constrained number input shared by quest editors and the options page. */
export function NumberInput({
  value,
  max,
  min = 1,
  disabled = false,
  onChange,
}: {
  value: number;
  max: number;
  min?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <Input
      type="number"
      className="w-21"
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v) && v >= min) onChange(v);
      }}
    />
  );
}
