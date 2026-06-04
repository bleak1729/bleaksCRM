import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const SECTORS = [
  'Salud','Veterinaria','Belleza','Hosteleria','Retail',
  'Servicios','Mecanica','Optica','Inmobiliaria','Academia','Otro',
]

interface Props {
  onSave:  (lead: any) => void
  onClose: () => void
}

export default function NewLeadModal({ onSave, onClose }: Props) {
  const [name,     setName]     = useState('')
  const [sector,   setSector]   = useState('')
  const [loc,      setLoc]      = useState('')
  const [url,      setUrl]      = useState('')
  const [phone,    setPhone]    = useState('')
  const [email,    setEmail]    = useState('')
  const [priority, setPriority] = useState('med')

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      id:       'manual-' + Date.now(),
      name:     name.trim(),
      sector:   sector || 'Servicios',
      loc:      loc.trim(),
      url:      url.trim() || 'Sin web — ' + (phone || 'sin teléfono'),
      phone:    phone.trim(),
      email:    email.trim(),
      priority,
      rating:   null,
      reviews:  0,
      flaws:    [],
      saas:     [],
      source:   'manual',
      lat:      null,
      lng:      null,
    })
    onClose()
  }

  const lbl = (text: string) => (
    <Label style={{ marginBottom: 5, display: 'block', color: 'var(--txt2)' }}>{text}</Label>
  )

  return createPortal(
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog" aria-modal="true" aria-labelledby="new-lead-title"
    >
      <div className="modal" style={{ maxWidth: 520, width: '100%', padding: 0 }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--bor2)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} style={{ color: 'var(--ac)' }} />
            <h2 id="new-lead-title" style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', margin: 0 }}>
              Añadir lead manual
            </h2>
          </div>
          <Button variant="ghost" size="icon-sm" shape="square" onClick={onClose}
            style={{ color: 'var(--txt3)', borderRadius: 'var(--r)' }}>
            <X size={15} />
          </Button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Nombre (obligatorio) */}
          <div>
            {lbl('Nombre del negocio *')}
            <Input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Clínica Veterinaria Romairone"
              autoFocus
              style={{ fontFamily: 'var(--fb)' }}
            />
          </div>

          {/* Sector + Prioridad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {lbl('Sector')}
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger style={{ fontFamily: 'var(--fb)' }}>
                  <SelectValue placeholder="Selecciona sector" />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              {lbl('Prioridad')}
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger style={{ fontFamily: 'var(--fb)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 Alta</SelectItem>
                  <SelectItem value="med">🟡 Media</SelectItem>
                  <SelectItem value="low">🟢 Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Web + Teléfono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {lbl('Sitio web')}
              <Input value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://..." style={{ fontFamily: 'var(--fb)' }} />
            </div>
            <div>
              {lbl('Teléfono')}
              <Input value={phone} onChange={e => setPhone(e.target.value)}
                type="tel" placeholder="+34 600 000 000" style={{ fontFamily: 'var(--fb)' }} />
            </div>
          </div>

          {/* Email + Dirección */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {lbl('Email')}
              <Input value={email} onChange={e => setEmail(e.target.value)}
                type="email" placeholder="contacto@empresa.com" style={{ fontFamily: 'var(--fb)' }} />
            </div>
            <div>
              {lbl('Dirección')}
              <Input value={loc} onChange={e => setLoc(e.target.value)}
                placeholder="C/ Ejemplo 1, Valladolid" style={{ fontFamily: 'var(--fb)' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--bor2)', background: 'var(--bg3)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" shape="square" onClick={onClose}
            style={{ fontFamily: 'var(--fb)', color: 'var(--txt2)' }}>
            Cancelar
          </Button>
          <Button variant="ghost" shape="square" onClick={handleSave} disabled={!name.trim()}
            style={{ fontFamily: 'var(--fd)', fontWeight: 700, background: 'var(--ac)', color: '#fff', border: '1px solid var(--ac)' }}>
            <Plus size={14} /> Añadir lead
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
