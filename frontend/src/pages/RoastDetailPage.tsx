import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Thermometer, AlertCircle } from "lucide-react";
import { api, type Roast } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "../lib/toast";

const levelLabel: Record<string, string> = { light: "Claro", medium: "Medio", dark: "Oscuro" };
const levelDot: Record<string, string> = {
  light: "bg-yellow-400",
  medium: "bg-orange-500",
  dark: "bg-stone-500 dark:bg-stone-400",
};

// ── Roast curve chart (pure SVG, no dependencies) ────────────────────────────

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s === 0 ? `${m}:00` : `${m}:${s.toString().padStart(2, "0")}`;
}

function RoastCurveChart({ profile }: { profile: Record<string, unknown> }) {
  const timex = (profile.timex as number[]) ?? [];
  const temp1 = (profile.temp1 as number[]) ?? [];
  const temp2 = (profile.temp2 as number[]) ?? [];
  const timeindex = (profile.timeindex as number[]) ?? [];
  const isF = String(profile.mode ?? "").toUpperCase() === "F";

  if (timex.length < 10 || temp1.length < 10) return null;

  const toC = (v: number) => isF ? (v - 32) * 5 / 9 : v;

  const chargeIdx = timeindex[0] ?? 0;
  const tpIdx     = timeindex[1] ?? 0;
  const fcsIdx    = timeindex[2] ?? 0;
  const dropIdx   = timeindex[6] ?? (timex.length - 1);

  const start = Math.max(0, chargeIdx);
  const end   = Math.min(timex.length - 1, dropIdx);

  const times  = timex.slice(start, end + 1);
  const bts    = temp1.slice(start, end + 1).map(toC);
  const ets    = temp2.slice(start, end + 1).map(toC);

  const t0       = times[0];
  const tNorm    = times.map(t => t - t0);
  const duration = tNorm[tNorm.length - 1];

  const allTemps = [...bts, ...ets].filter(v => v > 10 && v < 500);
  const minT = Math.floor(Math.min(...allTemps) / 10) * 10 - 5;
  const maxT = Math.ceil( Math.max(...allTemps) / 10) * 10 + 10;

  const W = 560, H = 220;
  const PL = 36, PR = 10, PT = 10, PB = 26;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  const xS = (t: number)    => PL + (t / duration) * cW;
  const yS = (temp: number) => PT + cH - ((temp - minT) / (maxT - minT)) * cH;

  function toPath(vals: number[]) {
    return vals.map((v, i) =>
      `${i === 0 ? "M" : "L"}${xS(tNorm[i]).toFixed(1)},${yS(v).toFixed(1)}`
    ).join(" ");
  }

  const btPath = toPath(bts);
  const etPath = toPath(ets);
  const btArea = `${btPath} L${xS(duration).toFixed(1)},${yS(minT).toFixed(1)} L${xS(0).toFixed(1)},${yS(minT).toFixed(1)} Z`;

  // Event markers
  const markers = [
    tpIdx  > chargeIdx ? { idx: tpIdx,  label: "TP",   color: "#3b82f6" } : null,
    fcsIdx > chargeIdx ? { idx: fcsIdx, label: "1C",   color: "#ef4444" } : null,
    dropIdx > 0        ? { idx: dropIdx, label: "Drop", color: "#8b5cf6" } : null,
  ].filter(Boolean) as { idx: number; label: string; color: string }[];

  // X ticks (minutes)
  const maxMin = Math.ceil(duration / 60);
  const xTicks = Array.from({ length: maxMin + 1 }, (_, i) => i);

  // Y ticks
  const yStep = (maxT - minT) > 120 ? 50 : 25;
  const yTicks: number[] = [];
  for (let v = Math.ceil(minT / yStep) * yStep; v <= maxT; v += yStep) yTicks.push(v);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="btGradFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="cc">
            <rect x={PL} y={PT} width={cW} height={cH + 1} />
          </clipPath>
        </defs>

        {/* Y grid + labels */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={yS(v)} y2={yS(v)}
              stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
            <text x={PL - 4} y={yS(v)} textAnchor="end" dominantBaseline="middle"
              fontSize="11" fill="currentColor" fillOpacity="0.4">{Math.round(v)}°</text>
          </g>
        ))}

        {/* X grid + labels */}
        {xTicks.filter(m => m > 0).map(m => (
          <g key={m}>
            <line x1={xS(m * 60)} x2={xS(m * 60)} y1={PT} y2={H - PB}
              stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
            <text x={xS(m * 60)} y={H - PB + 11} textAnchor="middle"
              fontSize="11" fill="currentColor" fillOpacity="0.4">{m}′</text>
          </g>
        ))}

        {/* Phase background zones */}
        {tpIdx > chargeIdx && (
          <rect
            x={xS(0)} y={PT}
            width={xS(tNorm[tpIdx - start]) - xS(0)}
            height={cH}
            fill="#22c55e" fillOpacity="0.04"
            clipPath="url(#cc)"
          />
        )}
        {tpIdx > chargeIdx && fcsIdx > chargeIdx && (
          <rect
            x={xS(tNorm[tpIdx - start])} y={PT}
            width={xS(tNorm[fcsIdx - start]) - xS(tNorm[tpIdx - start])}
            height={cH}
            fill="#f59e0b" fillOpacity="0.04"
            clipPath="url(#cc)"
          />
        )}
        {fcsIdx > chargeIdx && dropIdx > 0 && (
          <rect
            x={xS(tNorm[fcsIdx - start])} y={PT}
            width={xS(duration) - xS(tNorm[fcsIdx - start])}
            height={cH}
            fill="#ef4444" fillOpacity="0.05"
            clipPath="url(#cc)"
          />
        )}

        {/* BT area fill */}
        <path d={btArea} fill="url(#btGradFill)" clipPath="url(#cc)" />

        {/* ET curve (dashed, secondary) */}
        <path d={etPath} fill="none" stroke="#94a3b8" strokeWidth="1.5"
          strokeDasharray="5 3" opacity="0.55" clipPath="url(#cc)" />

        {/* BT curve */}
        <path d={btPath} fill="none" stroke="#f59e0b" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" clipPath="url(#cc)" />

        {/* Event markers */}
        {markers.map((ev) => {
          const relIdx = ev.idx - start;
          if (relIdx < 0 || relIdx >= tNorm.length) return null;
          const x = xS(tNorm[relIdx]);
          const y = yS(bts[relIdx]);
          return (
            <g key={ev.label}>
              <line x1={x} x2={x} y1={PT} y2={H - PB}
                stroke={ev.color} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <circle cx={x} cy={y} r="4.5" fill={ev.color} opacity="0.9" />
              <circle cx={x} cy={y} r="7" fill={ev.color} fillOpacity="0.15" />
              <text x={x} y={y - 11} textAnchor="middle" fontSize="12"
                fill={ev.color} fontWeight="700">{ev.label}</text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={PL} x2={PL}       y1={PT}     y2={H - PB}
          stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
        <line x1={PL} x2={W - PR}   y1={H - PB} y2={H - PB}
          stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/></svg>
          <span className="text-xs text-stone-500 dark:text-stone-400">BT — Temperatura del grano</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 2"/></svg>
          <span className="text-xs text-stone-500 dark:text-stone-400">ET — Temperatura del aire</span>
        </div>
      </div>
    </div>
  );
}

// ── Phase timeline ────────────────────────────────────────────────────────────

function PhaseTimeline({ profile }: { profile: Record<string, unknown> }) {
  const timex    = (profile.timex as number[]) ?? [];
  const timeindex = (profile.timeindex as number[]) ?? [];
  const isF      = String(profile.mode ?? "").toUpperCase() === "F";
  const toC      = (v: number) => isF ? (v - 32) * 5 / 9 : v;
  const temp1    = (profile.temp1 as number[]) ?? [];

  const chargeIdx = timeindex[0] ?? 0;
  const tpIdx     = timeindex[1] ?? 0;
  const fcsIdx    = timeindex[2] ?? 0;
  const dropIdx   = timeindex[6] ?? (timex.length - 1);

  if (!timex[chargeIdx] || !timex[dropIdx]) return null;

  const t0    = timex[chargeIdx];
  const total = timex[dropIdx] - t0;

  const hasTp  = tpIdx > chargeIdx;
  const hasFcs = fcsIdx > chargeIdx;

  const dryEnd  = hasTp  ? timex[tpIdx]  - t0 : 0;
  const mailEnd = hasFcs ? timex[fcsIdx] - t0 : 0;
  const devTime = hasFcs ? total - mailEnd : 0;
  const dtr     = hasFcs ? (devTime / total * 100).toFixed(1) : null;

  const phases = [
    hasTp  ? { label: "Secado",     pct: dryEnd / total,        color: "bg-green-500 dark:bg-green-600",  dur: dryEnd } : null,
    hasTp && hasFcs ? { label: "Maillard", pct: (mailEnd - dryEnd) / total, color: "bg-amber-500 dark:bg-amber-600", dur: mailEnd - dryEnd } : null,
    hasFcs ? { label: "Desarrollo", pct: devTime / total,       color: "bg-red-500 dark:bg-red-600",      dur: devTime } : null,
  ].filter(Boolean) as { label: string; pct: number; color: string; dur: number }[];

  if (!phases.length) return null;

  // Key event stats
  const events = [
    { label: "Carga",     time: 0,                       temp: toC(temp1[chargeIdx]),          color: "text-stone-500 dark:text-stone-400" },
    hasTp  ? { label: "P. Giro",  time: timex[tpIdx]  - t0, temp: toC(temp1[tpIdx]),          color: "text-blue-600 dark:text-blue-400"  } : null,
    hasFcs ? { label: "1er Crack",time: timex[fcsIdx] - t0, temp: toC(temp1[fcsIdx]),          color: "text-red-500 dark:text-red-400"    } : null,
    { label: "Descarga",  time: total,                   temp: toC(temp1[dropIdx]),             color: "text-violet-600 dark:text-violet-400" },
  ].filter(Boolean) as { label: string; time: number; temp: number; color: string }[];

  return (
    <div className="space-y-4">
      {/* Phase bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Fases del tueste</p>
          {dtr && (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
              DTR {dtr}%
            </span>
          )}
        </div>
        <div className="flex rounded-full overflow-hidden h-5 gap-px">
          {phases.map((ph) => (
            <div
              key={ph.label}
              className={`${ph.color} flex items-center justify-center transition-all`}
              style={{ width: `${(ph.pct * 100).toFixed(1)}%` }}
              role="img"
              aria-label={`${ph.label}: ${fmtTime(ph.dur)}`}
            >
              {ph.pct > 0.12 && (
                <span className="text-[9px] font-bold text-white drop-shadow-sm truncate px-1" aria-hidden="true">
                  {ph.label}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {phases.map((ph) => (
            <div key={ph.label} className="text-center" style={{ width: `${(ph.pct * 100).toFixed(1)}%` }}>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate px-0.5">
                {fmtTime(ph.dur)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Event timeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {events.map((ev) => (
          <div key={ev.label} className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3 text-center">
            <p className={`text-base font-bold ${ev.color}`}>{Math.round(ev.temp)}°C</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{ev.label}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-mono">{fmtTime(ev.time)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => nav("/")} className={backCls}><ArrowLeft className="w-4 h-4" /> Mis tuestes</button>
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-stone-400 dark:text-stone-600" />
        <p className="text-stone-500 dark:text-stone-400">No se pudo cargar este tueste.</p>
      </div>
    </div>
  );

  if (!roast) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 max-w-2xl mx-auto px-4 py-6">
      <div className="animate-pulse motion-reduce:animate-none space-y-4">
        <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/4" />
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 h-40" />
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 h-64" />
      </div>
    </div>
  );

  const qrUrl     = api.public.qrUrl(roast.slug);
  const publicUrl = `${window.location.origin}/r/${roast.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("No se pudo copiar el link.");
    });
  };

  const profile   = roast.profile_data as Record<string, unknown> | undefined;
  const hasCurve  = profile &&
    Array.isArray(profile.timex) &&
    (profile.timex as number[]).length > 10;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {showSavedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          Tueste guardado y etiqueta lista ✓
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => nav("/")} className={backCls}><ArrowLeft className="w-4 h-4" /> Mis tuestes</button>

        <div className="space-y-4">
          {/* ── Main card ── */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${levelDot[roast.roast_level] ?? "bg-stone-400"}`} />
                  <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 leading-tight">{roast.bean_origin}</h1>
                </div>
                {roast.farm && <p className="text-sm text-stone-500 dark:text-stone-400 ml-5">Finca {roast.farm}</p>}
                {roast.variety && <p className="text-xs text-stone-500 dark:text-stone-400 ml-5">{roast.variety}{roast.process ? ` · ${roast.process}` : ""}</p>}
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0">
                {levelLabel[roast.roast_level] ?? roast.roast_level}
              </span>
            </div>

            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
              {format(new Date(roast.roast_date), "d 'de' MMMM yyyy", { locale: es })}
              {" · "}Lote #{roast.batch_number}
            </p>

            {roast.tasting_notes && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Notas de cata</p>
                <p className="text-sm italic text-amber-800 dark:text-amber-300">"{roast.tasting_notes}"</p>
              </div>
            )}

            {roast.roaster_notes && (
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-4 leading-relaxed">{roast.roaster_notes}</p>
            )}

            {/* Weight & yield */}
            {(roast.green_weight_g || roast.roasted_weight_g) && (
              <div className="grid grid-cols-3 gap-3">
                {roast.green_weight_g != null && (
                  <div className="text-center bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
                    <p className="text-lg font-bold text-stone-900 dark:text-stone-100">{roast.green_weight_g}g</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Verde</p>
                  </div>
                )}
                {roast.roasted_weight_g != null && (
                  <div className="text-center bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
                    <p className="text-lg font-bold text-amber-800 dark:text-amber-300">{roast.roasted_weight_g}g</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Tostado</p>
                  </div>
                )}
                {roast.green_weight_g != null && roast.roasted_weight_g != null && (
                  <div className="text-center bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
                    <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
                      {((roast.roasted_weight_g / roast.green_weight_g) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Rendimiento</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Artisan curve card ── */}
          {hasCurve && profile && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Curva de tueste</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Importado desde Artisan
                    {roast.roast_time_minutes != null && ` · ${roast.roast_time_minutes.toFixed(1)} min`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-1.5">
                  <Thermometer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {String(profile.mode ?? "").toUpperCase() === "F" ? "°F → °C" : "°C"}
                  </span>
                </div>
              </div>

              {/* Chart */}
              <div className="px-3 pb-2">
                <RoastCurveChart profile={profile} />
              </div>

              {/* Phases + events */}
              <div className="px-5 pb-5 pt-2 border-t border-stone-50 dark:border-stone-800">
                <PhaseTimeline profile={profile} />
              </div>
            </div>
          )}

          {/* ── Artisan stats (no curve) ── */}
          {profile && !hasCurve && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">Datos de Artisan</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {roast.charge_temp != null && <Stat label="Temp. carga" value={`${roast.charge_temp} °C`} />}
                {roast.drop_temp != null && <Stat label="Temp. descarga" value={`${roast.drop_temp} °C`} />}
                {roast.roast_time_minutes != null && <Stat label="Duración" value={`${roast.roast_time_minutes.toFixed(1)} min`} />}
                {Boolean((profile.computed as Record<string, unknown>)?.FCs_BT) && (
                  <Stat
                    label="1er crack"
                    value={`${Math.round((Number((profile.computed as Record<string, unknown>).FCs_BT) - 32) * 5 / 9)} °C`}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── QR label ── */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Etiqueta QR</h2>
            <div className="flex gap-4 items-center">
              <div className="bg-white rounded-xl p-2 border border-stone-200 dark:border-stone-700 shrink-0">
                <img src={qrUrl} alt="Código QR con el enlace público de este tueste" className="w-20 h-20" />
              </div>
              <div className="flex-1 space-y-2">
                <a
                  href={qrUrl}
                  download={`tostapp-${roast.slug}.png`}
                  className="flex items-center justify-center gap-2 w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors"
                >
                  Descargar QR
                </a>
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 w-full border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  {copied ? "¡Copiado! ✓" : "Copiar link público"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{value}</p>
    </div>
  );
}

const backCls =
  "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm mb-5 flex items-center gap-1 transition-colors";
