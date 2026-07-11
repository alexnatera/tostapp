import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Package, Trash2 } from "lucide-react";
import { api, type Purchase_, type PurchaseCreate, type Supplier } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "../components/AppLayout";
import Combobox from "../components/ui/Combobox";
import IconButton from "../components/ui/IconButton";
import Field from "../components/ui/Field";
import { toast } from "../lib/toast";
import { confirmDestructive } from "../lib/confirm";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase_[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirmDestructive("¿Eliminar esta compra? Esta acción no se puede deshacer.", "Eliminar compra");
    if (!ok) return;
    try {
      await api.purchases.delete(id);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  const supplierValue = watch("supplier") ?? "";
  const supplierNames = Array.from(new Set(suppliers.map((s) => s.name)));

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
            className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2.5 min-h-11 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
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

            <div className="grid grid-cols-2 gap-3">
              <Field label="Origen" error={errors.bean_origin?.message}>
                <input {...register("bean_origin")} placeholder="Huila, Colombia" className={inp} />
              </Field>
              {/* onInput observes keystrokes bubbling up from Combobox's internal input,
                  keeping the free-text RHF field in sync even when the user types a brand-new
                  supplier name that isn't picked from the suggestion list. Combobox renders its
                  own associated <label> via the `label` prop, so it isn't wrapped in <Field>
                  (Field would clone its id onto this wrapping div instead of Combobox's real
                  input). */}
              <div onInput={(e) => setValue("supplier", (e.target as HTMLInputElement).value)}>
                <Combobox
                  items={supplierNames}
                  value={supplierValue || null}
                  onSelect={(v) => setValue("supplier", v ?? "")}
                  getLabel={(s) => s}
                  placeholder="Nombre del proveedor"
                  label="Proveedor"
                />
              </div>
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
          <EmptyState text="Sin compras registradas" />
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
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      {format(new Date(p.purchase_date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-stone-900 dark:text-stone-100 num">{p.kg_purchased} kg</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 num">${p.price_per_kg.toFixed(2)}/kg</p>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-0.5 num">
                      ${(p.kg_purchased * p.price_per_kg).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <IconButton aria-label="Eliminar compra" variant="danger" onClick={() => handleDelete(p.id)}>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16">
      <Package className="w-12 h-12 mx-auto mb-3 text-stone-500 dark:text-stone-400" />
      <p className="text-stone-500 dark:text-stone-400">{text}</p>
    </div>
  );
}

const inp =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

const btn =
  "w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 min-h-11 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1";
