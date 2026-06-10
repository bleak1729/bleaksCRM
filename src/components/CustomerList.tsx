import { useState, useMemo } from 'react'
import { Building2, Search, Plus, Pencil, Trash2, FolderKanban, ExternalLink } from 'lucide-react'
import { Badge }          from '@/components/ui/badge'
import { Button }         from '@/components/ui/button'
import CustomerModal      from './CustomerModal'
import ProjectModal       from './ProjectModal'
import type { Customer }  from './CustomerModal'
import type { Project }   from './ProjectModal'
import type { CustomerContact } from './ContactModal'
import type { Invoice }         from './InvoiceModal'
import type { Document }        from './DocumentModal'

/* ── Props ───────────────────────────────────────────────────────── */
interface Props {
  customers:        Customer[]
  projects:         Project[]
  customerContacts: CustomerContact[]
  invoices:         Invoice[]
  documents:        Document[]
  onSave:           (c: Customer) => void
  onDelete:         (id: string) => void
  onSaveProject:    (p: Project) => void
  onDeleteProject:  (id: string) => void
  onSaveContact:    (c: CustomerContact) => void
  onDeleteContact:  (id: string) => void
  onSaveInvoice:    (inv: Invoice) => void
  onDeleteInvoice:  (id: string) => void
  onSaveDocument:   (d: Document) => void
  onDeleteDocument: (id: string) => void
  onViewLead?:      (leadId: string) => void
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  activo: 'Activo', pausado: 'Pausado', cancelado: 'Cancelado',
}
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  activo: 'success', pausado: 'warning', cancelado: 'danger',
}

const fmt = (v: number) =>
  v > 0
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
    : '—'

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/* ── Filter tab ──────────────────────────────────────────────────── */
function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', fontSize: 13, fontWeight: active ? 700 : 500,
        fontFamily: 'var(--fb)', border: 'none', cursor: 'pointer', borderRadius: 'var(--r2)',
        background: active ? 'var(--ac)' : 'transparent',
        color:      active ? '#fff'      : 'var(--txt2)',
        transition: 'all .15s',
      }}
    >
      {label}
      <span style={{ marginLeft: 6, fontSize: 11, opacity: .8 }}>({count})</span>
    </button>
  )
}

/* ── Empty state ─────────────────────────────────────────────────── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40, color: 'var(--txt3)' }}>
      <Building2 size={48} style={{ opacity: .25 }}/>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt2)', margin: 0 }}>Sin clientes todavía</p>
      <p style={{ fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 280 }}>
        Los leads convertidos aparecen aquí automáticamente cuando cambias su estado a <strong>Cliente</strong>.
      </p>
      <button onClick={onAdd}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fd)' }}>
        <Plus size={14}/> Añadir cliente manualmente
      </button>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────── */
