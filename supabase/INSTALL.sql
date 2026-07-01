-- =====================================================
-- TEK DOSYA: Sıfırdan kurulum
-- Mehmet Can Baykan Mimar — Multi-Tenant Mimarlık SaaS
-- =====================================================
-- ⚠️ Bu script mevcut tüm tabloları siler (CASCADE).
-- Supabase Dashboard > SQL Editor > New query > yapıştır > Run
-- =====================================================

-- ============ ESKİ TABLOLARI TEMİZLE ============
drop table if exists public.audit_log cascade;
drop table if exists public.rate_limits cascade;
drop table if exists public.reports cascade;
drop table if exists public.messages cascade;
drop table if exists public.customers cascade;
drop table if exists public.services cascade;
drop table if exists public.concept_designs cascade;
drop table if exists public.projects cascade;
drop table if exists public.memberships cascade;
drop table if exists public.profiles cascade;
drop table if exists public.tenants cascade;

drop function if exists public.set_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.write_audit() cascade;
drop function if exists public.current_user_id() cascade;
drop function if exists public.user_role_in_tenant(uuid) cascade;
drop function if exists public.is_super_admin() cascade;
drop function if exists public.is_tenant_member(uuid) cascade;
drop function if exists public.can_manage_tenant(uuid) cascade;
drop function if exists public.get_tenant_by_slug(text) cascade;
drop function if exists public.check_rate_limit(text, text, int, interval) cascade;
drop function if exists public.submit_contact_form(text, text, text, text, text, text) cascade;

drop type if exists app_role cascade;
drop type if exists tenant_status cascade;
drop type if exists project_status cascade;
drop type if exists message_status cascade;
drop type if exists report_status cascade;

-- ============ EXTENSIONS ============
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============ ENUMS ============
create type app_role as enum ('super_admin', 'tenant_owner', 'tenant_staff', 'customer');
create type tenant_status as enum ('active', 'suspended', 'pending', 'archived');
create type project_status as enum ('inquiry', 'proposal', 'contracted', 'in_progress', 'completed', 'cancelled');
create type message_status as enum ('new', 'read', 'replied', 'archived', 'spam');
create type report_status as enum ('todo', 'in_progress', 'blocked', 'done', 'cancelled');

