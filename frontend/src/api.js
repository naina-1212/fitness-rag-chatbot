const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error(`Stats request failed: ${res.status}`);
  return res.json();
}

/**
 * Streams a chat answer from the backend.
 * The backend protocol: the first line is `__SOURCES__<json>`, followed by
 * the streamed answer text as plain chunked text.
 *
 * @param {string} query
 * @param {number} topK
 * @param {string} mode - "beginner" | "coach" | "researcher"
 * @param {string} modelType - "rag" | "agent"
 * @param {(delta: string) => void} onDelta - called with each new text chunk
 * @param {(sources: Array) => void} onSources - called once with parsed sources
 */
export async function streamChat(
  messages,
  topK,
  mode,
  modelType,
  searchWeb,
  onDelta,
  onSources,
) {
  const bodyPayload = {
    top_k: topK,
    mode,
    model_type: modelType,
    search_web: searchWeb,
  };
  if (Array.isArray(messages)) {
    bodyPayload.messages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  } else {
    bodyPayload.query = messages;
  }

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Chat request failed: ${res.status} ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sourcesParsed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    if (!sourcesParsed) {
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx === -1) continue; // wait for the full sources line

      const sourcesLine = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      sourcesParsed = true;

      if (sourcesLine.startsWith("__SOURCES__")) {
        try {
          const sources = JSON.parse(sourcesLine.slice("__SOURCES__".length));
          onSources(sources);
        } catch {
          onSources([]);
        }
      }

      if (buffer) {
        onDelta(buffer);
        buffer = "";
      }
      continue;
    }

    if (buffer) {
      onDelta(buffer);
      buffer = "";
    }
  }
}
