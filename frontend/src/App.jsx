import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import PulseLoader from "./components/PulseLoader";
import { fetchStats, streamChat } from "./api";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("coach");
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
    <div className="h-screen flex bg-bg font-body text-ink">
      <Sidebar
        mode={mode}
        onModeChange={setMode}
        onExampleClick={handleSend}
        stats={statsError ? null : stats}
        onClear={() => setMessages([])}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-line bg-surface px-8 py-5">
          <h1 className="font-display font-semibold text-2xl tracking-tight">
            Ask your research assistant
          </h1>
          <p className="text-sm text-muted mt-1">
            Answers are grounded in retrieved research — if the evidence is
            thin, it says so.
          </p>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted text-sm">
                  Pick a question from the sidebar, or type your own below.
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

        <div className="border-t border-line bg-surface px-8 py-4">
          <form
            className="max-w-3xl mx-auto flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a fitness or nutrition question..."
              className="flex-1 border border-line rounded-xl px-4 py-3 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="px-5 py-3 rounded-xl bg-ink text-bg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-forest-deep transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
