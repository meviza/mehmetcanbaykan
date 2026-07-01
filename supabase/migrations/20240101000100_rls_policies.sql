-- =====================================================
-- Row Level Security Policies — Multi-Tenant İzolasyon
-- =====================================================
-- Kurallar:
--   1) super_admin HER ŞEYİ görür/yapar
--   2) tenant_owner/staff kendi tenant'ında her şeyi yapar
--   3) customer kendi projelerini/mesajlarını görür
--   4) Anon kullanıcı sadece public read (active tenant, published content)
--   5) Yazma işlemleri sadece authenticate + member/owner/admin
-- =====================================================

-- ============ TABLOLARI RLS İÇİN AÇ ============
alter table public.tenants            enable row level security;
alter table public.profiles           enable row level security;
alter table public.memberships        enable row level security;
alter table public.projects           enable row level security;
alter table public.concept_designs    enable row level security;
alter table public.services           enable row level security;
alter table public.customers          enable row level security;
alter table public.messages           enable row level security;
alter table public.reports            enable row level security;
alter table public.audit_log          enable row level security;
alter table public.rate_limits        enable row level security;

-- ============ TENANTS ============
-- Anon: sadece aktif tenant'ları okuyabilir
drop policy if exists "tenants_select_anon" on public.tenants;
create policy "tenants_select_anon"
  on public.tenants for select
  to anon
  using (status = 'active');

-- Authenticated: kendi tenant'larını görür
drop policy if exists "tenants_select_member" on public.tenants;
create policy "tenants_select_member"
  on public.tenants for select
  to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.memberships m
      where m.tenant_id = tenants.id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

-- Super admin her şeyi yapabilir
drop policy if exists "tenants_all_superadmin" on public.tenants;
create policy "tenants_all_superadmin"
  on public.tenants for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Tenant owner kendi tenant'ını güncelleyebilir (slug hariç)
drop policy if exists "tenants_update_owner" on public.tenants;
create policy "tenants_update_owner"
  on public.tenants for update
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.tenant_id = tenants.id
        and m.user_id = auth.uid()
        and m.role = 'tenant_owner'
        and m.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.tenant_id = tenants.id
        and m.user_id = auth.uid()
        and m.role = 'tenant_owner'
        and m.is_active = true
    )
  );

-- ============ PROFILES ============
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists "profiles_select_tenant_member" on public.profiles;
create policy "profiles_select_tenant_member"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.memberships m1
      join public.memberships m2 on m2.tenant_id = m1.tenant_id
      where m1.user_id = auth.uid()
        and m1.is_active = true
        and m2.user_id = profiles.id
        and m2.is_active = true
    )
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_all_superadmin" on public.profiles;
create policy "profiles_all_superadmin"
  on public.profiles for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ============ MEMBERSHIPS ============
drop policy if exists "memberships_select_self" on public.memberships;
create policy "memberships_select_self"
  on public.memberships for select
  to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "memberships_select_tenant_member" on public.memberships;
create policy "memberships_select_tenant_member"
  on public.memberships for select
  to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.tenant_id = memberships.tenant_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('super_admin', 'tenant_owner', 'tenant_staff')
    )
  );

drop policy if exists "memberships_manage_owner" on public.memberships;
create policy "memberships_manage_owner"
  on public.memberships for all
  to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.memberships m
      where m.tenant_id = memberships.tenant_id
        and m.user_id = auth.uid()
        and m.role = 'tenant_owner'
        and m.is_active = true
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.memberships m
      where m.tenant_id = memberships.tenant_id
        and m.user_id = auth.uid()
        and m.role = 'tenant_owner'
        and m.is_active = true
    )
  );

-- ============ PROJECTS ============
-- Anon: sadece published + aktif tenant
drop policy if exists "projects_select_anon" on public.projects;
create policy "projects_select_anon"
  on public.projects for select
  to anon
  using (
    is_published = true
    and exists (select 1 from public.tenants t where t.id = projects.tenant_id and t.status = 'active')
  );

-- Authenticated: kendi tenant'ında tüm projeleri
drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member"
  on public.projects for select
  to authenticated
  using (public.can_manage_tenant(tenant_id));

-- Customer: kendi customer_id ile ilişkili projeleri
drop policy if exists "projects_select_customer" on public.projects;
create policy "projects_select_customer"
  on public.projects for select
  to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = projects.customer_id
        and c.user_id = auth.uid()
    )
  );

