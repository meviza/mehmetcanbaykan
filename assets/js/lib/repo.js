/**
 * Veri erişim katmanı (repository)
 * Tüm Supabase sorguları burada toplanır; UI katmanı bunları çağırır.
 * Çevrimdışı modda localStorage fallback uygular.
 */
import { getClient } from './db.js';
import { SUPABASE_CONFIG } from '../config.js';

const LS_KEYS = {
  customers: 'mcb:customers',
  projects: 'mcb:projects',
  permits: 'mcb:permits',
  documents: 'mcb:documents',
  conversations: 'mcb:conversations',
  messages: 'mcb:messages',
  reports: 'mcb:reports'
};

// ----------------- LOCAL STORAGE FALLBACK -----------------
function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function genId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ----------------- ORTAK YARDIMCI -----------------
async function sb() { return await getClient(); }

// ----------------- CUSTOMERS -----------------
export async function listCustomers() {
  const c = await sb();
  if (!c) return lsGet(LS_KEYS.customers);
  const { data, error } = await c.from('v_customer_summary').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function createCustomer(payload) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.customers);
    const row = { id: genId(), created_at: new Date().toISOString(), ...payload };
    list.push(row); lsSet(LS_KEYS.customers, list);
    return row;
  }
  const { data, error } = await c.from('customers').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id, patch) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.customers);
    const i = list.findIndex(x => x.id === id);
    if (i < 0) throw new Error('Customer not found');
    list[i] = { ...list[i], ...patch, updated_at: new Date().toISOString() };
    lsSet(LS_KEYS.customers, list);
    return list[i];
  }
  const { data, error } = await c.from('customers').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.customers).filter(x => x.id !== id);
    lsSet(LS_KEYS.customers, list);
    return true;
  }
  const { error } = await c.from('customers').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ----------------- PROJECTS -----------------
export async function listPublishedProjects() {
  const c = await sb();
  if (!c) return lsGet(LS_KEYS.projects).filter(p => p.is_published);
  const { data, error } = await c.from('projects')
    .select('*').eq('is_published', true)
    .order('display_order').order('year', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listAllProjects() {
  const c = await sb();
  if (!c) return lsGet(LS_KEYS.projects);
  const { data, error } = await c.from('v_project_summary').select('*').order('display_order').order('year', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProject(id) {
  const c = await sb();
  if (!c) return lsGet(LS_KEYS.projects).find(p => p.id === id);
  const { data, error } = await c.from('projects').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createProject(payload) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.projects);
    const row = { created_at: new Date().toISOString(), ...payload };
    list.push(row); lsSet(LS_KEYS.projects, list);
    return row;
  }
  const { data, error } = await c.from('projects').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(id, patch) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.projects);
    const i = list.findIndex(x => x.id === id);
    if (i < 0) throw new Error('Project not found');
    list[i] = { ...list[i], ...patch };
    lsSet(LS_KEYS.projects, list);
    return list[i];
  }
  const { data, error } = await c.from('projects').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id) {
  const c = await sb();
  if (!c) {
    lsSet(LS_KEYS.projects, lsGet(LS_KEYS.projects).filter(x => x.id !== id));
    return true;
  }
  const { error } = await c.from('projects').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ----------------- PERMITS -----------------
export async function listPermitsByProject(projectId) {
  const c = await sb();
  if (!c) return lsGet(LS_KEYS.permits).filter(p => p.project_id === projectId);
  const { data, error } = await c.from('permits').select('*').eq('project_id', projectId).order('applied_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listAllPermits() {
  const c = await sb();
  if (!c) return lsGet(LS_KEYS.permits);
  const { data, error } = await c.from('permits').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPermit(payload) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.permits);
    const row = { id: genId(), created_at: new Date().toISOString(), ...payload };
    list.push(row); lsSet(LS_KEYS.permits, list);
    return row;
  }
  const { data, error } = await c.from('permits').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updatePermit(id, patch) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.permits);
    const i = list.findIndex(x => x.id === id);
    if (i < 0) throw new Error('Permit not found');
    list[i] = { ...list[i], ...patch };
    lsSet(LS_KEYS.permits, list);
    return list[i];
  }
  const { data, error } = await c.from('permits').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePermit(id) {
  const c = await sb();
  if (!c) {
    lsSet(LS_KEYS.permits, lsGet(LS_KEYS.permits).filter(x => x.id !== id));
    return true;
  }
  const { error } = await c.from('permits').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ----------------- MESSAGES / CONVERSATIONS -----------------
export async function listMessages(filters = {}) {
  const c = await sb();
  if (!c) {
    let list = lsGet(LS_KEYS.messages);
    if (filters.status && filters.status !== 'all') list = list.filter(m => (m.status || 'new') === filters.status);
    return list.sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''));
  }
  let q = c.from('messages').select('*, customer:customer_id(name, phone, email), conversation:conversation_id(subject)').order('sent_at', { ascending: false });
  if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function submitContactForm(payload) {
  const c = await sb();
  if (!c) {
    // Çevrimdışı: localStorage'a kaydet
    const list = lsGet(LS_KEYS.messages);
    const row = {
      id: genId(), sent_at: new Date().toISOString(),
      status: 'new', direction: 'inbound', channel: 'web',
      ...payload
    };
    list.push(row); lsSet(LS_KEYS.messages, list);
    return row.id;
  }
  const { data, error } = await c.rpc(SUPABASE_CONFIG.rpc.submitContactForm, {
    p_sender_name: payload.sender_name,
    p_sender_phone: payload.sender_phone,
    p_sender_email: payload.sender_email || null,
    p_service: payload.service || null,
    p_body: payload.body,
    p_project_interest: payload.project_interest || null
  });
  if (error) throw error;
  return data;
}

