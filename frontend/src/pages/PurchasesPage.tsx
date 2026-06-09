import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { api, type Purchase_, type PurchaseCreate, type Supplier } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "../components/AppLayout";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase_[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PurchaseCreate>({
    defaultValues: { purchase_date: new Date().toISOString().slice(0, 10) },
  });

  function load() {
    setLoading(true);
    api.purchases.list().then((res) => {
      setPurchases(res.items);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.suppliers.list().then((res) => setSuppliers(res.items)).catch(() => null);
  }, []);

  async function onSubmit(data: PurchaseCreate) {
    setSubmitting(true);
    setError(null);
    try {
      await api.purchases.create({
        ...data,
        kg_purchased: Number(data.kg_purchased),
        price_per_kg: Number(data.price_per_kg),
      });
      reset({ purchase_date: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta compra?")) return;
    try {
      await api.purchases.delete(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  const supplierValue = watch("supplier") ?? "";

  return (
    <AppLayout active="compras">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Compras</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{total} registros</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors shadow-sm"
          >
            {showForm ? "Cancelar" : "+ Nueva compra"}
          </button>
        </header>

        {showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 mb-5 space-y-4"
          >
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Nueva compra de café verde</h2>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 rounded-xl">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Origen" error={errors.bean_origin?.message}>
                <input {...register("bean_origin")} placeholder="Huila, Colombia" className={inp} />
              </Field>
              <Field label="Proveedor">
                <ComboField
                  value={supplierValue}
                  onChange={(v) => setValue("supplier", v)}
                  options={suppliers.map((s) => s.name)}
                  placeholder="Nombre"
                  inputProps={register("supplier")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Kilogramos *" error={errors.kg_purchased?.message}>
                <input
                  {...register("kg_purchased", { required: "Requerido", min: { value: 0.01, message: "> 0" } })}
                  type="number" step="0.01" placeholder="0.00" className={inp}
                />
              </Field>
              <Field label="Precio/kg *" error={errors.price_per_kg?.message}>
                <input
                  {...register("price_per_kg", { required: "Requerido", min: { value: 0.01, message: "> 0" } })}
                  type="number" step="0.01" placeholder="0.00" className={inp}
                />
              </Field>
            </div>

            <Field label="Fecha *" error={errors.purchase_date?.message}>
              <input {...register("purchase_date", { required: "Requerido" })} type="date" className={inp} />
            </Field>

            <Field label="Notas">
              <textarea {...register("notes")} rows={2} placeholder="Observaciones opcionales..." className={`${inp} resize-none`} />
            </Field>

            <button type="submit" disabled={submitting} className={btn}>
              {submitting ? "Guardando..." : "Guardar compra"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 animate-pulse">
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-2/3 mb-2" />
                <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <EmptyState icon="📦" text="Sin compras registradas" />
        ) : (
          <div className="space-y-2">
            {purchases.map((p) => (
              <div key={p.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
                      {p.bean_origin || "Sin origen"}
                    </p>
                    {p.supplier && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{p.supplier}</p>
                    )}
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                      {format(new Date(p.purchase_date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{p.kg_purchased} kg</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">${p.price_per_kg.toFixed(2)}/kg</p>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-0.5">
                      ${(p.kg_purchased * p.price_per_kg).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ComboField({
  value,
  onChange,
  options,
  placeholder,
  inputProps,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  inputProps: ReturnType<ReturnType<typeof useForm>["register"]>;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  useEffect(() => {
    function close(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        {...inputProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={inp}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg max-h-48 overflow-auto py-1">
          {filtered.map((name) => (
            <li
              key={name}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(name);
                setOpen(false);
              }}
              className="px-3 py-2 text-sm text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 cursor-pointer truncate"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-stone-500 dark:text-stone-400">{text}</p>
    </div>
  );
}

const inp =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

const btn =
  "w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50";
