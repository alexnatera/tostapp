import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

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
  const colors = ["text-red-500", "text-orange-500", "text-amber-600", "text-green-600"];
  return { score, label: labels[score], color: colors[score] };
}

export default function RegisterPage() {
  const { register, handleSubmit, watch } = useForm<Fields>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { setToken } = useAuth();
  const nav = useNavigate();
  const pw = watch("password", "");
  const strength = passwordStrength(pw);

  const onSubmit = async (data: Fields) => {
    setError("");
    setSuccess("");
    try {
      // Check password strength client-side before sending
      if (strength.score < 2) {
        setError("La contraseña debe tener al menos 8 caracteres, un número y un símbolo (!@#$…)");
        return;
      }
      await api.auth.register(data);
      const res = await api.auth.login({ email: data.email, password: data.password });
      setToken(res.access_token, data.roastery_name);
      setSuccess("Cuenta creada ✓");
      setTimeout(() => nav("/"), 500);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-amber-900 mb-2 text-center">☕ Tostapp</h1>
        <p className="text-center text-amber-700 mb-8 text-sm">Crea tu cuenta gratis</p>
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow p-6 space-y-4">
          <input
            {...register("roastery_name", { required: true })}
            placeholder="Nombre de tu tostadora"
            className="w-full border border-amber-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            {...register("email", { required: true })}
            type="email"
            placeholder="Email"
            className="w-full border border-amber-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div>
            <input
              {...register("password", { required: true })}
              type="password"
              placeholder="Contraseña"
              className="w-full border border-amber-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {pw && (
              <div className="mt-1.5 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i <= strength.score ? "bg-green-500" : "bg-amber-100"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${strength.color}`}>{strength.label}</p>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg">{error}</p>}
          {success && <p className="text-green-600 text-sm bg-green-50 p-2 rounded-lg">{success}</p>}

          <button
            type="submit"
            className="w-full bg-amber-800 text-white rounded-lg py-3 font-medium hover:bg-amber-900 transition"
          >
            Crear cuenta
          </button>
        </form>
        <p className="text-center text-sm text-amber-700 mt-4">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium underline">
            Entra aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
