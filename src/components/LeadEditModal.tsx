import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Phone, Globe, MapPin, Tag, Zap, Star, Share2,
  StickyNote, CheckCircle2, Mail, Users, CircleCheck, Sparkles, Loader2,
} from 'lucide-react'
import { analyzeLead } from '../api.js'
import { Badge }      from '@/components/ui/badge'
import { Button }     from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input }      from '@/components/ui/input'
import { Label }      from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator }  from '@/components/ui/separator'
import { Textarea }   from '@/components/ui/textarea'
import { cn }         from '@/lib/utils'

/* ── Types ──────────────────────────────────────────────────────── */
interface Lead {
  id: string; name: string; sector: string; loc: string; url: string;
  phone: string; email?: string; priority: string; rating: number | null; reviews: number;
  flaws: string[]; saas: string[]; source: string;
  linkedin?: string; instagram?: string; facebook?: string; twitter?: string; tiktok?: string;
  [k: string]: unknown
}
interface ContactMethod { done: boolean; date?: string }
interface ContactState  { phone?: ContactMethod; email?: ContactMethod; visit?: ContactMethod }
interface LeadUpdates   { lead?: Partial<Lead>; status?: string; note?: string; contact?: ContactState }
interface Props {
  lead: Lead; status: string; contact: ContactState; note: string;
  onSave: (id: string, u: LeadUpdates) => void; onClose: () => void;
}

const STATUSES   = ['sin contactar', 'en proceso', 'mockup', 'cliente', 'descartado']
const PRIORITIES = [
  { value: 'high', label: 'Alta',  color: 'var(--danger)',  dot: '#dc2626' },
  { value: 'med',  label: 'Media', color: 'var(--warning)', dot: '#ca8a04' },
  { value: 'low',  label: 'Baja',  color: 'var(--success)', dot: '#15803d' },
]

const CONTACT_METHODS = [
  { key: 'phone' as const, icon: <Phone size={16} />, label: 'Llamada' },
  { key: 'email' as const, icon: <Mail  size={16} />, label: 'Email'   },
  { key: 'visit' as const, icon: <Users size={16} />, label: 'Visita'  },
]

/* ── Section header ─────────────────────────────────────────────── */
function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
      {icon}
      {children}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────── */
