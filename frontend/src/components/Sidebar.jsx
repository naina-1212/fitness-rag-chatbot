const MODES = [
  { id: "beginner", label: "Beginner", hint: "Plain language, zero jargon" },
  { id: "coach", label: "Coach", hint: "Practical, direct advice" },
  { id: "researcher", label: "Researcher", hint: "More technical depth" },
];

const EXAMPLES = [
  "How much protein do I need to build muscle?",
  "What's the best training volume for hypertrophy?",
  "Does sleep actually affect muscle recovery?",
  "What heart rate zone is best for cardio fitness?",
  "Is intermittent fasting effective for fat loss?",
];

export default function Sidebar({
  mode,
  onModeChange,
  onExampleClick,
  stats,
  onClear,
  theme,
  onThemeToggle,
}) {
  return (
    <aside className="w-72 shrink-0 border-r border-line bg-surface flex flex-col h-full">
      <div className="px-5 py-6 border-b border-line flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <svg
              width="22"
              height="22"
              viewBox="0 0 240 24"
              className="shrink-0"
            >
              <path
                d="M0 12 H70 L84 2 L98 22 L112 6 L124 12 H240"
                stroke="var(--color-accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="font-display font-semibold text-lg tracking-tight">
              Fitness Coach
            </span>
          </div>
          <p className="text-xs text-muted mt-1.5 leading-snug">
            Evidence-based answers, grounded in real research.
          </p>
        </div>
        <button
          onClick={onThemeToggle}
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          className="shrink-0 w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:text-ink hover:border-ink/30 transition-colors"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      <div className="px-5 py-5 border-b border-line">
        <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted mb-3">
          Explanation mode
        </h3>
        <div className="flex flex-col gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                mode === m.id
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line bg-bg text-muted hover:border-ink/20 hover:text-ink"
              }`}
            >
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-xs opacity-70">{m.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 border-b border-line flex-1 overflow-y-auto">
        <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted mb-3">
          Try asking
        </h3>
        <div className="flex flex-col gap-1.5">
          {EXAMPLES.map((q) => (
            <button
              key={q}
              onClick={() => onExampleClick(q)}
              className="text-left text-sm text-ink/80 px-3 py-2 rounded-lg hover:bg-bg border border-transparent hover:border-line transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="px-5 py-4 border-t border-line grid grid-cols-2 gap-2">
          <StatBlock value={stats.unique_sources} label="sources" />
          <StatBlock value={stats.total_chunks} label="passages" />
        </div>
      )}

      <div className="px-5 py-4 border-t border-line">
        <button
          onClick={onClear}
          className="w-full text-sm text-muted hover:text-ink border border-line rounded-lg py-2 transition-colors"
        >
          Clear conversation
        </button>
      </div>
    </aside>
  );
}

function StatBlock({ value, label }) {
  return (
    <div className="text-center">
      <div className="font-mono text-lg font-semibold text-forest-deep">
        {value ?? "—"}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
    </div>
  );
}
