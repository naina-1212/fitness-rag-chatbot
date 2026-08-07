export default function SourceChips({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <details className="mt-3 group text-left">
      <summary className="cursor-pointer text-sm font-mono uppercase tracking-wide text-muted hover:text-ink transition-colors list-none flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-forest" />
        Based on {sources.length} source{sources.length !== 1 ? "s" : ""}
        <span className="group-open:rotate-180 transition-transform text-xs">▾</span>
      </summary>
      <div className="mt-2 flex flex-col gap-1.5">
        {sources.map((s, i) => {
          const content = (
            <>
              <span className="font-mono text-muted shrink-0 text-sm">{s.year}</span>
              <span className="text-ink/80 text-left flex-1 hover:underline transition-all text-sm font-medium">{s.title}</span>
              <span className="ml-auto shrink-0 font-mono text-xs uppercase text-forest-deep bg-forest/10 px-1.5 py-0.5 rounded">
                {s.source_type}
              </span>
            </>
          );

          if (s.url) {
            return (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-baseline gap-2 text-sm px-3 py-2 rounded-lg bg-bg border border-line hover:border-accent/40 hover:bg-accent-soft/10 transition-colors no-underline"
              >
                {content}
              </a>
            );
          }

          return (
            <div
              key={i}
              className="flex items-baseline gap-2 text-sm px-3 py-2 rounded-lg bg-bg border border-line"
            >
              {content}
            </div>
          );
        })}
      </div>
    </details>
  );
}