-- Yazma: sadece manage yetkisi olan
drop policy if exists "projects_modify_staff" on public.projects;
create policy "projects_modify_staff"
  on public.projects for all
  to authenticated
  using (public.can_manage_tenant(tenant_id))
  with check (public.can_manage_tenant(tenant_id));

-- ============ CONCEPT_DESIGNS ============
drop policy if exists "concepts_select_anon" on public.concept_designs;
create policy "concepts_select_anon"
  on public.concept_designs for select
  to anon
  using (
    is_published = true
    and exists (select 1 from public.tenants t where t.id = concept_designs.tenant_id and t.status = 'active')
  );

drop policy if exists "concepts_modify_staff" on public.concept_designs;
create policy "concepts_modify_staff"
  on public.concept_designs for all
  to authenticated
  using (public.can_manage_tenant(tenant_id))
  with check (public.can_manage_tenant(tenant_id));

-- ============ SERVICES ============
drop policy if exists "services_select_anon" on public.services;
create policy "services_select_anon"
  on public.services for select
  to anon
  using (
    is_published = true
    and exists (select 1 from public.tenants t where t.id = services.tenant_id and t.status = 'active')
  );

drop policy if exists "services_modify_staff" on public.services;
create policy "services_modify_staff"
  on public.services for all
  to authenticated
  using (public.can_manage_tenant(tenant_id))
  with check (public.can_manage_tenant(tenant_id));

-- ============ CUSTOMERS ============
drop policy if exists "customers_select_staff" on public.customers;
create policy "customers_select_staff"
  on public.customers for select
  to authenticated
  using (public.can_manage_tenant(tenant_id));

drop policy if exists "customers_select_self" on public.customers;
create policy "customers_select_self"
  on public.customers for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "customers_modify_staff" on public.customers;
create policy "customers_modify_staff"
  on public.customers for all
  to authenticated
  using (public.can_manage_tenant(tenant_id))
  with check (public.can_manage_tenant(tenant_id));

-- Customer kendi profilini güncelleyebilir (sadece null olmayan alanlar)
drop policy if exists "customers_update_self" on public.customers;
create policy "customers_update_self"
  on public.customers for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============ MESSAGES ============
-- Anon: INSERT (web formu)
drop policy if exists "messages_insert_anon" on public.messages;
create policy "messages_insert_anon"
  on public.messages for insert
  to anon
  with check (
    sender_name is not null
    and body is not null
    and length(sender_name) between 2 and 200
    and length(body) between 5 and 5000
    and length(coalesce(sender_email, '')) <= 200
    and length(coalesce(sender_phone, '')) <= 50
    and exists (select 1 from public.tenants t where t.id = messages.tenant_id and t.status = 'active')
  );

-- Staff: kendi tenant'ındaki tüm mesajları görür
drop policy if exists "messages_select_staff" on public.messages;
create policy "messages_select_staff"
  on public.messages for select
  to authenticated
  using (public.can_manage_tenant(tenant_id));

drop policy if exists "messages_modify_staff" on public.messages;
create policy "messages_modify_staff"
  on public.messages for update
  to authenticated
  using (public.can_manage_tenant(tenant_id))
  with check (public.can_manage_tenant(tenant_id));

-- Customer: sadece kendi customer_id ile ilişkili mesajları
drop policy if exists "messages_select_customer" on public.messages;
create policy "messages_select_customer"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = messages.customer_id
        and c.user_id = auth.uid()
    )
  );

-- ============ REPORTS ============
drop policy if exists "reports_modify_staff" on public.reports;
create policy "reports_modify_staff"
  on public.reports for all
  to authenticated
  using (public.can_manage_tenant(tenant_id))
  with check (public.can_manage_tenant(tenant_id));

drop policy if exists "reports_select_customer" on public.reports;
create policy "reports_select_customer"
  on public.reports for select
  to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = reports.customer_id
        and c.user_id = auth.uid()
    )
  );

-- ============ AUDIT LOG ============
drop policy if exists "audit_select_admin" on public.audit_log;
create policy "audit_select_admin"
  on public.audit_log for select
  to authenticated
  using (
    public.is_super_admin()
    or (
      tenant_id is not null
      and exists (
        select 1 from public.memberships m
        where m.tenant_id = audit_log.tenant_id
          and m.user_id = auth.uid()
          and m.role in ('super_admin', 'tenant_owner')
          and m.is_active = true
      )
    )
  );

