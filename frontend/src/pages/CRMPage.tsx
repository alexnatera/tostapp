import { useEffect, useState } from "react";
import { api, type Customer, type CustomerCreate, type Supplier, type SupplierCreate } from "../lib/api";
import AppLayout from "../components/AppLayout";

type CRMTab = "clientes" | "proveedores";

export default function CRMPage() {
  const [tab, setTab] = useState<CRMTab>("clientes");
  return (
    <AppLayout active="crm">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">CRM</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Clientes y proveedores</p>
        </header>
        <div className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1 mb-5">
          {(["clientes", "proveedores"] as CRMTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              }`}>
              {t}
            </button>
          ))}
        </div>
        {tab === "clientes" ? <ClientesTab /> : <ProveedoresTab />}
      </div>
    </AppLayout>
  );
}

// ── shared helpers ─────────────────────────────────────────────────────────────

const inp =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ContactLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors">
      <span>{icon}</span>
      <span className="truncate max-w-[120px]">{label}</span>
    </a>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 animate-pulse h-24" />
      ))}
    </div>
  );
}

// ── Clientes ──────────────────────────────────────────────────────────────────

type CustomerForm = Omit<CustomerCreate, "type"> & { type: "B2B" | "D2C" };

const emptyCustomer = (): CustomerForm => ({
  name: "", email: "", phone: "", whatsapp: "", instagram: "",
  facebook: "", website: "", address: "", city: "", tax_id: "",
  type: "B2B", notes: "",
});

function ClientesTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyCustomer());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.customers.list().then((r) => { setCustomers(r.items); setTotal(r.total); }).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditingId(null); setForm(emptyCustomer()); setShowNew(true); setError(null); }

  function openEdit(c: Customer) {
    setShowNew(false);
    setEditingId(c.id);
    setError(null);
    setForm({
      name: c.name, email: c.email ?? "", phone: c.phone ?? "",
      whatsapp: c.whatsapp ?? "", instagram: c.instagram ?? "",
      facebook: c.facebook ?? "", website: c.website ?? "",
      address: c.address ?? "", city: c.city ?? "",
      tax_id: c.tax_id ?? "",
      type: (c.type === "D2C" ? "D2C" : "B2B"),
      notes: c.notes ?? "",
    });
  }

  function cancelEdit() { setEditingId(null); setShowNew(false); setError(null); }

  function set(k: keyof CustomerForm, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
    ) as CustomerCreate;
    payload.name = form.name;
    payload.type = form.type;
    try {
      if (editingId) {
        const updated = await api.customers.update(editingId, payload);
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
        setEditingId(null);
      } else {
        const created = await api.customers.create(payload);
        setCustomers((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
        setShowNew(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    try {
      await api.customers.delete(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => t - 1);
      if (editingId === id) setEditingId(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  const filtered = search
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.phone ?? "").includes(search)
      )
    : customers;

  const CustomerFormPanel = (
    <form onSubmit={handleSave} className="bg-white dark:bg-stone-900 rounded-2xl border border-amber-300 dark:border-amber-600 p-5 mb-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {editingId ? "Editar cliente" : "Nuevo cliente"}
        </h2>
        <button type="button" onClick={cancelEdit} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-lg leading-none">×</button>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl">{error}</p>}

      <Field label="Nombre *">
        <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inp} placeholder="Cafetería El Origen" />
      </Field>

      {/* Type */}
      <div>
        <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">Tipo</label>
        <div className="flex gap-2">
          {(["B2B", "D2C"] as const).map((t) => (
            <button key={t} type="button" onClick={() => set("type", t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                form.type === t
                  ? "bg-amber-800 dark:bg-amber-600 text-white border-amber-800 dark:border-amber-600"
                  : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="📧 Email">
          <input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inp} placeholder="hola@cafe.cl" />
        </Field>
        <Field label="📞 Teléfono">
          <input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={inp} placeholder="+56 9 1234 5678" />
        </Field>
        <Field label="💬 WhatsApp">
          <input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} className={inp} placeholder="+56912345678" />
        </Field>
        <Field label="🌐 Sitio web">
          <input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} className={inp} placeholder="www.cafe.cl" />
        </Field>
        <Field label="📸 Instagram">
          <input value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} className={inp} placeholder="@cafeteria" />
        </Field>
        <Field label="Facebook">
          <input value={form.facebook ?? ""} onChange={(e) => set("facebook", e.target.value)} className={inp} placeholder="fb.com/cafeteria" />
        </Field>
      </div>

      {/* Location & fiscal */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ciudad">
          <input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} className={inp} placeholder="Santiago" />
        </Field>
        <Field label="RUT / Tax ID">
          <input value={form.tax_id ?? ""} onChange={(e) => set("tax_id", e.target.value)} className={inp} placeholder="12.345.678-9" />
        </Field>
        <div className="col-span-2">
          <Field label="Dirección">
            <input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} className={inp} placeholder="Av. Providencia 1234" />
          </Field>
        </div>
      </div>

      <Field label="Notas">
        <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Observaciones..." />
      </Field>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={cancelEdit}
          className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50">
          {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear cliente"}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-stone-500 dark:text-stone-400">{total} cliente{total !== 1 ? "s" : ""}</p>
        <button onClick={openNew}
          className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors">
          + Nuevo cliente
        </button>
      </div>

      {customers.length > 3 && (
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..." className={`${inp} mb-4`} />
      )}

      {showNew && CustomerFormPanel}

      {loading ? <Skeleton /> : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">👥</div>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">
            {search ? "Sin resultados" : "Sin clientes registrados"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            if (editingId === c.id) return (
              <div key={c.id}>{CustomerFormPanel}</div>
            );
            return (
              <div key={c.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-lg shrink-0 font-bold text-stone-500 dark:text-stone-400 uppercase">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.type === "B2B"
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                          : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                      }`}>
                        {c.type}
                      </span>
                      {c.tax_id && (
                        <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">{c.tax_id}</span>
                      )}
                    </div>
                    {(c.city || c.address) && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                        📍 {[c.city, c.address].filter(Boolean).join(", ")}
                      </p>
                    )}

                    {/* Contact links */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {c.email && <ContactLink href={`mailto:${c.email}`} icon="📧" label={c.email} />}
                      {c.phone && <ContactLink href={`tel:${c.phone}`} icon="📞" label={c.phone} />}
                      {c.whatsapp && (
                        <ContactLink
                          href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, "")}`}
                          icon="💬" label={c.whatsapp}
                        />
                      )}
                      {c.instagram && (
                        <ContactLink
                          href={c.instagram.startsWith("http") ? c.instagram : `https://instagram.com/${c.instagram.replace("@", "")}`}
                          icon="📸" label={c.instagram}
                        />
                      )}
                      {c.facebook && (
                        <ContactLink
                          href={c.facebook.startsWith("http") ? c.facebook : `https://facebook.com/${c.facebook}`}
                          icon="👤" label={c.facebook}
                        />
                      )}
                      {c.website && (
                        <ContactLink
                          href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                          icon="🌐" label={c.website}
                        />
                      )}
                    </div>

                    {c.notes && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 italic">{c.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <button onClick={() => openEdit(c)}
                    className="flex-1 text-center text-xs font-medium text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg py-1.5 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(c.id)}
                    className="px-4 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg py-1.5 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Proveedores ───────────────────────────────────────────────────────────────

type SupplierForm = {
  name: string; email: string; phone: string; whatsapp: string;
  website: string; address: string; city: string; contact_person: string; notes: string;
};

const emptySupplier = (): SupplierForm => ({
  name: "", email: "", phone: "", whatsapp: "", website: "",
  address: "", city: "", contact_person: "", notes: "",
});

function ProveedoresTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptySupplier());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.suppliers.list().then((r) => { setSuppliers(r.items); setTotal(r.total); }).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditingId(null); setForm(emptySupplier()); setShowNew(true); setError(null); }

  function openEdit(s: Supplier) {
    setShowNew(false);
    setEditingId(s.id);
    setError(null);
    setForm({
      name: s.name, email: s.email ?? "", phone: s.phone ?? "",
      whatsapp: s.whatsapp ?? "", website: s.website ?? "",
      address: s.address ?? "", city: s.city ?? "",
      contact_person: s.contact_person ?? "", notes: s.notes ?? "",
    });
  }

  function cancelEdit() { setEditingId(null); setShowNew(false); setError(null); }
  function set(k: keyof SupplierForm, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
    ) as SupplierCreate;
    payload.name = form.name;
    try {
      if (editingId) {
        const updated = await api.suppliers.update(editingId, payload);
        setSuppliers((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        setEditingId(null);
      } else {
        const created = await api.suppliers.create(payload);
        setSuppliers((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
        setShowNew(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este proveedor?")) return;
    try {
      await api.suppliers.delete(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      setTotal((t) => t - 1);
      if (editingId === id) setEditingId(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  const SupplierFormPanel = (
    <form onSubmit={handleSave} className="bg-white dark:bg-stone-900 rounded-2xl border border-amber-300 dark:border-amber-600 p-5 mb-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {editingId ? "Editar proveedor" : "Nuevo proveedor"}
        </h2>
        <button type="button" onClick={cancelEdit} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-lg leading-none">×</button>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Nombre *">
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inp} placeholder="Importadora de Café" />
          </Field>
        </div>
        <Field label="Persona de contacto">
          <input value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} className={inp} placeholder="Juan Pérez" />
        </Field>
        <Field label="📧 Email">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inp} placeholder="ventas@cafe.com" />
        </Field>
        <Field label="📞 Teléfono">
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inp} placeholder="+56 9 1234 5678" />
        </Field>
        <Field label="💬 WhatsApp">
          <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={inp} placeholder="+56912345678" />
        </Field>
        <Field label="Ciudad">
          <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inp} placeholder="Santiago" />
        </Field>
        <Field label="🌐 Sitio web">
          <input value={form.website} onChange={(e) => set("website", e.target.value)} className={inp} placeholder="www.proveedor.cl" />
        </Field>
        <div className="col-span-2">
          <Field label="Dirección">
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inp} placeholder="Av. Industrial 456" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Notas">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Observaciones..." />
          </Field>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={cancelEdit}
          className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50">
          {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear proveedor"}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-stone-500 dark:text-stone-400">{total} proveedor{total !== 1 ? "es" : ""}</p>
        <button onClick={openNew}
          className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors">
          + Nuevo proveedor
        </button>
      </div>

      {showNew && SupplierFormPanel}

      {loading ? <Skeleton /> : suppliers.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🏪</div>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">Sin proveedores registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => {
            if (editingId === s.id) return <div key={s.id}>{SupplierFormPanel}</div>;
            return (
              <div key={s.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-lg shrink-0 font-bold text-stone-500 dark:text-stone-400 uppercase">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{s.name}</p>
                    {s.contact_person && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Contacto: {s.contact_person}</p>
                    )}
                    {(s.city || s.address) && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                        📍 {[s.city, s.address].filter(Boolean).join(", ")}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {s.email && <ContactLink href={`mailto:${s.email}`} icon="📧" label={s.email} />}
                      {s.phone && <ContactLink href={`tel:${s.phone}`} icon="📞" label={s.phone} />}
                      {s.whatsapp && (
                        <ContactLink
                          href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, "")}`}
                          icon="💬" label={s.whatsapp}
                        />
                      )}
                      {s.website && (
                        <ContactLink
                          href={s.website.startsWith("http") ? s.website : `https://${s.website}`}
                          icon="🌐" label={s.website}
                        />
                      )}
                    </div>

                    {s.notes && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 italic">{s.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <button onClick={() => openEdit(s)}
                    className="flex-1 text-center text-xs font-medium text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg py-1.5 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="px-4 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg py-1.5 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
