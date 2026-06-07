import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api, type Roast } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const levelLabel: Record<string, string> = {
  light: "Claro",
  medium: "Medio",
  dark: "Oscuro",
};

const levelStyle: Record<string, string> = {
  light: "bg-yellow-100 text-yellow-800",
  medium: "bg-orange-100 text-orange-800",
  dark: "bg-stone-200 text-stone-800",
};

export default function RoastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation();
  const [roast, setRoast] = useState<Roast | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(state?.justCreated ?? false);
  const nav = useNavigate();

  useEffect(() => {
    if (id) api.roasts.get(id).then(setRoast).catch(() => setLoadError(true));
  }, [id]);

  useEffect(() => {
    if (showSavedToast) {
      const t = setTimeout(() => setShowSavedToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showSavedToast]);

  if (loadError) return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button onClick={() => nav("/")} className="text-amber-700 text-sm mb-4">← Mis tuestes</button>
      <div className="text-center py-12 text-amber-600">
        <p className="text-3xl mb-3">☕</p>
        <p>No se pudo cargar este tueste.</p>
        <button onClick={() => nav("/")} className="mt-4 text-sm underline text-amber-700">Volver al inicio</button>
      </div>
    </div>
  );

  if (!roast) return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-amber-100 rounded w-1/4" />
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <div className="h-6 bg-amber-100 rounded w-2/3" />
          <div className="h-4 bg-amber-50 rounded w-1/3" />
          <div className="h-24 bg-amber-50 rounded" />
        </div>
      </div>
    </div>
  );

  const qrUrl = api.public.qrUrl(roast.slug);
  const publicUrl = `${window.location.origin}/r/${roast.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Success toast after form submit */}
      {showSavedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-800 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
          Tueste guardado y etiqueta lista ✓
        </div>
      )}

      <button onClick={() => nav("/")} className="text-amber-700 text-sm mb-4">← Mis tuestes</button>

      <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-amber-900">{roast.bean_origin}</h2>
            {roast.farm && <p className="text-sm text-amber-600">Finca {roast.farm}</p>}
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${levelStyle[roast.roast_level]}`}>
            {levelLabel[roast.roast_level] ?? roast.roast_level}
          </span>
        </div>

        <p className="text-sm text-amber-700">
          {format(new Date(roast.roast_date), "d 'de' MMMM yyyy", { locale: es })} · Lote #{roast.batch_number}
        </p>

        {roast.tasting_notes && (
          <p className="text-sm italic text-amber-800">"{roast.tasting_notes}"</p>
        )}

        <div className="border-t border-amber-100 pt-4">
          <p className="text-xs font-medium text-amber-700 mb-3">Etiqueta QR</p>
          <div className="flex gap-4 items-center">
            <img src={qrUrl} alt="QR" className="w-24 h-24 rounded-lg border border-amber-200" />
            <div className="flex-1 space-y-2">
              <a
                href={qrUrl}
                download={`tostapp-${roast.slug}.png`}
                className="block w-full text-center bg-amber-800 text-white rounded-lg py-2 text-sm font-medium hover:bg-amber-900 transition"
              >
                Descargar QR
              </a>
              <button
                onClick={handleCopy}
                className="block w-full text-center border border-amber-300 text-amber-800 rounded-lg py-2 text-sm hover:bg-amber-50 transition"
              >
                {copied ? "¡Copiado! ✓" : "Copiar link público"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
