// Capa de acceso a la API del servidor Express

export const getHealth = () => fetch('/api/health').then(r => r.json())

export const loadData  = () => fetch('/api/data').then(r => r.json())

export const saveData  = data =>
  fetch('/api/data', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  }).then(r => r.json())

// Búsqueda síncrona — devuelve { leads, total, query } directamente
export const startSearch = body =>
  fetch('/api/search', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  }).then(r => {
    if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error)))
    return r.json()
  })
