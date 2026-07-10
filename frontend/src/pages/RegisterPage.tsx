import { useId, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import Field from "../components/ui/Field";
import IconButton from "../components/ui/IconButton";

interface Fields {
  email: string;
  password: string;
  roastery_name: string;
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=;:\[\]\\]/.test(pw)) score++;
  const labels = ["Débil", "Regular", "Buena", "Fuerte"];
  const colors = [
    "text-red-700 dark:text-red-400",
    "text-orange-700 dark:text-orange-400",
    "text-amber-800 dark:text-amber-400",
    "text-emerald-700 dark:text-emerald-400",
  ];
  return { score, label: labels[score], color: colors[score] };
}

const barColor = ["bg-red-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500"];

export default function RegisterPage() {
  const { register, handleSubmit, watch } = useForm<Fields>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  const { setToken } = useAuth();
  const nav = useNavigate();
  const pw = watch("password", "");
  const strength = passwordStrength(pw);

  const onSubmit = async (data: Fields) => {
    setError("");
    setSuccess("");
    if (strength.score < 3) {
      setError("La contraseña debe tener al menos 8 caracteres, un número y un símbolo.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.register(data);
      const res = await api.auth.login({ email: data.email, password: data.password });
      setToken(res.access_token, res.roastery_name, res.is_admin);
      setSuccess("Cuenta creada ✓");
      setTimeout(() => nav("/"), 400);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/images/app-icon.jpg"
            alt="Tostapp"
            className="w-16 h-16 rounded-2xl shadow-lg object-cover mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Crear cuenta</h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">Empieza a registrar tus tuestes</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 space-y-4"
        >
          <Field label="Nombre de tu tostadora">
            <input
              {...register("roastery_name", { required: true })}
              placeholder="Nombre de tu tostadora"
              className={input}
            />
          </Field>
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
                autoComplete="new-password"
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
            {pw && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? barColor[strength.score] : "bg-stone-200 dark:bg-stone-700"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength.color}`}>{strength.label}</p>
              </div>
            )}
          </div>

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

          <button type="submit" disabled={loading} className={btn}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-600 dark:text-stone-400 mt-4">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-amber-800 dark:text-amber-400 hover:underline">
            Entra aquí
          </Link>
        </p>
      </div>
    </div>
  );
}

const input =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

const btn =
  "w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50";
