import { Link } from "react-router-dom";
import { type ShopPublic, type ShopProduct, type ShopTheme } from "../lib/api";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

const DEFAULT_THEME: ShopTheme = {
  primary_color: "#92400e",
  accent_color: "#d97706",
  bg_color: "#fafaf9",
  text_color: "#1c1917",
  font_family: "sans",
  layout: "list",
};

const FONT_CLASS: Record<string, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

export default function ShopLayout({ shop }: { shop: ShopPublic }) {
  const theme: ShopTheme = { ...DEFAULT_THEME, ...(shop.theme ?? {}) };

  const whatsappUrl = shop.whatsapp_number
    ? `https://wa.me/${shop.whatsapp_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hola, me interesa comprar café de ${shop.roastery_name}`)}`
    : null;

  const inStock = shop.products.filter((p) => p.stock_quantity > 0);
  const outOfStock = shop.products.filter((p) => p.stock_quantity <= 0);

  return (
    <div
      className={`min-h-screen ${FONT_CLASS[theme.font_family] ?? "font-sans"}`}
      style={{ backgroundColor: theme.bg_color, color: theme.text_color }}
    >
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">

        {theme.banner_image && (
          <div className="w-full h-40 rounded-2xl overflow-hidden">
            <img src={theme.banner_image} alt="Banner" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="text-center space-y-2">
          {shop.business_logo && (
            <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border border-black/10 mb-4">
              <img src={shop.business_logo} alt={shop.roastery_name} className="w-full h-full object-contain p-2" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{shop.roastery_name}</h1>
          {(shop.business_city || shop.business_country) && (
            <p className="text-sm opacity-60">
              {[shop.business_city, shop.business_country].filter(Boolean).join(", ")}
            </p>
          )}
          {theme.about_text && (
            <p className="text-sm opacity-75 max-w-sm mx-auto leading-relaxed">{theme.about_text}</p>
          )}
          <div className="flex justify-center gap-4 pt-1">
            {shop.business_website && (
              <a
                href={shop.business_website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:underline"
                style={{ color: theme.accent_color }}
              >
                {shop.business_website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {theme.instagram_url && (
              <a
                href={theme.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:underline"
                style={{ color: theme.accent_color }}
              >
                Instagram
              </a>
            )}
          </div>
        </div>

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full font-semibold rounded-2xl py-3.5 transition-opacity hover:opacity-90 text-sm text-white"
            style={{ backgroundColor: theme.primary_color }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Pedir por WhatsApp
          </a>
        )}

        {shop.products.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-black/10">
            <div className="text-4xl mb-3">☕</div>
            <p className="text-sm opacity-60">Esta tostería aún no ha publicado su catálogo.</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">Catálogo</h2>
            {theme.layout === "grid" ? (
              <div className="grid grid-cols-2 gap-3">
                {inStock.map((p) => (
                  <ProductCard key={p.id} product={p} accentColor={theme.accent_color} grid />
                ))}
                {outOfStock.map((p) => (
                  <ProductCard key={p.id} product={p} accentColor={theme.accent_color} grid outOfStock />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {inStock.map((p) => (
                  <ProductCard key={p.id} product={p} accentColor={theme.accent_color} />
                ))}
                {outOfStock.length > 0 && inStock.length > 0 && (
                  <p className="text-xs opacity-40 pt-2 pb-1">Sin stock actualmente:</p>
                )}
                {outOfStock.map((p) => (
                  <ProductCard key={p.id} product={p} accentColor={theme.accent_color} outOfStock />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: theme.primary_color }}>
          <p className="text-white/70 text-sm mb-3">¿Eres tostador de café artesanal?</p>
          <Link
            to="/register"
            className="block w-full bg-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity text-sm"
            style={{ color: theme.primary_color }}
          >
            Crea tu catálogo gratis en Tostapp →
          </Link>
        </div>

        <p className="text-center text-xs opacity-30">Catálogo generado con Tostapp</p>
      </div>
    </div>
  );
}

function ProductCard({
  product: p,
  accentColor,
  grid = false,
  outOfStock = false,
}: {
  product: ShopProduct;
  accentColor: string;
  grid?: boolean;
  outOfStock?: boolean;
}) {
  return (
    <div
      className={`bg-white/80 rounded-2xl border border-black/10 ${
        grid ? "p-3" : "p-4 flex gap-3"
      } ${outOfStock ? "opacity-50" : ""}`}
    >
      {!grid && (
        <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-lg shrink-0">
          ☕
        </div>
      )}
      {grid && <div className="text-3xl mb-2 text-center">☕</div>}
      <div className={grid ? "text-center" : "flex-1 min-w-0"}>
        <p className={`font-medium text-sm ${grid ? "mb-1" : ""}`}>{p.name}</p>
        {p.description && !grid && (
          <p className="text-xs opacity-60 mt-0.5 line-clamp-2">{p.description}</p>
        )}
        <div className={`flex items-center gap-3 mt-1.5 ${grid ? "justify-center" : ""}`}>
          <span className="text-sm font-semibold" style={{ color: accentColor }}>
            {fmt(p.price)} / {p.unit}
          </span>
          <span className={`text-xs font-medium ${outOfStock ? "text-red-500" : "text-emerald-600"}`}>
            {outOfStock ? "Sin stock" : "Disponible"}
          </span>
        </div>
      </div>
    </div>
  );
}