export default function LeadEditModal({ lead, status, contact, note, onSave, onClose }: Props) {
  const [name,       setName]       = useState(lead.name)
  const [sector,     setSector]     = useState(lead.sector)
  const [loc,        setLoc]        = useState(lead.loc)
  const [url,        setUrl]        = useState(lead.url)
  const [phone,      setPhone]      = useState(lead.phone)
  const [email,      setEmail]      = useState(lead.email ?? '')
  const [priority,   setPriority]   = useState(lead.priority)
  const [curStatus,  setCurStatus]  = useState(status)
  const [curNote,    setCurNote]    = useState(note)
  const [curContact, setCurContact] = useState<ContactState>(contact)
  const [curFlaws,   setCurFlaws]   = useState<string[]>(lead.flaws || [])
  const [curSaas,    setCurSaas]    = useState<string[]>(lead.saas  || [])
  const [linkedin,   setLinkedin]   = useState(lead.linkedin  ?? '')
  const [instagram,  setInstagram]  = useState(lead.instagram ?? '')
  const [facebook,   setFacebook]   = useState(lead.facebook  ?? '')
  const [twitter,    setTwitter]    = useState(lead.twitter   ?? '')
  const [tiktok,     setTiktok]     = useState(lead.tiktok    ?? '')
  const [analyzing,  setAnalyzing]  = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const result = await analyzeLead({
        url:    url.trim(),
        sector: sector,
        phone:  phone.trim(),
        email:  email.trim(),
      })
      setCurFlaws(result.flaws || [])
      setCurSaas(result.saas  || [])
    } catch { /* silencioso */ }
    finally { setAnalyzing(false) }
  }

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 60) }, [])
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const toggleContact = (method: keyof ContactState) => {
    setCurContact(prev => {
      const m = prev[method]
      if (m?.done) return { ...prev, [method]: { done: false } }
      return {
        ...prev,
        [method]: {
          done: true,
          date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
        },
      }
    })
  }

  const handleSave = () =>
    onSave(lead.id, {
      lead:    { name, sector, loc, url, phone, email, priority, flaws: curFlaws, saas: curSaas, linkedin, instagram, facebook, twitter, tiktok },
      status:  curStatus,
      note:    curNote,
      contact: curContact,
    })

  const prioColor = PRIORITIES.find(p => p.value === priority)?.color || 'var(--neutral)'

  return createPortal(
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div
        className="modal"
        style={{ maxWidth: 920, width: '100%', maxHeight: '94vh', overflowY: 'auto', padding: 0 }}
      >

        {/* ── Header ───────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--bor2)', background: 'var(--bg3)' }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span style={{
              width: 4, minHeight: 40, borderRadius: 2,
              background: prioColor, flexShrink: 0,
            }} />
            <div className="min-w-0">
              <h2
                id="edit-modal-title"
                className="text-lg font-semibold text-foreground truncate"
                style={{ fontFamily: 'var(--fd)' }}
              >
                {lead.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-muted-foreground">{lead.sector}</span>
                {lead.source === 'apify' && (
                  <Badge variant="secondary" style={{ fontSize: 10 }}>Google Maps</Badge>
                )}
                {lead.rating && (
                  <span className="text-sm" style={{ color: 'var(--warning)' }}>
                    ★ {lead.rating} · {lead.reviews} reseñas
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost" size="icon-sm" shape="square"
            onClick={onClose} title="Cerrar"
            style={{ color: 'var(--txt3)', borderRadius: 'var(--r)', flexShrink: 0 }}
          >
            <X size={16} />
          </Button>
        </div>

        {/* ── Body: two-column ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12 lg:gap-8">

          {/* ── LEFT COLUMN — Form (7/12) ───────────────────────── */}
          <div className="lg:col-span-7 space-y-6">

            {/* § Business info */}
            <div>
              <SectionTitle icon={<Tag size={11} />}>Información del negocio</SectionTitle>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-name">Nombre del negocio</Label>
                  <Input
                    id="edit-name"
                    ref={firstRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1.5"
                    style={{ fontFamily: 'var(--fb)' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-sector">Sector</Label>
                    <Input
                      id="edit-sector"
                      value={sector}
                      onChange={e => setSector(e.target.value)}
                      className="mt-1.5"
                      style={{ fontFamily: 'var(--fb)' }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-loc">
                      <MapPin size={11} className="inline mr-1" />Dirección
                    </Label>
                    <Input
                      id="edit-loc"
                      value={loc}
                      onChange={e => setLoc(e.target.value)}
                      className="mt-1.5"
                      style={{ fontFamily: 'var(--fb)' }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-url">
                      <Globe size={11} className="inline mr-1" />Web / URL
                    </Label>
                    <Input
                      id="edit-url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      className="mt-1.5"
                      style={{ fontFamily: 'var(--fb)' }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">
                      <Phone size={11} className="inline mr-1" />Teléfono
                    </Label>
                    <Input
                      id="edit-phone"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      type="tel"
                      className="mt-1.5"
                      style={{ fontFamily: 'var(--fb)' }}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-email">
                      <Mail size={11} className="inline mr-1" />Correo electrónico
                    </Label>
                    <Input
                      id="edit-email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      type="email"
                      placeholder="contacto@empresa.com"
                      className="mt-1.5"
                      style={{ fontFamily: 'var(--fb)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* § Redes sociales */}
            <div>
              <SectionTitle icon={<Share2 size={11} />}>Redes sociales</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'edit-linkedin',  label: 'LinkedIn',    value: linkedin,  set: setLinkedin,  placeholder: 'linkedin.com/in/empresa' },
                  { id: 'edit-instagram', label: 'Instagram',   value: instagram, set: setInstagram, placeholder: 'instagram.com/empresa' },
                  { id: 'edit-facebook',  label: 'Facebook',    value: facebook,  set: setFacebook,  placeholder: 'facebook.com/empresa' },
                  { id: 'edit-twitter',   label: 'Twitter / X', value: twitter,   set: setTwitter,   placeholder: 'x.com/empresa' },
                  { id: 'edit-tiktok',    label: 'TikTok',      value: tiktok,    set: setTiktok,    placeholder: 'tiktok.com/@empresa' },
                ] as const).map(({ id, label, value, set, placeholder }) => (
                  <div key={id}>
                    <Label htmlFor={id}>{label}</Label>
                    <Input
                      id={id}
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      className="mt-1.5"
                      style={{ fontFamily: 'var(--fb)' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* § Pipeline */}
            <div>
              <SectionTitle icon={<Zap size={11} />}>Pipeline</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {/* Estado */}
                <div>
                  <Label htmlFor="edit-status">Estado</Label>
                  <Select value={curStatus} onValueChange={setCurStatus}>
                    <SelectTrigger id="edit-status" className="mt-1.5" style={{ fontFamily: 'var(--fb)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prioridad — combobox */}
                <div>
                  <Label htmlFor="edit-priority" style={{ color: 'var(--txt2)' }}>
                    Prioridad<span style={{ color: 'var(--danger)' }} className="ml-0.5">*</span>
                  </Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="edit-priority" className="mt-1.5" style={{ fontFamily: 'var(--fb)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.dot, display: 'inline-block' }} />
                            {p.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* § Contact tracking */}
            <div>
              <SectionTitle icon={<CheckCircle2 size={11} />}>Seguimiento de contacto</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {CONTACT_METHODS.map(({ key, icon, label }) => {
                  const m = curContact[key]
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant="ghost"
                      shape="square"
                      onClick={() => toggleContact(key)}
                      contentClassName="!flex-col !items-center !justify-center !gap-1.5"
                      className="h-auto py-3 px-2 transition-all"
                      style={{
                        background:   m?.done ? 'var(--ac-tint)' : 'var(--bg)',
                        border:       `1px solid ${m?.done ? 'var(--ac)' : 'var(--bor2)'}`,
                        borderRadius: 'var(--r2)',
                        color:        m?.done ? 'var(--ac)' : 'var(--txt2)',
                        boxShadow:    m?.done ? '0 0 0 3px rgba(45,90,112,.12)' : 'none',
                      }}
                    >
                      {m?.done ? <CheckCircle2 size={16} /> : icon}
                      <span className="text-xs font-medium">{label}</span>
                      {m?.done && m.date && (
                        <span className="text-[10px] leading-tight" style={{ color: 'var(--txt3)' }}>
                          {m.date}
                        </span>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* § Notes */}
            <div>
              <SectionTitle icon={<StickyNote size={11} />}>Notas del comercial</SectionTitle>
              <Textarea
                value={curNote}
                onChange={e => setCurNote(e.target.value)}
                placeholder="Nombre de contacto, objeciones, próximo paso..."
                rows={3}
                style={{ fontFamily: 'var(--fb)', fontSize: 13 }}
              />
            </div>
          </div>

          {/* ── RIGHT COLUMN — Diagnosis card (5/12) ────────────── */}
          <div className="lg:col-span-5">
            <div
              className="sticky top-0 rounded-[var(--r3)] p-5 space-y-0"
              style={{ background: 'var(--bg3)', border: '1px solid var(--bor2)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h4
                  className="text-sm font-semibold flex items-center gap-1.5"
                  style={{ color: 'var(--txt)', margin: 0 }}
                >
                  <Star size={14} style={{ color: 'var(--ac)' }} />
                  Diagnóstico digital
                </h4>
                <Button
                  type="button" variant="ghost" size="sm" shape="square"
                  onClick={handleAnalyze} disabled={analyzing}
                  style={{ fontFamily: 'var(--fd)', fontWeight: 600, fontSize: 11, background: 'var(--ac-tint)', color: 'var(--ac)', border: '1px solid var(--ac)', padding: '4px 10px', height: 'auto' }}
                >
                  {analyzing
                    ? <><Loader2 size={11} className="animate-spin" /> Analizando...</>
                    : <><Sparkles size={11} /> Analizar</>
                  }
                </Button>
              </div>
              <p className="mt-2 text-sm leading-5" style={{ color: 'var(--txt2)' }}>
                Análisis automático basado en datos de Google Maps y web pública.
              </p>

              {/* Stats highlights */}
              <ul className="mt-4 space-y-1">
                {lead.rating && (
                  <li className="flex items-center gap-2 py-1" style={{ color: 'var(--txt)' }}>
                    <CircleCheck size={16} style={{ color: 'var(--ac)', flexShrink: 0 }} />
                    <span className="text-sm">★ {lead.rating} · {lead.reviews} reseñas en Google</span>
                  </li>
                )}
                <li className="flex items-center gap-2 py-1" style={{ color: 'var(--txt)' }}>
                  <CircleCheck
                    size={16}
                    style={{ color: lead.url?.startsWith('Sin') ? 'var(--txt3)' : 'var(--ac)', flexShrink: 0 }}
                  />
                  <span className="text-sm">
                    {lead.url?.startsWith('Sin') ? 'Sin presencia web detectada' : 'Tiene presencia web'}
                  </span>
                </li>
                {lead.phone && (
                  <li className="flex items-center gap-2 py-1" style={{ color: 'var(--txt)' }}>
                    <CircleCheck size={16} style={{ color: 'var(--ac)', flexShrink: 0 }} />
                    <span className="text-sm">Teléfono disponible</span>
                  </li>
                )}
              </ul>

              {/* Flaws */}
              <div style={{ height: 1, background: 'var(--bor)', margin: '12px 0' }} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--txt3)', letterSpacing: '.06em' }}>
                  Fallos detectados
                </p>
                {curFlaws.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {curFlaws.map(f => (
                      <Badge key={f} variant="danger" style={{ fontSize: 11 }}>{f}</Badge>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>
                    Sin datos — haz clic en <strong>Analizar</strong>
                  </p>
                )}
              </div>

              {/* SaaS opportunities */}
              <div style={{ height: 1, background: 'var(--bor)', margin: '12px 0' }} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--txt3)', letterSpacing: '.06em' }}>
                  Oportunidades SaaS
                </p>
                {curSaas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {curSaas.map(s => (
                      <Badge key={s} variant="success" style={{ fontSize: 11 }}>{s}</Badge>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>
                    Sin datos — haz clic en <strong>Analizar</strong>
                  </p>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--bor)', margin: '12px 0' }} />

              {/* Metadata */}
              <div className="space-y-0.5 text-xs" style={{ color: 'var(--txt3)', fontFamily: 'var(--fm)' }}>
                <div>ID: {lead.id}</div>
                <div>Fuente: {lead.source === 'apify' ? 'Google Maps (Apify)' : 'Manual'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--bor2)', background: 'var(--bg3)' }}>
          <Separator className="opacity-0" />
          <div className="flex items-center justify-between px-6 py-4">
            <span
              className="text-xs text-muted-foreground"
              style={{ fontFamily: 'var(--fm)' }}
            >
              ID: {lead.id} · {lead.source || 'manual'}
            </span>
            <div className="flex items-center gap-3">
              <Button
                type="button" variant="ghost" shape="square"
                onClick={onClose}
                style={{ fontFamily: 'var(--fb)', color: 'var(--txt2)' }}
              >
                Cancelar
              </Button>
              <Button
                type="button" variant="ghost" shape="square"
                onClick={handleSave}
                style={{
                  fontFamily: 'var(--fd)', fontWeight: 700,
                  background: 'var(--ac)', color: '#fff',
                  border: '1px solid var(--ac)',
                }}
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}
