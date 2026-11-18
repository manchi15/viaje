const env = import.meta.env || {};
// These are public browser credentials (the publishable key is safe to expose).
// Keep the .env overrides for local development and compiled deployments, while
// allowing GitHub's direct branch publishing to connect without Vite injection.
const DEFAULT_SUPABASE_URL = 'https://vzmlftmtsycmzufcuzbz.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YDQ6KsU23ds5di7cT4SGtQ_HT-xPybW';
const API_URL = String(env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
const API_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
const SESSION_KEY = 'nexora-auth-session-v1';
const BUCKET = 'nexora-photos';

export const isSupabaseConfigured = Boolean(API_URL && API_KEY);
let session = readSession();
let refreshTask;

function readSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return value?.access_token && value?.refresh_token ? value : null;
  } catch { return null; }
}

function saveSession(value) {
  session = value?.access_token
    ? { ...value, expires_at: value.expires_at || Math.floor(Date.now() / 1000) + Number(value.expires_in || 3600) }
    : null;
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* La sesión en memoria todavía permite usar esta pestaña. */ }
  window.dispatchEvent(new CustomEvent('nexora:auth-changed', { detail: session }));
  return session;
}

export function currentSession() { return session; }
export function currentUser() { return session?.user || null; }

async function refreshSession() {
  if (!session?.refresh_token) return null;
  if (!refreshTask) {
    refreshTask = fetch(`${API_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = apiError(payload, response.status);
        if (response.status === 400 || response.status === 401) saveSession(null);
        throw error;
      }
      return saveSession(payload);
    }).finally(() => { refreshTask = null; });
  }
  return refreshTask;
}

async function accessToken() {
  if (!session?.access_token) return null;
  if (Number(session.expires_at || 0) * 1000 < Date.now() + 45_000) await refreshSession();
  return session?.access_token || null;
}

async function request(path, { method = 'GET', body, headers = {}, auth = true, raw = false } = {}) {
  if (!isSupabaseConfigured) throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY para conectar NEXORA.');
  const token = auth ? await accessToken() : null;
  const jsonBody = body != null && !(body instanceof Blob);
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      apikey: API_KEY,
      ...(jsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
      Authorization: `Bearer ${token || API_KEY}`,
    },
    body: body == null ? undefined : jsonBody ? JSON.stringify(body) : body,
  });
  if (raw && response.ok) return response;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw apiError(payload, response.status);
  return payload;
}

function apiError(payload, status) {
  const error = new Error(payload.msg || payload.message || payload.error_description || payload.error || `Supabase respondió ${status}.`);
  error.code = payload.code || payload.error_code || String(status);
  error.status = status;
  return error;
}

export async function restoreSession() {
  if (!isSupabaseConfigured) throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY para conectar NEXORA.');
  if (session) {
    try { await accessToken(); }
    catch (error) {
      if (session) throw error;
    }
  }
  if (session) return session;

  const createGuestSession = async () => {
    session = readSession();
    if (session) {
      await accessToken();
      if (session) return session;
    }
    const result = await request('/auth/v1/signup', {
      method: 'POST',
      auth: false,
      body: { data: {} },
    });
    if (!result.access_token || !result.refresh_token || !result.user?.is_anonymous) {
      throw new Error('Supabase no creó una sesión anónima. Habilita los inicios de sesión anónimos en la configuración de Auth.');
    }
    saveSession(result);
    return session;
  };

  if (navigator.locks?.request) {
    return navigator.locks.request(SESSION_KEY, { mode: 'exclusive' }, createGuestSession);
  }
  return createGuestSession();
}

export function selectRows(table, query = '') {
  return request(`/rest/v1/${encodeURIComponent(table)}?${query}`, { headers: { Accept: 'application/json' } });
}

export function insertRow(table, value, { returning = 'representation' } = {}) {
  return request(`/rest/v1/${encodeURIComponent(table)}`, {
    method: 'POST', body: value, headers: { Prefer: `return=representation`, ...(returning === 'minimal' ? { Prefer: 'return=minimal' } : {}) },
  });
}

export function updateRows(table, query, value) {
  return request(`/rest/v1/${encodeURIComponent(table)}?${query}`, { method: 'PATCH', body: value, headers: { Prefer: 'return=representation' } });
}

export function deleteRows(table, query, { returning = 'minimal' } = {}) {
  return request(`/rest/v1/${encodeURIComponent(table)}?${query}`, {
    method: 'DELETE',
    headers: { Prefer: `return=${returning}` },
  });
}

export function callRpc(name, args = {}) {
  return request(`/rest/v1/rpc/${encodeURIComponent(name)}`, { method: 'POST', body: args });
}

export async function uploadPrivateObject(path, file) {
  const safePath = path.split('/').map(encodeURIComponent).join('/');
  return request(`/storage/v1/object/${BUCKET}/${safePath}`, {
    method: 'POST', body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
  });
}

export function removePrivateObjects(paths) {
  return request(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', body: { prefixes: paths } });
}

export async function signedObjectUrl(path, expiresIn = 3600) {
  const safePath = path.split('/').map(encodeURIComponent).join('/');
  const result = await request(`/storage/v1/object/sign/${BUCKET}/${safePath}`, {
    method: 'POST', body: { expiresIn },
  });
  return result.signedURL?.startsWith('http') ? result.signedURL : `${API_URL}/storage/v1${result.signedURL}`;
}

export async function signedObjectUrls(paths, expiresIn = 3600) {
  if (!paths.length) return [];
  const result = await request(`/storage/v1/object/sign/${BUCKET}`, {
    method: 'POST', body: { paths, expiresIn },
  });
  return result.map((entry) => ({
    path: entry.path,
    signedURL: entry.signedURL?.startsWith('http') ? entry.signedURL : `${API_URL}/storage/v1${entry.signedURL}`,
  }));
}

window.addEventListener('storage', (event) => {
  if (event.key === SESSION_KEY) {
    session = readSession();
    window.dispatchEvent(new CustomEvent('nexora:auth-changed', { detail: session }));
  }
});
