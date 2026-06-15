import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type ShopPublic } from "../lib/api";
import ShopLayout from "../components/ShopLayout";

export default function PublicShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<ShopPublic | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) api.public.shop(slug).then(setShop).catch(() => setError(true));
  }, [slug]);

  if (error) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6">
      <p className="text-stone-500 dark:text-stone-400">Esta tostería no existe o no está disponible.</p>
    </div>
  );

  if (!shop) return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return <ShopLayout shop={shop} />;
}
