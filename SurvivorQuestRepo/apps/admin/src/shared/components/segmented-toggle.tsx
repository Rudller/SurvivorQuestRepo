type SegmentedToggleOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedToggleProps<T extends string> = {
  options: readonly SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedToggle<T extends string>({ options, value, onChange }: SegmentedToggleProps<T>) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              value === option.value ? "bg-amber-400 text-zinc-950" : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
