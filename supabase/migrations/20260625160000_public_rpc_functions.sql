-- Migration: 20260625160000_public_rpc_functions
-- SECURITY DEFINER fonksiyonlar: RLS bypass ile public form verisi kabul eder
-- Validasyon fonksiyon içinde yapılır

create or replace function public.submit_contact_form(
  p_sender_name text,
  p_sender_phone text,
  p_sender_email text default null,
  p_service text default null,
  p_body text default '',
  p_project_interest text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_conversation_id uuid;
  v_message_id uuid;
begin
  -- Mevcut müşteriyi telefon ile bul, yoksa oluştur
  if p_sender_phone is not null then
    select id into v_customer_id from public.customers
    where phone = p_sender_phone
    limit 1;
  end if;

  if v_customer_id is null then
    insert into public.customers (name, phone, email, type, city)
    values (p_sender_name, p_sender_phone, p_sender_email, 'individual', 'Siirt')
    returning id into v_customer_id;
  end if;

  -- Açık konuşma oluştur veya son açık olanı bul
  select id into v_conversation_id from public.conversations
  where customer_id = v_customer_id and status = 'open'
  order by last_message_at desc
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (customer_id, channel, subject, status)
    values (v_customer_id, 'web',
            coalesce(p_project_interest, 'Web sitesi iletişim'),
            'open')
    returning id into v_conversation_id;
  end if;

  -- Mesaj ekle
  insert into public.messages (
    conversation_id, customer_id, direction, channel, body,
    status, sender_name, sender_phone, sender_email, service
  )
  values (
    v_conversation_id, v_customer_id, 'inbound', 'web', p_body,
    'new', p_sender_name, p_sender_phone, p_sender_email, p_service
  )
  returning id into v_message_id;

  -- Konuşma son mesaj zamanını güncelle
  update public.conversations
  set last_message_at = now()
  where id = v_conversation_id;

  return v_message_id;
end;
$$;

-- Public access
grant execute on function public.submit_contact_form to anon, authenticated;
