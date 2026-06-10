// Capa de acceso a la API del servidor Express

import type {
  Customer, CustomerContact, DataPayload, DocumentItem,
  Health, Invoice, Project, SearchParams, SearchResult,
} from './types'

const TOKEN_KEY = 'bleaks-crm-token'
const USER_KEY  = 'bleaks-crm-user'

export const saveToken  = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = ()              => localStorage.removeItem(TOKEN_KEY)
export const getToken   = ()              => localStorage.getItem(TOKEN_KEY)

interface RequestOptions {
  method?: string
  body?: unknown
  /** false para endpoints públicos (login, setup...) */
  auth?: boolean
}

// Helper único: serializa el body, añade el Bearer token y normaliza errores.
// Un 401 en una llamada autenticada significa sesión caducada → vuelta al login.
async function request<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) headers.Authorization = `Bearer ${getToken() || ''}`

  const r = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (auth && r.status === 401) {
    // Solo recargar si había una sesión que caducó: tras clearToken() un
    // segundo 401 ya no tiene token y no recarga (evita bucles de reload)
    const hadToken = !!getToken()
    clearToken()
    localStorage.removeItem(USER_KEY)
    if (hadToken) window.location.reload()
    throw new Error('Sesión expirada')
  }

  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { error?: string }).error || `Error HTTP ${r.status}`)
  return data as T
}

// ── Auth ──────────────────────────────────────────────────────────
export const getAuthStatus = () =>
  request<{ hasUsers: boolean }>('/api/auth/status', { auth: false })

export const login = (username: string, password: string) =>
  request<{ token: string; username: string }>('/api/auth/login', { method: 'POST', body: { username, password }, auth: false })

export const setupAccount = (username: string, password: string) =>
  request<{ token: string; username: string; recoveryKey: string }>('/api/auth/setup', { method: 'POST', body: { username, password }, auth: false })

export const recoverPassword = (username: string, recoveryKey: string, newPassword: string) =>
  request<{ ok: boolean }>('/api/auth/recover', { method: 'POST', body: { username, recoveryKey, newPassword }, auth: false })

export const regenerateRecoveryKey = () =>
  request<{ recoveryKey: string }>('/api/auth/recovery-key/regenerate', { method: 'POST' })

// ── Datos ─────────────────────────────────────────────────────────
export const getHealth = () => request<Health>('/api/health', { auth: false })

export const loadData = () => request<DataPayload>('/api/data')

export const saveData = (data: DataPayload) =>
  request<{ ok: boolean; deleted: number }>('/api/data', { method: 'POST', body: data })

// Búsqueda síncrona — devuelve { leads, total, query } directamente
export const startSearch = (body: SearchParams) =>
  request<SearchResult>('/api/search', { method: 'POST', body })

// Autocompletado de provincias/ciudades acotado por país (Places Autocomplete)
export interface GeoSuggestion { name: string; detail: string }
export const suggestGeo = (params: { type: 'region' | 'city'; country: string; region?: string; q: string }) => {
  const qs = new URLSearchParams({
    type: params.type,
    country: params.country,
    region: params.region || '',
    q: params.q,
  })
  return request<{ suggestions: GeoSuggestion[] }>(`/api/geo/suggest?${qs}`)
}

// Genera el prompt para landing page en Claude.ai
export const generateLandingPrompt = (leadId: string) =>
  request<{ prompt: string; lead: { name: string; sector: string; socials: Record<string, string> } }>(
    '/api/landing/prompt', { method: 'POST', body: { leadId } })

// Detección automática de redes sociales desde la web del lead
export const findSocial = (body: { url?: string; name?: string }) =>
  request<{ found: Record<string, string>; searchUrls: Record<string, string> }>('/api/social', { method: 'POST', body })

// Análisis digital de un lead (URL + sector + PageSpeed)
export const analyzeLead = (body: { url?: string; sector?: string; phone?: string; email?: string }) =>
  request<{ flaws: string[]; saas: string[] }>('/api/analyze', { method: 'POST', body })

// ── Customers ─────────────────────────────────────────────────────
export const loadCustomers  = ()                                    => request<Customer[]>('/api/customers')
export const createCustomer = (data: Partial<Customer>)             => request<Customer>('/api/customers', { method: 'POST', body: data })
export const updateCustomer = (id: string, data: Partial<Customer>) => request<Customer>(`/api/customers/${id}`, { method: 'PUT', body: data })
export const deleteCustomer = (id: string)                          => request<{ ok: boolean }>(`/api/customers/${id}`, { method: 'DELETE' })

// ── Projects ──────────────────────────────────────────────────────
export const loadProjects  = (customerId?: string)                 => request<Project[]>(`/api/projects${customerId ? `?customer_id=${customerId}` : ''}`)
export const createProject = (data: Partial<Project>)              => request<Project>('/api/projects', { method: 'POST', body: data })
export const updateProject = (id: string, data: Partial<Project>)  => request<Project>(`/api/projects/${id}`, { method: 'PUT', body: data })
export const deleteProject = (id: string)                          => request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' })

// ── Customer Contacts ─────────────────────────────────────────────
export const loadContacts  = (customerId?: string)                        => request<CustomerContact[]>(`/api/customer-contacts${customerId ? `?customer_id=${customerId}` : ''}`)
export const createContact = (data: Partial<CustomerContact>)             => request<CustomerContact>('/api/customer-contacts', { method: 'POST', body: data })
export const updateContact = (id: string, data: Partial<CustomerContact>) => request<CustomerContact>(`/api/customer-contacts/${id}`, { method: 'PUT', body: data })
export const deleteContact = (id: string)                                 => request<{ ok: boolean }>(`/api/customer-contacts/${id}`, { method: 'DELETE' })

// ── Invoices ──────────────────────────────────────────────────────
export const loadInvoices  = (customerId?: string)                 => request<Invoice[]>(`/api/invoices${customerId ? `?customer_id=${customerId}` : ''}`)
export const createInvoice = (data: Partial<Invoice>)              => request<Invoice>('/api/invoices', { method: 'POST', body: data })
export const updateInvoice = (id: string, data: Partial<Invoice>)  => request<Invoice>(`/api/invoices/${id}`, { method: 'PUT', body: data })
export const deleteInvoice = (id: string)                          => request<{ ok: boolean }>(`/api/invoices/${id}`, { method: 'DELETE' })

export const downloadInvoicePdf = (id: string) => {
  fetch(`/api/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${getToken() || ''}` } })
    .then(r => {
      if (!r.ok) throw new Error('No se pudo descargar el PDF')
      return r.blob()
    })
    .then(blob => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `factura-${id}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    })
    .catch(() => { /* el botón de la UI ya muestra el estado */ })
}

// ── Documents ─────────────────────────────────────────────────────
export const loadDocuments  = (customerId?: string)                     => request<DocumentItem[]>(`/api/documents${customerId ? `?customer_id=${customerId}` : ''}`)
export const createDocument = (data: Partial<DocumentItem>)             => request<DocumentItem>('/api/documents', { method: 'POST', body: data })
export const updateDocument = (id: string, data: Partial<DocumentItem>) => request<DocumentItem>(`/api/documents/${id}`, { method: 'PUT', body: data })
export const deleteDocument = (id: string)                              => request<{ ok: boolean }>(`/api/documents/${id}`, { method: 'DELETE' })
