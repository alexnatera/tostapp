# Migración a Supabase + GitHub Pages

Este PR migra tostapp de una arquitectura FastAPI + Postgres propio (VPS/Docker) a una
arquitectura 100% estática: frontend React servido desde GitHub Pages, backend reemplazado
por Supabase (Postgres + Auth + RLS + Edge Functions).

**No toca `main` ni el despliegue VPS/Docker actual.** Todo vive en la rama `supabase-pages`.

## Qué cambió

- `frontend/src/lib/supabase.ts` — cliente de Supabase.
- `frontend/src/lib/auth.ts` — store de auth reescrito sobre `supabase.auth`.
- `frontend/src/lib/api.ts` — mismo `api.*` público, pero implementado con queries a Supabase
  (tablas + RPCs) en vez de `fetch` a un backend FastAPI. Dashboards de finanzas/inventario
  ahora se calculan en el cliente.
- `frontend/src/lib/qr.ts` — generación de QR en el cliente (antes lo hacía el backend).
- `frontend/src/lib/alogParser.ts` — parser de archivos `.alog` de Artisan portado a TypeScript
  (antes vivía en `backend/app/routes/artisan.py`).
- 4 páginas con parches puntuales: `DashboardPage`, `RoastDetailPage`, `AdminPage`,
  `ResetPasswordPage`.
- `vite.config.ts`, `main.tsx`, `index.html` — configurados para servirse desde un subpath
  (`/tostapp/`) como requiere un GitHub Pages "project site".
- `.github/workflows/deploy-pages.yml` — build y deploy automático a GitHub Pages en cada push
  a esta rama.
- `supabase/functions/admin-impersonate/` — Edge Function para que un admin genere un magic
  link de acceso a la cuenta de otro usuario (reemplaza el endpoint `/admin/impersonate`).
- `supabase/migrations/20260805120000_initial_schema.sql` — esquema completo aplicado al
  proyecto Supabase (tablas, RLS, triggers, RPCs, grants).

## Proyecto Supabase

- Project ref: `hasgkfuueizmgyapxhwr`
- URL y anon key ya están en `frontend/.env.example` (la anon key es segura de commitear,
  el acceso real lo controla RLS).

## Pasos manuales pendientes (una sola vez)

1. **Habilitar GitHub Pages**: Settings → Pages → Source = "GitHub Actions" (en el repo).
2. **Auth settings en Supabase**: Authentication → Providers → Email → desactivar
   "Confirm email" si querés mantener el login instantáneo post-registro que tenía la app
   original (si no, los usuarios nuevos deberán confirmar por correo antes de entrar).
3. **Primer admin**: correr en el SQL Editor de Supabase:
   ```sql
   update public.profiles set is_admin = true where email = 'tu-email@ejemplo.com';
   ```
4. **Site URL / Redirect URLs** (Authentication → URL Configuration): agregar
   `https://alexnatera.github.io/tostapp/` como Site URL y como Redirect URL (necesario para
   el flujo de reset de password).

## Qué NO se migró / limitaciones conocidas

- Envío de emails transaccionales (confirmación, reset password) ahora depende 100% del
  proveedor de email de Supabase (por defecto limitado; para producción real conviene
  configurar un proveedor SMTP propio en Supabase Auth settings).
- No hay generación de PDF en el cliente todavía (los documentos —presupuestos/boletas/
  facturas— se guardan y muestran en pantalla, pero no hay export a PDF; el backend original
  tampoco lo tenía como endpoint separado, así que no es una regresión).