export default function CustomerList({ customers, projects, customerContacts, invoices, documents, onSave, onDelete, onSaveProject, onSaveContact, onDeleteContact, onSaveInvoice, onDeleteInvoice, onSaveDocument, onDeleteDocument, onViewLead }: Props) {
  const [filter,        setFilter]        = useState('all')
  const [query,         setQuery]         = useState('')
  const [editCustomer,  setEditCustomer]  = useState<Customer | null>(null)
  const [showModal,     setShowModal]     = useState(false)
  const [editProject,   setEditProject]   = useState<(Partial<Project> & { customer_id: string }) | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const counts = useMemo(() => ({
    all:       customers.length,
    activo:    customers.filter(c => c.status === 'activo').length,
    pausado:   customers.filter(c => c.status === 'pausado').length,
    cancelado: customers.filter(c => c.status === 'cancelado').length,
  }), [customers])

  const filtered = useMemo(() => {
    let list = customers
    if (filter !== 'all') list = list.filter(c => c.status === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.sector?.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [customers, filter, query])

  const mrr = useMemo(() =>
    customers.filter(c => c.status === 'activo').reduce((s, c) => s + (c.monthly_value || 0), 0)
  , [customers])

  const openNew = () => {
    setEditCustomer({ name: '', sector: '', contact_name: '', email: '', phone: '', address: '', website: '', status: 'activo', monthly_value: 0, services: [], notes: '' })
    setShowModal(true)
  }

  const openEdit = (c: Customer) => {
    setEditCustomer(c)
    setShowModal(true)
  }

  const handleSave = (c: Customer) => {
    onSave(c)
    setShowModal(false)
    setEditCustomer(null)
  }

  const handleDelete = (id: string) => {
    onDelete(id)
    setConfirmDelete(null)
  }

  const projectCountFor = (id?: string) =>
    id ? projects.filter(p => p.customer_id === id).length : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="cl-header" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--fd)', letterSpacing: '-.02em', margin: 0 }}>Clientes</h1>
            <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 3 }}>
              {counts.activo} activos · MRR <strong style={{ color: 'var(--ac)' }}>{fmt(mrr)}</strong>
            </p>
          </div>
          <button onClick={openNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--fd)', flexShrink: 0 }}>
            <Plus size={14}/> Nuevo cliente
          </button>
        </div>

        {/* Filters + Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid var(--bor2)' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', padding: 4, borderRadius: 'var(--r2)', border: '1px solid var(--bor2)' }}>
            <FilterTab label="Todos"     count={counts.all}       active={filter === 'all'}       onClick={() => setFilter('all')} />
            <FilterTab label="Activos"   count={counts.activo}    active={filter === 'activo'}    onClick={() => setFilter('activo')} />
            <FilterTab label="Pausados"  count={counts.pausado}   active={filter === 'pausado'}   onClick={() => setFilter('pausado')} />
            <FilterTab label="Cancelados" count={counts.cancelado} active={filter === 'cancelado'} onClick={() => setFilter('cancelado')} />
          </div>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt3)', pointerEvents: 'none' }}/>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar cliente…"
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg2)', color: 'var(--txt)', fontSize: 13, outline: 'none', fontFamily: 'var(--fb)' }} />
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      {customers.length === 0 ? (
        <EmptyState onAdd={openNew} />
      ) : filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt3)', fontSize: 14 }}>
          Sin resultados para <em style={{ marginLeft: 4 }}>"{query}"</em>
        </div>
      ) : (
        <div className="cl-list" style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bor2)' }}>
                {['Cliente', 'Contacto', 'Servicios', 'MRR', 'Estado', 'Inicio', 'Proyectos', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px 10px', fontSize: 11, fontWeight: 700, color: 'var(--txt3)', fontFamily: 'var(--fd)', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}
                  style={{ borderBottom: '1px solid var(--bor)', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Cliente */}
                  <td style={{ padding: '12px 12px', minWidth: 180 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)', fontFamily: 'var(--fb)' }}>{c.name}</div>
                    {c.sector && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 1 }}>{c.sector}</div>}
                  </td>
                  {/* Contacto */}
                  <td style={{ padding: '12px 12px' }}>
                    <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{c.contact_name || '—'}</div>
                    {c.email && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 1 }}>{c.email}</div>}
                  </td>
                  {/* Servicios */}
                  <td style={{ padding: '12px 12px', maxWidth: 180 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(c.services || []).slice(0, 2).map(s => (
                        <span key={s} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--ac-tint)', color: 'var(--ac)', borderRadius: 99, fontWeight: 500, whiteSpace: 'nowrap' }}>{s}</span>
                      ))}
                      {(c.services || []).length > 2 && (
                        <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg3)', color: 'var(--txt3)', borderRadius: 99 }}>+{(c.services || []).length - 2}</span>
                      )}
                      {(c.services || []).length === 0 && <span style={{ fontSize: 12, color: 'var(--txt3)' }}>—</span>}
                    </div>
                  </td>
                  {/* MRR */}
                  <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.monthly_value > 0 ? 'var(--success)' : 'var(--txt3)', fontFamily: 'var(--fm)' }}>
                      {fmt(c.monthly_value)}
                    </span>
                  </td>
                  {/* Estado */}
                  <td style={{ padding: '12px 12px' }}>
                    <Badge variant={STATUS_VARIANT[c.status] ?? 'default'} style={{ fontSize: 11 }}>
                      {STATUS_LABELS[c.status] || c.status}
                    </Badge>
                  </td>
                  {/* Inicio */}
                  <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--txt3)' }}>{fmtDate(c.contract_start)}</span>
                  </td>
                  {/* Proyectos */}
                  <td style={{ padding: '12px 12px' }}>
                    <button
                      onClick={() => setEditProject({ customer_id: c.id!, name: '', description: '', status: 'activo', value: 0, start_date: null, end_date: null })}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--txt2)', background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', padding: '4px 8px', cursor: 'pointer', fontFamily: 'var(--fb)' }}
                    >
                      <FolderKanban size={12}/>
                      {projectCountFor(c.id)}
                    </button>
                  </td>
                  {/* Acciones */}
                  <td style={{ padding: '12px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {c.lead_id && onViewLead && (
                        <Button variant="ghost" size="icon-sm" shape="square" onClick={() => onViewLead!(c.lead_id!)} title="Ver lead original">
                          <ExternalLink size={13}/>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" shape="square" onClick={() => openEdit(c)} title="Editar">
                        <Pencil size={13}/>
                      </Button>
                      <Button variant="ghost" size="icon-sm" shape="square"
                        onClick={() => setConfirmDelete(c.id!)}
                        title="Eliminar"
                        style={{ color: 'var(--danger)' } as React.CSSProperties}>
                        <Trash2 size={13}/>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CustomerModal ─────────────────────────────────────── */}
      {showModal && editCustomer && (
        <CustomerModal
          key={editCustomer.id || 'new'}
          customer={editCustomer}
          projects={projects}
          customerContacts={customerContacts}
          invoices={invoices}
          documents={documents}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditCustomer(null) }}
          onViewLead={onViewLead}
          onNewProject={id => {
            setShowModal(false)
            setEditProject({ customer_id: id, name: '', description: '', status: 'activo', value: 0, start_date: null, end_date: null })
          }}
          onSaveContact={onSaveContact}
          onDeleteContact={onDeleteContact}
          onSaveInvoice={onSaveInvoice}
          onDeleteInvoice={onDeleteInvoice}
          onSaveDocument={onSaveDocument}
          onDeleteDocument={onDeleteDocument}
        />
      )}

      {/* ── ProjectModal ──────────────────────────────────────── */}
      {editProject && (
        <ProjectModal
          key={editProject.id || 'new'}
          project={editProject}
          onSave={p => { onSaveProject(p); setEditProject(null) }}
          onClose={() => setEditProject(null)}
        />
      )}

      {/* ── Confirm delete ────────────────────────────────────── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)', textAlign: 'center' }}>
            <Trash2 size={32} style={{ color: 'var(--danger)', margin: '0 auto 12px' }}/>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>¿Eliminar cliente?</p>
            <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 22 }}>Se eliminarán también todos sus proyectos. Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ padding: '8px 20px', background: 'transparent', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                style={{ padding: '8px 20px', background: 'var(--danger)', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
