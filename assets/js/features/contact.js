/**
 * İletişim formu: web sitesi ziyaretçisinden gelen talep.
 * Hem Supabase'e (submit_contact_form RPC) hem de WhatsApp'a yönlendirir.
 */
import { submitContactForm } from '../lib/repo.js';
import { $, escapeHtml, toast } from '../lib/ui.js';

const SERVICE_LABELS = {
  'Restorasyon': 'Restorasyon projesi',
  'İç Tasarım / İç Mimari': 'İç mimari çalışması',
  'Vaziyet Planı': 'Vaziyet planı',
  'Kat Planları': 'Kat planı',
  'Peyzaj': 'Peyzaj düzenlemesi',
  'Taş & Ahşap Ev (Rüristik)': 'Taş/ahşap ev projesi'
};

export function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(form);
    const payload = {
      sender_name: data.get('name')?.toString().trim() || '',
      sender_phone: data.get('phone')?.toString().trim() || '',
      sender_email: data.get('email')?.toString().trim() || '',
      service: data.get('service')?.toString().trim() || '',
      body: data.get('message')?.toString().trim() || '',
      project_interest: data.get('service')?.toString().trim() || ''
    };

    if (!payload.sender_name || !payload.sender_phone || !payload.service || !payload.body) {
      toast('Lütfen zorunlu alanları doldurun.', 'error');
      return;
    }

    // WhatsApp metni oluştur
    const text = [
      'Merhaba Mehmet Can Bey, web sitenizden yazıyorum.',
      '',
      `Ad Soyad: ${payload.sender_name}`,
      `Telefon: ${payload.sender_phone}`,
      payload.sender_email ? `E-posta: ${payload.sender_email}` : null,
      `Proje Türü: ${SERVICE_LABELS[payload.service] || payload.service}`,
      '',
      'Mesaj:',
      payload.body
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/905427351316?text=${encodeURIComponent(text)}`;

    // Optimistik olarak WhatsApp'ı aç, arka planda DB'ye kaydet
    window.open(url, '_blank', 'noopener');

    try {
      await submitContactForm(payload);
      toast('Mesajınız iletildi. WhatsApp üzerinden de yazabilirsiniz.', 'success');
      form.reset();
    } catch (err) {
      console.warn('DB kaydı başarısız (WhatsApp yine açıldı):', err);
      toast('WhatsApp açıldı, ancak kayıt alınamadı.', 'info');
    }
  });
}
