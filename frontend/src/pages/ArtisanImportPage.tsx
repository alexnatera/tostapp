import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, type Roast } from "../lib/api";

const levelLabel: Record<string, string> = { light: "Claro", medium: "Medio", dark: "Oscuro" };

export default function ArtisanImportPage() {
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Roast | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  async function handleFile(file: File) {
    if (!file.name.endsWith(".alog") && !file.name.endsWith(".json")) {
      setError("Por favor selecciona un archivo .alog exportado desde Artisan.");
      return;
    }
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const roast = await api.artisan.import(file);
      setResult(roast);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => nav("/")}
        className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm mb-5 flex items-center gap-1 transition-colors"
      >
        ← Mis tuestes
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Importar desde Artisan</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Exporta el .alog en Artisan desde <span className="font-medium">Archivo → Guardar log</span>
        </p>
      </div>

      {result ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-xl shrink-0">
              ✅
            </div>
            <div>
              <p className="font-semibold text-stone-900 dark:text-stone-100">Tueste importado</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">Todos los datos se importaron correctamente</p>
            </div>
          </div>

          <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4 space-y-2">
            {[
              { label: "Origen", value: result.bean_origin },
              { label: "Fecha", value: result.roast_date },
              { label: "Nivel", value: levelLabel[result.roast_level] ?? result.roast_level },
              ...(result.green_weight_g ? [{ label: "Verde", value: `${result.green_weight_g} g` }] : []),
              ...(result.roasted_weight_g ? [{ label: "Tostado", value: `${result.roasted_weight_g} g` }] : []),
              ...(result.roast_time_minutes ? [{ label: "Tiempo", value: `${result.roast_time_minutes.toFixed(1)} min` }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-stone-500 dark:text-stone-400">{label}</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Link
              to={`/roasts/${result.id}`}
              className="flex-1 text-center bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-2.5 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors text-sm"
            >
              Ver tueste →
            </Link>
            <button
              onClick={() => { setResult(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm"
            >
              Importar otro
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !importing && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
              importing
                ? "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/20 pointer-events-none"
                : dragging
                  ? "border-amber-500 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/20 scale-[1.01]"
                  : "border-stone-300 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-stone-50 dark:hover:bg-stone-900"
            }`}
          >
            <div className="text-5xl mb-4">{importing ? "⏳" : "📂"}</div>
            <p className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
              {importing ? "Importando..." : "Arrastra tu archivo .alog"}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {importing ? "Procesando perfil de tueste" : "o haz clic para seleccionar"}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".alog,.json"
            onChange={onInputChange}
            className="hidden"
          />

          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {!importing && (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full mt-4 bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors text-sm"
            >
              Seleccionar archivo .alog
            </button>
          )}

          <div className="mt-6 bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl p-4">
            <p className="text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">¿Cómo exportar desde Artisan?</p>
            <ol className="text-xs text-stone-500 dark:text-stone-400 space-y-1 list-decimal list-inside">
              <li>Abre el perfil de tueste en Artisan</li>
              <li>Ve a <span className="font-medium">Archivo → Guardar log</span></li>
              <li>Guarda el archivo .alog en tu dispositivo</li>
              <li>Sube ese archivo aquí</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