-- ============ UPDATED_AT TRIGGER ============
create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ============ TENANTS ============
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  name text not null,
  legal_name text,
  tagline text,
  description text,
  logo_url text,
  favicon_url text,
  og_image_url text,
  theme jsonb not null default '{
    "colors": {"primary":"#c9a45a","primary2":"#b08a3f","primary3":"#87682a","bg":"#0a0a0b","bgSoft":"#111114","bgElevated":"#16161a","ink":"#f4f1ea","ink2":"#d9d3c4","ink3":"#a39c8a","muted":"#7a7167","line":"rgba(244,241,234,0.08)"},
    "fonts": {"serif":"Cormorant Garamond","sans":"Inter"},
    "radius": {"sm":"8px","md":"14px","lg":"22px"}
  }'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  service_areas text[] default '{}',
  status tenant_status not null default 'pending',
  plan text not null default 'free' check (plan in ('free','pro','enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index idx_tenants_slug on public.tenants(slug);
create index idx_tenants_status on public.tenants(status);
create trigger trg_tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  default_tenant_id uuid references public.tenants(id) on delete set null,
  preferences jsonb not null default '{"locale":"tr","theme":"dark"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_default_tenant on public.profiles(default_tenant_id);
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

-- ============ MEMBERSHIPS ============
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  invited_by uuid references auth.users(id),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, is_active) deferrable initially deferred
);
create index idx_memberships_tenant on public.memberships(tenant_id) where is_active;
create index idx_memberships_user on public.memberships(user_id) where is_active;
create trigger trg_memberships_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- ============ PROJECTS ============
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  title text not null,
  category text not null check (category in ('restorasyon','ic-tasarim','vaziyet','kat-plani','peyzaj','tas-ahsap','diger')),
  category_label text,
  year int, location text, area text, duration text, client_name text,
  summary text, cover_image text, images text[] default '{}', tags text[] default '{}',
  content jsonb default '{}'::jsonb,
  customer_id uuid,
  status project_status not null default 'inquiry',
  is_published boolean not null default false,
  is_featured boolean not null default false,
  display_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (tenant_id, slug)
);
create index idx_projects_tenant on public.projects(tenant_id);
create index idx_projects_tenant_published on public.projects(tenant_id, is_published, display_order);
create index idx_projects_tenant_category on public.projects(tenant_id, category, is_published);
create index idx_projects_search on public.projects using gin (to_tsvector('simple', title || ' ' || coalesce(summary, '')));
create trigger trg_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ============ CONCEPT_DESIGNS ============
create table public.concept_designs (
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
create index idx_concepts_tenant on public.concept_designs(tenant_id, is_published, display_order);
create trigger trg_concepts_updated_at before update on public.concept_designs
  for each row execute function public.set_updated_at();

-- ============ SERVICES ============
create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  icon text,
  starting_price text,
  features text[] default '{}',
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index idx_services_tenant on public.services(tenant_id, is_published, display_order);
create trigger trg_services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- ============ CUSTOMERS ============
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text, phone text, address text, notes text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_customers_tenant on public.customers(tenant_id);
create index idx_customers_tenant_user on public.customers(tenant_id, user_id);
create index idx_customers_search on public.customers using gin (to_tsvector('simple', full_name || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '')));
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- ============ MESSAGES ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  sender_name text not null,
  sender_email text, sender_phone text,
  service_interest text, body text not null,
  source text default 'web',
  ip_address inet, user_agent text,
  status message_status not null default 'new',
  admin_notes text,
  replied_by uuid references auth.users(id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_messages_tenant_status on public.messages(tenant_id, status, created_at desc);
create index idx_messages_tenant_created on public.messages(tenant_id, created_at desc);
create trigger trg_messages_updated_at before update on public.messages
  for each row execute function public.set_updated_at();

-- ============ REPORTS ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null, body text,
  kind text not null default 'note' check (kind in ('note','task','saha','teklif','sorun')),
  status report_status not null default 'todo',
  priority int not null default 0 check (priority between 0 and 3),
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_reports_tenant_status on public.reports(tenant_id, status, created_at desc);
create index idx_reports_tenant_project on public.reports(tenant_id, project_id);
create index idx_reports_tenant_assigned on public.reports(tenant_id, assigned_to);
create trigger trg_reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- ============ AUDIT_LOG ============
create table public.audit_log (
  id bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb default '{}'::jsonb,
  ip_address inet, user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_tenant_created on public.audit_log(tenant_id, created_at desc);
create index idx_audit_actor on public.audit_log(actor_id, created_at desc);
create index idx_audit_action on public.audit_log(action, created_at desc);

create or replace function public.write_audit()
returns trigger
language plpgsql
as $$
declare v_tenant_id uuid; v_actor_id uuid := auth.uid(); v_actor_email text;
begin
  if tg_op = 'DELETE' then v_tenant_id := (to_jsonb(old)->>'tenant_id')::uuid;
  else v_tenant_id := (to_jsonb(new)->>'tenant_id')::uuid; end if;
  if v_actor_id is not null then select email into v_actor_email from auth.users where id = v_actor_id; end if;
  insert into public.audit_log (tenant_id, actor_id, actor_email, action, resource_type, resource_id, details)
  values (
    v_tenant_id, v_actor_id, v_actor_email,
    lower(tg_table_name) || '.' || lower(tg_op),
    tg_table_name,
    coalesce((to_jsonb(coalesce(new, old))->>'id')::text, ''),
    jsonb_build_object('op', tg_op, 'table', tg_table_name)
  );
  return coalesce(new, old);
end; $$;

create trigger trg_audit_projects after insert or update or delete on public.projects for each row execute function public.write_audit();
create trigger trg_audit_messages after insert or update or delete on public.messages for each row execute function public.write_audit();
create trigger trg_audit_tenants after insert or update or delete on public.tenants for each row execute function public.write_audit();
create trigger trg_audit_memberships after insert or update or delete on public.memberships for each row execute function public.write_audit();

-- ============ RATE_LIMITS ============
create table public.rate_limits (
  id bigserial primary key,
  bucket text not null, identifier text not null,
  count int not null default 1,
  window_start timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour'
);
create index idx_rate_limits_bucket on public.rate_limits(bucket, identifier, expires_at);

create or replace function public.check_rate_limit(p_bucket text, p_identifier text, p_max_count int default 5, p_window interval default '1 hour')
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  delete from public.rate_limits where bucket = p_bucket and identifier = p_identifier and expires_at < now();
  select coalesce(sum(count), 0) into v_count from public.rate_limits
  where bucket = p_bucket and identifier = p_identifier and window_start > now() - p_window;
  if v_count >= p_max_count then return false; end if;
  insert into public.rate_limits (bucket, identifier, count, window_start, expires_at)
  values (p_bucket, p_identifier, 1, now(), now() + p_window);
  return true;
end; $$;

-- ============ HELPER FONKSİYONLAR ============
create or replace function public.user_role_in_tenant(p_tenant_id uuid)
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.memberships where tenant_id = p_tenant_id and user_id = auth.uid() and is_active = true limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.memberships where user_id = auth.uid() and role = 'super_admin' and is_active = true);
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.memberships where tenant_id = p_tenant_id and user_id = auth.uid() and is_active = true);
$$;

