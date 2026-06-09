import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type RoastPublic } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const levelLabel: Record<string, string> = {
  light: "Claro — tueste ligero",
  medium: "Medio — tueste equilibrado",
  dark: "Oscuro — tueste intenso",
};

export default function PublicRoastPage() {
  const { slug } = useParams<{ slug: string }>();
  const [roast, setRoast] = useState<RoastPublic | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) api.public.roast(slug).then(setRoast).catch(() => setError(true));
  }, [slug]);

  if (error) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6">
      <p className="text-stone-500 dark:text-stone-400">Este tueste no existe o fue eliminado.</p>
    </div>
  );

  if (!roast) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-2 font-medium">
            {roast.roastery_name}
          </p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">{roast.bean_origin}</h1>
          {roast.farm && (
            <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">Finca {roast.farm}</p>
          )}
        </div>

        {roast.tasting_notes && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 text-center">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
              Notas de cata
            </p>
            <p className="text-lg text-amber-900 dark:text-amber-200 font-medium italic">
              "{roast.tasting_notes}"
            </p>
          </div>
        )}

        {roast.roaster_notes && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">
              Del tostador
            </p>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{roast.roaster_notes}</p>
          </div>
        )}

        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Origen" value={roast.bean_origin} />
            {roast.variety && <Stat label="Variedad" value={roast.variety} />}
            {roast.process && <Stat label="Proceso" value={roast.process} />}
            <Stat label="Tueste" value={levelLabel[roast.roast_level] ?? roast.roast_level} />
            <Stat label="Fecha" value={format(new Date(roast.roast_date), "d MMM yyyy", { locale: es })} />
            <Stat label="Lote" value={`#${roast.batch_number}`} />
          </div>
        </div>

        <div className="bg-amber-800 dark:bg-amber-700 rounded-2xl p-5 text-center">
          <p className="text-amber-200 text-sm mb-3">¿Eres tostador de café artesanal?</p>
          <Link
            to="/register"
            className="block w-full bg-white text-amber-900 font-semibold rounded-xl py-3 hover:bg-amber-50 transition-colors text-sm"
          >
            Crea tu cuenta gratis en Tostapp →
          </Link>
        </div>

        <p className="text-center text-xs text-stone-400 dark:text-stone-600">
          Generado con Tostapp
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 mt-0.5">{value}</p>
    </div>
  );
}
