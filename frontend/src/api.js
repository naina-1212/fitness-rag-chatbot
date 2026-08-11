const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const AUTH_SESSION_KEY = "pulsefit_auth_session";

function getAuthHeader() {
  try {
    const token = JSON.parse(
      localStorage.getItem(AUTH_SESSION_KEY) || "null",
    )?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error(`Stats request failed: ${res.status}`);
  return res.json();
}

async function conversationRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) throw new Error(`Conversation request failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export function fetchConversations() {
  return conversationRequest("/api/conversations");
}

export function saveConversation(conversation) {
  return conversationRequest(
    `/api/conversations/${encodeURIComponent(conversation.id)}`,
    {
      method: "PUT",
      body: JSON.stringify(conversation),
    },
  );
}

export function deleteConversation(id) {
  return conversationRequest(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchDocuments() {
  return conversationRequest("/api/documents");
}

export async function uploadDocument(file) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    headers: getAuthHeader(),
    body,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || "Document upload failed.");
  }
  return res.json();
}

export function deleteDocument(id) {
  return conversationRequest(`/api/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
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
  documentIds,
  onDelta,
  onSources,
) {
  const bodyPayload = {
    top_k: topK,
    mode,
    model_type: modelType,
    search_web: searchWeb,
    document_ids: documentIds || [],
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
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
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
