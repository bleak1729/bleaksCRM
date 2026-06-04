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

// ── Customers ─────────────────────────────────────────────────────
export const loadCustomers = () =>
  fetch('/api/customers', { headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const createCustomer = data =>
  fetch('/api/customers', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const updateCustomer = (id, data) =>
  fetch(`/api/customers/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const deleteCustomer = id =>
  fetch(`/api/customers/${id}`, { method: 'DELETE', headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

// ── Projects ──────────────────────────────────────────────────────
export const loadProjects = (customerId) =>
  fetch(`/api/projects${customerId ? `?customer_id=${customerId}` : ''}`, { headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const createProject = data =>
  fetch('/api/projects', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const updateProject = (id, data) =>
  fetch(`/api/projects/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const deleteProject = id =>
  fetch(`/api/projects/${id}`, { method: 'DELETE', headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

// ── Customer Contacts ─────────────────────────────────────────────
export const loadContacts = (customerId) =>
  fetch(`/api/customer-contacts?customer_id=${customerId}`, { headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const createContact = data =>
  fetch('/api/customer-contacts', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const updateContact = (id, data) =>
  fetch(`/api/customer-contacts/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const deleteContact = id =>
  fetch(`/api/customer-contacts/${id}`, { method: 'DELETE', headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

// ── Invoices ──────────────────────────────────────────────────────
export const loadInvoices = (customerId) =>
  fetch(`/api/invoices${customerId ? `?customer_id=${customerId}` : ''}`, { headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const createInvoice = data =>
  fetch('/api/invoices', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const updateInvoice = (id, data) =>
  fetch(`/api/invoices/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const deleteInvoice = id =>
  fetch(`/api/invoices/${id}`, { method: 'DELETE', headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const downloadInvoicePdf = (id) => {
  const token = localStorage.getItem('bleaks-crm-token') || ''
  const a = document.createElement('a')
  a.href = `/api/invoices/${id}/pdf`
  a.target = '_blank'
  // Pasamos el token via fetch para forzar descarga
  fetch(a.href, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `factura-${id}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    })
}

// ── Documents ─────────────────────────────────────────────────────
export const loadDocuments = (customerId) =>
  fetch(`/api/documents${customerId ? `?customer_id=${customerId}` : ''}`, { headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const createDocument = data =>
  fetch('/api/documents', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const updateDocument = (id, data) =>
  fetch(`/api/documents/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

export const deleteDocument = id =>
  fetch(`/api/documents/${id}`, { method: 'DELETE', headers: authHeaders() })
    .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))

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
