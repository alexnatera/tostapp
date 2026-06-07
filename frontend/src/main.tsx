import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { useAuth } from "./lib/auth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import NewRoastPage from "./pages/NewRoastPage";
import RoastDetailPage from "./pages/RoastDetailPage";
import PublicRoastPage from "./pages/PublicRoastPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/r/:slug" element={<PublicRoastPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/roasts/new" element={<PrivateRoute><NewRoastPage /></PrivateRoute>} />
        <Route path="/roasts/:id" element={<PrivateRoute><RoastDetailPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
