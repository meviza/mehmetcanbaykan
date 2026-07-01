-- =====================================================
-- Multi-Tenant Mimarlık SaaS — Veritabanı Şeması
-- Mehmet Can Baykan Mimar Platform
--
-- Mimari:
--   - tenants (ofisler): her mimarlık/mühendislik ofisi
--   - users (auth.users üzerinden genişletme)
--   - memberships (user ↔ tenant ilişkisi + rol)
--   - projects, services, messages, customers, reports
--   - Her tablo tenant_id içerir; RLS ile izolasyon
--
-- Roller (app_role enum):
--   super_admin     — platform sahibi (sen), tüm tenant'ları yönetir
--   tenant_owner    — ofis sahibi (Mehmet Can Baykan)
--   tenant_staff    — ofis çalışanı (mimar, editör)
--   customer        — müşteri (kendi projelerini görür)
--
-- Tüm migration'lar idempotent (IF NOT EXISTS).
-- =====================================================

-- ============ EXTENSIONS ============
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_tap" with schema extensions; -- test'ler için (opsiyonel)

-- ============ ENUMS ============
do $$ begin
  create type app_role as enum ('super_admin', 'tenant_owner', 'tenant_staff', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tenant_status as enum ('active', 'suspended', 'pending', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('inquiry', 'proposal', 'contracted', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('new', 'read', 'replied', 'archived', 'spam');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('todo', 'in_progress', 'blocked', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============ TENANTS ============
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  name text not null,
  legal_name text,
  tagline text,
  description text,
  logo_url text,
  favicon_url text,
  og_image_url text,
  -- Tema (JSONB — tema system tek kaynaktan yönetilir)
  theme jsonb not null default '{
    "colors": {
      "primary": "#c9a45a",
      "primary2": "#b08a3f",
      "accent": "#0a0a0b",
      "bg": "#0a0a0b",
      "bgSoft": "#111114",
      "ink": "#f4f1ea",
      "ink2": "#d9d3c4",
      "ink3": "#a39c8a",
      "line": "rgba(244,241,234,0.08)"
    },
    "fonts": {
      "serif": "Cormorant Garamond",
      "sans": "Inter"
    },
    "radius": { "sm": "8px", "md": "14px", "lg": "22px" }
  }'::jsonb,
  -- İletişim
  contact jsonb not null default '{}'::jsonb, -- { phone, email, address, lat, lng, instagram, ... }
  -- SEO
  seo jsonb not null default '{}'::jsonb, -- { title, description, keywords, ogImage, ... }
  -- Hizmet bölgesi
  service_areas text[] default '{}',
  -- Durum
  status tenant_status not null default 'pending',
  -- Plan / limit
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists idx_tenants_slug on public.tenants(slug);
create index if not exists idx_tenants_status on public.tenants(status);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- ============ PROFILES (auth.users genişletme) ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  -- Birincil tenant (super_admin için null)
  default_tenant_id uuid references public.tenants(id) on delete set null,
  -- UI tercihleri
  preferences jsonb not null default '{"locale":"tr","theme":"dark"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamztz not null default now()
);
create index if not exists idx_profiles_default_tenant on public.profiles(default_tenant_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Yeni user oluşunca otomatik profile
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ MEMBERSHIPS (user ↔ tenant + role) ============
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  -- Davet/aktifleştirme
  invited_by uuid references auth.users(id),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Bir user bir tenant'ta sadece 1 aktif üyelik
  unique (tenant_id, user_id, is_active) deferrable initially deferred
);
create index if not exists idx_memberships_tenant on public.memberships(tenant_id) where is_active;
create index if not exists idx_memberships_user on public.memberships(user_id) where is_active;
create index if not exists idx_memberships_role on public.memberships(tenant_id, role) where is_active;

drop trigger if exists trg_memberships_updated_at on public.memberships;
create trigger trg_memberships_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- ============ PROJECTS ============
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- Temel
  slug text not null,
  title text not null,
  category text not null check (category in ('restorasyon','ic-tasarim','vaziyet','kat-plani','peyzaj','tas-ahsap','diger')),
  category_label text,
  -- Meta
  year int,
  location text,
  area text,             -- m²
  duration text,         -- ay / hafta
  client_name text,
  -- İçerik
  summary text,
  cover_image text,      -- URL
  images text[] default '{}',
  tags text[] default '{}',
  content jsonb default '{}'::jsonb, -- blog benzeri structured content
  -- Müşteri ilişkisi (opsiyonel)
  customer_id uuid,
  -- Durum
  status project_status not null default 'inquiry',
  is_published boolean not null default false,
  is_featured boolean not null default false,
  -- Sıralama
  display_order int not null default 0,
  -- Audit
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  -- Slug benzersiz tenant içinde
  unique (tenant_id, slug)
);
create index if not exists idx_projects_tenant on public.projects(tenant_id);
create index if not exists idx_projects_tenant_published on public.projects(tenant_id, is_published, display_order);
create index if not exists idx_projects_tenant_category on public.projects(tenant_id, category, is_published);
create index if not exists idx_projects_search on public.projects using gin (to_tsvector('simple', title || ' ' || coalesce(summary, '')));

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ============ CONCEPT_DESIGNS (konsept slider için ayrı tablo) ============
create table if not exists public.concept_designs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  category text not null,
  hint text,
  image_url text not null,
  thumbnail_url text,
  display_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_concepts_tenant on public.concept_designs(tenant_id, is_published, display_order);

drop trigger if exists trg_concepts_updated_at on public.concept_designs;
create trigger trg_concepts_updated_at before update on public.concept_designs
  for each row execute function public.set_updated_at();

-- ============ SERVICES (hizmetler) ============
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  icon text, -- SVG path veya lucide icon adı
  starting_price text,
  features text[] default '{}',
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists idx_services_tenant on public.services(tenant_id, is_published, display_order);

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- ============ CUSTOMERS (müşteriler) ============
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- user_id opsiyonel (kayıtlı müşteri ise)
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  address text,
  notes text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_tenant on public.customers(tenant_id);
create index if not exists idx_customers_tenant_user on public.customers(tenant_id, user_id);
create index if not exists idx_customers_search on public.customers using gin (to_tsvector('simple', full_name || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '')));

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- ============ MESSAGES (web'den gelen iletişim mesajları) ============
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  -- Gönderen bilgisi
  sender_name text not null,
  sender_email text,
  sender_phone text,
  -- İçerik
  service_interest text,
  body text not null,
  -- Meta
  source text default 'web', -- web, whatsapp, phone, email
  ip_address inet,
  user_agent text,
  -- Durum
  status message_status not null default 'new',
  admin_notes text,
  replied_by uuid references auth.users(id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_messages_tenant_status on public.messages(tenant_id, status, created_at desc);
create index if not exists idx_messages_tenant_created on public.messages(tenant_id, created_at desc);

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at before update on public.messages
  for each row execute function public.set_updated_at();

-- ============ REPORTS (iç notlar, görevler) ============
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  body text,
  kind text not null default 'note' check (kind in ('note','task','saha','teklif','sorun')),
  status report_status not null default 'todo',
  priority int not null default 0 check (priority between 0 and 3),
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_reports_tenant_status on public.reports(tenant_id, status, created_at desc);
create index if not exists idx_reports_tenant_project on public.reports(tenant_id, project_id);
create index if not exists idx_reports_tenant_assigned on public.reports(tenant_id, assigned_to);

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- ============ AUDIT_LOG (tüm kritik aksiyonları logla) ============
create table if not exists public.audit_log (
  id bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,         -- e.g. 'project.create', 'auth.login'
  resource_type text,           -- e.g. 'project', 'message'
  resource_id text,
  details jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_tenant_created on public.audit_log(tenant_id, created_at desc);
create index if not exists idx_audit_actor on public.audit_log(actor_id, created_at desc);
create index if not exists idx_audit_action on public.audit_log(action, created_at desc);

-- Audit trigger fonksiyonu (generic)
create or replace function public.write_audit()
returns trigger
language plpgsql
as $$
declare
  v_tenant_id uuid;
  v_actor_id uuid := auth.uid();
  v_actor_email text;
begin
  -- Tenant_id'yi NEW/OLD'dan çek
  if tg_op = 'DELETE' then
    v_tenant_id := (to_jsonb(old)->>'tenant_id')::uuid;
  else
    v_tenant_id := (to_jsonb(new)->>'tenant_id')::uuid;
  end if;

  if v_actor_id is not null then
    select email into v_actor_email from auth.users where id = v_actor_id;
  end if;

  insert into public.audit_log (tenant_id, actor_id, actor_email, action, resource_type, resource_id, details)
  values (
    v_tenant_id,
    v_actor_id,
    v_actor_email,
    lower(tg_table_name) || '.' || lower(tg_op),
    tg_table_name,
    coalesce((to_jsonb(coalesce(new, old))->>'id')::text, ''),
    jsonb_build_object(
      'op', tg_op,
      'table', tg_table_name
    )
  );
  return coalesce(new, old);
end; $$;

-- Kritik tablolara audit trigger
drop trigger if exists trg_audit_projects on public.projects;
create trigger trg_audit_projects after insert or update or delete on public.projects
  for each row execute function public.write_audit();

drop trigger if exists trg_audit_messages on public.messages;
create trigger trg_audit_messages after insert or update or delete on public.messages
  for each row execute function public.write_audit();

drop trigger if exists trg_audit_tenants on public.tenants;
create trigger trg_audit_tenants after insert or update or delete on public.tenants
  for each row execute function public.write_audit();

drop trigger if exists trg_audit_memberships on public.memberships;
create trigger trg_audit_memberships after insert or update or delete on public.memberships
  for each row execute function public.write_audit();

-- ============ RATE LIMITS (basit spam koruması) ============
create table if not exists public.rate_limits (
  id bigserial primary key,
  bucket text not null,        -- 'message_submit', 'login', etc.
  identifier text not null,    -- IP, user_id, email
  count int not null default 1,
  window_start timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour'
);
create index if not exists idx_rate_limits_bucket on public.rate_limits(bucket, identifier, expires_at);

-- ============ YARDIMCI FONKSİYONLAR ============

-- JWT'den user_id al
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    (auth.uid())::text
  ), '')::uuid;
$$;

-- User'ın belirli bir tenant'taki rolünü al
create or replace function public.user_role_in_tenant(p_tenant_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.memberships
  where tenant_id = p_tenant_id
    and user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

-- User süper admin mi?
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.memberships
    where user_id = auth.uid()
      and role = 'super_admin'
      and is_active = true
  );
$$;

-- User tenant'ta en az staff mı?
create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.memberships
    where tenant_id = p_tenant_id
      and user_id = auth.uid()
      and is_active = true
  );
