import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Customer, type DocumentCreate, type Product } from "../lib/api";
import Combobox from "../components/ui/Combobox";
import Modal from "../components/ui/Modal";
import Field from "../components/ui/Field";
import IconButton from "../components/ui/IconButton";
import { ClipboardList, Receipt, FileText, AlertTriangle, X, ArrowLeft } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface DocItem {
  product_id?: string;
  description: string;
  qty: number;
  unit_price: number;
  total: number;
  unit?: string;
  stock_available?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { id: "presupuesto", label: "Presupuesto", icon: ClipboardList },
  { id: "boleta", label: "Boleta", icon: Receipt },
  { id: "factura", label: "Factura", icon: FileText },
];
const CURRENCIES = ["CLP", "USD", "EUR", "ARS", "MXN", "COP", "PEN"];
const STATUS_OPTIONS = [
  { id: "borrador", label: "Borrador" },
  { id: "enviado", label: "Enviado" },
  { id: "pagado", label: "Pagado" },
  { id: "cancelado", label: "Cancelado" },
];
const UNITS = ["unidad", "kg", "g", "lb", "bolsa", "caja", "paquete", "servicio"];

const inputCls =
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

// ── Helper ─────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split("T")[0]; }

function calcTotals(items: DocItem[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

// ── New Client Modal ──────────────────────────────────────────────────────────

function NewClientModal({ onSave, onClose }: { onSave: (c: Customer) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const c = await api.customers.create({ name, email: email || undefined, phone: phone || undefined, type: "B2B" });
      onSave(c);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nombre" required>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Café Amanecer" />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="cliente@empresa.com" />
        </Field>
        <Field label="Teléfono">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+56 9 1234 5678" />
        </Field>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex-1 bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50">
            {saving ? "..." : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── New Product Modal ─────────────────────────────────────────────────────────

function NewProductModal({ onSave, onClose }: { onSave: (p: Product) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [sku, setSku] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const p = await api.products.create({
        name,
        price: Number(price) || 0,
        stock_quantity: Number(stock) || 0,
        unit,
        sku: sku || undefined,
      });
      onSave(p);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo producto" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nombre" required>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Café Ethiopia 250g" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio unit.">
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="0" />
          </Field>
          <Field label="Stock actual">
            <input type="number" min="0" step="0.001" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} placeholder="0" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidad">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="SKU">
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} placeholder="ETH-250" />
          </Field>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex-1 bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50">
            {saving ? "..." : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export default function DocumentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id) && id !== "new";
  const nav = useNavigate();

  // Catalog data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Doc meta
  const [docType, setDocType] = useState("presupuesto");
  const [docNumber, setDocNumber] = useState("");
  const [status, setStatus] = useState("borrador");
  const [currency, setCurrency] = useState("CLP");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState("");

  // Client
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");

  // Items
  const [items, setItems] = useState<DocItem[]>([{ description: "", qty: 1, unit_price: 0, total: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingNumber, setLoadingNumber] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState<number | null>(null); // item index
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Load catalog
  useEffect(() => {
    Promise.all([
      api.customers.list(),
      api.products.list(),
    ]).then(([c, p]) => {
      setCustomers(c.items);
      setProducts(p.items);
    });
  }, []);

  // Load existing doc for edit
  useEffect(() => {
    if (!isEdit || !id) return;
    api.documents.get(id).then((doc) => {
      setDocType(doc.doc_type);
      setDocNumber(doc.doc_number);
      setStatus(doc.status);
      setCurrency(doc.currency);
      setIssueDate(doc.issue_date);
      setDueDate(doc.due_date ?? "");
      setClientName(doc.client_name ?? "");
      setClientEmail(doc.client_email ?? "");
      setClientAddress(doc.client_address ?? "");
      setClientTaxId(doc.client_tax_id ?? "");
      const loadedItems = doc.items.length
        ? doc.items.map((i) => ({
            product_id: (i as DocItem).product_id,
            description: i.description,
            qty: Number(i.qty),
            unit_price: Number(i.unit_price),
            total: Number(i.total),
            unit: (i as DocItem).unit,
            stock_available: (i as DocItem).stock_available,
          }))
        : [{ description: "", qty: 1, unit_price: 0, total: 0 }];
      setItems(loadedItems);
      setTaxRate(Number(doc.tax_rate));
      setNotes(doc.notes ?? "");
    });
  }, [id, isEdit]);

  // Auto-fetch next number (new doc only)
  useEffect(() => {
    if (isEdit) return;
    setLoadingNumber(true);
    api.documents.nextNumber(docType)
      .then((res) => setDocNumber(res.doc_number))
      .finally(() => setLoadingNumber(false));
  }, [docType, isEdit]);

  function selectClient(c: Customer | null) {
    setSelectedClient(c);
    if (c) {
      setClientName(c.name);
      setClientEmail(c.email ?? "");
      setClientAddress("");
      setClientTaxId("");
    } else {
      setClientName("");
      setClientEmail("");
    }
  }

  function selectProduct(index: number, product: Product | null) {
    setItems((prev) => {
      const next = [...prev];
      if (product) {
        next[index] = {
          ...next[index],
          product_id: product.id,
          description: product.name,
          unit_price: Number(product.price),
          unit: product.unit,
          stock_available: Number(product.stock_quantity),
          total: next[index].qty * Number(product.price),
        };
      } else {
        next[index] = { ...next[index], product_id: undefined, description: "", stock_available: undefined };
      }
      return next;
    });
  }

  function updateItemQty(index: number, qty: number) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], qty, total: qty * next[index].unit_price };
      return next;
    });
  }

  function updateItemPrice(index: number, price: number) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], unit_price: price, total: next[index].qty * price };
      return next;
    });
  }

  function updateItemDescription(index: number, desc: string) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], description: desc, product_id: undefined };
      return next;
    });
  }

  function addItem() {
    setItems((p) => [...p, { description: "", qty: 1, unit_price: 0, total: 0 }]);
  }

  function removeItem(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i));
  }

  const { subtotal, taxAmount, total } = calcTotals(items, taxRate);

  function fmt(n: number) {
    if (currency === "CLP") return `$${Math.round(n).toLocaleString("es-CL")}`;
    return new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(n);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload: DocumentCreate = {
      doc_type: docType as DocumentCreate["doc_type"],
      doc_number: docNumber,
      status: status as DocumentCreate["status"],
      currency,
      issue_date: issueDate,
      due_date: dueDate || undefined,
      client_name: clientName || undefined,
      client_email: clientEmail || undefined,
      client_address: clientAddress || undefined,
      client_tax_id: clientTaxId || undefined,
      items: items.filter((i) => i.description.trim()),
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      notes: notes || undefined,
    };
    try {
      const doc = isEdit && id
        ? await api.documents.update(id, payload)
        : await api.documents.create(payload);
      nav(`/documents/${doc.id}`);
    } catch (err) {
      setError((err as Error).message);
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {showNewClient && (
        <NewClientModal
          onSave={(c) => { setCustomers((prev) => [c, ...prev]); selectClient(c); setShowNewClient(false); }}
          onClose={() => setShowNewClient(false)}
        />
      )}
      {showNewProduct !== null && (
        <NewProductModal
          onSave={(p) => {
            setProducts((prev) => [...prev, p]);
            selectProduct(showNewProduct, p);
            setShowNewProduct(null);
          }}
          onClose={() => setShowNewProduct(null)}
        />
      )}

      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
          <button
            onClick={() => nav(-1)}
            className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm mb-5 flex items-center gap-1 py-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver
          </button>

          <header className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {isEdit ? "Editar documento" : "Nuevo documento"}
            </h1>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type + meta */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
              <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Tipo</h2>
              <div className="grid grid-cols-3 gap-2">
                {DOC_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDocType(t.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                      docType === t.id
                        ? "border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-300"
                        : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600"
                    }`}
                  >
                    <t.icon className="w-5 h-5" aria-hidden="true" />
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Número">
                  <input
                    type="text"
                    value={loadingNumber ? "..." : docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className={inputCls}
                    required
                  />
                </Field>
                <Field label="Estado">
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                    {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Moneda">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Emisión">
                  <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required className={inputCls} />
                </Field>
                <Field label="Vence">
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>

            {/* Client */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-3">
              <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Cliente</h2>
              <Combobox
                items={customers}
                value={selectedClient}
                onSelect={selectClient}
                onCreateNew={() => setShowNewClient(true)}
                getLabel={(c) => c.name}
                getSubLabel={(c) => c.email ?? (c.type === "B2B" ? "Empresa" : "Particular")}
                placeholder="Buscar cliente en CRM..."
                createLabel="Crear nuevo cliente"
              />
              {/* Editable client fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Field label="Nombre / Empresa">
                    <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} placeholder="Nombre del cliente" />
                  </Field>
                </div>
                <Field label="Email">
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputCls} placeholder="cliente@empresa.com" />
                </Field>
                <Field label="RUT / ID fiscal">
                  <input type="text" value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} className={inputCls} placeholder="76.123.456-7" />
                </Field>
                <div className="col-span-2">
                  <Field label="Dirección">
                    <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={inputCls} placeholder="Av. Principal 123, Santiago" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
              <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">Productos / Servicios</h2>

              <div className="space-y-4">
                {items.map((item, i) => {
                  const overStock = item.stock_available !== undefined && item.qty > item.stock_available;
                  const linkedProduct = item.product_id ? products.find((p) => p.id === item.product_id) ?? null : null;

                  return (
                    <div key={i} className={`rounded-xl border p-3 space-y-2 transition-colors ${overStock ? "border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/10" : "border-stone-100 dark:border-stone-800"}`}>
                      {/* Product selector */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Combobox
                            items={products}
                            value={linkedProduct}
                            onSelect={(p) => selectProduct(i, p)}
                            onCreateNew={() => setShowNewProduct(i)}
                            getLabel={(p) => p.name}
                            getSubLabel={(p) => `Stock: ${p.stock_quantity} ${p.unit} · ${p.price > 0 ? fmt(p.price) : "sin precio"}`}
                            placeholder="Buscar producto o escribir descripción..."
                            createLabel="Crear nuevo producto"
                          />
                        </div>
                        {items.length > 1 && (
                          <IconButton
                            aria-label="Eliminar ítem"
                            variant="danger"
                            onClick={() => removeItem(i)}
                            className="shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </IconButton>
                        )}
                      </div>

                      {/* Description override if no product selected */}
                      {!linkedProduct && (
                        <input
                          type="text"
                          placeholder="Descripción del ítem"
                          value={item.description}
                          onChange={(e) => updateItemDescription(i, e.target.value)}
                          className={inputCls}
                        />
                      )}

                      {/* Qty + price + total */}
                      <div className="grid grid-cols-[minmax(64px,20%)_1fr_minmax(72px,22%)_1fr] gap-2 items-end">
                        <Field label="Cantidad">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.qty || ""}
                            onChange={(e) => updateItemQty(i, Number(e.target.value))}
                            className={`${inputCls} text-center px-2 ${overStock ? "border-amber-400 dark:border-amber-500 focus:ring-amber-400" : ""}`}
                          />
                        </Field>
                        <div>
                          {item.stock_available !== undefined && (
                            <div className={`text-xs mb-1 flex items-center gap-1 ${overStock ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-stone-500 dark:text-stone-400"}`}>
                              {overStock && <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />}
                              {overStock ? `Stock mínimo: ${item.stock_available} ${item.unit ?? ""}` : `Stock: ${item.stock_available} ${item.unit ?? ""}`}
                            </div>
                          )}
                          {!item.stock_available && <div className="mb-1 h-4" />}
                        </div>
                        <Field label="P. Unit.">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price || ""}
                            onChange={(e) => updateItemPrice(i, Number(e.target.value))}
                            className={`${inputCls} text-right px-2`}
                          />
                        </Field>
                        <div className="text-right">
                          <span className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Total</span>
                          <p className="num py-2.5 text-sm font-semibold text-stone-800 dark:text-stone-200">{fmt(item.total)}</p>
                        </div>
                      </div>

                      {overStock && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          La cantidad supera el stock disponible ({item.stock_available} {item.unit ?? "unidades"}). Puedes continuar, pero revisa tu inventario.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="mt-3 text-xs font-medium text-amber-800 dark:text-amber-400 hover:underline"
              >
                + Agregar ítem
              </button>

              {/* Totals */}
              <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-500 dark:text-stone-400">Subtotal</span>
                  <span className="num text-sm font-medium text-stone-800 dark:text-stone-200">{fmt(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-500 dark:text-stone-400">Impuesto</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" max="100" step="0.5"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        aria-label="Porcentaje de impuesto"
                        className="w-16 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-base text-center focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
                      />
                      <span className="text-sm text-stone-500 dark:text-stone-400">%</span>
                    </div>
                  </div>
                  <span className="num text-sm font-medium text-stone-800 dark:text-stone-200">{fmt(taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
                  <span className="font-bold text-stone-900 dark:text-stone-100">Total</span>
                  <span className="num font-bold text-lg text-stone-900 dark:text-stone-100">{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
              <h2 id="notes-heading" className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
                Notas / Condiciones de pago
              </h2>
              <textarea
                aria-labelledby="notes-heading"
                rows={3}
                placeholder="Ej: Transferencia a Banco Estado Cta. 123456. Validez: 15 días."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>

            {error && (
              <p
                ref={errorRef}
                className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 rounded-xl"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-amber-800 dark:bg-amber-600 text-white rounded-xl py-3 font-semibold hover:bg-amber-900 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 text-sm"
            >
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear documento"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
