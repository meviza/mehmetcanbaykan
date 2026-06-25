-- ============================================================================
-- Mehmet Can Baykan Mimar — Hierarchical CRM Schema
-- Migration: 20260625_000001_initial
-- ============================================================================
-- Bu şema, tek bir mimarlık ofisinin tüm iş akışını kapsayan ilişkisel
-- modeldir. Temel hiyerarşi:
--
--   customers (müşteriler)
--     ↓
--     projects (projeler)
--       ↓
--       ├── permits (ruhsat / izin başvuruları)
--       ├── documents (dosyalar)
--       ├── reports (notlar, görevler)
--       └── conversations → messages (iletişim)
--
-- RLS politikaları: public okur (yayında olanlar), authenticated yazar.
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- Helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 1) MÜŞTERİLER
-- ============================================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'individual',     -- individual | corporate
  phone text,
  email text,
  address text,
  city text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_customers_email on public.customers(email);

-- ============================================================================
-- 2) PROJELER
-- ============================================================================
create table if not exists public.projects (
  id text primary key,                          -- slug, örn: rest-01
  customer_id uuid references public.customers(id) on delete restrict,
  title text not null,
  category text not null,                       -- restorasyon | ic-tasarim | vaziyet | kat-plani | peyzaj | tas-ahsap
  category_label text,
  year int,
  location text,
  area text,
  duration text,
  status text default 'devam-ediyor',          -- tamamlandi | devam-ediyor | beklemede | iptal
  summary text,
  image text,
  tags text[] default '{}',
  content jsonb default '{}'::jsonb,
  is_published boolean default false,
  display_order int default 0,
  started_at date,
  finished_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create index if not exists idx_projects_customer on public.projects(customer_id);
create index if not exists idx_projects_category on public.projects(category);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_published on public.projects(is_published, display_order);

-- ============================================================================
-- 3) RUHSAT / İZİN BAŞVURULARI
-- ============================================================================
create table if not exists public.permits (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  type text not null,                           -- yapi-ruhsati | iskan | tadilat | imar-durumu | koruma-kurulu | cevre | diger
  status text not null default 'hazirlik',      -- hazirlik | basvuruldu | incelemede | eksik-evrak | onaylandi | reddedildi | iptal
  authority text,                               -- siirt-belediyesi | valilik | koruma-kurulu | ...
  application_no text,
  applied_at date,
  approved_at date,
  fee numeric(12, 2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_permits_updated_at on public.permits;
create trigger trg_permits_updated_at
  before update on public.permits
  for each row execute function public.set_updated_at();

create index if not exists idx_permits_project on public.permits(project_id);
create index if not exists idx_permits_status on public.permits(status);

-- ============================================================================
-- 4) DOSYALAR (projelere veya izinlere bağlı)
-- ============================================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade,
  permit_id uuid references public.permits(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  name text not null,
  category text,                                -- cizim | sozlesme | ruhsat | fatura | fotograf | diger
  storage_path text not null,                   -- bucket içindeki yol
  public_url text,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_documents_project on public.documents(project_id);
create index if not exists idx_documents_permit on public.documents(permit_id);
create index if not exists idx_documents_customer on public.documents(customer_id);

-- ============================================================================
-- 5) GÖRÜŞMELER (konuşma thread'leri, bir müşteriye ve projeye bağlı)
-- ============================================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id text references public.projects(id) on delete set null,
  channel text not null default 'web',          -- web | whatsapp | phone | in-person | email
  subject text,
  status text not null default 'open',          -- open | waiting | closed
  started_at timestamptz default now(),
  last_message_at timestamptz default now()
);

create index if not exists idx_conversations_customer on public.conversations(customer_id);
create index if not exists idx_conversations_project on public.conversations(project_id);
create index if not exists idx_conversations_status on public.conversations(status, last_message_at desc);

-- ============================================================================
-- 6) MESAJLAR (konuşma içindeki bireysel mesajlar)
-- ============================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  direction text not null default 'inbound',    -- inbound | outbound
  channel text not null default 'web',
  body text not null,
  status text not null default 'new',           -- new | read | replied | archived
  admin_note text,
  -- Form verisi (web'den gelen mesajlar için)
  sender_name text,
  sender_phone text,
  sender_email text,
  service text,                                 -- proje türü talebi
  -- Zamanlar
  sent_at timestamptz default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, sent_at);
create index if not exists idx_messages_customer on public.messages(customer_id);
create index if not exists idx_messages_project on public.messages(project_id);
create index if not exists idx_messages_status on public.messages(status, sent_at desc);

-- ============================================================================
-- 7) RAPORLAR (görev, not, teklif, görüşme, saha kaydı)
-- ============================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  permit_id uuid references public.permits(id) on delete set null,
  type text not null default 'not',             -- gorev | not | teklif | gorusme | saha | sozlesme | fatura | toplanti
  title text not null,
  body text,
  status text not null default 'open',          -- open | in-progress | done | archived
  priority text not null default 'normal',      -- low | normal | high | urgent
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

