import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import App from "./App";
import AuthPage from "./components/AuthPage";

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

function PublicRoute({ type }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? (
    <Navigate to="/chat" replace />
  ) : (
    <AuthPage type={type} />
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute type="login" />} />
      <Route path="/signup" element={<PublicRoute type="signup" />} />
      <Route path="/forgot-password" element={<PublicRoute type="forgot" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/chat" element={<App />} />
      </Route>
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
