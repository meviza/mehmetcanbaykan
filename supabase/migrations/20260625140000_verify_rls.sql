-- Verification + force re-create
drop policy if exists "public_insert_messages" on public.messages;
create policy "public_insert_messages" on public.messages
  for insert to anon with check (true);

drop policy if exists "public_insert_customers" on public.customers;
create policy "public_insert_customers" on public.customers
  for insert to anon with check (true);

drop policy if exists "public_insert_conversations" on public.conversations;
create policy "public_insert_conversations" on public.conversations
  for insert to anon with check (true);
