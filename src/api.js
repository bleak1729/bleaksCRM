// Capa de acceso a la API del servidor Express

const TOKEN_KEY = 'bleaks-crm-token'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}`,
})

// ── Auth ──────────────────────────────────────────────────────────
export const getAuthStatus = () =>
  fetch('/api/auth/status').then(r => r.json())

export const login = (username, password) =>
  fetch('/api/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const setupAccount = (username, password) =>
  fetch('/api/auth/setup', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const saveToken   = token  => localStorage.setItem(TOKEN_KEY, token)
export const clearToken  = ()     => localStorage.removeItem(TOKEN_KEY)
export const getToken    = ()     => localStorage.getItem(TOKEN_KEY)

// ── Datos ─────────────────────────────────────────────────────────
export const getHealth = () => fetch('/api/health').then(r => r.json())

export const loadData  = () =>
  fetch('/api/data', { headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const saveData  = data =>
  fetch('/api/data', {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(data),
  }).then(r => r.json())

// Análisis digital de un lead (URL + sector + PageSpeed)
export const analyzeLead = ({ url, sector, phone, email }) =>
  fetch('/api/analyze', {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ url, sector, phone, email }),
  }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

// Búsqueda síncrona — devuelve { leads, total, query } directamente
export const startSearch = body =>
  fetch('/api/search', {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  }).then(r => {
    if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error)))
    return r.json()
  })
