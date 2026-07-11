import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { DollarSign, Trash2 } from "lucide-react";
import { api, type Sale_, type SaleCreate, type Customer } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "../components/AppLayout";
import Combobox from "../components/ui/Combobox";
import IconButton from "../components/ui/IconButton";
import Field from "../components/ui/Field";
import { toast } from "../lib/toast";
import { confirmDestructive } from "../lib/confirm";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale_[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirmDestructive("¿Eliminar esta venta? Esta acción no se puede deshacer.", "Eliminar venta");
    if (!ok) return;
    try {
      await api.sales.delete(id);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  const customerValue = watch("customer") ?? "";
  const customerNames = Array.from(new Set(customers.map((c) => c.name)));

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
            className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2.5 min-h-11 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
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

            {/* onInput observes keystrokes bubbling up from Combobox's internal input,
                keeping the free-text RHF field in sync even when the user types a brand-new
                customer name that isn't picked from the suggestion list. Combobox renders its
                own associated <label> via the `label` prop, so it isn't wrapped in <Field>
                (Field would clone its id onto this wrapping div instead of Combobox's real
                input). */}
            <div onInput={(e) => setValue("customer", (e.target as HTMLInputElement).value)}>
              <Combobox
                items={customerNames}
                value={customerValue || null}
                onSelect={(v) => setValue("customer", v ?? "")}
                getLabel={(c) => c}
                placeholder="Nombre del cliente (opcional)"
                label="Cliente"
              />
            </div>

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
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-stone-500 dark:text-stone-400" />
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
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      {format(new Date(s.sale_date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-stone-900 dark:text-stone-100 num">{s.kg_sold} kg</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 num">${s.price_per_kg.toFixed(2)}/kg</p>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-0.5 num">
                      ${(s.kg_sold * s.price_per_kg).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <IconButton aria-label="Eliminar venta" variant="danger" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const inp =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

const btn =
  "w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 min-h-11 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1";
