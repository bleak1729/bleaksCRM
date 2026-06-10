import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, UserCircle2 } from 'lucide-react'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import type { CustomerContact } from '../types'
export type { CustomerContact }

interface Props {
  contact:  Partial<CustomerContact> & { customer_id: string }
  onSave:   (c: CustomerContact) => void
  onClose:  () => void
}

const DEFAULT = { name: '', role: '', email: '', phone: '', is_primary: false, notes: '' }

export default function ContactModal({ contact, onSave, onClose }: Props) {
  const isNew = !contact.id
  const [form, setForm] = useState<CustomerContact>({ ...DEFAULT, ...contact } as CustomerContact)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm({ ...DEFAULT, ...contact } as CustomerContact)
    setErrors({})
  }, [contact])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const set = <K extends keyof CustomerContact>(k: K, v: CustomerContact[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setErrors(prev => ({ ...prev, [k]: '' }))
  }

  const handleSubmit = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form)
  }

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bor2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, background: 'var(--ac-tint)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ac)' }}>
              <UserCircle2 size={15}/>
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)' }}>
              {isNew ? 'Nuevo contacto' : 'Editar contacto'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt3)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={18}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Label htmlFor="ct-name">Nombre *</Label>
            <Input id="ct-name" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Nombre completo"
              style={errors.name ? { borderColor: 'var(--danger)' } : {}} />
            {errors.name && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="ct-role">Cargo / Rol</Label>
            <Input id="ct-role" value={form.role} onChange={e => set('role', e.target.value)} placeholder="CEO, Marketing, Técnico…" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label htmlFor="ct-email">Email</Label>
              <Input id="ct-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@…" />
            </div>
            <div>
              <Label htmlFor="ct-phone">Teléfono</Label>
              <Input id="ct-phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="600 000 000" />
            </div>
          </div>

          <div>
            <Label htmlFor="ct-notes">Notas</Label>
            <Textarea id="ct-notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observaciones…" rows={2} />
          </div>

          {/* Principal toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: form.is_primary ? 'var(--ac-tint)' : 'var(--bg2)', borderRadius: 'var(--r2)', border: `1px solid ${form.is_primary ? 'var(--ac)' : 'var(--bor2)'}`, transition: 'all .15s' }}>
            <input type="checkbox" checked={form.is_primary} onChange={e => set('is_primary', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--ac)', cursor: 'pointer' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: form.is_primary ? 'var(--ac)' : 'var(--txt)', fontFamily: 'var(--fb)' }}>Contacto principal</div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>Se mostrará como referencia principal del cliente</div>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--bor2)' }}>
          <button onClick={onClose}
            style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer', fontFamily: 'var(--fb)' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit}
            style={{ padding: '8px 20px', background: 'var(--ac)', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--fd)' }}>
            {isNew ? 'Añadir contacto' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
