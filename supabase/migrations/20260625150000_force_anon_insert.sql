-- Migration: 20260625150000_force_anon_insert
-- Anon insert için tüm policy'leri net şekilde tanımla

-- Messages
drop policy if exists "public_insert_messages" on public.messages;
drop policy if exists "auth_all_messages" on public.messages;
create policy "public_insert_messages" on public.messages
  for insert to anon with check (true);
create policy "auth_select_messages" on public.messages
  for select to authenticated using (true);
create policy "auth_update_messages" on public.messages
  for update to authenticated using (true) with check (true);
create policy "auth_delete_messages" on public.messages
  for delete to authenticated using (true);

-- Customers
drop policy if exists "public_insert_customers" on public.customers;
drop policy if exists "auth_all_customers" on public.customers;
create policy "public_insert_customers" on public.customers
  for insert to anon with check (true);
create policy "auth_all_customers" on public.customers
  for all to authenticated using (true) with check (true);

-- Conversations
drop policy if exists "public_insert_conversations" on public.conversations;
drop policy if exists "auth_all_conversations" on public.conversations;
create policy "public_insert_conversations" on public.conversations
  for insert to anon with check (true);
create policy "auth_all_conversations" on public.conversations
  for all to authenticated using (true) with check (true);

-- Projects - public read only published
drop policy if exists "public_read_published_projects" on public.projects;
drop policy if exists "auth_all_projects" on public.projects;
create policy "public_read_published_projects" on public.projects
  for select to anon, authenticated using (is_published = true);
create policy "auth_write_projects" on public.projects
  for all to authenticated using (true) with check (true);

-- Permits
drop policy if exists "auth_all_permits" on public.permits;
create policy "auth_all_permits" on public.permits
  for all to authenticated using (true) with check (true);

-- Documents
drop policy if exists "auth_all_documents" on public.documents;
create policy "auth_all_documents" on public.documents
  for all to authenticated using (true) with check (true);

-- Reports
drop policy if exists "auth_all_reports" on public.reports;
create policy "auth_all_reports" on public.reports
  for all to authenticated using (true) with check (true);