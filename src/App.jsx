import { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar }       from './components/ui/modern-side-bar.tsx'
import SearchPanel       from './components/SearchPanel.jsx'
import KPIStrip          from './components/KPIStrip.jsx'
import LeadTable         from './components/LeadTable.tsx'
import LeadEditModal     from './components/LeadEditModal.tsx'
import Dashboard         from './components/Dashboard.tsx'
import Login             from './components/Login.tsx'
import NewLeadModal      from './components/NewLeadModal.tsx'
import CustomerList      from './components/CustomerList.tsx'
import { getHealth, loadData, saveData, startSearch, getToken, clearToken,
         loadCustomers, createCustomer, updateCustomer, deleteCustomer,
         loadProjects, createProject, updateProject, deleteProject,
         loadContacts, createContact, updateContact, deleteContact,
         loadInvoices, createInvoice, updateInvoice, deleteInvoice,
         loadDocuments, createDocument, updateDocument, deleteDocument } from './api.js'


// Inicializa el tema desde localStorage (evita flash antes del primer render)
const getInitialTheme = () => {
  const saved = localStorage.getItem('bleaks-crm-theme')
  return saved === 'dark' ? 'dark' : 'light'   // light por defecto
}

export default function App() {
  // ── Auth ───────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState(() => {
    // Si hay token guardado, lo consideramos autenticado hasta que el servidor diga lo contrario
    return getToken() ? localStorage.getItem('bleaks-crm-user') || '' : null
  })

  const handleLogin = (username) => {
    localStorage.setItem('bleaks-crm-user', username)
    setAuthUser(username)
  }

  const handleLogout = () => {
    clearToken()
    localStorage.removeItem('bleaks-crm-user')
    setAuthUser(null)
  }

  // ── State ─────────────────────────────────────────────────────
  const [leads,     setLeads]     = useState([])
  const [activeNav, setActiveNav] = useState('busqueda')
  const [theme,     setTheme]     = useState(getInitialTheme)
  const [contacts,  setContacts]  = useState({})
  const [notes,     setNotes]     = useState({})
  const [statuses,  setStatuses]  = useState({})
  const [filter,    setFilter]    = useState('all')
  const [customers,         setCustomers]         = useState([])
  const [projects,          setProjects]          = useState([])
  const [customerContacts,  setCustomerContacts]  = useState([])
  const [invoices,          setInvoices]          = useState([])
  const [documents,         setDocuments]         = useState([])
  const [editModalLead,  setEditModalLead]  = useState(null)
  const [showNewLead,    setShowNewLead]    = useState(false)
  const [health,        setHealth]       = useState(null)
  const [toast,       setToast]        = useState(null)
  const [search,      setSearch]       = useState({ loading: false, status: '', color: '' })

  // Refs to latest state for async closures
  const leadsRef     = useRef(leads)
  const contactsRef  = useRef(contacts)
  const notesRef     = useRef(notes)
  const statusesRef  = useRef(statuses)
  const customersRef = useRef(customers)

  useEffect(() => { leadsRef.current     = leads     }, [leads])
  useEffect(() => { contactsRef.current  = contacts  }, [contacts])
  useEffect(() => { notesRef.current     = notes     }, [notes])
  useEffect(() => { statusesRef.current  = statuses  }, [statuses])
  useEffect(() => { customersRef.current = customers }, [customers])

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
    // Leads: crítico — fallo aquí sí bloquea
    loadData()
      .then(d => {
        setLeads(   d.leads    || [])
        setContacts(d.contacts || {})
        setNotes(   d.notes    || {})
        setStatuses(d.statuses || {})
      })
      .catch(err => console.error('Error cargando datos:', err))

    // Módulo clientes: independientes — si la tabla aún no existe en Supabase no rompen la app
    loadCustomers().then(c => setCustomers(c || [])).catch(() => {})
    loadProjects().then(p => setProjects(p || [])).catch(() => {})
    loadContacts().then(c => setCustomerContacts(c || [])).catch(() => {})
    loadInvoices().then(i => setInvoices(i || [])).catch(() => {})
    loadDocuments().then(d => setDocuments(d || [])).catch(() => {})

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
    // Calcular todos los nuevos valores usando los refs actuales
    const nextLeads    = updates.lead !== undefined
      ? leadsRef.current.map(l => l.id === id ? { ...l, ...updates.lead } : l)
      : leadsRef.current
    const nextStatuses = updates.status !== undefined
      ? { ...statusesRef.current, [id]: updates.status }
      : statusesRef.current
    const nextNotes    = updates.note !== undefined
      ? { ...notesRef.current, [id]: updates.note }
      : notesRef.current
    const nextContacts = updates.contact !== undefined
      ? { ...contactsRef.current, [id]: updates.contact }
      : contactsRef.current

    // Actualizar estado
    if (updates.lead     !== undefined) setLeads(nextLeads)
    if (updates.status   !== undefined) setStatuses(nextStatuses)
    if (updates.note     !== undefined) setNotes(nextNotes)
    if (updates.contact  !== undefined) setContacts(nextContacts)

    // Una sola llamada a persist con todos los datos actualizados
    persist({ leads: nextLeads, statuses: nextStatuses, notes: nextNotes, contacts: nextContacts })

    // Auto-crear cliente cuando el lead pasa a 'cliente'
    if (updates.status === 'cliente') {
      const lead = nextLeads.find(l => l.id === id)
      const alreadyCustomer = customersRef.current.some(c => c.lead_id === id)
      if (lead && !alreadyCustomer) {
        createCustomer({
          lead_id: id,
          name:    lead.name    || '',
          sector:  lead.sector  || '',
          email:   lead.email   || '',
          phone:   lead.phone   || '',
          address: lead.loc     || '',
          website: lead.url && !lead.url.startsWith('Sin web') ? lead.url : '',
        })
          .then(c => setCustomers(prev => [c, ...prev]))
          .catch(() => {})
      }
    }
  }, [persist])

  // ── Customer handlers ──────────────────────────────────────────
  const handleSaveCustomer = useCallback(async (customer) => {
    try {
      if (customer.id) {
        const updated = await updateCustomer(customer.id, customer)
        setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c))
        showToast('Cliente actualizado')
      } else {
        const created = await createCustomer(customer)
        setCustomers(prev => [created, ...prev])
        showToast('Cliente creado')
      }
    } catch { showToast('Error al guardar cliente') }
  }, [showToast])

  const handleDeleteCustomer = useCallback(async (id) => {
    try {
      await deleteCustomer(id)
      setCustomers(prev => prev.filter(c => c.id !== id))
      setProjects(prev => prev.filter(p => p.customer_id !== id))
      showToast('Cliente eliminado')
    } catch { showToast('Error al eliminar cliente') }
  }, [showToast])

  // ── Project handlers ───────────────────────────────────────────
  const handleSaveProject = useCallback(async (project) => {
    try {
      if (project.id) {
        const updated = await updateProject(project.id, project)
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
        showToast('Proyecto actualizado')
      } else {
        const created = await createProject(project)
        setProjects(prev => [created, ...prev])
        showToast('Proyecto creado')
      }
    } catch { showToast('Error al guardar proyecto') }
  }, [showToast])

  const handleDeleteProject = useCallback(async (id) => {
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
      showToast('Proyecto eliminado')
    } catch { showToast('Error al eliminar proyecto') }
  }, [showToast])

  // ── Contact handlers ───────────────────────────────────────────
  const handleSaveContact = useCallback(async (contact) => {
    try {
      if (contact.id) {
        const updated = await updateContact(contact.id, contact)
        setCustomerContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
        showToast('Contacto actualizado')
      } else {
        const created = await createContact(contact)
        setCustomerContacts(prev => [created, ...prev])
        showToast('Contacto añadido')
      }
    } catch { showToast('Error al guardar contacto') }
  }, [showToast])

  const handleDeleteContact = useCallback(async (id) => {
    try {
      await deleteContact(id)
      setCustomerContacts(prev => prev.filter(c => c.id !== id))
      showToast('Contacto eliminado')
    } catch { showToast('Error al eliminar contacto') }
  }, [showToast])

  // ── Invoice handlers ───────────────────────────────────────────
  const handleSaveInvoice = useCallback(async (invoice) => {
    try {
      if (invoice.id) {
        const updated = await updateInvoice(invoice.id, invoice)
        setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i))
        showToast('Factura actualizada')
      } else {
        const created = await createInvoice(invoice)
        setInvoices(prev => [created, ...prev])
        showToast('Factura creada')
      }
    } catch { showToast('Error al guardar factura') }
  }, [showToast])

  const handleDeleteInvoice = useCallback(async (id) => {
    try {
      await deleteInvoice(id)
      setInvoices(prev => prev.filter(i => i.id !== id))
      showToast('Factura eliminada')
    } catch { showToast('Error al eliminar factura') }
  }, [showToast])

  // ── Document handlers ──────────────────────────────────────────
  const handleSaveDocument = useCallback(async (document) => {
    try {
      if (document.id) {
        const updated = await updateDocument(document.id, document)
        setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d))
        showToast('Documento actualizado')
      } else {
        const created = await createDocument(document)
        setDocuments(prev => [created, ...prev])
        showToast('Documento añadido')
      }
    } catch { showToast('Error al guardar documento') }
  }, [showToast])

  const handleDeleteDocument = useCallback(async (id) => {
    try {
      await deleteDocument(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
      showToast('Documento eliminado')
    } catch { showToast('Error al eliminar documento') }
  }, [showToast])

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
  if (!authUser) return <Login onSuccess={handleLogin} />

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <Sidebar
        health={health}
        theme={theme}
        onToggleTheme={toggleTheme}
        leads={leads}
        onSave={handleSave}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        username={authUser}
        onLogout={handleLogout}
      />

      {/* ── CONTENIDO PRINCIPAL ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)' }}>

        {activeNav === 'dashboard' ? (
          /* ── DASHBOARD ───────────────────────────────────────── */
          <Dashboard
            leads={leads}
            statuses={statuses}
            contacts={contacts}
            customers={customers}
            onNavigate={setActiveNav}
          />
        ) : activeNav === 'clientes' ? (
          /* ── CLIENTES ────────────────────────────────────────── */
          <CustomerList
            customers={customers}
            projects={projects}
            customerContacts={customerContacts}
            invoices={invoices}
            documents={documents}
            onSave={handleSaveCustomer}
            onDelete={handleDeleteCustomer}
            onSaveProject={handleSaveProject}
            onDeleteProject={handleDeleteProject}
            onSaveContact={handleSaveContact}
            onDeleteContact={handleDeleteContact}
            onSaveInvoice={handleSaveInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onSaveDocument={handleSaveDocument}
            onDeleteDocument={handleDeleteDocument}
            onViewLead={leadId => {
              const lead = leads.find(l => l.id === leadId)
              if (lead) { setEditModalLead(lead); setActiveNav('busqueda') }
            }}
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
              onNewLead={() => setShowNewLead(true)}
              onEdit={lead => setEditModalLead(lead)}
              onDelete={id => {
                setLeads(prev => { const next = prev.filter(l => l.id !== id); persist({ leads: next }); return next })
                showToast('Lead eliminado')
              }}
              onExportCSV={exportCSV}
              onExportJSON={exportJSON}
              onImport={importData}
            />
          </>
        )}
      </div>

      {/* ── MODAL NUEVO LEAD MANUAL ─────────────────────────────── */}
      {showNewLead && (
        <NewLeadModal
          onSave={lead => {
            setLeads(prev => { const next = [lead, ...prev]; persist({ leads: next }); return next })
            showToast('Lead añadido manualmente')
          }}
          onClose={() => setShowNewLead(false)}
        />
      )}

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
