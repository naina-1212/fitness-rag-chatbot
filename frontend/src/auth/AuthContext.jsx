import { createContext, useContext, useMemo, useState } from "react";
import * as authApi from "./authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authApi.getStoredSession());

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    isAuthenticated: Boolean(session?.user || session?.token),
    async login(credentials) {
      const nextSession = await authApi.signIn(credentials);
      setSession(nextSession);
    },
    async signup(credentials) {
      const nextSession = await authApi.signUp(credentials);
      setSession(nextSession);
    },
    async logout() {
      await authApi.signOut();
      setSession(null);
    },
    requestPasswordReset: authApi.requestPasswordReset,
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
