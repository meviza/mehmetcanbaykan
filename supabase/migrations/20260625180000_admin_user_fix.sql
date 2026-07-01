-- =====================================================
-- Admin kullanıcı oluştur (Supabase uyumlu)
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştır.
-- =====================================================

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'can.mimarlik.56@gmail.com';
  v_password text := 'Mehmet2026!'; -- İlk girişten sonra değiştir!
begin
  -- Önce mevcut kullanıcıyı sil (eğer varsa)
  delete from auth.identities where user_id in (select id from auth.users where email = v_email);
  delete from auth.users where email = v_email;

  -- Yeni kullanıcı oluştur (Supabase'in hash'leme fonksiyonunu kullanır)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),  -- bcrypt (Supabase uyumlu)
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
    format('{"sub":"%s","email":"%s"}', v_user_id, v_email)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  raise notice '✅ Admin kullanıcı oluşturuldu: %', v_email;
  raise notice '🔑 Şifre: %', v_password;
  raise notice '⚠️  İlk girişten sonra şifreyi değiştirin!';
end $$;
