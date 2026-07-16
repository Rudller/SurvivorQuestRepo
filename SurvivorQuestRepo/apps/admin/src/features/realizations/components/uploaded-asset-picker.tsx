"use client";

interface UploadedAssetPickerProps {
  options: { url: string; label: string }[];
  selectedUrl?: string;
  onSelect: (url: string) => void;
}

export function UploadedAssetPicker({ options, selectedUrl, onSelect }: UploadedAssetPickerProps) {
  if (options.length === 0) {
    return <p className="text-xs text-zinc-500">Brak wcześniej przesłanych plików.</p>;
  }

  return (
    <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
      {options.map((option) => {
        const isSelected = option.url === selectedUrl;
        return (
          <button
            key={option.url}
            type="button"
            title={option.label}
            onClick={() => onSelect(option.url)}
            className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border transition ${
              isSelected ? "border-amber-400 ring-2 ring-amber-400" : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={option.url} alt={option.label} className="h-full w-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}
