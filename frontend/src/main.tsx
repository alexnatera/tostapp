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
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminPage from "./pages/AdminPage";
import PurchasesPage from "./pages/PurchasesPage";
import SalesPage from "./pages/SalesPage";
import FinancePage from "./pages/FinancePage";
import CRMPage from "./pages/CRMPage";
import InventoryPage from "./pages/InventoryPage";
import ArtisanImportPage from "./pages/ArtisanImportPage";
import DocumentsPage from "./pages/DocumentsPage";
import DocumentFormPage from "./pages/DocumentFormPage";
import DocumentDetailPage from "./pages/DocumentDetailPage";
import BusinessProfilePage from "./pages/BusinessProfilePage";
import ProductsPage from "./pages/ProductsPage";
import PublicShopPage from "./pages/PublicShopPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/r/:slug" element={<PublicRoastPage />} />
        <Route path="/tienda/:slug" element={<PublicShopPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/roasts/new" element={<PrivateRoute><NewRoastPage /></PrivateRoute>} />
        <Route path="/roasts/:id" element={<PrivateRoute><RoastDetailPage /></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/purchases" element={<PrivateRoute><PurchasesPage /></PrivateRoute>} />
        <Route path="/sales" element={<PrivateRoute><SalesPage /></PrivateRoute>} />
        <Route path="/finance" element={<PrivateRoute><FinancePage /></PrivateRoute>} />
        <Route path="/crm" element={<PrivateRoute><CRMPage /></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
        <Route path="/roasts/import-artisan" element={<PrivateRoute><ArtisanImportPage /></PrivateRoute>} />
        <Route path="/documents" element={<PrivateRoute><DocumentsPage /></PrivateRoute>} />
        <Route path="/documents/new" element={<PrivateRoute><DocumentFormPage /></PrivateRoute>} />
        <Route path="/documents/:id" element={<PrivateRoute><DocumentDetailPage /></PrivateRoute>} />
        <Route path="/documents/:id/edit" element={<PrivateRoute><DocumentFormPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><BusinessProfilePage /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
