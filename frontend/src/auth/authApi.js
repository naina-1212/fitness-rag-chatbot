const API_BASE = import.meta.env.VITE_AUTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const SESSION_KEY = "pulsefit_auth_session";

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return getStoredSession()?.token || null;
}

function saveSession(data, fallbackEmail) {
  const token = data.access_token || data.token || data.accessToken || null;
  const user = data.user || { email: data.email || fallbackEmail };
  const session = { token, user };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      // Local authentication uses the bearer token returned by the API. Using
      // cookies here makes browsers reject the default localhost CORS policy.
      credentials: "omit",
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new Error("We couldn't reach the authentication service. Please try again shortly.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Authentication isn't connected yet. Add an auth service at /api/auth to enable sign-in.");
    }
    throw new Error(data.detail || data.message || "Something went wrong. Please try again.");
  }
  return data;
}

export async function signIn({ email, password }) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return saveSession(data, email);
}

export async function signUp({ name, email, password }) {
  const data = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  return saveSession(data, email);
}

export async function requestPasswordReset(email) {
  return request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function signOut() {
  try {
    await request("/api/auth/logout", { method: "POST", headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {} });
  } finally {
    localStorage.removeItem(SESSION_KEY);
  }
}
