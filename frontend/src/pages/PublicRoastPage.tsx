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
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
      <p className="text-amber-700">Este tueste no existe o fue eliminado.</p>
    </div>
  );

  if (!roast) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-amber-600 mb-1">{roast.roastery_name}</p>
          <h1 className="text-3xl font-bold text-amber-900">{roast.bean_origin}</h1>
          {roast.farm && <p className="text-amber-600 mt-1">Finca {roast.farm}</p>}
        </div>

        {roast.tasting_notes && (
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-2">Notas de cata</p>
            <p className="text-lg text-amber-900 font-medium italic">"{roast.tasting_notes}"</p>
          </div>
        )}

        {/* Roaster story before stats — emotional payload first */}
        {roast.roaster_notes && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-2">Del tostador</p>
            <p className="text-sm text-amber-800 leading-relaxed">{roast.roaster_notes}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5 grid grid-cols-2 gap-4">
          <Stat label="Origen" value={roast.bean_origin} />
          {roast.variety && <Stat label="Variedad" value={roast.variety} />}
          {roast.process && <Stat label="Proceso" value={roast.process} />}
          <Stat label="Tueste" value={levelLabel[roast.roast_level] ?? roast.roast_level} />
          <Stat label="Fecha" value={format(new Date(roast.roast_date), "d MMM yyyy", { locale: es })} />
          <Stat label="Lote" value={`#${roast.batch_number}`} />
        </div>

        {/* CTA — primary acquisition channel for Tostapp */}
        <div className="bg-amber-800 rounded-2xl p-5 text-center">
          <p className="text-amber-200 text-sm mb-3">¿Eres tostador de café artesanal?</p>
          <Link
            to="/register"
            className="block w-full bg-white text-amber-900 font-semibold rounded-xl py-3 hover:bg-amber-50 transition"
          >
            Crea tu cuenta gratis en Tostapp →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-amber-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-amber-900 mt-0.5">{value}</p>
    </div>
  );
}