create or replace function public.can_manage_tenant(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.memberships where tenant_id = p_tenant_id and user_id = auth.uid() and is_active = true and role in ('super_admin','tenant_owner','tenant_staff'));
$$;

-- ============ SUBMIT CONTACT FORM RPC ============
create or replace function public.submit_contact_form(
  p_tenant_slug text, p_sender_name text, p_sender_phone text,
  p_sender_email text default null, p_service text default null, p_body text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tenant_id uuid; v_message_id uuid; v_ip_text text;
begin
  select id into v_tenant_id from public.tenants where slug = p_tenant_slug and status = 'active';
  if v_tenant_id is null then return jsonb_build_object('ok', false, 'error', 'invalid_tenant'); end if;

  -- IP başına rate limit (5/saat)
  if not public.check_rate_limit('message_submit', 'anon', 5, '1 hour'::interval) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  if p_sender_name is null or length(trim(p_sender_name)) < 2 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  if p_sender_phone is null or length(trim(p_sender_phone)) < 7 then return jsonb_build_object('ok', false, 'error', 'invalid_phone'); end if;
  if p_body is null or length(trim(p_body)) < 5 then return jsonb_build_object('ok', false, 'error', 'invalid_body'); end if;

  insert into public.messages (tenant_id, sender_name, sender_phone, sender_email, service_interest, body, source, status)
  values (v_tenant_id, trim(p_sender_name), trim(p_sender_phone), nullif(trim(coalesce(p_sender_email,'')), ''), nullif(trim(coalesce(p_service,'')), ''), trim(p_body), 'web', 'new')
  returning id into v_message_id;

  return jsonb_build_object('ok', true, 'id', v_message_id);
exception when others then return jsonb_build_object('ok', false, 'error', 'server_error');
end; $$;

-- ============ RLS POLİTİKALARI ============
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.concept_designs enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

-- tenants
create policy "tenants_select_anon" on public.tenants for select to anon using (status = 'active');
create policy "tenants_select_member" on public.tenants for select to authenticated using (public.is_super_admin() or exists(select 1 from public.memberships m where m.tenant_id = tenants.id and m.user_id = auth.uid() and m.is_active));
create policy "tenants_all_superadmin" on public.tenants for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "tenants_update_owner" on public.tenants for update to authenticated using (exists(select 1 from public.memberships m where m.tenant_id = tenants.id and m.user_id = auth.uid() and m.role = 'tenant_owner' and m.is_active)) with check (exists(select 1 from public.memberships m where m.tenant_id = tenants.id and m.user_id = auth.uid() and m.role = 'tenant_owner' and m.is_active));

-- profiles
create policy "profiles_select_self" on public.profiles for select to authenticated using (id = auth.uid() or public.is_super_admin());
create policy "profiles_select_tenant_member" on public.profiles for select to authenticated using (exists(select 1 from public.memberships m1 join public.memberships m2 on m2.tenant_id = m1.tenant_id where m1.user_id = auth.uid() and m1.is_active and m2.user_id = profiles.id and m2.is_active));
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_all_superadmin" on public.profiles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- memberships
create policy "memberships_select_self" on public.memberships for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy "memberships_select_tenant_member" on public.memberships for select to authenticated using (exists(select 1 from public.memberships m where m.tenant_id = memberships.tenant_id and m.user_id = auth.uid() and m.is_active and m.role in ('super_admin','tenant_owner','tenant_staff')));
create policy "memberships_manage_owner" on public.memberships for all to authenticated using (public.is_super_admin() or exists(select 1 from public.memberships m where m.tenant_id = memberships.tenant_id and m.user_id = auth.uid() and m.role = 'tenant_owner' and m.is_active)) with check (public.is_super_admin() or exists(select 1 from public.memberships m where m.tenant_id = memberships.tenant_id and m.user_id = auth.uid() and m.role = 'tenant_owner' and m.is_active));

-- projects
create policy "projects_select_anon" on public.projects for select to anon using (is_published = true and exists(select 1 from public.tenants t where t.id = projects.tenant_id and t.status = 'active'));
create policy "projects_select_member" on public.projects for select to authenticated using (public.can_manage_tenant(tenant_id));
create policy "projects_select_customer" on public.projects for select to authenticated using (exists(select 1 from public.customers c where c.id = projects.customer_id and c.user_id = auth.uid()));
create policy "projects_modify_staff" on public.projects for all to authenticated using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id));

