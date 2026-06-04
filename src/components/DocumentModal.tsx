import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, FileText } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface Document {
  id?:         string
  customer_id: string
  project_id?: string | null
  title:       string
  type:        'contrato' | 'propuesta' | 'informe' | 'presupuesto' | 'otro'
  drive_url:   string
  doc_date?:   string | null
  notes:       string
  created_at?: string
}

interface Props {
  document: Partial<Document> & { customer_id: string }
  onSave:   (d: Document) => void
  onClose:  () => void
}

const TYPE_OPTIONS = [
  { value: 'contrato',    label: 'Contrato'    },
  { value: 'propuesta',   label: 'Propuesta'   },
  { value: 'presupuesto', label: 'Presupuesto' },
  { value: 'informe',     label: 'Informe'     },
  { value: 'otro',        label: 'Otro'        },
]

const DEFAULT: Omit<Document, 'customer_id'> = {
  title: '', type: 'contrato', drive_url: '', doc_date: null, notes: '',
}

export default function DocumentModal({ document, onSave, onClose }: Props) {
  const isNew = !document.id
  const [form, setForm] = useState<Document>({ ...DEFAULT, ...document } as Document)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm({ ...DEFAULT, ...document } as Document)
    setErrors({})
  }, [document])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const set = <K extends keyof Document>(k: K, v: Document[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setErrors(prev => ({ ...prev, [k]: '' }))
  }

  const handleSubmit = () => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'El título es obligatorio'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form)
  }

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bor2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, background: 'var(--ac-tint)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ac)' }}>
              <FileText size={15}/>
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)' }}>
              {isNew ? 'Nuevo documento' : 'Editar documento'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt3)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={18}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Label htmlFor="doc-title">Título del documento *</Label>
            <Input id="doc-title" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Ej: Contrato de servicios 2025"
              style={errors.title ? { borderColor: 'var(--danger)' } : {}} />
            {errors.title && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{errors.title}</p>}
          </div>

          <div>
            <Label>Tipo</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => set('type', opt.value as Document['type'])}
                  style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 500, fontFamily: 'var(--fb)',
                    border: '1px solid', borderRadius: 99, cursor: 'pointer', transition: 'all .15s',
                    borderColor: form.type === opt.value ? 'var(--ac)' : 'var(--bor2)',
                    background:  form.type === opt.value ? 'var(--ac-tint)' : 'var(--bg2)',
                    color:       form.type === opt.value ? 'var(--ac)'      : 'var(--txt3)',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="doc-url">Enlace Google Drive</Label>
            <Input id="doc-url" value={form.drive_url} onChange={e => set('drive_url', e.target.value)}
              placeholder="https://drive.google.com/…" />
            <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>
              Pega el enlace compartido del documento o carpeta de Drive
            </p>
          </div>

          <div>
            <Label htmlFor="doc-date">Fecha del documento</Label>
            <Input id="doc-date" type="date" value={form.doc_date || ''}
              onChange={e => set('doc_date', e.target.value || null)} />
          </div>

          <div>
            <Label htmlFor="doc-notes">Notas</Label>
            <Textarea id="doc-notes" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Observaciones…" rows={2} />
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
            {isNew ? 'Añadir documento' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
