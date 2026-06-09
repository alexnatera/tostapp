import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Customer, type DocumentCreate, type Product } from "../lib/api";

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
  { id: "presupuesto", label: "Presupuesto", icon: "📋" },
  { id: "boleta", label: "Boleta", icon: "🧾" },
  { id: "factura", label: "Factura", icon: "📄" },
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
  "w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent transition-all";

// ── Helper ─────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split("T")[0]; }

function calcTotals(items: DocItem[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

// ── Combobox ─────────────────────────────────────────────────────────────────

function Combobox<T>({
  items,
  value,
  onSelect,
  onCreateNew,
  getLabel,
  getSubLabel,
  placeholder,
  createLabel,
}: {
  items: T[];
  value: T | null;
  onSelect: (item: T) => void;
  onCreateNew: () => void;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string;
  placeholder: string;
  createLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = items.filter((i) =>
    getLabel(i).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center gap-2 w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        {value && !open ? (
          <>
            <span className="text-sm text-stone-900 dark:text-stone-100 flex-1 truncate">{getLabel(value)}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(null as unknown as T); setQuery(""); }}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-xs"
            >
              ×
            </button>
          </>
        ) : (
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
          />
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-xs text-stone-400 dark:text-stone-500">Sin resultados</p>
          )}
          {filtered.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => { onSelect(item); setQuery(""); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{getLabel(item)}</p>
              {getSubLabel && <p className="text-xs text-stone-400 dark:text-stone-500">{getSubLabel(item)}</p>}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={() => { setOpen(false); onCreateNew(); }}
            className="w-full text-left px-4 py-2.5 border-t border-stone-100 dark:border-stone-800 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            + {createLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Mini modal ────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-lg leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
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
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Nombre *</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Café Amanecer" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="cliente@empresa.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Teléfono</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+56 9 1234 5678" />
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
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Nombre *</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Café Ethiopia 250g" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Precio unit.</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Stock actual</label>
            <input type="number" min="0" step="0.001" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} placeholder="0" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Unidad</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">SKU</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} placeholder="ETH-250" />
          </div>
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
            className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm mb-5 flex items-center gap-1 transition-colors"
          >
            ← Volver
          </button>

          <header className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {isEdit ? "Editar documento" : "Nuevo documento"}
            </h1>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type + meta */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Tipo</p>
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
                    <span className="text-xl">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Número</label>
                  <input
                    type="text"
                    value={loadingNumber ? "..." : docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Estado</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                    {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Moneda</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Emisión</label>
                  <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Vence</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Client */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-3">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Cliente</p>
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
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Nombre / Empresa</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} placeholder="Nombre del cliente" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Email</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputCls} placeholder="cliente@empresa.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">RUT / ID fiscal</label>
                  <input type="text" value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} className={inputCls} placeholder="76.123.456-7" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Dirección</label>
                  <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={inputCls} placeholder="Av. Principal 123, Santiago" />
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">Productos / Servicios</p>

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
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                          >
                            ×
                          </button>
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
                      <div className="grid grid-cols-[80px_1fr_90px_1fr] gap-2 items-end">
                        <div>
                          <label className="block text-xs text-stone-400 dark:text-stone-500 mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.qty || ""}
                            onChange={(e) => updateItemQty(i, Number(e.target.value))}
                            className={`${inputCls} text-center px-2 ${overStock ? "border-amber-400 dark:border-amber-500 focus:ring-amber-400" : ""}`}
                          />
                        </div>
                        <div>
                          {item.stock_available !== undefined && (
                            <div className={`text-xs mb-1 ${overStock ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-stone-400 dark:text-stone-500"}`}>
                              {overStock ? `⚠ Stock mínimo: ${item.stock_available} ${item.unit ?? ""}` : `Stock: ${item.stock_available} ${item.unit ?? ""}`}
                            </div>
                          )}
                          {!item.stock_available && <div className="mb-1 h-4" />}
                        </div>
                        <div>
                          <label className="block text-xs text-stone-400 dark:text-stone-500 mb-1">P. Unit.</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price || ""}
                            onChange={(e) => updateItemPrice(i, Number(e.target.value))}
                            className={`${inputCls} text-right px-2`}
                          />
                        </div>
                        <div className="text-right">
                          <label className="block text-xs text-stone-400 dark:text-stone-500 mb-1">Total</label>
                          <p className="py-2.5 text-sm font-semibold text-stone-800 dark:text-stone-200">{fmt(item.total)}</p>
                        </div>
                      </div>

                      {overStock && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-3 py-1.5">
                          ⚠ La cantidad supera el stock disponible ({item.stock_available} {item.unit ?? "unidades"}). Puedes continuar, pero revisa tu inventario.
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
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{fmt(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-500 dark:text-stone-400">Impuesto</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" max="100" step="0.5"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="w-16 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
                      />
                      <span className="text-sm text-stone-400">%</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{fmt(taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
                  <span className="font-bold text-stone-900 dark:text-stone-100">Total</span>
                  <span className="font-bold text-lg text-stone-900 dark:text-stone-100">{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
                Notas / Condiciones de pago
              </label>
              <textarea
                rows={3}
                placeholder="Ej: Transferencia a Banco Estado Cta. 123456. Validez: 15 días."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputCls} resize-none`}
              />
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
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear documento"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