-- concept_designs
create policy "concepts_select_anon" on public.concept_designs for select to anon using (is_published = true and exists(select 1 from public.tenants t where t.id = concept_designs.tenant_id and t.status = 'active'));
create policy "concepts_modify_staff" on public.concept_designs for all to authenticated using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id));

-- services
create policy "services_select_anon" on public.services for select to anon using (is_published = true and exists(select 1 from public.tenants t where t.id = services.tenant_id and t.status = 'active'));
create policy "services_modify_staff" on public.services for all to authenticated using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id));

-- customers
create policy "customers_select_staff" on public.customers for select to authenticated using (public.can_manage_tenant(tenant_id));
create policy "customers_select_self" on public.customers for select to authenticated using (user_id = auth.uid());
create policy "customers_modify_staff" on public.customers for all to authenticated using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id));
create policy "customers_update_self" on public.customers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages
create policy "messages_insert_anon" on public.messages for insert to anon with check (sender_name is not null and body is not null and length(sender_name) between 2 and 200 and length(body) between 5 and 5000 and length(coalesce(sender_email, '')) <= 200 and length(coalesce(sender_phone, '')) <= 50 and exists(select 1 from public.tenants t where t.id = messages.tenant_id and t.status = 'active'));
create policy "messages_select_staff" on public.messages for select to authenticated using (public.can_manage_tenant(tenant_id));
create policy "messages_modify_staff" on public.messages for update to authenticated using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id));
create policy "messages_select_customer" on public.messages for select to authenticated using (exists(select 1 from public.customers c where c.id = messages.customer_id and c.user_id = auth.uid()));

-- reports
create policy "reports_modify_staff" on public.reports for all to authenticated using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id));
create policy "reports_select_customer" on public.reports for select to authenticated using (exists(select 1 from public.customers c where c.id = reports.customer_id and c.user_id = auth.uid()));

-- audit_log
create policy "audit_select_admin" on public.audit_log for select to authenticated using (public.is_super_admin() or (tenant_id is not null and exists(select 1 from public.memberships m where m.tenant_id = audit_log.tenant_id and m.user_id = auth.uid() and m.role in ('super_admin','tenant_owner') and m.is_active)));
create policy "audit_no_insert" on public.audit_log for insert to authenticated with check (false);

