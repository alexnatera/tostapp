import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await api.auth.resetPassword("", password);
      setSuccess("Contraseña actualizada ✓");
      setTimeout(() => nav("/login"), 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-800 dark:bg-amber-600 text-3xl mb-4 shadow-lg">
            ☕
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Nueva contraseña</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4"
        >
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all"
          />
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Mínimo 8 caracteres, un número y un símbolo.
          </p>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 rounded-xl">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
