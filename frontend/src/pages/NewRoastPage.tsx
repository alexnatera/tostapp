import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { api, type RoastCreate } from "../lib/api";
import { format } from "date-fns";

export default function NewRoastPage() {
  const [showDetails, setShowDetails] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<RoastCreate>({
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
    <div className="max-w-lg mx-auto min-h-screen flex flex-col bg-amber-50">
      <div className="flex-1 px-4 py-6 pb-4">
        <button onClick={() => nav(-1)} className="text-amber-700 text-sm mb-4">← Volver</button>
        <h2 className="text-2xl font-bold text-amber-900 mb-6">Nuevo tueste</h2>

        <form id="roast-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Primary fields — always visible */}
          <Field label="Origen del café *">
            <input
              {...register("bean_origin", { required: true })}
              placeholder="Huila, Colombia"
              className={input}
            />
          </Field>

          <Field label="Nivel de tueste *">
            <select {...register("roast_level", { required: true })} className={input}>
              <option value="light">Claro</option>
              <option value="medium">Medio</option>
              <option value="dark">Oscuro</option>
            </select>
          </Field>

          <Field label="Fecha de tueste *">
            <input
              {...register("roast_date", { required: true })}
              type="date"
              className={input}
            />
          </Field>

          {/* Collapsible details — closed by default; RHF preserves values on toggle */}
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-2 text-sm text-amber-700 font-medium pt-2"
          >
            <span className={`transition-transform ${showDetails ? "rotate-45" : ""}`}>+</span>
            {showDetails ? "Ocultar detalles" : "Agregar detalles"}
          </button>

          {showDetails && (
            <div className="space-y-4 border-l-2 border-amber-200 pl-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Finca">
                  <input {...register("farm")} placeholder="El Paraíso" className={input} />
                </Field>
                <Field label="Variedad">
                  <input {...register("variety")} placeholder="Castillo" className={input} />
                </Field>
              </div>

              <Field label="Proceso">
                <input {...register("process")} placeholder="Lavado" className={input} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Peso verde (g)">
                  <input
                    {...register("green_weight_g", { valueAsNumber: true })}
                    type="number"
                    className={input}
                  />
                </Field>
                <Field label="Peso tostado (g)">
                  <input
                    {...register("roasted_weight_g", { valueAsNumber: true })}
                    type="number"
                    className={input}
                  />
                </Field>
              </div>

              <Field label="Notas de cata">
                <input
                  {...register("tasting_notes")}
                  placeholder="Chocolate, caramelo, cítrico"
                  className={input}
                />
              </Field>

              <Field label="Historia del tostador">
                <textarea
                  {...register("roaster_notes")}
                  rows={3}
                  placeholder="Cuéntale al cliente la historia de este café..."
                  className={`${input} resize-none`}
                />
              </Field>
            </div>
          )}
        </form>
      </div>

      {/* Sticky submit button — always visible at bottom of viewport */}
      <div className="sticky bottom-0 bg-amber-50 border-t border-amber-100 px-4 py-3">
        <button
          type="submit"
          form="roast-form"
          disabled={isSubmitting}
          className="w-full bg-amber-800 text-white rounded-xl py-4 font-semibold text-lg hover:bg-amber-900 transition disabled:opacity-50"
        >
          {isSubmitting ? "Guardando..." : "Guardar y generar etiqueta →"}
        </button>
      </div>
    </div>
  );
}

const input = "w-full border border-amber-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-amber-800 mb-1">{label}</label>
      {children}
    </div>
  );
}
