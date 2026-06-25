-- =====================================================
-- Mehmet Can Baykan Mimar — Supabase Veritabanı Şeması
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- =====================================================

-- 1) Projeler tablosu
create table if not exists public.projects (
  id text primary key,
  title text not null,
  category text not null,
  category_label text,
  year int,
  location text,
  area text,
  duration text,
  status text default 'Tamamlandı',
  summary text,
  image text,
  tags text[] default '{}',
  content jsonb default '{}'::jsonb,
  is_published boolean default true,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_projects_category on public.projects(category);
create index if not exists idx_projects_published on public.projects(is_published, display_order);

-- updated_at otomatik güncelleme
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 2) Müşteri mesajları (web formundan gelen)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  service text,
  message text not null,
  source text default 'web',
  status text default 'new',  -- new | read | replied | archived
  admin_note text,
  created_at timestamptz default now(),
  replied_at timestamptz
);

create index if not exists idx_messages_status on public.messages(status, created_at desc);

-- 3) Raporlar (iç notlar, görevler, takip kayıtları)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,  -- gorev | not | teklif | gorusme | saha
  related_project text references public.projects(id) on delete set null,
  related_message uuid references public.messages(id) on delete set null,
  body text,
  status text default 'open',  -- open | done | archived
  due_date date,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- 4) Storage bucket (görseller için)
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

-- 5) RLS (Row Level Security) — public okuma, sadece admin yazma
alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

-- Herkes yayınlanmış projeleri okuyabilir (public site için)
drop policy if exists "public_read_published_projects" on public.projects;
create policy "public_read_published_projects" on public.projects
  for select using (is_published = true);

-- Mesajlar: herkes ekleyebilir (form gönderimi için), kimse okuyamaz (admin dışında)
drop policy if exists "public_insert_messages" on public.messages;
create policy "public_insert_messages" on public.messages
  for insert with check (true);

-- Raporlar: sadece authenticated kullanıcılar
drop policy if exists "auth_read_reports" on public.reports;
create policy "auth_read_reports" on public.reports
  for select to authenticated using (true);

drop policy if exists "auth_write_reports" on public.reports;
create policy "auth_write_reports" on public.reports
  for all to authenticated using (true) with check (true);

-- Projeleri sadece authenticated kullanıcılar yazabilir
drop policy if exists "auth_all_projects" on public.projects;
create policy "auth_all_projects" on public.projects
  for all to authenticated using (true) with check (true);

-- Mesajları sadece authenticated kullanıcılar okuyabilir/güncelleyebilir
drop policy if exists "auth_all_messages" on public.messages;
create policy "auth_all_messages" on public.messages
  for all to authenticated using (true) with check (true);

-- Storage: herkes public bucket'tan okuyabilir, sadece authenticated yazabilir
drop policy if exists "public_read_storage" on storage.objects;
create policy "public_read_storage" on storage.objects
  for select using (bucket_id = 'project-images');

drop policy if exists "auth_write_storage" on storage.objects;
create policy "auth_write_storage" on storage.objects
  for insert to authenticated with check (bucket_id = 'project-images');

drop policy if exists "auth_update_storage" on storage.objects;
create policy "auth_update_storage" on storage.objects
  for update to authenticated using (bucket_id = 'project-images');

drop policy if exists "auth_delete_storage" on storage.objects;
create policy "auth_delete_storage" on storage.objects
  for delete to authenticated using (bucket_id = 'project-images');

-- =====================================================
-- Başlangıç verisi: 18 projelik JSON'dan içe aktarım
-- (Supabase Dashboard > Table Editor > projects > Import)
-- veya SQL Editor'da aşağıdaki sorguyu kullanın
-- =====================================================

-- Örnek kayıt (diğerlerini siz ekleyeceksiniz)
insert into public.projects (id, title, category, category_label, year, location, area, status, summary, is_published)
values
  ('rest-01', 'Tarihi Konak Restorasyonu', 'restorasyon', 'Restorasyon', 2024, 'Siirt Merkez', '320 m²', 'Tamamlandı',
   'Osmanlı dönemi taş konak, geleneksel malzemeyle aslına uygun şekilde yeniden ayağa kaldırıldı.', true)
on conflict (id) do nothing;