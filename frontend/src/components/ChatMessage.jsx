import ReactMarkdown from "react-markdown";
import SourceChips from "./SourceChips";

export default function ChatMessage({ role, content, sources, streaming }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[80%] ${isUser ? "order-2" : ""}`}>
        <div
          className={
            isUser
              ? "bg-ink text-bg rounded-2xl rounded-br-sm px-5 py-3.5 shadow-md"
              : "bg-surface border border-line rounded-2xl rounded-bl-sm px-5 py-4 shadow-[0_2px_8px_rgba(20,35,28,0.05)]"
          }
        >
          <div
            className={`text-base leading-relaxed ${isUser ? "" : "prose-fitness text-ink"}`}
          >
            {isUser ? (
              content
            ) : (
              <ReactMarkdown>{content || "\u00A0"}</ReactMarkdown>
            )}
            {streaming && (
              <span className="inline-block w-1.5 h-4 bg-accent align-middle ml-1 animate-pulse" />
            )}
          </div>
          {!isUser && !streaming && <SourceChips sources={sources} />}
        </div>
      </div>
    </div>
  );
}