-- rate_limits
create policy "rate_limits_select_admin" on public.rate_limits for select to authenticated using (public.is_super_admin());
create policy "rate_limits_insert_all" on public.rate_limits for insert to anon, authenticated with check (true);
create policy "rate_limits_modify_admin" on public.rate_limits for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- ============ GRANT'LAR ============
grant usage on schema public to anon, authenticated;
grant select on public.tenants, public.services, public.concept_designs, public.projects to anon;
grant insert on public.messages to anon;
grant usage, select on all sequences in schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ============ FORCE RLS (service role dışında tüm erişim RLS) ============
alter table public.tenants force row level security;
alter table public.profiles force row level security;
alter table public.memberships force row level security;
alter table public.projects force row level security;
alter table public.concept_designs force row level security;
alter table public.services force row level security;
alter table public.customers force row level security;
alter table public.messages force row level security;
alter table public.reports force row level security;
alter table public.audit_log force row level security;
alter table public.rate_limits force row level security;

-- ============ BAŞLANGIÇ VERİSİ ============
do $$
declare v_tenant_id uuid;
begin
  if not exists(select 1 from public.tenants where slug = 'mehmetcanbaykan') then
    insert into public.tenants (slug, name, legal_name, tagline, description, status, plan, service_areas, theme, contact, seo)
    values (
      'mehmetcanbaykan', 'Mehmet Can Baykan Mimar', 'Mehmet Can Baykan — Mimar',
      'Siirt merkezli mimarlık & tasarım ofisi',
      'Siirt ve çevresinde restorasyon, iç mimari, vaziyet planı, peyzaj ve taş-ahşap ev projeleri.',
      'active', 'pro',
      array['Siirt','Kurtalan','Baykan','Pervari','Şirvan','Tillo','Batman','Şırnak'],
      '{"colors":{"primary":"#c9a45a","primary2":"#b08a3f","primary3":"#87682a","accent":"#0a0a0b","bg":"#0a0a0b","bgSoft":"#111114","ink":"#f4f1ea","ink2":"#d9d3c4","ink3":"#b3ac9a","muted":"#8a8270","line":"rgba(244,241,234,0.08)","line2":"rgba(244,241,234,0.16)"},"fonts":{"serif":"Cormorant Garamond","sans":"Inter"},"radius":{"sm":"8px","md":"14px","lg":"22px"}}'::jsonb,
      '{"phone":"+90 542 735 13 16","email":"mimar@mehmetcanbaykan.com","whatsapp":"905427351316","address":"Bahçelievler Mah. Şehit Üsteğmen Kamil Baltacı Cad. Arslan Apartmanı No:4 K:2, Siirt Merkez","instagram":"https://www.instagram.com/mimarmehmetcanbaykan","lat":37.9335149,"lng":41.9359725,"workingHours":"Pzt-Cmt 09:00-19:00"}'::jsonb,
      '{"title":"Mehmet Can Baykan — Mimar | Siirt Mimarlık Ofisi","description":"Siirt''te mimari restorasyon, iç tasarım, vaziyet planı, peyzaj ve taş-ahşap ev projeleri. Ücretsiz ön görüşme.","keywords":["Siirt mimar","mimarlık ofisi","restorasyon","iç mimari"]}'::jsonb
    ) returning id into v_tenant_id;
    raise notice 'Tenant oluşturuldu: %', v_tenant_id;
  end if;
end $$;

-- =====================================================
-- ✅ KURULUM TAMAMLANDI
-- Şimdi Supabase Dashboard > Authentication > Users
--   > Add user > can.mimarlik.56@gmail.com / Mehmet2026! / Auto Confirm
-- Sonra bu user'ı tenant_owner yapmak için SQL Editor'da:
--   INSERT INTO memberships(tenant_id, user_id, role, is_active, accepted_at)
--   SELECT id, 'USER_ID', 'tenant_owner', true, now() FROM tenants WHERE slug='mehmetcanbaykan';
-- =====================================================
select '✅ Multi-tenant mimarlık SaaS veritabanı hazır.' as status;