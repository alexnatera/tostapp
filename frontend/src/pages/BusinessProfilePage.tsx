import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type BusinessProfile } from "../lib/api";

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    api.profile.getBusiness().then(setProfile);
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setError("El logo no debe superar 1.5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((p) => p ? { ...p, business_logo: reader.result as string } : p);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await api.profile.updateBusiness(profile);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function set(field: keyof BusinessProfile, value: string) {
    setProfile((p) => p ? { ...p, [field]: value } : p);
  }

  if (!profile) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <button
          onClick={() => nav(-1)}
          className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm mb-5 flex items-center gap-1 transition-colors"
        >
          ← Volver
        </button>

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Perfil del negocio</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Esta información aparece en tus presupuestos, boletas y facturas.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Logo */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Logo</p>
            <div className="flex items-center gap-4">
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 flex items-center justify-center cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-colors overflow-hidden bg-stone-50 dark:bg-stone-800 shrink-0"
              >
                {profile.business_logo ? (
                  <img src={profile.business_logo} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-2xl">🏭</span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="text-sm font-medium text-amber-800 dark:text-amber-400 hover:underline"
                >
                  {profile.business_logo ? "Cambiar logo" : "Subir logo"}
                </button>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">PNG, JPG o SVG. Máx 1.5 MB</p>
                {profile.business_logo && (
                  <button
                    type="button"
                    onClick={() => setProfile((p) => p ? { ...p, business_logo: undefined } : p)}
                    className="text-xs text-red-500 dark:text-red-400 hover:underline mt-1 block"
                  >
                    Eliminar logo
                  </button>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Basic info */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Información básica</p>
            <Field label="Nombre del negocio / tostadería" required>
              <input
                type="text"
                value={profile.roastery_name}
                onChange={(e) => set("roastery_name", e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field label="RUT / NIT / RFC (ID fiscal)">
              <input
                type="text"
                placeholder="Ej: 12.345.678-9"
                value={profile.business_tax_id ?? ""}
                onChange={(e) => set("business_tax_id", e.target.value)}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciudad">
                <input
                  type="text"
                  value={profile.business_city ?? ""}
                  onChange={(e) => set("business_city", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="País">
                <input
                  type="text"
                  value={profile.business_country ?? ""}
                  onChange={(e) => set("business_country", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Dirección">
              <textarea
                rows={2}
                value={profile.business_address ?? ""}
                onChange={(e) => set("business_address", e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>

          {/* Contact */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Contacto</p>
            <Field label="Teléfono">
              <input
                type="tel"
                placeholder="+56 9 1234 5678"
                value={profile.business_phone ?? ""}
                onChange={(e) => set("business_phone", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Email de contacto">
              <input
                type="email"
                placeholder="hola@mitostaderia.cl"
                value={profile.business_email ?? ""}
                onChange={(e) => set("business_email", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Sitio web">
              <input
                type="url"
                placeholder="https://mitostaderia.cl"
                value={profile.business_website ?? ""}
                onChange={(e) => set("business_website", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Guardando..." : saved ? "Guardado ✓" : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
