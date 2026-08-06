export type TabItem = {
  id: string;
  label: string;
  hasError?: boolean;
};

type TabStripProps = {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

export function TabStrip({ tabs, activeId, onChange, className }: TabStripProps) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 overflow-x-auto border-b border-zinc-800 ${className ?? ""}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {tab.hasError ? (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-red-500"
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
