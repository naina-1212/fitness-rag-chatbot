export default function SourceChips({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer text-xs font-mono uppercase tracking-wide text-muted hover:text-ink transition-colors list-none flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-forest" />
        Based on {sources.length} source{sources.length !== 1 ? "s" : ""}
        <span className="group-open:rotate-180 transition-transform text-[10px]">▾</span>
      </summary>
      <div className="mt-2 flex flex-col gap-1.5">
        {sources.map((s, i) => (
          <div
            key={i}
            className="flex items-baseline gap-2 text-xs px-3 py-2 rounded-lg bg-bg border border-line"
          >
            <span className="font-mono text-muted shrink-0">{s.year}</span>
            <span className="text-ink/80">{s.title}</span>
            <span className="ml-auto shrink-0 font-mono text-[10px] uppercase text-forest-deep bg-forest/10 px-1.5 py-0.5 rounded">
              {s.source_type}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
