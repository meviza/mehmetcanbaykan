-- Migration: 20260625130000_rls_anon_insert
-- Web formundan gelen mesajlar için anon role'e insert izni

drop policy if exists "public_insert_messages" on public.messages;
create policy "public_insert_messages" on public.messages
  for insert to anon, authenticated with check (true);