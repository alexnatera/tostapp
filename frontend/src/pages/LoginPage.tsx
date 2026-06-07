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

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-amber-900 mb-2 text-center">☕ Tostapp</h1>
        <p className="text-center text-amber-700 mb-8 text-sm">Tu bitácora de tuestes</p>
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-amber-800 text-white rounded-lg py-3 font-medium hover:bg-amber-900 transition"
          >
            Entrar
          </button>
        </form>
        <p className="text-center text-sm text-amber-700 mt-4">
          ¿Sin cuenta?{" "}
          <Link to="/register" className="font-medium underline">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
