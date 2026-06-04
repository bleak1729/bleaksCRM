import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Building2, ExternalLink, Download, ExternalLink as LinkIcon, Star } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ContactModal  from './ContactModal'
import InvoiceModal  from './InvoiceModal'
import DocumentModal from './DocumentModal'
import type { CustomerContact } from './ContactModal'
import type { Invoice }         from './InvoiceModal'
import type { Document }        from './DocumentModal'
import { downloadInvoicePdf }   from '../api.js'

/* ── Types ───────────────────────────────────────────────────────── */
export interface Customer {
  id?:              string
  lead_id?:         string | null
  name:             string
  sector:           string
  contact_name:     string
  email:            string
  phone:            string
  address:          string
  website:          string
  drive_folder_url?: string
  status:           'activo' | 'pausado' | 'cancelado'
  contract_start?:  string | null
  contract_end?:    string | null
  monthly_value:    number
  services:         string[]
  notes:            string
  created_at?:      string
}

interface Project { id: string; customer_id: string; name: string; status: string; value: number; drive_folder_url?: string }

interface Props {
  customer:         Customer | null
  projects?:        Project[]
  customerContacts?: CustomerContact[]
  invoices?:         Invoice[]
  documents?:        Document[]
  onSave:           (c: Customer) => void
  onClose:          () => void
  onViewLead?:      (leadId: string) => void
  onNewProject?:    (customerId: string) => void
  onSaveContact?:   (c: CustomerContact) => void
  onDeleteContact?: (id: string) => void
  onSaveInvoice?:   (inv: Invoice) => void
  onDeleteInvoice?: (id: string) => void
  onSaveDocument?:  (d: Document) => void
  onDeleteDocument?:(id: string) => void
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'activo',    label: 'Activo',    color: 'var(--success)' },
  { value: 'pausado',   label: 'Pausado',   color: 'var(--warning)' },
  { value: 'cancelado', label: 'Cancelado', color: 'var(--danger)'  },
]

const PROJECT_STATUS_LABELS: Record<string, string> = {
  activo: 'Activo', en_pausa: 'En pausa', completado: 'Completado', cancelado: 'Cancelado',
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  cotizacion: 'var(--warning)', enviada: 'var(--ac)', pagada: 'var(--success)', vencida: 'var(--danger)',
}

const DOC_TYPE_LABELS: Record<string, string> = {
  contrato: 'Contrato', propuesta: 'Propuesta', presupuesto: 'Presupuesto', informe: 'Informe', otro: 'Otro',
}

const DEFAULT: Customer = {
  name: '', sector: '', contact_name: '', email: '', phone: '',
  address: '', website: '', drive_folder_url: '', status: 'activo',
  contract_start: null, contract_end: null, monthly_value: 0, services: [], notes: '',
}

const fmt = (v: number) =>
  v > 0 ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v) : '—'

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

type Tab = 'contrato' | 'contactos' | 'facturas' | 'docs'

/* ── Tab button ──────────────────────────────────────────────────── */
function TabBtn({ id, label, count, active, onClick }: { id: Tab; label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 10px', fontSize: 12, fontWeight: active ? 700 : 500,
      fontFamily: 'var(--fb)', border: 'none', cursor: 'pointer',
      borderBottom: `2px solid ${active ? 'var(--ac)' : 'transparent'}`,
      background: 'transparent',
      color: active ? 'var(--ac)' : 'var(--txt3)',
      transition: 'all .15s', whiteSpace: 'nowrap',
    }}>
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  )
}

