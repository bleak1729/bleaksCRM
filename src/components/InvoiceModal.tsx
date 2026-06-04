import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Receipt } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface Invoice {
  id?:             string
  customer_id:     string
  invoice_number:  string
  issue_date:      string
  due_date?:       string | null
  amount:          number
  tax_pct:         number
  status:          'cotizacion' | 'enviada' | 'pagada' | 'vencida'
  description:     string
  notes:           string
  created_at?:     string
}

interface Props {
  invoice:  Partial<Invoice> & { customer_id: string }
  onSave:   (inv: Invoice) => void
  onClose:  () => void
}

const STATUS_OPTIONS = [
  { value: 'borrador', label: 'Borrador', color: 'var(--txt3)'    },
  { value: 'enviada',  label: 'Enviada',  color: 'var(--ac)'      },
  { value: 'pagada',   label: 'Pagada',   color: 'var(--success)' },
  { value: 'vencida',  label: 'Vencida',  color: 'var(--danger)'  },
]

const today = new Date().toISOString().slice(0, 10)
const DEFAULT: Omit<Invoice, 'customer_id'> = {
  invoice_number: '', issue_date: today, due_date: null,
  amount: 0, tax_pct: 21, status: 'borrador', description: '', notes: '',
}

export default function InvoiceModal({ invoice, onSave, onClose }: Props) {
  const isNew = !invoice.id
  const [form, setForm] = useState<Invoice>({ ...DEFAULT, ...invoice } as Invoice)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm({ ...DEFAULT, ...invoice } as Invoice)
    setErrors({})
  }, [invoice])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const set = <K extends keyof Invoice>(k: K, v: Invoice[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setErrors(prev => ({ ...prev, [k]: '' }))
  }

  const handleSubmit = () => {
    const errs: Record<string, string> = {}
    if (!form.invoice_number.trim()) errs.invoice_number = 'El número de factura es obligatorio'
    if (!form.amount || form.amount <= 0) errs.amount = 'El importe debe ser mayor que 0'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form)
  }

  const subtotal = form.amount || 0
  const taxAmt   = subtotal * (form.tax_pct || 21) / 100
  const total    = subtotal + taxAmt
  const fmtEur   = (v: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bor2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, background: 'var(--ac-tint)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ac)' }}>
              <Receipt size={15}/>
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)' }}>
              {isNew ? 'Nueva factura' : `Factura ${form.invoice_number}`}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt3)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={18}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label htmlFor="inv-num">Número de factura *</Label>
              <Input id="inv-num" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)}
                placeholder="FAC-2025-001"
                style={errors.invoice_number ? { borderColor: 'var(--danger)' } : {}} />
              {errors.invoice_number && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{errors.invoice_number}</p>}
            </div>
            <div>
              <Label>Estado</Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 6 }}>
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value}
                    onClick={() => set('status', opt.value as Invoice['status'])}
                    style={{
                      padding: '5px 0', fontSize: 11, fontWeight: 600, fontFamily: 'var(--fb)',
                      border: '1px solid', borderRadius: 'var(--r2)', cursor: 'pointer', transition: 'all .15s',
                      borderColor: form.status === opt.value ? opt.color : 'var(--bor2)',
                      background:  form.status === opt.value ? opt.color + '22' : 'var(--bg2)',
                      color:       form.status === opt.value ? opt.color : 'var(--txt3)',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label htmlFor="inv-issue">Fecha de emisión</Label>
              <Input id="inv-issue" type="date" value={form.issue_date}
                onChange={e => set('issue_date', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="inv-due">Fecha de vencimiento</Label>
              <Input id="inv-due" type="date" value={form.due_date || ''}
                onChange={e => set('due_date', e.target.value || null)} />
            </div>
          </div>

          <div>
            <Label htmlFor="inv-desc">Descripción del servicio</Label>
            <Textarea id="inv-desc" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Descripción detallada del servicio facturado…" rows={2} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <Label htmlFor="inv-amount">Base imponible (€) *</Label>
              <Input id="inv-amount" type="number" min={0} step={0.01}
                value={form.amount || ''} onChange={e => set('amount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                style={errors.amount ? { borderColor: 'var(--danger)' } : {}} />
              {errors.amount && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{errors.amount}</p>}
            </div>
            <div>
              <Label htmlFor="inv-tax">IVA (%)</Label>
              <Input id="inv-tax" type="number" min={0} max={100}
                value={form.tax_pct} onChange={e => set('tax_pct', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Resumen importes */}
          {form.amount > 0 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)', marginBottom: 4 }}>
                <span>Subtotal:</span><span>{fmtEur(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)', marginBottom: 8 }}>
                <span>IVA ({form.tax_pct}%):</span><span>{fmtEur(taxAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--ac)', borderTop: '1px solid var(--bor2)', paddingTop: 8 }}>
                <span>Total:</span><span>{fmtEur(total)}</span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="inv-notes">Notas</Label>
            <Textarea id="inv-notes" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Condiciones de pago, observaciones…" rows={2} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--bor2)' }}>
          <button onClick={onClose}
            style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer', fontFamily: 'var(--fb)' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit}
            style={{ padding: '8px 20px', background: 'var(--ac)', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--fd)' }}>
            {isNew ? 'Crear factura' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
