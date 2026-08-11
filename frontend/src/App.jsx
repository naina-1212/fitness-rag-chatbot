import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import PulseLoader from "./components/PulseLoader";
import {
  deleteConversation,
  deleteDocument,
  fetchConversations,
  fetchDocuments,
  fetchStats,
  saveConversation,
  streamChat,
  uploadDocument,
} from "./api";
import { useAuth } from "./auth/AuthContext";

const SUGGESTIONS = [
  {
    title: "Protein Baseline",
    desc: "How much protein do I need to build muscle?",
    icon: "🥩",
    mode: "coach",
    modelType: "rag",
  },
  {
    title: "Optimal Volume",
    desc: "What's the best training volume for hypertrophy?",
    icon: "💪",
    mode: "researcher",
    modelType: "rag",
  },
  {
    title: "Cardio Zones",
    desc: "What heart rate zone is best for cardio fitness?",
    icon: "❤️",
    mode: "coach",
    modelType: "agent",
  },
  {
    title: "Daily Nutrition",
    desc: "Give me a simple guide for healthy eating and fat loss.",
    icon: "🥗",
    mode: "beginner",
    modelType: "agent",
  },
];

export default function App() {
  const { logout, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentError, setDocumentError] = useState("");
  const [documentNotice, setDocumentNotice] = useState("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const saveTimerRef = useRef(null);

  const [input, setInput] = useState("");
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("pulsefit_sidebar_collapsed") === "true",
  );
  const scrollRef = useRef(null);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark",
  );

  const createNewSession = () => ({
    id: "session_" + Date.now(),
    title: "New Chat",
    messages: [],
    mode: "coach",
    modelType: "rag",
    searchWeb: true,
    documentIds: [],
    timestamp: Date.now(),
  });

  // Load history from the server after authentication. The API scopes it to this user.
  useEffect(() => {
    let cancelled = false;
    setHistoryLoaded(false);
    fetchConversations()
      .then((saved) => {
        if (cancelled) return;
        const nextSessions = saved.length ? saved : [createNewSession()];
        setSessions(nextSessions);
        setActiveChatId(nextSessions[0].id);
        setHistoryLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Unable to load conversation history", error);
        const newSession = createNewSession();
        setSessions([newSession]);
        setActiveChatId(newSession.id);
        setHistoryLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch(() => setDocumentError("Your documents could not be loaded."));
  }, [user?.id]);

  // Sync activeChatId fallback if not found in sessions
  useEffect(() => {
    if (!activeChatId && sessions.length > 0) {
      setActiveChatId(sessions[0].id);
    }
  }, [sessions, activeChatId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "pulsefit_sidebar_collapsed",
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setStatsError(true));
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      Promise.all(sessions.map((session) => saveConversation(session))).catch(
        (error) => console.error("Unable to save conversation history", error),
      );
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [sessions, historyLoaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [sessions, activeChatId]);

  // Derive active session state
  const activeSession = sessions.find((s) => s.id === activeChatId) ||
    sessions[0] || {
      id: "",
      title: "New Chat",
      messages: [],
      mode: "coach",
      modelType: "rag",
      searchWeb: true,
    };

  const messages = activeSession.messages || [];
  const mode = activeSession.mode || "coach";
  const modelType = activeSession.modelType || "rag";
  const searchWeb = activeSession.searchWeb !== false; // defaults to true

  const setMode = (newMode) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeChatId ? { ...s, mode: newMode } : s)),
    );
  };

  const setModelType = (newModelType) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeChatId ? { ...s, modelType: newModelType } : s,
      ),
    );
  };

  const setSearchWeb = (newSearchWeb) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeChatId ? { ...s, searchWeb: newSearchWeb } : s,
      ),
    );
  };

  const toggleDocument = (id) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeChatId
          ? {
              ...session,
              documentIds: (session.documentIds || []).includes(id)
                ? session.documentIds.filter((documentId) => documentId !== id)
                : [...(session.documentIds || []), id],
            }
          : session,
      ),
    );
  };

  const handleUploadDocument = async (file) => {
    setDocumentError("");
    setDocumentNotice("");
    setIsUploadingDocument(true);
    try {
      const uploaded = await uploadDocument(file);
      setDocuments((prev) => [uploaded, ...prev]);
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeChatId
            ? {
                ...session,
                documentIds: [...(session.documentIds || []), uploaded.id],
              }
            : session,
        ),
      );
      setDocumentNotice(`${uploaded.filename} is ready to use in this chat.`);
    } catch (error) {
      setDocumentError(error.message);
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    setDocumentError("");
    setDocumentNotice("");
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((document) => document.id !== id));
      setSessions((prev) =>
        prev.map((session) => ({
          ...session,
          documentIds: (session.documentIds || []).filter(
            (documentId) => documentId !== id,
          ),
        })),
      );
      setDocumentNotice("Document removed.");
    } catch (error) {
      setDocumentError(error.message);
    }
  };

  const handleNewChat = () => {
    const newSession = createNewSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveChatId(newSession.id);
  };

  const handleDeleteSession = (id) => {
    const remaining = sessions.filter((s) => s.id !== id);
    deleteConversation(id).catch((error) =>
      console.error("Unable to delete conversation", error),
    );
    if (remaining.length === 0) {
      const defaultSession = createNewSession();
      setSessions([defaultSession]);
      setActiveChatId(defaultSession.id);
    } else {
      setSessions(remaining);
      if (activeChatId === id) {
        setActiveChatId(remaining[0].id);
      }
    }
  };

  const handleClearChat = () => {
    if (
      confirm(
        "Are you sure you want to clear all messages in this conversation?",
      )
    ) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeChatId ? { ...s, title: "New Chat", messages: [] } : s,
        ),
      );
    }
  };

  const handleRenameSession = (id, newTitle) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s)),
    );
  };

  const handleSuggestionClick = (sug) => {
    if (isStreaming) return;
    // Set settings
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeChatId
          ? { ...s, mode: sug.mode, modelType: sug.modelType }
          : s,
      ),
    );
    // Send suggestion
    handleSend(sug.desc, sug.mode, sug.modelType, searchWeb);
  };

  async function handleSend(query, forceMode, forceModelType, forceSearchWeb) {
    const activeQuery = query || input;
    if (!activeQuery.trim() || isStreaming) return;

    setInput("");

    const currentActiveId = activeChatId;
    const currentMode = forceMode || mode;
    const currentModelType = forceModelType || modelType;
    const currentSearchWeb =
      forceSearchWeb !== undefined ? forceSearchWeb : searchWeb;
    const currentDocumentIds = activeSession.documentIds || [];

    const userMsg = { role: "user", content: activeQuery };
    const assistantMsg = {
      role: "assistant",
      content: "",
      sources: [],
      streaming: true,
    };
    const newMessages = [...messages, userMsg];

    // Optimistically update sessions list with user message & streaming assistant placeholder
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentActiveId) {
          const updatedTitle =
            s.title === "New Chat"
              ? activeQuery.split(" ").slice(0, 5).join(" ") +
                (activeQuery.split(" ").length > 5 ? "..." : "")
              : s.title;

          return {
            ...s,
            title: updatedTitle,
            messages: [...newMessages, assistantMsg],
            timestamp: Date.now(),
          };
        }
        return s;
      }),
    );

    setIsStreaming(true);

    try {
      await streamChat(
        newMessages,
        6,
        currentMode,
        currentModelType,
        currentSearchWeb,
        currentDocumentIds,
        (delta) => {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === currentActiveId) {
                const msgs = [...s.messages];
                const last = msgs[msgs.length - 1];
                if (last && last.role === "assistant") {
                  msgs[msgs.length - 1] = {
                    ...last,
                    content: last.content + delta,
                  };
                }
                return { ...s, messages: msgs };
              }
              return s;
            }),
          );
        },
        (sources) => {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === currentActiveId) {
                const msgs = [...s.messages];
                const last = msgs[msgs.length - 1];
                if (last && last.role === "assistant") {
                  msgs[msgs.length - 1] = { ...last, sources };
                }
                return { ...s, messages: msgs };
              }
              return s;
            }),
          );
        },
      );
    } catch (err) {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentActiveId) {
            const msgs = [...s.messages];
            msgs[msgs.length - 1] = {
              role: "assistant",
              content: `Something went wrong reaching the backend: ${err.message}`,
              sources: [],
              streaming: false,
            };
            return { ...s, messages: msgs };
          }
          return s;
        }),
      );
    } finally {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentActiveId) {
            const msgs = [...s.messages];
            const last = msgs[msgs.length - 1];
            if (last && last.role === "assistant") {
              msgs[msgs.length - 1] = { ...last, streaming: false };
            }
            return { ...s, messages: msgs };
          }
          return s;
        }),
      );
      setIsStreaming(false);
    }
  }

  return (
    <div className="h-screen flex bg-bg font-body text-ink overflow-hidden relative">
      {/* Decorative Glowing mesh background */}
      <div className="mesh-bg animate-fade-in" />

      <Sidebar
        onLogout={logout}
        modelType={modelType}
        onModelTypeChange={setModelType}
        mode={mode}
        onModeChange={setMode}
        stats={statsError ? null : stats}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        sessions={sessions}
        activeChatId={activeChatId}
        onSelectSession={setActiveChatId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onClearChat={handleClearChat}
        isChatEmpty={messages.length === 0}
        sidebarOpen={sidebarOpen}
        onSidebarClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
        documents={documents}
        activeDocumentIds={activeSession.documentIds || []}
        onUploadDocument={handleUploadDocument}
        onDeleteDocument={handleDeleteDocument}
        onToggleDocument={toggleDocument}
        documentError={documentError}
        documentNotice={documentNotice}
        isUploadingDocument={isUploadingDocument}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-full z-10">
        {/* Header */}
        <header className="glass-panel border-b border-line px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl border border-line bg-surface flex items-center justify-center text-xl text-ink hover:bg-bg transition-colors cursor-pointer"
              title="Open sidebar"
            >
              ☰
            </button>
            <div>
              <h1 className="font-display font-extrabold text-xl tracking-tight text-ink">
                {activeSession.title}
              </h1>
              <p className="text-2xs text-muted mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1.5">
                {modelType === "rag" ? "📚 Research RAG" : "🌐 Web Agent"}
                <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                <span className="text-muted font-normal lowercase">
                  ({mode} mode)
                </span>
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-xs font-mono font-bold text-muted bg-bg px-3 py-1.5 rounded-xl border border-line">
            Session: {activeSession.id.slice(8, 16)}
          </div>
        </header>

        {/* Scrollable messages container */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-40 scrollbar-thin"
        >
          <div className="max-w-3xl mx-auto flex flex-col">
            {messages.length === 0 ? (
              <div className="py-10 md:py-20 text-center animate-slide-up">
                <span className="text-5xl animate-bounce inline-block mb-3">
                  ⚡
                </span>
                <h2 className="text-2xl font-extrabold text-ink tracking-tight font-display">
                  Welcome to PulseFit Coach
                </h2>
                <p className="text-muted text-sm mt-2 max-w-md mx-auto font-medium leading-relaxed">
                  Get practical training and nutrition guidance, grounded in
                  research or the live web. Choose a prompt below or ask your
                  own question.
                </p>

                {/* Suggestions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-10 text-left">
                  {SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(sug)}
                      className="glass-panel hover:bg-accent-soft/30 hover:border-accent/40 rounded-2xl p-4.5 text-left transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 hover:shadow-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl group-hover:scale-110 transition-transform duration-200">
                          {sug.icon}
                        </span>
                        <div className="text-sm font-extrabold text-ink">
                          {sug.title}
                        </div>
                      </div>
                      <div className="text-xs text-muted font-medium mt-1 leading-normal">
                        {sug.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {messages.map((m, i) => (
                  <ChatMessage key={i} {...m} />
                ))}
              </div>
            )}

            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="pl-13.5 mb-6 animate-pulse">
                <PulseLoader
                  label={
                    modelType === "rag"
                      ? "Analyzing Sports Studies..."
                      : "Querying Live Agent..."
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Floating Chat Input bar */}
        <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 px-4 sm:px-6 pointer-events-none z-25">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <form
              className="flex items-center gap-1.5 sm:gap-2 bg-surface/92 backdrop-blur-lg border border-line rounded-2xl p-2 sm:p-2.5 shadow-lg focus-within:ring-2 focus-within:ring-accent/25 focus-within:border-accent transition-all duration-200"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              {/* Dynamic Engine/Search Toggle Indicator */}
              <div className="pl-0.5 sm:pl-1.5 shrink-0">
                {modelType === "agent" ? (
                  <button
                    type="button"
                    onClick={() => setSearchWeb(!searchWeb)}
                    className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.8 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer select-none ${
                      searchWeb
                        ? "border-forest bg-forest/10 text-forest shadow-xs"
                        : "border-line bg-bg text-muted hover:text-ink"
                    }`}
                    title={
                      searchWeb
                        ? "DuckDuckGo web search is ACTIVE"
                        : "DuckDuckGo web search is INACTIVE (chat only)"
                    }
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${searchWeb ? "bg-forest animate-pulse" : "bg-muted"}`}
                    />
                    🌐 Search Web
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.8 rounded-xl border border-line bg-bg text-muted text-xs font-bold select-none">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    📚 Study RAG
                  </div>
                )}
              </div>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  modelType === "rag"
                    ? "Ask a fitness/nutrition question grounded in studies..."
                    : searchWeb
                      ? "Search the live web for up-to-date wellness advice..."
                      : "Chat with PulseFit (ChatGPT-style direct answer)..."
                }
                className="flex-1 min-w-0 border-0 px-1 sm:px-2 py-2.5 text-sm sm:text-base bg-transparent focus:outline-none placeholder:text-muted/60 text-ink"
                disabled={isStreaming}
              />

              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="w-11 h-11 rounded-xl bg-ink text-bg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent hover:text-white transition-all cursor-pointer shrink-0 shadow-sm"
                title="Send Message"
              >
                <svg
                  width="18"
                  height="18"
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
            <p className="text-center text-[10px] text-muted/60 mt-2 font-bold tracking-wide uppercase select-none">
              {modelType === "rag"
                ? "📚 Grounded in PubMed + WHO/ACSM study guidelines"
                : searchWeb
                  ? "🌐 Live web search mode is active"
                  : "⚡ Direct chat mode (like ChatGPT)"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
