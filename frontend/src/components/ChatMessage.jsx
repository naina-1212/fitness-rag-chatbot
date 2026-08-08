import ReactMarkdown from "react-markdown";
import SourceChips from "./SourceChips";

export default function ChatMessage({ role, content, sources, streaming }) {
  const isUser = role === "user";

  return (
    <div
      className={`flex gap-3.5 mb-5 items-start ${isUser ? "flex-row-reverse" : "flex-row"} animate-slide-up`}
    >
      {/* Avatar Indicator */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-sm select-none border ${
          isUser
            ? "bg-accent border-accent text-white"
            : "bg-surface border-line text-accent font-display"
        }`}
      >
        {isUser ? "U" : "P"}
      </div>

      <div
        className={`max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`px-5 py-3.5 shadow-sm transition-all duration-200 ${
            isUser
              ? "bg-ink text-bg rounded-2xl rounded-tr-none"
              : "bg-surface border border-line rounded-2xl rounded-tl-none prose-fitness text-ink"
          }`}
        >
          <div className="text-base leading-relaxed break-words">
            {isUser ? (
              content
            ) : (
              <ReactMarkdown>{content || "\u00A0"}</ReactMarkdown>
            )}
            {streaming && (
              <span className="inline-block w-1.5 h-4 bg-accent align-middle ml-1 animate-pulse" />
            )}
          </div>
          {!isUser && !streaming && sources && sources.length > 0 && (
            <SourceChips sources={sources} />
          )}
        </div>
      </div>
    </div>
  );
}
