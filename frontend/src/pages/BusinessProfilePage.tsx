import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type BusinessProfile, type ShopPublic, type ShopTheme } from "../lib/api";
import ShopLayout from "../components/ShopLayout";

const DEFAULT_THEME: ShopTheme = {
  primary_color: "#92400e",
  accent_color: "#d97706",
  bg_color: "#fafaf9",
  text_color: "#1c1917",
  font_family: "sans",
  layout: "list",
};

const PRESETS: { name: string; theme: Partial<ShopTheme> }[] = [
  { name: "Café", theme: { primary_color: "#92400e", accent_color: "#d97706", bg_color: "#fafaf9", text_color: "#1c1917" } },
  { name: "Oscuro", theme: { primary_color: "#d97706", accent_color: "#fbbf24", bg_color: "#1c1917", text_color: "#fafaf9" } },
  { name: "Verde", theme: { primary_color: "#166534", accent_color: "#15803d", bg_color: "#f0fdf4", text_color: "#14532d" } },
  { name: "Cielo", theme: { primary_color: "#1e40af", accent_color: "#3b82f6", bg_color: "#eff6ff", text_color: "#1e3a5f" } },
  { name: "Rosa", theme: { primary_color: "#9d174d", accent_color: "#ec4899", bg_color: "#fdf2f8", text_color: "#831843" } },
  { name: "Minimal", theme: { primary_color: "#374151", accent_color: "#6b7280", bg_color: "#ffffff", text_color: "#111827" } },
];

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

  function setTheme(patch: Partial<ShopTheme>) {
    setProfile((p) => {
      if (!p) return p;
      const current: ShopTheme = { ...DEFAULT_THEME, ...(p.shop_theme ?? {}) };
      return { ...p, shop_theme: { ...current, ...patch } };
    });
  }

  const theme = useMemo<ShopTheme>(
    () => ({ ...DEFAULT_THEME, ...(profile?.shop_theme ?? {}) }),
    [profile?.shop_theme]
  );

  const previewShop = useMemo<ShopPublic | null>(() => {
    if (!profile) return null;
    return {
      roastery_name: profile.roastery_name || "Tu tostadería",
      roastery_slug: profile.roastery_slug ?? "preview",
      business_city: profile.business_city,
      business_country: profile.business_country,
      business_logo: profile.business_logo,
      business_website: profile.business_website,
      whatsapp_number: profile.whatsapp_number,
      theme,
      products: [
        { id: "1", name: "Ethiopia Yirgacheffe", description: "Floral, bergamota y té negro", unit: "250g", price: 8500, stock_quantity: 10 },
        { id: "2", name: "Colombia Huila", description: "Caramelo, ciruela y nuez", unit: "250g", price: 7800, stock_quantity: 5 },
        { id: "3", name: "Kenya AA", unit: "250g", price: 9200, stock_quantity: 0 },
      ],
    };
  }, [profile, theme]);

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

          {/* Tienda pública */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Tienda pública</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Tu catálogo de productos accesible sin login.</p>
            </div>
            <Field label="URL de tu tienda (slug)">
              <div className="flex rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-amber-400 dark:focus-within:ring-amber-500 focus-within:border-transparent transition-all">
                <span className="px-3 py-2.5 text-xs text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 border-r border-stone-200 dark:border-stone-700 flex items-center whitespace-nowrap select-none">
                  /tienda/
                </span>
                <input
                  type="text"
                  placeholder="mi-tostaderia"
                  value={profile.roastery_slug ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-");
                    set("roastery_slug", raw);
                  }}
                  className="flex-1 bg-stone-50 dark:bg-stone-800 px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
                />
              </div>
              {profile.roastery_slug && (
                <a
                  href={`/tienda/${profile.roastery_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 dark:text-amber-400 hover:underline mt-1 inline-block"
                >
                  Ver mi tienda →
                </a>
              )}
            </Field>
            <Field label="WhatsApp (con código de país)">
              <input
                type="tel"
                placeholder="+56912345678"
                value={profile.whatsapp_number ?? ""}
                onChange={(e) => set("whatsapp_number", e.target.value)}
                className={inputCls}
              />
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Los clientes podrán contactarte desde la tienda.</p>
            </Field>
          </div>

          {/* Theme editor */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-5">
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Apariencia de la tienda</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Personaliza los colores y el estilo de tu catálogo público.</p>
            </div>

            {/* Presets */}
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Paletas prediseñadas</p>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setTheme(p.theme)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-500 transition-colors text-xs font-medium text-stone-700 dark:text-stone-300"
                  >
                    <span className="flex gap-0.5 shrink-0">
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: p.theme.primary_color }} />
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: p.theme.accent_color }} />
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: p.theme.bg_color }} />
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Colores personalizados</p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["Color primario", "primary_color"],
                    ["Color de acento", "accent_color"],
                    ["Fondo", "bg_color"],
                    ["Texto", "text_color"],
                  ] as [string, keyof ShopTheme][]
                ).map(([label, key]) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(theme[key] as string) ?? "#000000"}
                      onChange={(e) => setTheme({ [key]: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-stone-200 dark:border-stone-700 cursor-pointer bg-transparent p-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-stone-600 dark:text-stone-400 truncate">{label}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 font-mono">{theme[key] as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Font + Layout */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Tipografía</p>
                <div className="flex flex-col gap-1.5">
                  {(["sans", "serif", "mono"] as const).map((f) => (
                    <label key={f} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="font_family"
                        value={f}
                        checked={theme.font_family === f}
                        onChange={() => setTheme({ font_family: f })}
                        className="accent-amber-600"
                      />
                      <span className={`text-sm text-stone-700 dark:text-stone-300 ${f === "sans" ? "font-sans" : f === "serif" ? "font-serif" : "font-mono"}`}>
                        {f === "sans" ? "Sans-serif" : f === "serif" ? "Serif" : "Monospace"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Layout</p>
                <div className="flex flex-col gap-1.5">
                  {(["list", "grid"] as const).map((l) => (
                    <label key={l} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="layout"
                        value={l}
                        checked={theme.layout === l}
                        onChange={() => setTheme({ layout: l })}
                        className="accent-amber-600"
                      />
                      <span className="text-sm text-stone-700 dark:text-stone-300">
                        {l === "list" ? "Lista" : "Cuadrícula"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* About text */}
            <Field label={`Descripción de tu tostadería (${(theme.about_text ?? "").length}/500)`}>
              <textarea
                rows={3}
                placeholder="Cuéntales a tus clientes sobre tu tostadería..."
                value={theme.about_text ?? ""}
                onChange={(e) => setTheme({ about_text: e.target.value.slice(0, 500) })}
                className={`${inputCls} resize-none`}
              />
            </Field>

            {/* Instagram */}
            <Field label="Instagram URL">
              <input
                type="url"
                placeholder="https://instagram.com/mitostaderia"
                value={theme.instagram_url ?? ""}
                onChange={(e) => setTheme({ instagram_url: e.target.value || undefined })}
                className={inputCls}
              />
            </Field>

            {/* Facebook */}
            <Field label="Facebook URL">
              <input
                type="url"
                placeholder="https://facebook.com/mitostaderia"
                value={theme.facebook_url ?? ""}
                onChange={(e) => setTheme({ facebook_url: e.target.value || undefined })}
                className={inputCls}
              />
            </Field>

            {/* Banner image */}
            <Field label="URL de imagen banner">
              <input
                type="url"
                placeholder="https://ejemplo.com/banner.jpg"
                value={theme.banner_image ?? ""}
                onChange={(e) => setTheme({ banner_image: e.target.value || undefined })}
                className={inputCls}
              />
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                Aparece en la parte superior de tu tienda pública (recomendado: 1200×400px).
              </p>
            </Field>

            {/* Live preview */}
            {previewShop && (
              <div>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Vista previa en vivo</p>
                <div
                  className="mx-auto overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm"
                  style={{ width: 195, height: 390 }}
                >
                  <div style={{ width: 390, transform: "scale(0.5)", transformOrigin: "top left", pointerEvents: "none" }}>
                    <ShopLayout shop={previewShop} />
                  </div>
                </div>
              </div>
            )}
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
