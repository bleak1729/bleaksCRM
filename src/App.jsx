import { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar }   from './components/ui/modern-side-bar.tsx'
import SearchPanel   from './components/SearchPanel.jsx'
import KPIStrip      from './components/KPIStrip.jsx'
import LeadTable     from './components/LeadTable.tsx'
import LeadEditModal from './components/LeadEditModal.tsx'
import Dashboard     from './components/Dashboard.tsx'
import { getHealth, loadData, saveData, startSearch } from './api.js'
import { INIT_LEADS } from './data/init-leads.js'


// Inicializa el tema desde localStorage (evita flash antes del primer render)
const getInitialTheme = () => {
  const saved = localStorage.getItem('bleaks-crm-theme')
  return saved === 'dark' ? 'dark' : 'light'   // light por defecto
}

export default function App() {
  // ── State ─────────────────────────────────────────────────────
  const [leads,     setLeads]     = useState([])
  const [activeNav, setActiveNav] = useState('busqueda')
  const [theme,     setTheme]     = useState(getInitialTheme)
  const [contacts, setContacts] = useState({})
  const [notes,    setNotes]    = useState({})
  const [statuses, setStatuses] = useState({})
  const [filter,   setFilter]   = useState('all')
  const [editModalLead, setEditModalLead] = useState(null) // Lead a editar
  const [health,        setHealth]       = useState(null)
  const [toast,       setToast]        = useState(null)
  const [search,      setSearch]       = useState({ loading: false, status: '', color: '' })

  // Refs to latest state for async closures
  const leadsRef    = useRef(leads)
  const contactsRef = useRef(contacts)
  const notesRef    = useRef(notes)
  const statusesRef = useRef(statuses)

  useEffect(() => { leadsRef.current    = leads    }, [leads])
  useEffect(() => { contactsRef.current = contacts }, [contacts])
  useEffect(() => { notesRef.current    = notes    }, [notes])
  useEffect(() => { statusesRef.current = statuses }, [statuses])

  // ── Tema: aplica data-theme al <html> y persiste en localStorage ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('bleaks-crm-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  // ── Load on mount ──────────────────────────────────────────────
  useEffect(() => {
    loadData()
      .then(d => {
        setLeads(   d.leads?.length ? d.leads    : [...INIT_LEADS])
        setContacts(d.contacts  || {})
        setNotes(   d.notes     || {})
        setStatuses(d.statuses  || {})
      })
      .catch(() => setLeads([...INIT_LEADS]))

    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ ok: false, apify: false }))
  }, [])

  // ── Toast ──────────────────────────────────────────────────────
  const toastTimer = useRef(null)
  const showToast = useCallback(msg => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  // ── Persist ────────────────────────────────────────────────────
  const persist = useCallback(async (overrides = {}) => {
    const payload = {
      leads:    overrides.leads    ?? leadsRef.current,
      contacts: overrides.contacts ?? contactsRef.current,
      notes:    overrides.notes    ?? notesRef.current,
      statuses: overrides.statuses ?? statusesRef.current,
      ts: Date.now()
    }
    try { await saveData(payload) } catch { /* fail silently */ }
  }, [])

  // ── Save (manual button) ───────────────────────────────────────
  const handleSave = useCallback(async () => {
    await persist()
    showToast('Guardado correctamente')
  }, [persist, showToast])

  // ── Update lead (desde el modal de edición) ───────────────────
  const updateLead = useCallback((id, updates) => {
    if (updates.lead) {
      setLeads(prev => {
        const next = prev.map(l => l.id === id ? { ...l, ...updates.lead } : l)
        persist({ leads: next })
        return next
      })
    }
    if (updates.status !== undefined) {
      setStatuses(prev => {
        const next = { ...prev, [id]: updates.status }
        persist({ statuses: next })
        return next
      })
    }
    if (updates.note !== undefined) {
      setNotes(prev => {
        const next = { ...prev, [id]: updates.note }
        persist({ notes: next })
        return next
      })
    }
    if (updates.contact !== undefined) {
      setContacts(prev => {
        const next = { ...prev, [id]: updates.contact }
        persist({ contacts: next })
        return next
      })
    }
  }, [persist])

  // ── Google Maps search ────────────────────────────────────────
  const runSearch = useCallback(async ({ city, radius, sector }) => {
    setSearch({ loading: true, status: 'Buscando en Google Maps...', color: 'var(--txt2)' })
    try {
      const { leads: raw, total, query } = await startSearch({ city, radius, sector })

      const existing = new Set(leadsRef.current.map(l => l.name.toLowerCase()))
      const newLeads = (raw || []).filter(l => {
        if (existing.has(l.name.toLowerCase())) return false
        existing.add(l.name.toLowerCase())
        return true
      })
      const nextLeads = [...leadsRef.current, ...newLeads]
      setLeads(nextLeads)
      persist({ leads: nextLeads })
      setSearch({
        loading: false,
        status:  `✓ ${newLeads.length} leads nuevos (${total} resultados para "${query}")`,
        color:   'var(--success)',
      })
      showToast(`+${newLeads.length} leads vía Google Maps`)
    } catch (err) {
      setSearch({ loading: false, status: `Error: ${err.message}`, color: 'var(--danger)' })
    }
  }, [persist, showToast])

  // ── Export JSON ────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ leads, contacts, notes, statuses, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' }
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bleaks-crm-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    showToast('Exportado como JSON')
  }, [leads, contacts, notes, statuses, showToast])

  // ── Export CSV ─────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const esc = v => {
      const s = String(v ?? '')
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const prio = { high: 'Alta', med: 'Media', low: 'Baja' }
    const headers = ['Nombre','Sector','Teléfono','Web','Dirección','Prioridad','Estado','Puntuación','Reseñas','Fallos','SaaS','Notas']
    const rows = leads.map(l => [
      l.name, l.sector, l.phone || '', l.url, l.loc,
      prio[l.priority] || '', statuses[l.id] || 'sin contactar',
      l.rating || '', l.reviews || '',
      (l.flaws || []).join(' | '),
      (l.saas  || []).join(' | '),
      (notes[l.id] || '').replace(/[\n\r]+/g, ' ')
    ])
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bleaks-crm-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    showToast(`CSV exportado · ${leads.length} leads`)
  }, [leads, contacts, notes, statuses, showToast])

  // ── Import JSON ────────────────────────────────────────────────
  const importData = useCallback(e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const d = JSON.parse(ev.target.result)
        if (d.leads)    setLeads(d.leads)
        if (d.contacts) setContacts(d.contacts)
        if (d.notes)    setNotes(d.notes)
        if (d.statuses) setStatuses(d.statuses)
        await persist({ leads: d.leads, contacts: d.contacts, notes: d.notes, statuses: d.statuses })
        showToast(`Importado · ${d.leads?.length || 0} leads`)
      } catch { showToast('Error al importar — archivo inválido') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [persist, showToast])

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <Sidebar
        health={health}
        theme={theme}
        onToggleTheme={toggleTheme}
        leads={leads}
        onSave={handleSave}
        onExportCSV={exportCSV}
        onExportJSON={exportJSON}
        onImport={importData}
        activeNav={activeNav}
        onNavChange={setActiveNav}
      />

      {/* ── CONTENIDO PRINCIPAL ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)' }}>

        {activeNav === 'dashboard' ? (
          /* ── DASHBOARD ───────────────────────────────────────── */
          <Dashboard
            leads={leads}
            statuses={statuses}
            contacts={contacts}
            onNavigate={setActiveNav}
          />
        ) : (
          /* ── BÚSQUEDA + TABLA ────────────────────────────────── */
          <>
            <SearchPanel search={search} onSearch={runSearch} />
            <KPIStrip leads={leads} statuses={statuses} contacts={contacts} />
            <LeadTable
              leads={leads}
              statuses={statuses}
              filter={filter}
              onFilter={setFilter}
              onEdit={lead => setEditModalLead(lead)}
              onDelete={id => {
                setLeads(prev => { const next = prev.filter(l => l.id !== id); persist({ leads: next }); return next })
                showToast('Lead eliminado')
              }}
            />
          </>
        )}
      </div>

      {/* ── MODAL DE EDICIÓN DE LEAD ────────────────────────────── */}
      {editModalLead && (
        <LeadEditModal
          lead={editModalLead}
          status={statuses[editModalLead.id] || 'sin contactar'}
          contact={contacts[editModalLead.id] || {}}
          note={notes[editModalLead.id] || ''}
          onSave={(id, updates) => {
            updateLead(id, updates)
            setEditModalLead(null)
            showToast('Lead actualizado')
          }}
          onClose={() => setEditModalLead(null)}
        />
      )}

      {/* ── TOAST ───────────────────────────────────────────────── */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">{toast}</div>
      )}
    </div>
  )
}