export async function updateMessage(id, patch) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.messages);
    const i = list.findIndex(x => x.id === id);
    if (i < 0) throw new Error('Message not found');
    list[i] = { ...list[i], ...patch };
    lsSet(LS_KEYS.messages, list);
    return list[i];
  }
  const { data, error } = await c.from('messages').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMessage(id) {
  const c = await sb();
  if (!c) {
    lsSet(LS_KEYS.messages, lsGet(LS_KEYS.messages).filter(x => x.id !== id));
    return true;
  }
  const { error } = await c.from('messages').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ----------------- REPORTS -----------------
export async function listReports(filters = {}) {
  const c = await sb();
  if (!c) {
    let list = lsGet(LS_KEYS.reports);
    if (filters.status) list = list.filter(r => r.status === filters.status);
    if (filters.type) list = list.filter(r => r.type === filters.type);
    return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }
  let q = c.from('reports').select('*, customer:customer_id(name), project:project_id(title)').order('created_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.type) q = q.eq('type', filters.type);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createReport(payload) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.reports);
    const row = { id: genId(), created_at: new Date().toISOString(), status: 'open', priority: 'normal', ...payload };
    list.unshift(row); lsSet(LS_KEYS.reports, list);
    return row;
  }
  const { data: { user } } = await c.auth.getUser();
  const { data, error } = await c.from('reports').insert({ ...payload, created_by: user?.id || null }).select().single();
  if (error) throw error;
  return data;
}

export async function updateReport(id, patch) {
  const c = await sb();
  if (!c) {
    const list = lsGet(LS_KEYS.reports);
    const i = list.findIndex(x => x.id === id);
    if (i < 0) throw new Error('Report not found');
    list[i] = { ...list[i], ...patch };
    lsSet(LS_KEYS.reports, list);
    return list[i];
  }
  const { data, error } = await c.from('reports').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteReport(id) {
  const c = await sb();
  if (!c) {
    lsSet(LS_KEYS.reports, lsGet(LS_KEYS.reports).filter(x => x.id !== id));
    return true;
  }
  const { error } = await c.from('reports').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ----------------- DASHBOARD -----------------
export async function getDashboardStats() {
  const [customers, projects, messages, reports] = await Promise.all([
    listCustomers().catch(() => []),
    listAllProjects().catch(() => []),
    listMessages({ status: 'new' }).catch(() => []),
    listReports({ status: 'open' }).catch(() => [])
  ]);
  return {
    customerCount: customers.length,
    projectCount: projects.length,
    publishedCount: projects.filter(p => p.is_published).length,
    newMessages: messages.length,
    openReports: reports.length,
    activePermits: (await listAllPermits().catch(() => []))
      .filter(p => ['basvuruldu', 'incelemede', 'eksik-evrak'].includes(p.status)).length
  };
}
