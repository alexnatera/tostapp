import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { api, type Sale_, type SaleCreate, type Customer } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "../components/AppLayout";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale_[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SaleCreate>({
    defaultValues: { sale_date: new Date().toISOString().slice(0, 10) },
  });

  function load() {
    setLoading(true);
    api.sales.list().then((res) => {
      setSales(res.items);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.customers.list().then((res) => setCustomers(res.items)).catch(() => null);
  }, []);

  async function onSubmit(data: SaleCreate) {
    setSubmitting(true);
    setError(null);
    try {
      await api.sales.create({
        ...data,
        kg_sold: Number(data.kg_sold),
        price_per_kg: Number(data.price_per_kg),
      });
      reset({ sale_date: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta venta?")) return;
    try {
      await api.sales.delete(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  const customerValue = watch("customer") ?? "";

  return (
    <AppLayout active="ventas">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Ventas</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{total} registros</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors shadow-sm"
          >
            {showForm ? "Cancelar" : "+ Nueva venta"}
          </button>
        </header>

        {showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 mb-5 space-y-4"
          >
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Registrar venta</h2>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 rounded-xl">
                {error}
              </p>
            )}

            <Field label="Cliente">
              <ComboField
                value={customerValue}
                onChange={(v) => setValue("customer", v)}
                options={customers.map((c) => c.name)}
                placeholder="Nombre del cliente (opcional)"
                inputProps={register("customer")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Kilogramos *" error={errors.kg_sold?.message}>
                <input
                  {...register("kg_sold", { required: "Requerido", min: { value: 0.01, message: "> 0" } })}
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

            <Field label="Fecha *" error={errors.sale_date?.message}>
              <input {...register("sale_date", { required: "Requerido" })} type="date" className={inp} />
            </Field>

            <Field label="Notas">
              <textarea {...register("notes")} rows={2} placeholder="Observaciones opcionales..." className={`${inp} resize-none`} />
            </Field>

            <button type="submit" disabled={submitting} className={btn}>
              {submitting ? "Guardando..." : "Guardar venta"}
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
        ) : sales.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">💰</div>
            <p className="text-stone-500 dark:text-stone-400">Sin ventas registradas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map((s) => (
              <div key={s.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
                      {s.customer || "Cliente general"}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                      {format(new Date(s.sale_date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{s.kg_sold} kg</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">${s.price_per_kg.toFixed(2)}/kg</p>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-0.5">
                      ${(s.kg_sold * s.price_per_kg).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => handleDelete(s.id)}
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

const inp =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

const btn =
  "w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50";