create index if not exists idx_reports_customer on public.reports(customer_id);
create index if not exists idx_reports_project on public.reports(project_id);
create index if not exists idx_reports_status on public.reports(status, priority, due_date);

-- ============================================================================
-- 8) VIEW'LAR — sık sorgular için
-- ============================================================================

-- Müşteri özeti: proje sayısı, son iletişim, açık görevler
create or replace view public.v_customer_summary as
select
  c.id,
  c.name,
  c.type,
  c.phone,
  c.email,
  c.city,
  coalesce(p.project_count, 0) as project_count,
  coalesce(p.last_project_year, null) as last_project_year,
  coalesce(m.unread_count, 0) as unread_messages,
  m.last_message_at,
  coalesce(r.open_tasks, 0) as open_tasks
from public.customers c
left join (
  select customer_id,
         count(*) as project_count,
         max(year) as last_project_year
  from public.projects
  group by customer_id
) p on p.customer_id = c.id
left join (
  select customer_id,
         count(*) filter (where status = 'new') as unread_count,
         max(sent_at) as last_message_at
  from public.messages
  group by customer_id
) m on m.customer_id = c.id
left join (
  select customer_id,
         count(*) filter (where status in ('open', 'in-progress')) as open_tasks
  from public.reports
  group by customer_id
) r on r.customer_id = c.id;

-- Proje özeti: müşteri + izin sayıları + belge sayısı
create or replace view public.v_project_summary as
select
  pr.*,
  c.name as customer_name,
  c.phone as customer_phone,
  coalesce(perm.permit_count, 0) as permit_count,
  coalesce(perm.active_permits, 0) as active_permits,
  coalesce(doc.document_count, 0) as document_count
from public.projects pr
left join public.customers c on c.id = pr.customer_id
left join (
  select project_id,
         count(*) as permit_count,
         count(*) filter (where status in ('basvuruldu', 'incelemede', 'eksik-evrak')) as active_permits
  from public.permits
  group by project_id
) perm on perm.project_id = pr.id
left join (
  select project_id, count(*) as document_count
  from public.documents
  group by project_id
) doc on doc.project_id = pr.id;

-- ============================================================================
-- 9) ROW LEVEL SECURITY
-- ============================================================================
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.permits enable row level security;
alter table public.documents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

-- PUBLIC (anon) — sadece yayında olan projeleri okuyabilir, mesaj gönderebilir
drop policy if exists "public_read_published_projects" on public.projects;
create policy "public_read_published_projects" on public.projects
  for select using (is_published = true);

drop policy if exists "public_insert_messages" on public.messages;
create policy "public_insert_messages" on public.messages
  for insert to anon, authenticated with check (true);

-- AUTHENTICATED — her şeyi okuyup yazabilir (admin)
drop policy if exists "auth_all_customers" on public.customers;
create policy "auth_all_customers" on public.customers
  for all to authenticated using (true) with check (true);

drop policy if exists "auth_all_projects" on public.projects;
create policy "auth_all_projects" on public.projects
  for all to authenticated using (true) with check (true);

drop policy if exists "auth_all_permits" on public.permits;
create policy "auth_all_permits" on public.permits
  for all to authenticated using (true) with check (true);

drop policy if exists "auth_all_documents" on public.documents;
create policy "auth_all_documents" on public.documents
  for all to authenticated using (true) with check (true);

drop policy if exists "auth_all_conversations" on public.conversations;
create policy "auth_all_conversations" on public.conversations
  for all to authenticated using (true) with check (true);

drop policy if exists "auth_all_messages" on public.messages;
create policy "auth_all_messages" on public.messages
  for all to authenticated using (true) with check (true);

drop policy if exists "auth_all_reports" on public.reports;
create policy "auth_all_reports" on public.reports
  for all to authenticated using (true) with check (true);

-- ============================================================================
-- 10) STORAGE BUCKETS
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('project-images', 'project-images', true),
  ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- Public bucket: herkes okur, sadece authenticated yazar
drop policy if exists "public_read_project_images" on storage.objects;
create policy "public_read_project_images" on storage.objects
  for select using (bucket_id = 'project-images');

drop policy if exists "auth_write_project_images" on storage.objects;
create policy "auth_write_project_images" on storage.objects
  for insert to authenticated with check (bucket_id = 'project-images');

drop policy if exists "auth_update_project_images" on storage.objects;
create policy "auth_update_project_images" on storage.objects
  for update to authenticated using (bucket_id = 'project-images');

drop policy if exists "auth_delete_project_images" on storage.objects;
create policy "auth_delete_project_images" on storage.objects
  for delete to authenticated using (bucket_id = 'project-images');

-- Private bucket: sadece authenticated
drop policy if exists "auth_all_project_documents" on storage.objects;
create policy "auth_all_project_documents" on storage.objects
  for all to authenticated using (bucket_id = 'project-documents') with check (bucket_id = 'project-documents');