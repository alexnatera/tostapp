import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError("Link inválido. Solicita uno nuevo.");
      return;
    }
    try {
      await api.auth.resetPassword(token, password);
      setSuccess("Contraseña actualizada ✓");
      setTimeout(() => nav("/login"), 1500);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-amber-900 mb-6 text-center">Nueva contraseña</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border border-amber-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <p className="text-xs text-amber-500">Mínimo 8 caracteres, un número y un símbolo.</p>
          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg">{error}</p>}
          {success && <p className="text-green-600 text-sm bg-green-50 p-2 rounded-lg">{success}</p>}
          <button
            type="submit"
            className="w-full bg-amber-800 text-white rounded-lg py-3 font-medium hover:bg-amber-900 transition"
          >
            Cambiar contraseña
          </button>
        </form>
      </div>
    </div>
  );
}
