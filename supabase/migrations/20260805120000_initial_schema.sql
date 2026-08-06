-- ============================================================
-- Tostapp — Supabase schema (migración desde FastAPI/Postgres)
-- Applied to project hasgkfuueizmgyapxhwr (org: aramos) on 2026-08-05.
-- ============================================================

create extension if not exists "pgcrypto";

-- ================= profiles =================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  roastery_name text not null,
  is_beta boolean not null default true,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  plan_tier text not null default 'beta' check (plan_tier in ('beta','pro','enterprise')),
  subscription_expires_at timestamptz,
  last_active_at timestamptz,
  business_address text,
  business_phone text,
  business_email text,
  business_tax_id text,
  business_logo text,
  business_website text,
  business_city text,
  business_country text,
  roastery_slug text unique,
  whatsapp_number text,
  shop_theme jsonb,
  created_at timestamptz not null default now(),
  constraint roastery_slug_format check (roastery_slug is null or roastery_slug ~ '^[a-z0-9-]+$')
);

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_slug text; final_slug text; attempt int := 0;
begin
  base_slug := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'roastery_name', 'tostadora'), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'tostadora'; end if;
  loop
    final_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    exit when not exists (select 1 from public.profiles where roastery_slug = final_slug);
    attempt := attempt + 1;
    exit when attempt > 5;
  end loop;
  insert into public.profiles (id, email, roastery_name, roastery_slug)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'roastery_name', 'Mi Tostadora'), final_slug);
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================= suppliers =================
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text, phone text, whatsapp text, website text,
  address text, city text, contact_person text, notes text,
  created_at timestamptz not null default now()
);
create index idx_suppliers_user on public.suppliers(user_id);
alter table public.suppliers enable row level security;
create policy "suppliers_all_own" on public.suppliers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= customers =================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text, phone text, whatsapp text, instagram text, facebook text, website text,
  address text, city text, tax_id text,
  type text default 'B2B' check (type in ('B2B','D2C')),
  notes text,
  created_at timestamptz not null default now()
);
create index idx_customers_user on public.customers(user_id);
alter table public.customers enable row level security;
create policy "customers_all_own" on public.customers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= roasts =================
create table public.roasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null,
  bean_origin text not null,
  farm text, variety text, process text,
  roast_date date not null,
  roast_level text not null check (roast_level in ('light','medium','dark')),
  roast_time_minutes numeric,
  charge_temp integer, drop_temp integer,
  green_weight_g integer, roasted_weight_g integer,
  batch_number integer not null default 1,
  tasting_notes text, roaster_notes text,
  profile_data jsonb,
  created_at timestamptz not null default now()
);
create index idx_roasts_user on public.roasts(user_id);
create index idx_roasts_user_date on public.roasts(user_id, roast_date);
alter table public.roasts enable row level security;
create policy "roasts_select_own" on public.roasts for select using (auth.uid() = user_id);
create policy "roasts_insert_own" on public.roasts for insert with check (auth.uid() = user_id);
create policy "roasts_update_own" on public.roasts for update using (auth.uid() = user_id);
create policy "roasts_delete_own" on public.roasts for delete using (auth.uid() = user_id);

create or replace function public.roasts_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text; cnt int; candidate text; attempt int := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || new.roast_date::text, 0));
  if new.batch_number is null or new.batch_number <= 1 then
    select count(*) into cnt from public.roasts where user_id = new.user_id and roast_date = new.roast_date;
    new.batch_number := cnt + 1;
  end if;
  if new.slug is null or new.slug = '' then
    base := lower(regexp_replace(coalesce(new.bean_origin, 'roast'), '[^a-zA-Z0-9]+', '-', 'g'));
    base := trim(both '-' from base);
    if base = '' then base := 'roast'; end if;
    loop
      candidate := base || '-' || to_char(new.roast_date, 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit when not exists (select 1 from public.roasts where slug = candidate);
      attempt := attempt + 1;
      exit when attempt > 5;
    end loop;
    new.slug := candidate;
  end if;
  return new;
end; $$;

create trigger trg_roasts_before_insert before insert on public.roasts
  for each row execute function public.roasts_before_insert();

create or replace function public.get_roast_by_slug(p_slug text)
returns table (
  slug text, bean_origin text, farm text, variety text, process text,
  roast_date date, roast_level text, tasting_notes text, roaster_notes text,
  batch_number int, roastery_name text, roastery_slug text
)
language sql stable security definer set search_path = public as $$
  select r.slug, r.bean_origin, r.farm, r.variety, r.process, r.roast_date, r.roast_level,
         r.tasting_notes, r.roaster_notes, r.batch_number, p.roastery_name, p.roastery_slug
  from public.roasts r join public.profiles p on p.id = r.user_id
  where r.slug = p_slug;
$$;

-- ================= purchases =================
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier text,
  bean_origin text,
  kg_purchased numeric not null,
  price_per_kg numeric not null,
  purchase_date date not null,
  notes text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_purchases_user on public.purchases(user_id);
alter table public.purchases enable row level security;
create policy "purchases_all_own" on public.purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= sales =================
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer text,
  kg_sold numeric not null,
  price_per_kg numeric not null,
  sale_date date not null,
  notes text,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_sales_user on public.sales(user_id);
alter table public.sales enable row level security;
create policy "sales_all_own" on public.sales for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= products =================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  sku text,
  unit text not null default 'unidad',
  price numeric(12,2) not null default 0,
  stock_quantity numeric(12,3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_user on public.products(user_id);
alter table public.products enable row level security;
create policy "products_all_own" on public.products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= documents =================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('presupuesto','boleta','factura')),
  doc_number text not null,
  status text not null default 'borrador' check (status in ('borrador','enviado','pagado','cancelado')),
  client_name text, client_email text, client_address text, client_tax_id text,
  issue_date date not null,
  due_date date,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'CLP',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_documents_user on public.documents(user_id);
alter table public.documents enable row level security;
create policy "documents_all_own" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.next_document_number(p_doc_type text, p_year int)
returns text language plpgsql security definer set search_path = public as $$
declare
  prefix text; cnt int;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_doc_type || p_year::text, 1));
  prefix := case p_doc_type when 'presupuesto' then 'PRE' when 'boleta' then 'BOL' when 'factura' then 'FAC' else 'DOC' end;
  select count(*) into cnt from public.documents
    where user_id = auth.uid() and doc_type = p_doc_type and extract(year from issue_date) = p_year;
  return prefix || '-' || p_year::text || '-' || lpad((cnt + 1)::text, 3, '0');
