const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function request(path, { password, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(password ? { 'x-admin-password': password } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Sem comunicacao com a API. Confira se o servidor local esta em execucao.');
  }
  let payload;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) {
    throw new Error(payload.error || `Falha no servidor (HTTP ${response.status}).`);
  }
  return payload;
}

// No Render Static Site os dados publicados sao arquivos JSON de SOMENTE LEITURA.
// No Windows/local continuamos usando normalmente a API administrativa.
export const getPublicUnit = (slug) => import.meta.env.VITE_PUBLIC_STATIC === 'true'
  ? request(`/public-data/${encodeURIComponent(slug)}.json`)
  : request(`/api/public/units/${encodeURIComponent(slug)}`);
export const loginAdmin = (password) => request('/api/admin/login', { method: 'POST', password });
export const adminRequest = (password, path, options = {}) => request(path, { ...options, password });
export const bodyJson = (data) => JSON.stringify(data);
