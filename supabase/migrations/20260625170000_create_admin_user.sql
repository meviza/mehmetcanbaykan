-- Migration: 20260625170000_create_admin_user
-- Mehmet Can Baykan için admin kullanıcısı oluşturur

do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  if exists(select 1 from auth.users where email = 'can.mimarlik.56@gmail.com') then
    raise notice 'Admin user zaten mevcut, atlıyorum.';
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'can.mimarlik.56@gmail.com',
    extensions.crypt('MehmetCan2026!Architect', extensions.gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mehmet Can Baykan","role":"admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    format('{"sub":"%s","email":"%s"}', v_user_id, 'can.mimarlik.56@gmail.com')::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  raise notice 'Admin user oluşturuldu: %', v_user_id;
end $$;