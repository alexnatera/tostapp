import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

interface Fields {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { register, handleSubmit } = useForm<Fields>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const { setToken } = useAuth();
  const { isDark, toggle } = useTheme();
  const nav = useNavigate();

  const onSubmit = async (data: Fields) => {
    setError("");
    setLoading(true);
    try {
      const res = await api.auth.login(data);
      setToken(res.access_token, res.roastery_name, res.is_admin);
      nav("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetMsg("");
    try {
      await api.auth.forgotPassword(resetEmail);
      setResetMsg("Si el email existe, recibirás un link para restablecer tu contraseña.");
    } catch {
      setResetMsg("Error al enviar. Intenta de nuevo.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Hero image panel — desktop only */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="/images/login-hero.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-amber-950/80 via-amber-900/40 to-transparent flex items-end p-12">
          <div className="text-white">
            <h2 className="text-4xl font-bold mb-3">Tostapp</h2>
            <p className="text-white/75 text-lg">Tu bitácora de tuestes artesanales</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4 relative">
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm"
        aria-label="Cambiar tema"
      >
        {isDark ? "☀️" : "🌙"}
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/images/app-icon.jpg"
            alt="Tostapp"
            className="w-16 h-16 rounded-2xl shadow-lg object-cover mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Tostapp</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Tu bitácora de tuestes</p>
        </div>

        {showForgot ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Recuperar contraseña</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Ingresa tu email y te enviaremos un link.</p>
            <input
              type="email"
              placeholder="tu@email.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className={input}
            />
            {resetMsg && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl">
                {resetMsg}
              </p>
            )}
            <button onClick={handleForgotPassword} className={btn}>Enviar link</button>
            <button
              onClick={() => setShowForgot(false)}
              className="w-full text-center text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              ← Volver al login
            </button>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-4"
            >
              <input
                {...register("email", { required: true })}
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                className={input}
              />
              <input
                {...register("password", { required: true })}
                type="password"
                placeholder="Contraseña"
                autoComplete="current-password"
                className={input}
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 rounded-xl">
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className={btn}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="text-center mt-4 space-y-2">
              <button
                onClick={() => setShowForgot(true)}
                className="text-sm text-stone-500 dark:text-stone-400 hover:text-amber-800 dark:hover:text-amber-400 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                ¿Sin cuenta?{" "}
                <Link
                  to="/register"
                  className="font-medium text-amber-800 dark:text-amber-400 hover:underline"
                >
                  Regístrate gratis
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

const input =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

const btn =
  "w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50";