-- Insert: trigger üzerinden (security definer), anon insert engellenir
drop policy if exists "audit_no_insert" on public.audit_log;
create policy "audit_no_insert"
  on public.audit_log for insert
  to authenticated
  with check (false);

-- ============ RATE LIMITS ============
-- Sadece super_admin görebilir
drop policy if exists "rate_limits_select_admin" on public.rate_limits;
create policy "rate_limits_select_admin"
  on public.rate_limits for select
  to authenticated
  using (public.is_super_admin());

drop policy if exists "rate_limits_insert_all" on public.rate_limits;
create policy "rate_limits_insert_all"
  on public.rate_limits for insert
  to anon, authenticated
  with check (true);

drop policy if exists "rate_limits_modify_admin" on public.rate_limits;
create policy "rate_limits_modify_admin"
  on public.rate_limits for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- =====================================================
-- RATE LIMITING FUNCTION (web form spam koruması)
-- =====================================================
create or replace function public.check_rate_limit(
  p_bucket text,
  p_identifier text,
  p_max_count int default 5,
  p_window interval default '1 hour'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Eski kayıtları temizle
  delete from public.rate_limits
  where bucket = p_bucket and identifier = p_identifier and expires_at < now();

  -- Son pencere sayısı
  select coalesce(sum(count), 0) into v_count
  from public.rate_limits
  where bucket = p_bucket
    and identifier = p_identifier
    and window_start > now() - p_window;

  if v_count >= p_max_count then
    return false;
  end if;

  -- Sayaç artır
  insert into public.rate_limits (bucket, identifier, count, window_start, expires_at)
  values (p_bucket, p_identifier, 1, now(), now() + p_window);

  return true;
end; $$;

-- =====================================================
-- SUBMIT CONTACT FORM (güvenli RPC — anon çağırabilir)
-- =====================================================
create or replace function public.submit_contact_form(
  p_tenant_slug text,
  p_sender_name text,
  p_sender_phone text,
  p_sender_email text default null,
  p_service text default null,
  p_body text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_message_id uuid;
  v_ip inet := nullif(current_setting('request.headers', true)::json->>'x-forwarded-for', '')::inet;
  v_ip_text text := coalesce(v_ip::text, '');
begin
  -- Tenant bul
  select id into v_tenant_id
  from public.tenants
  where slug = p_tenant_slug and status = 'active';

  if v_tenant_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_tenant');
  end if;

  -- Rate limit (IP başına)
  if not public.check_rate_limit(
    'message_submit',
    coalesce(v_ip_text, 'unknown'),
    5,        -- max 5 mesaj
    '1 hour'  -- 1 saatte
  ) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  -- Validasyon
  if p_sender_name is null or length(trim(p_sender_name)) < 2 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if p_sender_phone is null or length(trim(p_sender_phone)) < 7 then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;
  if p_body is null or length(trim(p_body)) < 5 then
    return jsonb_build_object('ok', false, 'error', 'invalid_body');
  end if;

  -- Insert
  insert into public.messages (
    tenant_id, sender_name, sender_phone, sender_email,
    service_interest, body, source, ip_address, status
  ) values (
    v_tenant_id,
    trim(p_sender_name),
    trim(p_sender_phone),
    nullif(trim(coalesce(p_sender_email, '')), ''),
    nullif(trim(coalesce(p_service, '')), ''),
    trim(p_body),
    'web',
    v_ip,
    'new'
  ) returning id into v_message_id;

  return jsonb_build_object('ok', true, 'id', v_message_id);
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error');
end; $$;

-- =====================================================
-- GRANT'LAR
-- =====================================================
-- Anon: sadece public read (tenants, projects, concepts, services)
grant usage on schema public to anon, authenticated;
grant select on public.tenants, public.services, public.concept_designs, public.projects to anon;
grant insert on public.messages to anon;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Authenticated: RLS üzerinden her tabloya erişim
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Service role bypass
alter table public.tenants            force row level security;
alter table public.profiles           force row level security;
alter table public.memberships        force row level security;
alter table public.projects           force row level security;
alter table public.concept_designs    force row level security;
alter table public.services           force row level security;
alter table public.customers          force row level security;
alter table public.messages           force row level security;
alter table public.reports            force row level security;
alter table public.audit_log          force row level security;
alter table public.rate_limits        force row level security;