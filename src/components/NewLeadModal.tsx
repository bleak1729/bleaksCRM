import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Sparkles, Loader2 } from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge }     from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { analyzeLead } from '../api'

const SECTORS = [
  'Salud','Veterinaria','Belleza','Hosteleria','Retail',
  'Servicios','Mecanica','Optica','Inmobiliaria','Academia','Otro',
]

interface Props {
  onSave:  (lead: any) => void
  onClose: () => void
}

export default function NewLeadModal({ onSave, onClose }: Props) {
  const [name,      setName]      = useState('')
  const [sector,    setSector]    = useState('')
  const [loc,       setLoc]       = useState('')
  const [url,       setUrl]       = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [priority,  setPriority]  = useState('med')
  const [flaws,     setFlaws]     = useState<string[]>([])
  const [saas,      setSaas]      = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed,  setAnalyzed]  = useState(false)

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const result = await analyzeLead({
        url:    url.trim() || '',
        sector: sector || 'Servicios',
        phone:  phone.trim(),
        email:  email.trim(),
      })
      setFlaws(result.flaws || [])
      setSaas(result.saas  || [])
      setAnalyzed(true)
    } catch { /* silencioso */ }
    finally { setAnalyzing(false) }
  }

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
      flaws,
      saas,
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

          {/* Botón analizar + resultados */}
          <Separator />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: analyzed ? 10 : 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', fontFamily: 'var(--fb)' }}>
                Diagnóstico digital
              </span>
              <Button
                type="button" variant="ghost" size="sm" shape="square"
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{ fontFamily: 'var(--fd)', fontWeight: 600, background: 'var(--ac-tint)', color: 'var(--ac)', border: '1px solid var(--ac)', fontSize: 12 }}
              >
                {analyzing
                  ? <><Loader2 size={12} className="animate-spin" /> Analizando...</>
                  : <><Sparkles size={12} /> {analyzed ? 'Reanalizar' : 'Analizar digitalmente'}</>
                }
              </Button>
            </div>
            {analyzed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {flaws.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, marginBottom: 5 }}>⚠ Fallos detectados</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {flaws.map(f => <Badge key={f} variant="danger" style={{ fontSize: 10 }}>{f}</Badge>)}
                    </div>
                  </div>
                )}
                {saas.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, marginBottom: 5 }}>🚀 Oportunidades SaaS</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {saas.map(s => <Badge key={s} variant="success" style={{ fontSize: 10 }}>{s}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            )}
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
