import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ShopPublic } from "../lib/api";
import ShopLayout from "../components/ShopLayout";
import Spinner from "../components/ui/Spinner";

export default function PublicShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<ShopPublic | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) api.public.shop(slug).then(setShop).catch(() => setError(true));
  }, [slug]);

  if (error) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-stone-500 dark:text-stone-400 mb-3">Esta tostería no existe o no está disponible.</p>
        <Link
          to="/"
          className="text-sm font-semibold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline underline-offset-2 transition-colors"
        >
          Volver al inicio de Tostapp
        </Link>
      </div>
    </div>
  );

  if (!shop) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
      <Spinner label="Cargando" />
    </div>
  );

  return <ShopLayout shop={shop} />;
}
