import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Receipt, Plus, Trash2 } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/* ── Types ───────────────────────────────────────────────────────── */
export interface LineItem {
  description: string
  quantity:    number
  unit_price:  number
}

export interface Invoice {
  id?:             string
  customer_id:     string
  invoice_number:  string
  issue_date:      string
  due_date?:       string | null
  amount:          number
  tax_pct:         number
  status:          'cotizacion' | 'enviada' | 'pagada' | 'vencida'
  line_items:      LineItem[]
  description:     string
  notes:           string
  created_at?:     string
}

interface Props {
  invoice:  Partial<Invoice> & { customer_id: string }
  onSave:   (inv: Invoice) => void
  onClose:  () => void
}

/* ── Constants ───────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'cotizacion', label: 'Cotización', color: 'var(--warning)' },
  { value: 'enviada',    label: 'Enviada',    color: 'var(--ac)'      },
  { value: 'pagada',     label: 'Pagada',     color: 'var(--success)' },
  { value: 'vencida',    label: 'Vencida',    color: 'var(--danger)'  },
]

const today = new Date().toISOString().slice(0, 10)

const EMPTY_ITEM: LineItem = { description: '', quantity: 1, unit_price: 0 }

const DEFAULT: Omit<Invoice, 'customer_id'> = {
  invoice_number: '', issue_date: today, due_date: null,
  amount: 0, tax_pct: 21, status: 'cotizacion',
  line_items: [{ ...EMPTY_ITEM }],
  description: '', notes: '',
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmtEur = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

const calcSubtotal = (items: LineItem[]) =>
  items.reduce((s, it) => s + (it.quantity || 0) * (it.unit_price || 0), 0)

/* ── Component ───────────────────────────────────────────────────── */
export default function InvoiceModal({ invoice, onSave, onClose }: Props) {
  const isNew = !invoice.id

  const [form,   setForm]   = useState<Invoice>(() => ({
    ...DEFAULT,
    ...invoice,
    line_items: invoice.line_items?.length ? invoice.line_items : [{ ...EMPTY_ITEM }],
  }) as Invoice)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm({
      ...DEFAULT,
      ...invoice,
      line_items: invoice.line_items?.length ? invoice.line_items : [{ ...EMPTY_ITEM }],
    } as Invoice)
    setErrors({})
  }, [invoice])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const setField = <K extends keyof Invoice>(k: K, v: Invoice[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  /* ── Line item helpers ── */
  const updateItem = (idx: number, field: keyof LineItem, raw: string) => {
    setForm(prev => {
      const items = prev.line_items.map((it, i) => {
        if (i !== idx) return it
        const val = field === 'description' ? raw : (parseFloat(raw) || 0)
        return { ...it, [field]: val }
      })
      return { ...prev, line_items: items, amount: calcSubtotal(items) }
    })
  }

  const addItem = () =>
    setForm(prev => ({
      ...prev,
      line_items: [...prev.line_items, { ...EMPTY_ITEM }],
    }))

  const removeItem = (idx: number) =>
    setForm(prev => {
      const items = prev.line_items.filter((_, i) => i !== idx)
      const safe  = items.length ? items : [{ ...EMPTY_ITEM }]
      return { ...prev, line_items: safe, amount: calcSubtotal(safe) }
    })

  /* ── Submit ── */
  const handleSubmit = () => {
    const subtotal = calcSubtotal(form.line_items)
    if (subtotal <= 0) { setErrors({ items: 'Añade al menos un ítem con importe' }); return }
    onSave({ ...form, amount: subtotal })
  }

  const subtotal = calcSubtotal(form.line_items)
  const taxAmt   = subtotal * (form.tax_pct || 21) / 100
  const total    = subtotal + taxAmt

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bor2)', flexShrink: 0 }}>
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
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Número + Estado + Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {/* Número */}
            <div>
              <Label>Número</Label>
              {form.invoice_number ? (
                <div style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, color: 'var(--ac)', fontFamily: 'var(--fm)', marginTop: 6 }}>
                  {form.invoice_number}
                </div>
              ) : (
                <div style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1px dashed var(--bor2)', borderRadius: 'var(--r2)', fontSize: 12, color: 'var(--txt3)', marginTop: 6, fontStyle: 'italic' }}>
                  Auto al guardar
                </div>
              )}
            </div>
            {/* Fecha emisión */}
            <div>
              <Label htmlFor="inv-issue">Fecha emisión</Label>
              <Input id="inv-issue" type="date" value={form.issue_date}
                onChange={e => setField('issue_date', e.target.value)} />
            </div>
            {/* Fecha vencimiento */}
            <div>
              <Label htmlFor="inv-due">Vencimiento</Label>
              <Input id="inv-due" type="date" value={form.due_date || ''}
                onChange={e => setField('due_date', e.target.value || null)} />
            </div>
          </div>

          {/* Estado */}
          <div>
            <Label>Estado</Label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => setField('status', opt.value as Invoice['status'])}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, fontFamily: 'var(--fb)',
                    border: '1px solid', borderRadius: 'var(--r2)', cursor: 'pointer', transition: 'all .15s',
                    borderColor: form.status === opt.value ? opt.color : 'var(--bor2)',
                    background:  form.status === opt.value ? opt.color + '22' : 'var(--bg2)',
                    color:       form.status === opt.value ? opt.color : 'var(--txt3)',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {/* ── Tabla de ítems ── */}
          <div>
            <Label>Conceptos</Label>
            {errors.items && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{errors.items}</p>}

            <div style={{ marginTop: 8, border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
              {/* Cabecera */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 90px 32px', background: 'var(--bg3)', borderBottom: '1px solid var(--bor2)' }}>
                {['Descripción', 'Cant.', 'P. Unitario', 'Total', ''].map((h, i) => (
                  <div key={i} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--fd)', textAlign: i >= 2 ? 'right' : 'left' }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Filas */}
              {form.line_items.map((item, idx) => {
                const lineTotal = (item.quantity || 0) * (item.unit_price || 0)
                return (
                  <div key={idx}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 90px 32px', borderBottom: idx < form.line_items.length - 1 ? '1px solid var(--bor)' : 'none', alignItems: 'center' }}
                  >
                    {/* Descripción */}
                    <div style={{ padding: '4px 6px 4px 8px' }}>
                      <input
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder="Descripción del servicio…"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--txt)', fontFamily: 'var(--fb)', padding: '4px 2px' }}
                      />
                    </div>
                    {/* Cantidad */}
                    <div style={{ padding: '4px 6px' }}>
                      <input
                        type="number" min={0} step={1}
                        value={item.quantity || ''}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--txt)', fontFamily: 'var(--fm)', textAlign: 'right', padding: '4px 2px' }}
                      />
                    </div>
                    {/* Precio unitario */}
                    <div style={{ padding: '4px 6px' }}>
                      <input
                        type="number" min={0} step={0.01}
                        value={item.unit_price || ''}
                        onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                        placeholder="0.00"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--txt)', fontFamily: 'var(--fm)', textAlign: 'right', padding: '4px 2px' }}
                      />
                    </div>
                    {/* Total fila */}
                    <div style={{ padding: '4px 10px 4px 6px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: lineTotal > 0 ? 'var(--txt)' : 'var(--txt3)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>
                      {lineTotal > 0 ? fmtEur(lineTotal) : '—'}
                    </div>
                    {/* Eliminar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button onClick={() => removeItem(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', display: 'flex', padding: 4, borderRadius: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--txt3)')}
                        title="Eliminar línea"
                      >
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Añadir línea */}
            <button onClick={addItem}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--ac)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--fb)', padding: '4px 0' }}
            >
              <Plus size={13}/> Añadir línea
            </button>
          </div>

          {/* IVA + Resumen */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ width: 120 }}>
              <Label htmlFor="inv-tax">IVA (%)</Label>
              <Input id="inv-tax" type="number" min={0} max={100}
                value={form.tax_pct} onChange={e => setField('tax_pct', parseFloat(e.target.value) || 0)} />
            </div>
            {subtotal > 0 && (
              <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)', marginBottom: 4 }}>
                  <span>Subtotal:</span><span style={{ fontFamily: 'var(--fm)' }}>{fmtEur(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)', marginBottom: 8 }}>
                  <span>IVA ({form.tax_pct}%):</span><span style={{ fontFamily: 'var(--fm)' }}>{fmtEur(taxAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--ac)', borderTop: '1px solid var(--bor2)', paddingTop: 8 }}>
                  <span>Total:</span><span style={{ fontFamily: 'var(--fm)' }}>{fmtEur(total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="inv-notes">Notas / Condiciones de pago</Label>
            <Textarea id="inv-notes" value={form.notes} onChange={e => setField('notes', e.target.value)}
              placeholder="Condiciones de pago, observaciones…" rows={2} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--bor2)', flexShrink: 0 }}>
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
