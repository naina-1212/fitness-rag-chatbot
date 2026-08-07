import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import PulseLoader from "./components/PulseLoader";
import { fetchStats, streamChat } from "./api";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("coach");
  const [modelType, setModelType] = useState("rag");
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef(null);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setStatsError(true));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend(query) {
    if (!query.trim() || isStreaming) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: query },
      { role: "assistant", content: "", sources: [], streaming: true },
    ]);
    setIsStreaming(true);

    try {
      await streamChat(
        query,
        6,
        mode,
        modelType,
        (delta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + delta };
            return next;
          });
        },
        (sources) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, sources };
            return next;
          });
        },
      );
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: `Something went wrong reaching the backend: ${err.message}`,
          sources: [],
          streaming: false,
        };
        return next;
      });
    } finally {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, streaming: false };
        return next;
      });
      setIsStreaming(false);
    }
  }

  return (
    <div className="h-screen flex bg-bg font-body text-ink overflow-hidden">
      <Sidebar
        modelType={modelType}
        onModelTypeChange={setModelType}
        mode={mode}
        onModeChange={setMode}
        onExampleClick={handleSend}
        stats={statsError ? null : stats}
        onClear={() => setMessages([])}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Header */}
        <header className="border-b border-line bg-surface px-8 py-5.5 shadow-sm">
          <h1 className="font-display font-bold text-3xl tracking-tight bg-gradient-to-r from-ink to-ink/80 bg-clip-text text-transparent">
            Ask your fitness assistant
          </h1>
          <p className="text-base text-muted mt-1.5 font-medium">
            {modelType === "rag"
              ? "📚 Answers are grounded in retrieved sports science guidelines and PubMed literature."
              : "🌐 Answers are generated using live web search results and general athletic knowledge."}
          </p>
        </header>

        {/* Scrollable messages container */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pt-6 pb-36">
          <div className="max-w-3xl mx-auto flex flex-col gap-5">
            {messages.length === 0 && (
              <div className="text-center py-24 bg-surface/40 rounded-3xl border border-line/50 p-8 mt-4 shadow-sm">
                <span className="text-4xl">👋</span>
                <h2 className="text-xl font-bold text-ink mt-3">Welcome to PulseFit</h2>
                <p className="text-muted text-base mt-2 max-w-md mx-auto">
                  Pick an example question from the sidebar, or type your own topic below to get started in {modelType === "rag" ? "Research RAG" : "Web Agent"} mode.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <ChatMessage key={i} {...m} />
            ))}
            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="pl-1">
                <PulseLoader />
              </div>
            )}
          </div>
        </div>

        {/* Floating Chat Input bar */}
        <div className="absolute bottom-6 left-0 right-0 px-8 pointer-events-none z-10">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <form
              className="flex items-center gap-2 bg-surface/90 backdrop-blur-md border border-line rounded-2xl p-2.5 shadow-[0_8px_32px_rgba(20,35,28,0.08)] focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-all duration-200"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
            >
              {/* Icon indicator */}
              <span className="pl-3.5 text-xl select-none shrink-0" title={modelType === "rag" ? "RAG Mode" : "Agent Mode"}>
                {modelType === "rag" ? "📚" : "🌐"}
              </span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  modelType === "rag"
                    ? "Ask a fitness/nutrition question grounded in studies..."
                    : "Ask anything using live web search agent..."
                }
                className="flex-1 border-0 px-3 py-3 text-base bg-transparent focus:outline-none placeholder:text-muted/70 text-ink"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="w-12 h-12 rounded-xl bg-ink text-bg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent hover:text-white transition-all cursor-pointer shrink-0 shadow-sm"
                title="Send Message"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
            <p className="text-center text-xs text-muted/70 mt-2 font-semibold tracking-wide">
              {modelType === "rag"
                ? "Research RAG mode retrieves scientific guidelines and papers"
                : "Web Agent mode aggregates live web information & databases"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
