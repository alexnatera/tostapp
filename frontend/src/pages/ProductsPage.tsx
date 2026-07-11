import AppLayout from "../components/AppLayout";
import ProductCatalogSection from "../components/ProductCatalogSection";

export default function ProductsPage() {
  return (
    <AppLayout active="inventario">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 lg:py-8">
        <ProductCatalogSection
          variant="page"
          title="Productos"
          subtitle="Catálogo de productos y stock disponible"
        />
      </div>
    </AppLayout>
  );
}
