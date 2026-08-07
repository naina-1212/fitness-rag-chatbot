const MODEL_TYPES = [
  {
    id: "rag",
    label: "Research RAG",
    hint: "Search study documents",
    icon: "📚",
  },
  { id: "agent", label: "Web Agent", hint: "Query the live web", icon: "🌐" },
];

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
  modelType,
  onModelTypeChange,
  mode,
  onModeChange,
  onExampleClick,
  stats,
  onClear,
  theme,
  onThemeToggle,
}) {
  return (
    <aside className="w-80 shrink-0 border-r border-line bg-surface flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="px-6 py-6 border-b border-line flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 240 24"
              className="shrink-0"
            >
              <path
                d="M0 12 H70 L84 2 L98 22 L112 6 L124 12 H240"
                stroke="var(--color-accent)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-ink to-muted bg-clip-text text-transparent">
              PulseFit Coach
            </span>
          </div>
          <p className="text-sm text-muted mt-1.5 leading-snug">
            Evidence-based training assistant.
          </p>
        </div>
        <button
          onClick={onThemeToggle}
          aria-label="Toggle theme"
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          className="shrink-0 w-9 h-9 rounded-xl border border-line flex items-center justify-center text-muted hover:text-ink hover:border-ink/30 hover:bg-bg transition-all"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Engine selector */}
      <div className="px-6 py-5 border-b border-line">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted mb-3.5">
          Knowledge engine
        </h3>
        <div className="flex flex-col gap-2">
          {MODEL_TYPES.map((m) => (
            <button
              key={m.id}
              onClick={() => onModelTypeChange(m.id)}
              className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                modelType === m.id
                  ? "border-accent bg-accent-soft text-ink shadow-sm scale-[1.01]"
                  : "border-line bg-bg text-muted hover:border-ink/20 hover:text-ink"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{m.icon}</span>
                <div className="text-base font-bold">{m.label}</div>
              </div>
              <div className="text-sm opacity-85 mt-0.5 ml-7">{m.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Explanation mode */}
      <div className="px-6 py-5 border-b border-line">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted mb-3.5">
          Voice & style
        </h3>
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`text-left px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                mode === m.id
                  ? "border-accent bg-accent-soft text-ink scale-[1.01]"
                  : "border-line bg-bg text-muted hover:border-ink/20 hover:text-ink"
              }`}
            >
              <div className="text-base font-semibold">{m.label}</div>
              <div className="text-sm opacity-85 mt-0.5">{m.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Try asking */}
      <div className="px-6 py-5 border-b border-line flex-1 overflow-y-auto">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted mb-3.5">
          Try asking
        </h3>
        <div className="flex flex-col gap-2">
          {EXAMPLES.map((q) => (
            <button
              key={q}
              onClick={() => onExampleClick(q)}
              className="text-left text-base text-ink/80 px-4 py-2.5 rounded-xl hover:bg-bg border border-transparent hover:border-line transition-all cursor-pointer font-medium hover:pl-5 duration-200"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && modelType === "rag" && (
        <div className="px-6 py-4 border-t border-line grid grid-cols-2 gap-3 bg-bg/50">
          <StatBlock value={stats.unique_sources} label="sources" />
          <StatBlock value={stats.total_chunks} label="passages" />
        </div>
      )}

      {/* Clear conversation */}
      <div className="px-6 py-4 border-t border-line">
        <button
          onClick={onClear}
          className="w-full text-base text-muted hover:text-ink hover:bg-bg border border-line rounded-xl py-2.5 transition-all font-semibold cursor-pointer text-center"
        >
          Clear conversation
        </button>
      </div>
    </aside>
  );
}

function StatBlock({ value, label }) {
  return (
    <div className="text-center bg-surface p-2 rounded-xl border border-line">
      <div className="font-mono text-xl font-bold text-forest-deep">
        {value ?? "—"}
      </div>
      <div className="text-xs uppercase tracking-wide text-muted font-bold mt-0.5">
        {label}
      </div>
    </div>
  );
}
