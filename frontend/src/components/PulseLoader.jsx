// Signature element: a heartbeat/vital-signs pulse line, used as the
// "thinking" indicator while retrieval + generation are in flight.
// Ties together "evidence" (vital signs) and "fitness" (exertion) in one
// visual idea, instead of a generic spinner.
export default function PulseLoader({ label = "Checking the research" }) {
  return (
    <div className="flex items-center gap-3 text-muted">
      <svg
        className="pulse-line"
        width="72"
        height="24"
        viewBox="0 0 240 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 12 H70 L84 2 L98 22 L112 6 L124 12 H240"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-mono text-xs tracking-wide uppercase">{label}</span>
    </div>
  );
}
