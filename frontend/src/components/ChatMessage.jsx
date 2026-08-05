import ReactMarkdown from "react-markdown";
import SourceChips from "./SourceChips";

export default function ChatMessage({ role, content, sources, streaming }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] ${isUser ? "order-2" : ""}`}>
        <div
          className={
            isUser
              ? "bg-ink text-bg rounded-2xl rounded-br-sm px-4 py-3"
              : "bg-surface border border-line rounded-2xl rounded-bl-sm px-4 py-3 shadow-[0_1px_2px_rgba(20,35,28,0.04)]"
          }
        >
          <div className={`text-sm leading-relaxed ${isUser ? "" : "prose-fitness"}`}>
            {isUser ? (
              content
            ) : (
              <ReactMarkdown>{content || "\u00A0"}</ReactMarkdown>
            )}
            {streaming && (
              <span className="inline-block w-1.5 h-4 bg-accent align-middle ml-0.5 animate-pulse" />
            )}
          </div>
          {!isUser && !streaming && <SourceChips sources={sources} />}
        </div>
      </div>
    </div>
  );
}