$$;

-- User tenant'ta admin/owner mı? (yazma yetkisi)
create or replace function public.can_manage_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.memberships
    where tenant_id = p_tenant_id
      and user_id = auth.uid()
      and is_active = true
      and role in ('super_admin', 'tenant_owner', 'tenant_staff')
  );
$$;

-- Tenant'ın belirli bir slug için aktif olup olmadığını kontrol et
create or replace function public.get_tenant_by_slug(p_slug text)
returns public.tenants
language sql
stable
as $$
  select * from public.tenants where slug = p_slug and status = 'active' limit 1;
$$;

-- ===========================================================
-- BAŞLANGIÇ VERİSİ: Mehmet Can Baykan tenant
-- ===========================================================
do $$
declare
  v_tenant_id uuid;
begin
  if not exists(select 1 from public.tenants where slug = 'mehmetcanbaykan') then
    insert into public.tenants (
      slug, name, legal_name, tagline, description,
      status, plan, service_areas,
      theme, contact, seo
    ) values (
      'mehmetcanbaykan',
      'Mehmet Can Baykan Mimar',
      'Mehmet Can Baykan — Mimar',
      'Siirt merkezli mimarlık & tasarım ofisi',
      'Siirt ve çevresinde restorasyon, iç mimari, vaziyet planı, peyzaj ve taş-ahşap ev projeleri. Ücretsiz ön görüşme için WhatsApp''tan yazın.',
      'active', 'pro',
      array['Siirt','Kurtalan','Baykan','Pervari','Şirvan','Tillo','Batman','Şırnak'],
      '{
        "colors": {
          "primary": "#c9a45a", "primary2": "#b08a3f", "primary3": "#87682a",
          "accent": "#0a0a0b", "bg": "#0a0a0b", "bgSoft": "#111114",
          "ink": "#f4f1ea", "ink2": "#d9d3c4", "ink3": "#b3ac9a",
          "muted": "#8a8270", "line": "rgba(244,241,234,0.08)", "line2": "rgba(244,241,234,0.16)"
        },
        "fonts": { "serif": "Cormorant Garamond", "sans": "Inter" },
        "radius": { "sm": "8px", "md": "14px", "lg": "22px" }
      }'::jsonb,
      '{
        "phone": "+90 542 735 13 16",
        "email": "mimar@mehmetcanbaykan.com",
        "whatsapp": "905427351316",
        "address": "Bahçelievler Mah. Şehit Üsteğmen Kamil Baltacı Cad. Arslan Apartmanı No:4 K:2, Siirt Merkez",
        "instagram": "https://www.instagram.com/mimarmehmetcanbaykan",
        "lat": 37.9335149, "lng": 41.9359725,
        "workingHours": "Pzt-Cmt 09:00-19:00"
      }'::jsonb,
      '{
        "title": "Mehmet Can Baykan — Mimar | Siirt Mimarlık Ofisi",
        "description": "Siirt''te mimari restorasyon, iç tasarım, vaziyet planı, peyzaj ve taş-ahşap ev projeleri. Ücretsiz ön görüşme.",
        "keywords": ["Siirt mimar","mimarlık ofisi","restorasyon","iç mimari","vaziyet planı","peyzaj","taş ev","ahşap ev","Mehmet Can Baykan"]
      }'::jsonb
    ) returning id into v_tenant_id;

    raise notice 'Mehmet Can Baykan tenant oluşturuldu: %', v_tenant_id;
  end if;
end $$;

-- Mehmet Can Baykan kullanıcısını tenant'a bağla
do $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  select id into v_user_id from auth.users where email = 'can.mimarlik.56@gmail.com';
  select id into v_tenant_id from public.tenants where slug = 'mehmetcanbaykan';

  if v_user_id is not null and v_tenant_id is not null then
    insert into public.memberships (tenant_id, user_id, role, is_active, accepted_at)
    values (v_tenant_id, v_user_id, 'tenant_owner', true, now())
    on conflict (tenant_id, user_id, is_active) do update set role = 'tenant_owner', is_active = true;

    update public.profiles set default_tenant_id = v_tenant_id where id = v_user_id;

    raise notice 'Kullanıcı tenant_owner olarak bağlandı';
  end if;
end $$;

-- ===========================================================
-- BAŞARILI
-- ===========================================================
-- Şimdi: 20240101000000_rls_policies.sql uygulayın (RLS politikaları)
-- ===========================================================