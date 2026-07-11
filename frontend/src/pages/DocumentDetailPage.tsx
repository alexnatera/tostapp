import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type BusinessProfile, type Document_ } from "../lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "../lib/toast";

const typeLabel: Record<string, string> = {
  presupuesto: "PRESUPUESTO",
  boleta: "BOLETA",
  factura: "FACTURA",
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

function formatMoney(amount: number, currency: string): string {
  if (currency === "CLP") return `$${Math.round(amount).toLocaleString("es-CL")}`;
  return new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(amount);
}

function fmtDate(d: string) {
  return format(new Date(d), "d 'de' MMMM 'de' yyyy", { locale: es });
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document_ | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [error, setError] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!id) return;
    Promise.all([api.documents.get(id), api.profile.getBusiness()])
      .then(([d, p]) => { setDoc(d); setProfile(p); })
      .catch(() => setError(true));
  }, [id]);

  async function updateStatus(status: string) {
    if (!doc || !id) return;
    try {
      const updated = await api.documents.update(id, { status: status as Document_["status"] });
      setDoc(updated);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar el estado");
    }
  }

  function handlePrint() {
    window.print();
  }

  if (error) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <p className="text-stone-500">Documento no encontrado.</p>
    </div>
  );

  if (!doc || !profile) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const subtotal = Number(doc.subtotal);
  const taxAmount = Number(doc.tax_amount);
  const total = Number(doc.total);
  const taxRate = Number(doc.tax_rate);

  return (
    <>
      <h1 className="sr-only">Documento {doc.doc_number}</h1>
      {/* Screen-only actions bar */}
      <div className="no-print bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-10">
        <button
          onClick={() => nav("/documents")}
          className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm flex items-center gap-1 py-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Documentos
        </button>
        <div className="flex items-center gap-2">
          {/* Quick status change */}
          <select
            value={doc.status}
            onChange={(e) => updateStatus(e.target.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer ${statusColor[doc.status]}`}
          >
            <option value="borrador">Borrador</option>
            <option value="enviado">Enviado</option>
            <option value="pagado">Pagado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <Link
            to={`/documents/${doc.id}/edit`}
            className="text-xs font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl px-4 py-2 transition-colors"
          >
            Editar
          </Link>
          <button
            onClick={handlePrint}
            className="text-xs font-semibold bg-amber-800 text-white hover:bg-amber-900 rounded-xl px-4 py-2 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Descargar PDF
          </button>
        </div>
      </div>

      {/* Document — printed as-is */}
      <div className="bg-stone-100 dark:bg-stone-950 min-h-screen py-8 px-4 no-print-bg">
        <div
          ref={printRef}
          id="printable-doc"
          className="bg-white mx-auto max-w-2xl shadow-md print:shadow-none print:max-w-none print:mx-0"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-8 pb-6 border-b border-stone-100">
            {/* Business info */}
            <div className="flex-1">
              {profile.business_logo && (
                <img
                  src={profile.business_logo}
                  alt={profile.roastery_name}
                  className="h-14 max-w-[160px] object-contain mb-3"
                />
              )}
              <h2 className="text-lg font-bold text-stone-900">{profile.roastery_name}</h2>
              {profile.business_tax_id && (
                <p className="text-xs text-stone-500 mt-0.5">RUT: {profile.business_tax_id}</p>
              )}
              {(profile.business_address || profile.business_city) && (
                <p className="text-xs text-stone-500 mt-0.5">
                  {[profile.business_address, profile.business_city, profile.business_country].filter(Boolean).join(", ")}
                </p>
              )}
              {profile.business_phone && (
                <p className="text-xs text-stone-500 mt-0.5">{profile.business_phone}</p>
              )}
              {profile.business_email && (
                <p className="text-xs text-stone-500 mt-0.5">{profile.business_email}</p>
              )}
              {profile.business_website && (
                <p className="text-xs text-stone-500 mt-0.5">{profile.business_website}</p>
              )}
            </div>

            {/* Doc type + number */}
            <div className="text-right ml-6">
              <p className="text-2xl font-black tracking-tight text-amber-800">{typeLabel[doc.doc_type]}</p>
              <p className="text-base font-bold text-stone-800 mt-0.5">N° {doc.doc_number}</p>
              <div className="mt-3 space-y-0.5">
                <p className="text-xs text-stone-500">
                  <span className="font-medium text-stone-700">Emisión:</span>{" "}
                  {fmtDate(doc.issue_date)}
                </p>
                {doc.due_date && (
                  <p className="text-xs text-stone-500">
                    <span className="font-medium text-stone-700">Vence:</span>{" "}
                    {fmtDate(doc.due_date)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Client */}
          {(doc.client_name || doc.client_email || doc.client_address || doc.client_tax_id) && (
            <div className="px-8 py-5 bg-stone-50 border-b border-stone-100">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Facturar a</p>
              {doc.client_name && <p className="font-semibold text-stone-900">{doc.client_name}</p>}
              {doc.client_tax_id && <p className="text-xs text-stone-500 mt-0.5">RUT: {doc.client_tax_id}</p>}
              {doc.client_address && <p className="text-xs text-stone-500 mt-0.5">{doc.client_address}</p>}
              {doc.client_email && <p className="text-xs text-stone-500 mt-0.5">{doc.client_email}</p>}
            </div>
          )}

          {/* Items table */}
          <div className="px-8 py-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-stone-200">
                    <th className="text-left py-2 text-xs font-bold text-stone-500 uppercase tracking-wider pb-3">Descripción</th>
                    <th className="text-center py-2 text-xs font-bold text-stone-500 uppercase tracking-wider pb-3 w-16">Cant.</th>
                    <th className="text-right py-2 text-xs font-bold text-stone-500 uppercase tracking-wider pb-3 w-28">P. Unit.</th>
                    <th className="text-right py-2 text-xs font-bold text-stone-500 uppercase tracking-wider pb-3 w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.items.map((item, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="py-3 text-stone-800">{item.description}</td>
                      <td className="num py-3 text-center text-stone-600">{item.qty}</td>
                      <td className="num py-3 text-right text-stone-600">{formatMoney(item.unit_price, doc.currency)}</td>
                      <td className="num py-3 text-right font-medium text-stone-800">{formatMoney(item.total, doc.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-5 flex justify-end">
              <div className="w-60 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="num text-stone-700">{formatMoney(subtotal, doc.currency)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Impuesto ({taxRate}%)</span>
                    <span className="num text-stone-700">{formatMoney(taxAmount, doc.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t-2 border-stone-800 mt-2">
                  <span className="text-stone-900">TOTAL</span>
                  <span className="num text-stone-900">{formatMoney(total, doc.currency)}</span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 text-right">{doc.currency}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {doc.notes && (
            <div className="px-8 pb-6">
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Notas</p>
                <p className="text-sm text-stone-600 whitespace-pre-line">{doc.notes}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-4 border-t border-stone-100 flex items-center justify-between">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {statusLabel[doc.status] !== "Borrador" ? "" : ""}
              Generado con Tostapp
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">{profile.roastery_name}</p>
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .no-print-bg { background: white !important; padding: 0 !important; }
          #printable-doc { box-shadow: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </>
  );
}
