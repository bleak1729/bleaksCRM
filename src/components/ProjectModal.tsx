import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, FolderKanban } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/* ── Types ───────────────────────────────────────────────────────── */
import type { Project } from '../types'
export type { Project }

interface Props {
  project:     Partial<Project> & { customer_id: string }
  onSave:      (p: Project) => void
  onClose:     () => void
}

const STATUS_OPTIONS = [
  { value: 'activo',     label: 'Activo',     color: 'var(--success)' },
  { value: 'en_pausa',   label: 'En pausa',   color: 'var(--warning)' },
  { value: 'completado', label: 'Completado', color: 'var(--ac)'      },
  { value: 'cancelado',  label: 'Cancelado',  color: 'var(--danger)'  },
]

const DEFAULT: Omit<Project, 'customer_id'> = {
  name: '', description: '', status: 'activo',
  start_date: null, end_date: null, value: 0,
}

export default function ProjectModal({ project, onSave, onClose }: Props) {
  const isNew = !project.id
  const [form, setForm] = useState<Project>(() => ({ ...DEFAULT, ...project }) as Project)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const set = <K extends keyof Project>(k: K, v: Project[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setErrors(prev => ({ ...prev, [k]: '' }))
  }

  const handleSubmit = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'El nombre del proyecto es obligatorio'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form)
  }

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bor2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, background: 'var(--ac-tint)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ac)' }}>
              <FolderKanban size={15}/>
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)' }}>
              {isNew ? 'Nuevo proyecto' : 'Editar proyecto'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt3)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={18}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <Label htmlFor="p-name">Nombre del proyecto *</Label>
            <Input id="p-name" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej: Web corporativa, SEO Q1…"
              style={errors.name ? { borderColor: 'var(--danger)' } : {}} />
            {errors.name && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{errors.name}</p>}
          </div>

          <div>
            <Label>Estado</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => set('status', opt.value as Project['status'])}
                  style={{
                    padding: '7px 0', fontSize: 12, fontWeight: 600, fontFamily: 'var(--fb)',
                    border: '1px solid', borderRadius: 'var(--r2)', cursor: 'pointer', transition: 'all .15s',
                    borderColor: form.status === opt.value ? opt.color : 'var(--bor2)',
                    background:  form.status === opt.value ? opt.color + '22' : 'var(--bg2)',
                    color:       form.status === opt.value ? opt.color : 'var(--txt3)',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="p-desc">Descripción</Label>
            <Textarea id="p-desc" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Descripción del proyecto…" rows={2} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label htmlFor="p-start">Fecha inicio</Label>
              <Input id="p-start" type="date" value={form.start_date || ''}
                onChange={e => set('start_date', e.target.value || null)} />
            </div>
            <div>
              <Label htmlFor="p-end">Fecha fin</Label>
              <Input id="p-end" type="date" value={form.end_date || ''}
                onChange={e => set('end_date', e.target.value || null)} />
            </div>
          </div>

          <div>
            <Label htmlFor="p-value">Valor del proyecto (€)</Label>
            <Input id="p-value" type="number" min={0} value={form.value || ''}
              onChange={e => set('value', parseFloat(e.target.value) || 0)}
              placeholder="0" />
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
            {isNew ? 'Crear proyecto' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
