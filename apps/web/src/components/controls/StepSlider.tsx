'use client';

interface Props {
  stepCount: number;
  viewIndex: number;
  disabled: boolean;
  onChange: (index: number) => void;
}

export function StepSlider({ stepCount, viewIndex, disabled, onChange }: Props) {
  const max = Math.max(0, stepCount - 1);
  const value = Math.max(0, Math.min(viewIndex, max));

  return (
    <input
      type="range"
      min={0}
      max={max}
      step={1}
      value={value}
      disabled={disabled || stepCount === 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className="cv-slider flex-1 h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        background:
          stepCount > 0
            ? `linear-gradient(to right,
                 var(--cv-active-border) 0%,
                 var(--cv-active-border) ${(value / Math.max(1, max)) * 100}%,
                 var(--cv-border) ${(value / Math.max(1, max)) * 100}%,
                 var(--cv-border) 100%)`
            : 'var(--cv-border)',
      }}
    />
  );
}
