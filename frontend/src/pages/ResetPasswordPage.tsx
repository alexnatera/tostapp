import { useId, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import IconButton from "../components/ui/IconButton";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  const nav = useNavigate();

  const lengthOk = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-+=;:\[\]\\]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError("Link inválido. Solicita uno nuevo.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
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
          <img
            src="/images/app-icon.jpg"
            alt="Tostapp"
            className="w-16 h-16 rounded-2xl shadow-lg object-cover mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Nueva contraseña</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4"
        >
          <div>
            <label htmlFor={passwordId} className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id={passwordId}
                type={showPassword ? "text" : "password"}
                placeholder="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 pr-11 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all"
              />
              <IconButton
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-0 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </IconButton>
            </div>
          </div>
          <p
            className={`text-xs flex items-center gap-1.5 transition-colors ${
              lengthOk && hasNumber && hasSymbol
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-stone-600 dark:text-stone-400"
            }`}
          >
            {lengthOk && hasNumber && hasSymbol && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
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
