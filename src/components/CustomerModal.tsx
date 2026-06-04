import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Building2, ExternalLink } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/* ── Types ───────────────────────────────────────────────────────── */
export interface Customer {
  id?:             string
  lead_id?:        string | null
  name:            string
  sector:          string
  contact_name:    string
  email:           string
  phone:           string
  address:         string
  website:         string
  status:          'activo' | 'pausado' | 'cancelado'
  contract_start?: string | null
  contract_end?:   string | null
  monthly_value:   number
  services:        string[]
  notes:           string
  created_at?:     string
}

interface Project {
  id:          string
  customer_id: string
  name:        string
  status:      string
  value:       number
}

interface Props {
  customer:   Customer | null
  projects?:  Project[]
  onSave:     (c: Customer) => void
  onClose:    () => void
  onViewLead?: (leadId: string) => void
  onNewProject?: (customerId: string) => void
}

/* ── Status options ──────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'activo',    label: 'Activo',    color: 'var(--success)' },
  { value: 'pausado',   label: 'Pausado',   color: 'var(--warning)' },
  { value: 'cancelado', label: 'Cancelado', color: 'var(--danger)'  },
]

const PROJECT_STATUS_LABELS: Record<string, string> = {
  activo:     'Activo',
  en_pausa:   'En pausa',
  completado: 'Completado',
  cancelado:  'Cancelado',
}

const DEFAULT: Customer = {
  name: '', sector: '', contact_name: '', email: '', phone: '',
  address: '', website: '', status: 'activo',
  contract_start: null, contract_end: null,
  monthly_value: 0, services: [], notes: '',
}

/* ── Component ───────────────────────────────────────────────────── */
export default function CustomerModal({ customer, projects = [], onSave, onClose, onViewLead, onNewProject }: Props) {
  const isNew = !customer?.id

  const [form, setForm] = useState<Customer>(() => customer ? { ...DEFAULT, ...customer } : DEFAULT)
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm(customer ? { ...DEFAULT, ...customer } : DEFAULT)
    setErrors({})
  }, [customer])

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const set = useCallback(<K extends keyof Customer>(k: K, v: Customer[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setErrors(prev => ({ ...prev, [k]: '' }))
  }, [])

  const addTag = useCallback(() => {
    const tag = tagInput.trim()
    if (!tag) return
    if (!form.services.includes(tag)) {
      setForm(prev => ({ ...prev, services: [...prev.services, tag] }))
    }
    setTagInput('')
  }, [tagInput, form.services])

  const removeTag = useCallback((tag: string) => {
    setForm(prev => ({ ...prev, services: prev.services.filter(s => s !== tag) }))
  }, [])

  const handleSubmit = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form)
  }

  const fmt = (v: number) =>
    v > 0 ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v) : '—'

  const customerProjects = projects.filter(p => p.customer_id === customer?.id)

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1, overflow: 'hidden' }}>

          {/* ── Columna izquierda ── */}
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
                <Input id="c-sector" value={form.sector} onChange={e => set('sector', e.target.value)} placeholder="Ej: Veterinaria, Salud…" />
              </div>

              <div>
                <Label htmlFor="c-contact">Persona de contacto</Label>
                <Input id="c-contact" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Nombre y cargo" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
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
                  placeholder="Observaciones, acuerdos, recordatorios…" rows={3} />
              </div>
            </div>
          </div>

          {/* ── Columna derecha ── */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Contrato */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14, fontFamily: 'var(--fd)' }}>Contrato</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Estado */}
                <div>
                  <Label>Estado</Label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => set('status', opt.value as Customer['status'])}
                        style={{
                          flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
                          fontFamily: 'var(--fb)', border: '1px solid',
                          borderRadius: 'var(--r2)', cursor: 'pointer', transition: 'all .15s',
                          borderColor: form.status === opt.value ? opt.color : 'var(--bor2)',
                          background:  form.status === opt.value ? opt.color + '22' : 'var(--bg2)',
                          color:       form.status === opt.value ? opt.color : 'var(--txt3)',
                        }}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <Label htmlFor="c-start">Inicio del contrato</Label>
                    <Input id="c-start" type="date" value={form.contract_start || ''}
                      onChange={e => set('contract_start', e.target.value || null)} />
                  </div>
                  <div>
                    <Label htmlFor="c-end">Fin del contrato</Label>
                    <Input id="c-end" type="date" value={form.contract_end || ''}
                      onChange={e => set('contract_end', e.target.value || null)} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="c-mrr">MRR mensual (€)</Label>
                  <Input id="c-mrr" type="number" min={0} value={form.monthly_value || ''}
                    onChange={e => set('monthly_value', parseFloat(e.target.value) || 0)}
                    placeholder="0" />
                  {form.monthly_value > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>
                      ARR estimado: {fmt(form.monthly_value * 12)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Servicios */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14, fontFamily: 'var(--fd)' }}>Servicios</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {form.services.map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--ac-tint)', color: 'var(--ac)', borderRadius: 99, fontSize: 12, fontFamily: 'var(--fb)', fontWeight: 500 }}>
                    {tag}
                    <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ac)', display: 'flex', padding: 0, opacity: .7 }}>
                      <X size={11}/>
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                  placeholder="Añadir servicio (Enter)" style={{ flex: 1, fontSize: 12 }} />
                <button onClick={addTag} style={{ padding: '0 12px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  +
                </button>
              </div>
            </div>

            {/* Proyectos */}
            {!isNew && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'var(--fd)', margin: 0 }}>
                    Proyectos ({customerProjects.length})
                  </p>
                  {onNewProject && customer?.id && (
                    <button onClick={() => onNewProject(customer.id!)}
                      style={{ fontSize: 11, color: 'var(--ac)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      + Nuevo
                    </button>
                  )}
                </div>
                {customerProjects.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>Sin proyectos</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {customerProjects.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px solid var(--bor)' }}>
                        <span style={{ fontSize: 12, color: 'var(--txt)', fontWeight: 500 }}>{p.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {p.value > 0 && <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{fmt(p.value)}</span>}
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: p.status === 'activo' ? 'var(--success-bg)' : p.status === 'completado' ? 'var(--ac-tint)' : 'var(--bg3)', color: p.status === 'activo' ? 'var(--success)' : p.status === 'completado' ? 'var(--ac)' : 'var(--txt3)', fontWeight: 600 }}>
                            {PROJECT_STATUS_LABELS[p.status] || p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lead vinculado */}
            {form.lead_id && onViewLead && (
              <button
                onClick={() => onViewLead(form.lead_id!)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', cursor: 'pointer', fontSize: 12, color: 'var(--txt2)', fontFamily: 'var(--fb)', width: '100%' }}
              >
                <ExternalLink size={13}/> Ver lead original
              </button>
            )}
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
    </div>,
    document.body
  )
}
