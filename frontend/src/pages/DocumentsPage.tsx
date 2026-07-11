import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Document_ } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "../components/AppLayout";
import IconButton from "../components/ui/IconButton";
import { toast } from "../lib/toast";
import { confirmDestructive } from "../lib/confirm";
import { ClipboardList, Receipt, FileText, Package, Trash2 } from "lucide-react";

const typeLabel: Record<string, string> = {
  presupuesto: "Presupuesto",
  boleta: "Boleta",
  factura: "Factura",
};

const statusLabel: Record<string, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  pagado: "Pagado",
  cancelado: "Cancelado",
};

const statusColor: Record<string, string> = {
  borrador: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400",
  enviado: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  pagado: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  cancelado: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
};

const typeIcon: Record<string, typeof ClipboardList> = {
  presupuesto: ClipboardList,
  boleta: Receipt,
  factura: FileText,
};

function formatMoney(amount: number, currency: string): string {
  if (currency === "CLP") return `$${Math.round(amount).toLocaleString("es-CL")}`;
  return new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(amount);
}

const FILTERS = [
  { id: "", label: "Todos" },
  { id: "presupuesto", label: "Presupuestos" },
  { id: "boleta", label: "Boletas" },
  { id: "factura", label: "Facturas" },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document_[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.documents.list({ doc_type: filter || undefined })
      .then((res) => { setDocs(res.items); setTotal(res.total); })
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleDelete(id: string) {
    const ok = await confirmDestructive("Esta acción no se puede deshacer.", "¿Eliminar este documento?");
    if (!ok) return;
    setDeletingId(id);
    try {
      await api.documents.delete(id);
      setDocs((d) => d.filter((x) => x.id !== id));
      setTotal((t) => t - 1);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppLayout active="documentos">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <header className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Documentos</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {total > 0 ? `${total} documento${total !== 1 ? "s" : ""}` : "Sin documentos aún"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav("/products")}
              className="text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl px-3 py-2 inline-flex items-center gap-1.5 transition-colors"
            >
              <Package className="w-4 h-4" aria-hidden="true" /> Productos
            </button>
            <Link
              to="/documents/new"
              className="bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors shadow-sm"
            >
              + Nuevo
            </Link>
          </div>
        </header>

        {/* Type filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2.5 min-h-11 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.id
                  ? "bg-amber-800 dark:bg-amber-600 text-white"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-14 h-14 mx-auto mb-4 text-stone-300 dark:text-stone-700" aria-hidden="true" />
            <p className="text-stone-600 dark:text-stone-400 font-medium mb-1">Sin documentos</p>
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              Crea tu primer presupuesto, boleta o factura.
            </p>
            <Link
              to="/documents/new"
              className="inline-block mt-4 bg-amber-800 dark:bg-amber-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors"
            >
              + Nuevo documento
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => {
              const TypeIcon = typeIcon[doc.doc_type] ?? FileText;
              const isDeleting = deletingId === doc.id;
              return (
              <div
                key={doc.id}
                className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 hover:border-amber-300 dark:hover:border-stone-700 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center shrink-0">
                    <TypeIcon className="w-5 h-5 text-stone-500 dark:text-stone-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                        {typeLabel[doc.doc_type]} {doc.doc_number}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[doc.status]}`}>
                        {statusLabel[doc.status]}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {doc.client_name ?? "Sin cliente"}
                      {" · "}
                      {format(new Date(doc.issue_date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <p className="font-bold text-stone-900 dark:text-stone-100 text-sm shrink-0">
                    {formatMoney(doc.total, doc.currency)}
                  </p>
                </div>
                <div className={`flex items-center gap-2 mt-3 ${isDeleting ? "pointer-events-none opacity-60" : ""}`}>
                  <Link
                    to={`/documents/${doc.id}`}
                    aria-disabled={isDeleting}
                    tabIndex={isDeleting ? -1 : undefined}
                    className="flex-1 text-center text-xs font-medium text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg py-1.5 transition-colors"
                  >
                    Ver / Imprimir
                  </Link>
                  <Link
                    to={`/documents/${doc.id}/edit`}
                    aria-disabled={isDeleting}
                    tabIndex={isDeleting ? -1 : undefined}
                    className="flex-1 text-center text-xs font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg py-1.5 transition-colors"
                  >
                    Editar
                  </Link>
                  <IconButton
                    aria-label="Eliminar documento"
                    variant="danger"
                    disabled={isDeleting}
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
