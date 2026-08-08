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

export default function Sidebar({
  modelType,
  onModelTypeChange,
  mode,
  onModeChange,
  stats,
  theme,
  onThemeToggle,

  // Session props
  sessions = [],
  activeChatId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onClearChat,
  isChatEmpty,

  // Mobile props
  sidebarOpen,
  onSidebarClose,
}) {
  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onSidebarClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-80 bg-surface border-r border-line flex flex-col h-full shadow-xl z-50 transform transition-transform duration-300 md:relative md:translate-x-0 shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5.5 border-b border-line flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 240 24"
                className="shrink-0"
              >
                <path
                  d="M0 12 H70 L84 2 L98 22 L112 6 L124 12 H240"
                  stroke="var(--color-accent)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span className="font-display font-extrabold text-lg tracking-tight bg-linear-to-r from-ink to-muted bg-clip-text text-transparent">
                PulseFit Coach
              </span>
            </div>
            <p className="text-xs text-muted mt-1 leading-snug font-medium">
              Evidence-based training assistant.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={onThemeToggle}
              aria-label="Toggle theme"
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              className="shrink-0 w-8 h-8 rounded-lg border border-line flex items-center justify-center text-sm text-muted hover:text-ink hover:border-ink/30 hover:bg-bg transition-all cursor-pointer"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Mobile close button */}
            <button
              onClick={onSidebarClose}
              className="md:hidden w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:text-ink cursor-pointer"
              title="Close menu"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pt-5 pb-2 flex flex-col gap-2">
          <button
            onClick={() => {
              onNewChat();
              if (onSidebarClose) onSidebarClose();
            }}
            className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
          >
            <span>＋</span> New Chat
          </button>

          <button
            onClick={() => {
              if (onClearChat) onClearChat();
              if (onSidebarClose) onSidebarClose();
            }}
            disabled={isChatEmpty}
            className={`w-full font-semibold py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all duration-200 ${
              isChatEmpty
                ? "bg-bg/10 border-line/40 text-muted/30 cursor-not-allowed opacity-40"
                : "bg-surface border-line text-muted hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 hover:shadow-xs"
            }`}
            title="Clear current chat messages"
          >
            <span>🧹</span> Clear Chat
          </button>
        </div>

        {/* Chat History Section */}
        <div className="flex-1 overflow-y-auto px-6 py-3 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-2xs font-extrabold uppercase tracking-wider text-muted/80">
                Chat History
              </span>
              <span className="text-2xs bg-bg border border-line px-1.5 py-0.5 rounded-full text-muted font-bold">
                {sessions.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1.5 scrollbar-thin">
              {sessions.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted/50 font-medium">
                  No conversations yet
                </div>
              ) : (
                sessions.map((s) => {
                  const isActive = s.id === activeChatId;
                  return (
                    <div
                      key={s.id}
                      className={`group relative flex items-center rounded-xl border transition-all duration-150 ${
                        isActive
                          ? "border-accent/40 bg-accent-soft/30 text-ink shadow-sm"
                          : "border-transparent hover:bg-bg/60 text-muted hover:text-ink"
                      }`}
                    >
                      <button
                        onClick={() => {
                          onSelectSession(s.id);
                          if (onSidebarClose) onSidebarClose();
                        }}
                        className="flex-1 text-left px-3.5 py-2.5 text-sm font-semibold truncate pr-16 cursor-pointer"
                      >
                        💬 {s.title || "Untitled Chat"}
                      </button>

                      {/* Hover Actions */}
                      <div
                        className={`absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg px-1 ${
                          isActive ? "bg-bg" : "bg-surface"
                        }`}
                      >
                        <button
                          onClick={() => {
                            const newTitle = prompt(
                              "Rename chat:",
                              s.title || "",
                            );
                            if (newTitle !== null && newTitle.trim()) {
                              onRenameSession(s.id, newTitle.trim());
                            }
                          }}
                          className="w-6.5 h-6.5 rounded-md hover:bg-line/60 flex items-center justify-center text-xs text-muted hover:text-ink cursor-pointer"
                          title="Rename chat"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this conversation?")) {
                              onDeleteSession(s.id);
                            }
                          }}
                          className="w-6.5 h-6.5 rounded-md hover:bg-accent/10 flex items-center justify-center text-xs text-muted hover:text-accent cursor-pointer"
                          title="Delete chat"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Configuration Settings */}
        <details className="border-t border-line py-3.5 group bg-bg/25">
          <summary className="px-6 py-1.5 cursor-pointer flex items-center justify-between text-2xs font-mono font-extrabold uppercase tracking-wider text-muted hover:text-ink list-none select-none">
            <span className="flex items-center gap-1.5">⚙️ Configuration</span>
            <span className="group-open:rotate-180 transition-transform text-xs duration-200">
              ▾
            </span>
          </summary>

          <div className="px-6 pt-4 pb-1 flex flex-col gap-4.5 animate-slide-up">
            {/* Engine selector */}
            <div>
              <h4 className="font-bold text-2xs text-muted uppercase tracking-wider mb-2">
                Knowledge Engine
              </h4>
              <div className="flex flex-col gap-1.5">
                {MODEL_TYPES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onModelTypeChange(m.id)}
                    className={`text-left px-3.5 py-2.5 rounded-xl border transition-all duration-150 text-xs cursor-pointer ${
                      modelType === m.id
                        ? "border-accent bg-accent-soft text-ink font-bold shadow-sm"
                        : "border-line bg-surface text-muted hover:border-ink/20 hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{m.icon}</span>
                      <div>{m.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation mode */}
            <div>
              <h4 className="font-bold text-2xs text-muted uppercase tracking-wider mb-2">
                Voice & Style
              </h4>
              <div className="flex flex-col gap-1.5">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onModeChange(m.id)}
                    className={`text-left px-3.5 py-2.5 rounded-xl border transition-all duration-150 text-xs cursor-pointer ${
                      mode === m.id
                        ? "border-accent bg-accent-soft text-ink font-bold shadow-sm"
                        : "border-line bg-surface text-muted hover:border-ink/20 hover:text-ink"
                    }`}
                  >
                    <div>{m.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>

        {/* Stats */}
        {stats && modelType === "rag" && (
          <div className="px-6 py-4.5 border-t border-line grid grid-cols-2 gap-3.5 bg-bg/50">
            <StatBlock value={stats.unique_sources} label="sources" />
            <StatBlock value={stats.total_chunks} label="passages" />
          </div>
        )}
      </aside>
    </>
  );
}

function StatBlock({ value, label }) {
  return (
    <div className="text-center bg-surface p-2.5 rounded-xl border border-line shadow-2xs">
      <div className="font-mono text-base font-extrabold text-forest-deep">
        {value ?? "—"}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wide text-muted font-extrabold mt-0.5">
        {label}
      </div>
    </div>
  );
}
