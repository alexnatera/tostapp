import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

interface Fields {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { register, handleSubmit } = useForm<Fields>();
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const { setToken } = useAuth();
  const nav = useNavigate();

  const onSubmit = async (data: Fields) => {
    setError("");
    try {
      const res = await api.auth.login(data);
      setToken(res.access_token, "");
      nav("/");
    } catch (e) {
      setError((e as Error).message);
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
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-amber-900 mb-2 text-center">☕ Tostapp</h1>
        <p className="text-center text-amber-700 mb-8 text-sm">Tu bitácora de tuestes</p>

        {showForgot ? (
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-amber-900">Recuperar contraseña</h2>
            <p className="text-sm text-amber-600">Ingresa tu email y te enviaremos un link.</p>
            <input
              type="email"
              placeholder="Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full border border-amber-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {resetMsg && <p className="text-sm text-green-600 bg-green-50 p-2 rounded-lg">{resetMsg}</p>}
            <button
              onClick={handleForgotPassword}
              className="w-full bg-amber-800 text-white rounded-lg py-3 font-medium hover:bg-amber-900 transition"
            >
              Enviar link
            </button>
            <button
              onClick={() => setShowForgot(false)}
              className="w-full text-center text-sm text-amber-600 underline"
            >
              ← Volver
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow p-6 space-y-4">
              <input
                {...register("email", { required: true })}
                type="email"
                placeholder="Email"
                className="w-full border border-amber-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                {...register("password", { required: true })}
                type="password"
                placeholder="Contraseña"
                className="w-full border border-amber-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg">{error}</p>}
              <button
                type="submit"
                className="w-full bg-amber-800 text-white rounded-lg py-3 font-medium hover:bg-amber-900 transition"
              >
                Entrar
              </button>
            </form>
            <p className="text-center text-sm text-amber-700 mt-4">
              <button onClick={() => setShowForgot(true)} className="underline">
                ¿Olvidaste tu contraseña?
              </button>
            </p>
            <p className="text-center text-sm text-amber-700 mt-2">
              ¿Sin cuenta?{" "}
              <Link to="/register" className="font-medium underline">
                Regístrate gratis
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