end; $$;

-- ================= public shop =================
create or replace function public.get_shop_by_slug(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when p.id is null then null else
    jsonb_build_object(
      'roastery_name', p.roastery_name,
      'roastery_slug', p.roastery_slug,
      'business_city', p.business_city,
      'business_country', p.business_country,
      'business_logo', p.business_logo,
      'business_website', p.business_website,
      'whatsapp_number', p.whatsapp_number,
      'theme', coalesce(p.shop_theme, '{}'::jsonb),
      'products', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pr.id, 'name', pr.name, 'description', pr.description,
          'unit', pr.unit, 'price', pr.price, 'stock_quantity', pr.stock_quantity
        ) order by pr.name)
        from public.products pr where pr.user_id = p.id
      ), '[]'::jsonb)
    )
  end
  from public.profiles p
  where p.roastery_slug = p_slug and p.is_active = true;
$$;

-- ================= admin RPCs =================
create or replace function public._require_admin()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
end; $$;

create or replace function public.admin_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_roasts', (select count(*) from public.roasts),
    'verified_users', (select count(*) from auth.users u join public.profiles p on p.id = u.id where u.email_confirmed_at is not null),
    'beta_users', (select count(*) from public.profiles where plan_tier = 'beta')
  );
end; $$;

create or replace function public.admin_list_users()
returns table (
  id uuid, email text, roastery_name text, is_beta boolean, is_admin boolean, is_active boolean,
  plan_tier text, email_verified boolean, roast_count bigint, created_at timestamptz,
  last_active_at timestamptz, subscription_expires_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  return query
    select p.id, p.email, p.roastery_name, p.is_beta, p.is_admin, p.is_active, p.plan_tier,
           (u.email_confirmed_at is not null) as email_verified,
           (select count(*) from public.roasts r where r.user_id = p.id) as roast_count,
           p.created_at, p.last_active_at, p.subscription_expires_at
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end; $$;

create or replace function public.admin_toggle_user(p_user_id uuid)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare result public.profiles;
begin
  perform public._require_admin();
  if p_user_id = auth.uid() then
    raise exception 'No puedes suspender tu propia cuenta';
  end if;
  update public.profiles set is_active = not is_active where id = p_user_id returning * into result;
  return result;
end; $$;

create or replace function public.admin_set_plan(p_user_id uuid, p_plan_tier text, p_expires timestamptz)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare result public.profiles;
begin
  perform public._require_admin();
  if p_plan_tier not in ('beta','pro','enterprise') then
    raise exception 'plan_tier invalido';
  end if;
  update public.profiles set plan_tier = p_plan_tier, subscription_expires_at = p_expires where id = p_user_id returning * into result;
  return result;
end; $$;

-- ================= grants (see 20260805_tighten_function_grants.sql) =================
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.roasts_before_insert() from public, anon, authenticated;
revoke all on function public._require_admin() from public, anon, authenticated;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_toggle_user(uuid) from public, anon;
revoke all on function public.admin_set_plan(uuid, text, timestamptz) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_toggle_user(uuid) to authenticated;
grant execute on function public.admin_set_plan(uuid, text, timestamptz) to authenticated;

revoke all on function public.next_document_number(text, int) from public, anon;
grant execute on function public.next_document_number(text, int) to authenticated;

revoke all on function public.get_roast_by_slug(text) from public;
revoke all on function public.get_shop_by_slug(text) from public;
grant execute on function public.get_roast_by_slug(text) to anon, authenticated;
grant execute on function public.get_shop_by_slug(text) to anon, authenticated;