/* ── Component ───────────────────────────────────────────────────── */
export default function CustomerModal({
  customer, projects = [], customerContacts = [], invoices = [], documents = [],
  onSave, onClose, onViewLead, onNewProject,
  onSaveContact, onDeleteContact,
  onSaveInvoice, onDeleteInvoice,
  onSaveDocument, onDeleteDocument,
}: Props) {
  const isNew = !customer?.id
  const [form,     setForm]     = useState<Customer>(() => customer ? { ...DEFAULT, ...customer } : DEFAULT)
  const [tagInput, setTagInput] = useState('')
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<Tab>('contrato')

  // Sub-modal state
  const [editContact,  setEditContact]  = useState<(Partial<CustomerContact> & { customer_id: string }) | null>(null)
  const [editInvoice,  setEditInvoice]  = useState<(Partial<Invoice> & { customer_id: string }) | null>(null)
  const [editDocument, setEditDocument] = useState<(Partial<Document> & { customer_id: string }) | null>(null)

  useEffect(() => {
    setForm(customer ? { ...DEFAULT, ...customer } : DEFAULT)
    setErrors({})
  }, [customer])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editContact && !editInvoice && !editDocument) onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, editContact, editInvoice, editDocument])

  const set = useCallback(<K extends keyof Customer>(k: K, v: Customer[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setErrors(prev => ({ ...prev, [k]: '' }))
  }, [])

  const addTag = useCallback(() => {
    const tag = tagInput.trim()
    if (!tag || form.services.includes(tag)) { setTagInput(''); return }
    setForm(prev => ({ ...prev, services: [...prev.services, tag] }))
    setTagInput('')
  }, [tagInput, form.services])

  const removeTag = useCallback((tag: string) => {
    setForm(prev => ({ ...prev, services: prev.services.filter(s => s !== tag) }))
  }, [])

  const handleSubmit = () => {
    if (!form.name.trim()) { setErrors({ name: 'El nombre es obligatorio' }); return }
    onSave(form)
  }

  const cid = customer?.id || ''
  const myProjects  = projects.filter(p => p.customer_id === cid)
  const myContacts  = customerContacts.filter(c => c.customer_id === cid)
  const myInvoices  = invoices.filter(i => i.customer_id === cid)
  const myDocuments = documents.filter(d => d.customer_id === cid)

  /* ── Render ──────────────────────────────────────────────────────── */
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 820, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bor2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, background: 'var(--ac-tint)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ac)', flexShrink: 0 }}>
              <Building2 size={16}/>
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)' }}>
                {isNew ? 'Nuevo cliente' : form.name || 'Editar cliente'}
              </div>
              {!isNew && form.sector && (
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 1 }}>{form.sector}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={18}/>
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>

          {/* ── Col izquierda: información básica ── */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', borderRight: '1px solid var(--bor2)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14, fontFamily: 'var(--fd)' }}>Información</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label htmlFor="c-name">Nombre *</Label>
                <Input id="c-name" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Nombre del cliente" style={errors.name ? { borderColor: 'var(--danger)' } : {}} />
                {errors.name && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="c-sector">Sector</Label>
                <Input id="c-sector" value={form.sector} onChange={e => set('sector', e.target.value)} placeholder="Ej: Veterinaria…" />
              </div>
              <div>
                <Label htmlFor="c-contact">Contacto principal</Label>
                <Input id="c-contact" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Nombre y cargo" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@…" />
                </div>
                <div>
                  <Label htmlFor="c-phone">Teléfono</Label>
                  <Input id="c-phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="600 000 000" />
                </div>
              </div>
              <div>
                <Label htmlFor="c-website">Sitio web</Label>
                <Input id="c-website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <Label htmlFor="c-address">Dirección</Label>
                <Input id="c-address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Calle, Ciudad" />
              </div>
              <div>
                <Label htmlFor="c-notes">Notas internas</Label>
                <Textarea id="c-notes" value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Observaciones, acuerdos…" rows={3} />
              </div>
              {form.lead_id && onViewLead && (
                <button onClick={() => onViewLead(form.lead_id!)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', cursor: 'pointer', fontSize: 12, color: 'var(--txt2)', fontFamily: 'var(--fb)' }}>
                  <ExternalLink size={13}/> Ver lead original
                </button>
              )}
            </div>
          </div>

          {/* ── Col derecha: tabs ── */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 0, padding: '0 16px', borderBottom: '1px solid var(--bor2)', flexShrink: 0, overflowX: 'auto' }}>
              <TabBtn id="contrato"  label="Contrato"                 active={activeTab === 'contrato'}  onClick={() => setActiveTab('contrato')}  />
              <TabBtn id="contactos" label="Contactos" count={myContacts.length}  active={activeTab === 'contactos'} onClick={() => setActiveTab('contactos')} />
              <TabBtn id="facturas"  label="Facturas"  count={myInvoices.length}  active={activeTab === 'facturas'}  onClick={() => setActiveTab('facturas')}  />
              <TabBtn id="docs"      label="Docs"      count={myDocuments.length} active={activeTab === 'docs'}      onClick={() => setActiveTab('docs')}      />
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

              {/* ── CONTRATO ── */}
              {activeTab === 'contrato' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Estado */}
                  <div>
                    <Label>Estado</Label>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {STATUS_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => set('status', opt.value as Customer['status'])}
                          style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, fontFamily: 'var(--fb)', border: '1px solid', borderRadius: 'var(--r2)', cursor: 'pointer', transition: 'all .15s',
                            borderColor: form.status === opt.value ? opt.color : 'var(--bor2)',
                            background:  form.status === opt.value ? opt.color + '22' : 'var(--bg2)',
                            color:       form.status === opt.value ? opt.color : 'var(--txt3)',
                          }}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  {/* Fechas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <Label htmlFor="c-start">Inicio contrato</Label>
                      <Input id="c-start" type="date" value={form.contract_start || ''} onChange={e => set('contract_start', e.target.value || null)} />
                    </div>
                    <div>
                      <Label htmlFor="c-end">Fin contrato</Label>
                      <Input id="c-end" type="date" value={form.contract_end || ''} onChange={e => set('contract_end', e.target.value || null)} />
                    </div>
                  </div>
                  {/* MRR */}
                  <div>
                    <Label htmlFor="c-mrr">MRR mensual (€)</Label>
                    <Input id="c-mrr" type="number" min={0} value={form.monthly_value || ''} onChange={e => set('monthly_value', parseFloat(e.target.value) || 0)} placeholder="0" />
                    {form.monthly_value > 0 && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>ARR estimado: {fmt(form.monthly_value * 12)}</p>}
                  </div>
                  {/* Servicios */}
                  <div>
                    <Label>Servicios</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '6px 0 8px' }}>
                      {form.services.map(tag => (
                        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--ac-tint)', color: 'var(--ac)', borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
                          {tag}
                          <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ac)', display: 'flex', padding: 0, opacity: .7 }}>
                            <X size={10}/>
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                        placeholder="Añadir servicio (Enter)" style={{ flex: 1, fontSize: 12 }} />
                      <button onClick={addTag} style={{ padding: '0 10px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                  {/* Proyectos */}
                  {!isNew && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Label>Proyectos ({myProjects.length})</Label>
                        {onNewProject && <button onClick={() => onNewProject(cid)} style={{ fontSize: 11, color: 'var(--ac)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Nuevo</button>}
                      </div>
                      {myProjects.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>Sin proyectos</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {myProjects.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px solid var(--bor)' }}>
                              <div style={{ minWidth: 0 }}>
                                <span style={{ fontSize: 12, color: 'var(--txt)', fontWeight: 500 }}>{p.name}</span>
                                {p.drive_folder_url && (
                                  <a href={p.drive_folder_url} target="_blank" rel="noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 8, fontSize: 10, color: 'var(--ac)' }}>
                                    <LinkIcon size={9}/> Drive
                                  </a>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {p.value > 0 && <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmt(p.value)}</span>}
                                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: p.status === 'activo' ? 'var(--success-bg)' : p.status === 'completado' ? 'var(--ac-tint)' : 'var(--bg3)', color: p.status === 'activo' ? 'var(--success)' : p.status === 'completado' ? 'var(--ac)' : 'var(--txt3)', fontWeight: 600 }}>
                                  {PROJECT_STATUS_LABELS[p.status] || p.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Drive folder */}
                  {form.drive_folder_url && (
                    <a href={form.drive_folder_url} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ac)', textDecoration: 'none', fontWeight: 500 }}>
                      <LinkIcon size={13}/> Carpeta del cliente en Drive
                    </a>
                  )}
                </div>
              )}

              {/* ── CONTACTOS ── */}
              {activeTab === 'contactos' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    {onSaveContact && !isNew && (
                      <button onClick={() => setEditContact({ customer_id: cid, name: '', role: '', email: '', phone: '', is_primary: myContacts.length === 0, notes: '' })}
                        style={{ fontSize: 12, color: 'var(--ac)', background: 'var(--ac-tint)', border: '1px solid var(--ac)', borderRadius: 'var(--r2)', padding: '5px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--fb)' }}>
                        + Añadir contacto
                      </button>
                    )}
                  </div>
                  {myContacts.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--txt3)', fontStyle: 'italic', textAlign: 'center', marginTop: 24 }}>Sin contactos — guarda el cliente primero</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {myContacts.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg2)', borderRadius: 'var(--r2)', border: `1px solid ${c.is_primary ? 'var(--ac)' : 'var(--bor)'}` }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', fontFamily: 'var(--fb)' }}>{c.name}</span>
                              {c.is_primary && <span style={{ fontSize: 9, padding: '1px 6px', background: 'var(--ac-tint)', color: 'var(--ac)', borderRadius: 99, fontWeight: 700 }}>PRINCIPAL</span>}
                            </div>
                            {c.role  && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 1 }}>{c.role}</div>}
                            {c.email && <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>{c.email}</div>}
                            {c.phone && <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{c.phone}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => setEditContact({ ...c })}
                              style={{ fontSize: 11, padding: '3px 8px', background: 'var(--bg3)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', cursor: 'pointer', color: 'var(--txt2)' }}>
                              Editar
                            </button>
                            {onDeleteContact && (
                              <button onClick={() => onDeleteContact(c.id!)}
                                style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', cursor: 'pointer', color: 'var(--danger)' }}>
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── FACTURAS ── */}
              {activeTab === 'facturas' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    {onSaveInvoice && !isNew && (
                      <button onClick={() => setEditInvoice({ customer_id: cid, invoice_number: '', issue_date: new Date().toISOString().slice(0,10), amount: 0, tax_pct: 21, status: 'borrador', description: '', notes: '' })}
                        style={{ fontSize: 12, color: 'var(--ac)', background: 'var(--ac-tint)', border: '1px solid var(--ac)', borderRadius: 'var(--r2)', padding: '5px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--fb)' }}>
                        + Nueva factura
                      </button>
                    )}
                  </div>
                  {myInvoices.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--txt3)', fontStyle: 'italic', textAlign: 'center', marginTop: 24 }}>Sin facturas — guarda el cliente primero</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {myInvoices.map(inv => {
                        const total = (Number(inv.amount) || 0) * (1 + (Number(inv.tax_pct) || 21) / 100)
                        return (
                          <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px solid var(--bor)' }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{inv.invoice_number || '—'}</div>
                              <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 1 }}>{fmtDate(inv.issue_date)}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fm)' }}>
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total)}
                              </span>
                              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: INVOICE_STATUS_COLORS[inv.status] + '22', color: INVOICE_STATUS_COLORS[inv.status], fontWeight: 700, border: `1px solid ${INVOICE_STATUS_COLORS[inv.status]}44` }}>
                                {inv.status}
                              </span>
                              <button onClick={() => downloadInvoicePdf(inv.id!)} title="Descargar PDF"
                                style={{ background: 'var(--bg3)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--txt2)' }}>
                                <Download size={12}/>
                              </button>
                              <button onClick={() => setEditInvoice({ ...inv })}
                                style={{ fontSize: 11, padding: '3px 8px', background: 'var(--bg3)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', cursor: 'pointer', color: 'var(--txt2)' }}>
                                Editar
                              </button>
                              {onDeleteInvoice && (
                                <button onClick={() => onDeleteInvoice(inv.id!)}
                                  style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', cursor: 'pointer', color: 'var(--danger)' }}>
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── DOCS ── */}
              {activeTab === 'docs' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    {form.drive_folder_url ? (
                      <a href={form.drive_folder_url} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ac)', textDecoration: 'none', fontWeight: 600 }}>
                        <LinkIcon size={12}/> Carpeta en Drive
                      </a>
                    ) : <span/>}
                    {onSaveDocument && !isNew && (
                      <button onClick={() => setEditDocument({ customer_id: cid, title: '', type: 'contrato', drive_url: '', notes: '' })}
                        style={{ fontSize: 12, color: 'var(--ac)', background: 'var(--ac-tint)', border: '1px solid var(--ac)', borderRadius: 'var(--r2)', padding: '5px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--fb)' }}>
                        + Añadir documento
                      </button>
                    )}
                  </div>
                  {myDocuments.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--txt3)', fontStyle: 'italic', textAlign: 'center', marginTop: 24 }}>Sin documentos — guarda el cliente primero</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {myDocuments.map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px solid var(--bor)' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{d.title}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                              <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--bg3)', borderRadius: 99, color: 'var(--txt3)', fontWeight: 500 }}>{DOC_TYPE_LABELS[d.type] || d.type}</span>
                              {d.doc_date && <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{fmtDate(d.doc_date)}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {d.drive_url && (
                              <a href={d.drive_url} target="_blank" rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ac)', textDecoration: 'none', padding: '3px 8px', background: 'var(--ac-tint)', borderRadius: 'var(--r2)', fontWeight: 600 }}>
                                <LinkIcon size={11}/> Abrir
                              </a>
                            )}
                            <button onClick={() => setEditDocument({ ...d })}
                              style={{ fontSize: 11, padding: '3px 8px', background: 'var(--bg3)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', cursor: 'pointer', color: 'var(--txt2)' }}>
                              Editar
                            </button>
                            {onDeleteDocument && (
                              <button onClick={() => onDeleteDocument(d.id!)}
                                style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', cursor: 'pointer', color: 'var(--danger)' }}>
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--bor2)', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer', fontFamily: 'var(--fb)' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit}
            style={{ padding: '8px 20px', background: 'var(--ac)', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--fd)' }}>
            {isNew ? 'Crear cliente' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      {editContact && (
        <ContactModal
          contact={editContact}
          onSave={c => { onSaveContact?.(c); setEditContact(null) }}
          onClose={() => setEditContact(null)}
        />
      )}
      {editInvoice && (
        <InvoiceModal
          invoice={editInvoice}
          onSave={inv => { onSaveInvoice?.(inv); setEditInvoice(null) }}
          onClose={() => setEditInvoice(null)}
        />
      )}
      {editDocument && (
        <DocumentModal
          document={editDocument}
          onSave={d => { onSaveDocument?.(d); setEditDocument(null) }}
          onClose={() => setEditDocument(null)}
        />
      )}
    </div>,
    document.body
  )
}
