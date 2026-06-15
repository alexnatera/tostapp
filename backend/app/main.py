from app.core.config import settings
from app.routes import admin, artisan, auth, customers, documents, finance, inventory, products, purchases, roasts, sales, shop, suppliers
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app = FastAPI(title="Tostapp API", version="0.3.0")

# CORS — multi-origin support via comma-separated env var
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiter
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(roasts.router)
app.include_router(artisan.router)
app.include_router(admin.router)
app.include_router(purchases.router)
app.include_router(sales.router)
app.include_router(finance.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(inventory.router)
app.include_router(documents.router)
app.include_router(products.router)
app.include_router(shop.router)


@app.get("/health")
def health():
    return {"status": "ok"}
