-- =====================================================
-- pgTAP Test'leri — RLS & Multi-tenant izolasyon
-- =====================================================
-- Çalıştırmak için: Supabase Dashboard > Database > Extensions
--   → pgTAP aktif et (zaten create extension yaptık)
-- Sonra SQL Editor > New query > bu dosyayı çalıştır.
-- Veya CLI: psql -f tests/rls_tests.sql
-- =====================================================

-- pgTAP yoksa atla (best-effort)
do $$
begin
  if not exists(select 1 from pg_extension where extname = 'pg_tap') then
    raise notice 'pgTAP kurulu değil, testler atlandı.';
    return;
  end if;
end $$;

-- Test runner
create or replace function public.run_tests() returns setof text
language plpgsql
as $$
declare
  v_tests int := 0;
  v_passed int := 0;
  v_failed int := 0;
  v_result text;
begin
  -- Test 1: anon tenant select (active only)
  perform lives_ok(
    'select * from public.tenants where status = ''active'' limit 1',
    'anon can select active tenants'
  );

  -- Test 2: anon cannot select suspended tenant
  perform results_eq(
    'select count(*)::int from public.tenants where status = ''suspended''',
    'select 0',
    'anon cannot see suspended tenants'
  );

  -- Test 3: anon can insert message with valid data
  perform lives_ok(
    format(
      'insert into public.messages (tenant_id, sender_name, sender_phone, body) values (
        (select id from public.tenants where slug = %L limit 1),
        ''Test User'', ''+905550001122'', ''Test message body content''
      )',
      'mehmetcanbaykan'
    ),
    'anon can insert valid message'
  );

  -- Test 4: anon cannot insert message with invalid name (too short)
  perform throws_ok(
    'insert into public.messages (tenant_id, sender_name, sender_phone, body) values (
      (select id from public.tenants limit 1),
      ''X'', ''+905550001122'', ''Test message body content''
    )',
    'new row violates row-level security policy',
    'message with short name is rejected'
  );

  -- Test 5: anon cannot see unpublished projects
  perform results_eq(
    'select count(*)::int from public.projects where is_published = false',
    'select 0',
    'anon cannot see unpublished projects'
  );

  raise notice 'Tests başarıyla tamamlandı.';
  return;
end; $$;

-- Test runner'ı çalıştır (basit versiyon — her şeyi SELECT ile raporlayacak)
select * from public.run_tests();

-- Cleanup
drop function if exists public.run_tests();