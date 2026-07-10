import { useId, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Sun, Moon, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import Field from "../components/ui/Field";
import IconButton from "../components/ui/IconButton";

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
  const [sending, setSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
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
    setSending(true);
    try {
      await api.auth.forgotPassword(resetEmail);
      setResetMsg("Si el email existe, recibirás un link para restablecer tu contraseña.");
    } catch {
      setResetMsg("Error al enviar. Intenta de nuevo.");
    } finally {
      setSending(false);
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
            <p className="text-4xl font-bold mb-3">Tostapp</p>
            <p className="text-white/75 text-lg">Tu bitácora de tuestes artesanales</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4 relative">
      <IconButton
        onClick={toggle}
        aria-label="Cambiar tema"
        className="fixed top-[max(1rem,env(safe-area-inset-top))] right-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </IconButton>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/images/app-icon.jpg"
            alt="Tostapp"
            className="w-16 h-16 rounded-2xl shadow-lg object-cover mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Tostapp</h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">Tu bitácora de tuestes</p>
        </div>

        {showForgot ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-4">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Recuperar contraseña</h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">Ingresa tu email y te enviaremos un link.</p>
            <Field label="Correo electrónico">
              <input
                type="email"
                placeholder="tu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className={input}
              />
            </Field>
            {resetMsg && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl">
                {resetMsg}
              </p>
            )}
            <button onClick={handleForgotPassword} disabled={sending} className={btn}>
              {sending ? "Enviando..." : "Enviar link"}
            </button>
            <button
              onClick={() => setShowForgot(false)}
              className="w-full text-center text-sm text-stone-600 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors py-2"
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
              <Field label="Correo electrónico">
                <input
                  {...register("email", { required: true })}
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className={input}
                />
              </Field>
              <div>
                <label htmlFor={passwordId} className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    {...register("password", { required: true })}
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    className={`${input} pr-11`}
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
                className="text-sm text-stone-600 dark:text-stone-400 hover:text-amber-800 dark:hover:text-amber-400 transition-colors py-2"
              >
                ¿Olvidaste tu contraseña?
              </button>
              <p className="text-sm text-stone-600 dark:text-stone-400">
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
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

const btn =
  "w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50";
