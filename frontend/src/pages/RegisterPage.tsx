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

export default function RegisterPage() {
  const { register, handleSubmit } = useForm<Fields>();
  const [error, setError] = useState("");
  const { setToken } = useAuth();
  const nav = useNavigate();

  const onSubmit = async (data: Fields) => {
    setError("");
    try {
      await api.auth.register(data);
      const res = await api.auth.login({ email: data.email, password: data.password });
      setToken(res.access_token, data.roastery_name);
      nav("/");
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
