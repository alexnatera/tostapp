import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { api, type RoastCreate } from "../lib/api";
import { format } from "date-fns";

export default function NewRoastPage() {
  const [showDetails, setShowDetails] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<RoastCreate>({
    defaultValues: {
      roast_date: format(new Date(), "yyyy-MM-dd"),
      roast_level: "medium",
    },
  });
  const nav = useNavigate();

  const onSubmit = async (data: RoastCreate) => {
    const roast = await api.roasts.create(data);
    nav(`/roasts/${roast.id}`, { state: { justCreated: true } });
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <button
          onClick={() => nav(-1)}
          className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm mb-5 flex items-center gap-1 transition-colors"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-6">Nuevo tueste</h1>

        <form id="roast-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Origen del café *" error={errors.bean_origin?.message}>
            <input
              {...register("bean_origin", { required: "Campo requerido", maxLength: { value: 120, message: "Máx. 120 caracteres" } })}
              placeholder="Huila, Colombia"
              className={errors.bean_origin ? inputErr : inp}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            {(["light", "medium", "dark"] as const).map((level) => {
              const labels = { light: "Claro", medium: "Medio", dark: "Oscuro" };
              const dots: Record<string, string> = { light: "bg-yellow-400", medium: "bg-orange-500", dark: "bg-stone-700 dark:bg-stone-400" };
              return (
                <label key={level} className="relative cursor-pointer">
                  <input
                    {...register("roast_level", { required: true })}
                    type="radio"
                    value={level}
                    className="peer sr-only"
                  />
                  <div className="border-2 border-stone-200 dark:border-stone-700 peer-checked:border-amber-600 dark:peer-checked:border-amber-500 peer-checked:bg-amber-50 dark:peer-checked:bg-amber-900/20 rounded-xl p-3 text-center transition-all">
                    <span className={`inline-block w-3 h-3 rounded-full mb-1.5 ${dots[level]}`} />
                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300">{labels[level]}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <Field label="Fecha de tueste *" error={errors.roast_date?.message}>
            <input
              {...register("roast_date", { required: "Campo requerido" })}
              type="date"
              className={errors.roast_date ? inputErr : inp}
            />
          </Field>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 font-medium pt-1 transition-colors"
          >
            <span className={`inline-block transition-transform duration-200 ${showDetails ? "rotate-90" : ""}`}>›</span>
            {showDetails ? "Ocultar detalles" : "Agregar detalles técnicos"}
          </button>

          {showDetails && (
            <div className="space-y-4 border-l-2 border-amber-200 dark:border-amber-800 pl-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Finca">
                  <input {...register("farm")} placeholder="El Paraíso" className={inp} />
                </Field>
                <Field label="Variedad">
                  <input {...register("variety")} placeholder="Castillo" className={inp} />
                </Field>
              </div>

              <Field label="Proceso">
                <input {...register("process")} placeholder="Lavado" className={inp} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Peso verde (g)">
                  <input {...register("green_weight_g", { valueAsNumber: true })} type="number" placeholder="500" className={inp} />
                </Field>
                <Field label="Peso tostado (g)">
                  <input {...register("roasted_weight_g", { valueAsNumber: true })} type="number" placeholder="425" className={inp} />
                </Field>
              </div>

              <Field label="Notas de cata" error={errors.tasting_notes?.message}>
                <input
                  {...register("tasting_notes", { maxLength: { value: 255, message: "Máx. 255 caracteres" } })}
                  placeholder="Chocolate, caramelo, cítrico"
                  className={inp}
                />
              </Field>

              <Field label="Historia del tostador" error={errors.roaster_notes?.message}>
                <textarea
                  {...register("roaster_notes", { maxLength: { value: 4000, message: "Máx. 4000 caracteres" } })}
                  rows={3}
                  placeholder="Cuéntale al cliente la historia de este café..."
                  className={`${inp} resize-none`}
                />
              </Field>
            </div>
          )}
        </form>
      </div>

      <div className="sticky bottom-0 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 px-4 py-3 max-w-2xl mx-auto w-full">
        <button
          type="submit"
          form="roast-form"
          disabled={isSubmitting}
          className="w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3.5 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 text-sm"
        >
          {isSubmitting ? "Guardando..." : "Guardar y generar etiqueta →"}
        </button>
      </div>
    </div>
  );
}

const inp =
  "w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

const inputErr =
  "w-full bg-white dark:bg-stone-800 border border-red-400 dark:border-red-600 rounded-xl px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500 focus:border-transparent transition-all";

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
