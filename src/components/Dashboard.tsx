import { useMemo } from 'react'
import {
  Users, TrendingUp, Phone, Globe, Mail, Star,
  AlertTriangle, Zap, Target, CheckCircle2, Clock,
  XCircle, ArrowRight, BarChart3, MapPin, Building2, Euro,
} from 'lucide-react'
import { Badge }     from '@/components/ui/badge'
import LeadsMap      from './LeadsMap'

/* ── Types ──────────────────────────────────────────────────────── */
interface Lead {
  id: string; name: string; sector: string; loc: string; url: string;
  phone: string; email?: string; priority: string; rating: number | null;
  reviews: number; flaws: string[]; saas: string[]; source: string;
  [k: string]: unknown
}
interface ContactState { phone?: { done: boolean }; email?: { done: boolean }; visit?: { done: boolean } }
interface Customer { id: string; status: string; monthly_value: number; [k: string]: unknown }
interface Props {
  leads:      Lead[]
  statuses:   Record<string, string>
  contacts:   Record<string, ContactState>
  customers?: Customer[]
  onNavigate: (id: string) => void
}

/* ── KPI Card ───────────────────────────────────────────────────── */
function KpiCard({
  icon, label, value, sub, color = 'var(--ac)', bg = 'var(--ac-tint)',
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color?: string; bg?: string;
}) {
  return (
    <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="kpi-label">{label}</span>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </span>
      </div>
      <div className="kpi-number" style={{ color }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

/* ── Section title ──────────────────────────────────────────────── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', padding: '20px 24px', boxShadow: 'var(--shadow)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.05em' }}>
        <span style={{ color: 'var(--ac)' }}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}

/* ── Horizontal bar ─────────────────────────────────────────────── */
function HBar({ label, value, max, color, badge }: { label: string; value: number; max: number; color: string; badge?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--txt)', fontFamily: 'var(--fb)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--txt2)', fontFamily: 'var(--fm)', flexShrink: 0 }}>{badge ?? value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

/* ── Lead row ───────────────────────────────────────────────────── */
function LeadRow({ lead, badge, badgeVariant }: { lead: Lead; badge?: string; badgeVariant?: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bor)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', fontFamily: 'var(--fb)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
        <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 1 }}>{lead.sector}</div>
      </div>
      {badge && <Badge variant={badgeVariant ?? 'default'} style={{ fontSize: 10, flexShrink: 0 }}>{badge}</Badge>}
    </div>
  )
}

/* ── Dashboard ──────────────────────────────────────────────────── */
export default function Dashboard({ leads, statuses, contacts, onNavigate }: Props) {

  const m = useMemo(() => {
    const total        = leads.length
    const sinContactar = leads.filter(l => (statuses[l.id] || 'sin contactar') === 'sin contactar').length
    const enProceso    = leads.filter(l => (statuses[l.id] || 'sin contactar') === 'en proceso').length
    const cliente      = leads.filter(l => (statuses[l.id] || 'sin contactar') === 'cliente').length
    const descartado   = leads.filter(l => (statuses[l.id] || 'sin contactar') === 'descartado').length

    const alta  = leads.filter(l => l.priority === 'high').length
    const media = leads.filter(l => l.priority === 'med').length
    const baja  = leads.filter(l => l.priority === 'low').length

    const withWeb   = leads.filter(l => l.url && !l.url.startsWith('Sin')).length
    const withPhone = leads.filter(l => !!l.phone).length
    const withEmail = leads.filter(l => !!l.email).length

    const convRate    = total ? Math.round((cliente / total) * 100) : 0
    const contactRate = total ? Math.round(((enProceso + cliente) / total) * 100) : 0

    const ratedLeads  = leads.filter(l => l.rating != null)
    const avgRating   = ratedLeads.length
      ? (ratedLeads.reduce((s, l) => s + (l.rating ?? 0), 0) / ratedLeads.length).toFixed(1)
      : '—'

    // Top sectors
    const sectorMap: Record<string, number> = {}
    leads.forEach(l => { sectorMap[l.sector] = (sectorMap[l.sector] || 0) + 1 })
    const topSectors = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]).slice(0, 7)

    // SaaS opportunities
    const saasMap: Record<string, number> = {}
    leads.forEach(l => l.saas?.forEach(s => { saasMap[s] = (saasMap[s] || 0) + 1 }))
    const topSaas = Object.entries(saasMap).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Flaws
    const flawMap: Record<string, number> = {}
    leads.forEach(l => l.flaws?.forEach(f => { flawMap[f] = (flawMap[f] || 0) + 1 }))
    const topFlaws = Object.entries(flawMap).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // Hot leads: Alta prioridad sin contactar
    const hotLeads = leads
      .filter(l => l.priority === 'high' && (statuses[l.id] || 'sin contactar') === 'sin contactar')
      .slice(0, 6)

    // Top by rating
    const topRated = [...leads]
      .filter(l => l.rating != null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 6)

    // Source breakdown
    const apify  = leads.filter(l => l.source === 'apify').length
    const manual = total - apify

    return {
      total, sinContactar, enProceso, cliente, descartado,
      alta, media, baja,
      withWeb, withPhone, withEmail,
      convRate, contactRate, avgRating,
      topSectors, topSaas, topFlaws, hotLeads, topRated,
      apify, manual,
    }
  }, [leads, statuses])

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', flex: 1 }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--fd)', letterSpacing: '-.02em' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 2, textTransform: 'capitalize' }}>{today}</p>
        </div>
        <button
          onClick={() => onNavigate('busqueda')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fd)', cursor: 'pointer', transition: 'opacity .15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Ver todos los leads <ArrowRight size={14}/>
        </button>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 24, padding: 0 }}>
        <KpiCard icon={<Users size={15}/>}      label="Total leads"       value={m.total}         sub={`${m.apify} de Google Maps · ${m.manual} manuales`} color="var(--ac)"     bg="var(--ac-tint)" />
        <KpiCard icon={<Clock size={15}/>}       label="Sin contactar"     value={m.sinContactar}  sub={`${m.total ? Math.round((m.sinContactar/m.total)*100) : 0}% del total`}    color="var(--neutral)" bg="var(--neutral-bg)" />
        <KpiCard icon={<TrendingUp size={15}/>}  label="En proceso"        value={m.enProceso}     sub={`Tasa contacto: ${m.contactRate}%`}                  color="var(--warning)" bg="var(--warning-bg)" />
        <KpiCard icon={<CheckCircle2 size={15}/>}label="Clientes"          value={m.cliente}       sub={`Conversión: ${m.convRate}%`}                        color="var(--success)" bg="var(--success-bg)" />
        <KpiCard icon={<XCircle size={15}/>}     label="Descartados"       value={m.descartado}    sub={`${m.total ? Math.round((m.descartado/m.total)*100) : 0}% del total`}    color="var(--danger)"  bg="var(--danger-bg)" />
        <KpiCard icon={<Star size={15}/>}        label="Rating medio"      value={m.avgRating}     sub={`${m.topRated.length} leads con valoración`}         color="#d97706"        bg="#fef9c3" />
      </div>

      {/* ── Pipeline visual ──────────────────────────────────── */}
      {m.total > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', padding: '20px 24px', marginBottom: 24, boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--ac)' }}><BarChart3 size={14}/></span>
            Distribución del pipeline
          </h3>
          {/* Stacked bar */}
          <div style={{ height: 14, borderRadius: 99, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
            {m.sinContactar > 0 && <div style={{ flex: m.sinContactar, background: 'var(--neutral-bg)', borderRight: '2px solid var(--bg2)' }} title={`Sin contactar: ${m.sinContactar}`} />}
            {m.enProceso    > 0 && <div style={{ flex: m.enProceso,    background: 'var(--warning-bg)', borderRight: '2px solid var(--bg2)' }} title={`En proceso: ${m.enProceso}`}    />}
            {m.cliente      > 0 && <div style={{ flex: m.cliente,      background: 'var(--success-bg)', borderRight: '2px solid var(--bg2)' }} title={`Clientes: ${m.cliente}`}        />}
            {m.descartado   > 0 && <div style={{ flex: m.descartado,   background: 'var(--danger-bg)'  }}                                     title={`Descartados: ${m.descartado}`}   />}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Sin contactar', n: m.sinContactar, color: 'var(--neutral)' },
              { label: 'En proceso',    n: m.enProceso,    color: 'var(--warning)' },
              { label: 'Clientes',      n: m.cliente,      color: 'var(--success)' },
              { label: 'Descartados',   n: m.descartado,   color: 'var(--danger)'  },
            ].map(({ label, n, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)', fontFamily: 'var(--fb)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: color, flexShrink: 0 }} />
                {label} <strong style={{ color: 'var(--txt)', fontFamily: 'var(--fm)' }}>{n}</strong>
                <span style={{ color: 'var(--txt3)' }}>({m.total ? Math.round((n/m.total)*100) : 0}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mapa de leads ────────────────────────────────────── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', padding: '20px 24px', marginBottom: 24, boxShadow: 'var(--shadow)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          <span style={{ color: 'var(--ac)' }}><MapPin size={14}/></span>
          Ubicación de leads
        </h3>
        <LeadsMap leads={leads} statuses={statuses} height={420} />
      </div>

      {/* ── Row 2: Prioridad + Presencia digital + Sectores ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 16, marginBottom: 24 }}>

        {/* Prioridad */}
        <Section title="Por prioridad" icon={<Target size={13}/>}>
          <HBar label="Alta"  value={m.alta}  max={m.total} color="var(--danger)"  badge={`${m.alta} leads`} />
          <HBar label="Media" value={m.media} max={m.total} color="var(--warning)" badge={`${m.media} leads`} />
          <HBar label="Baja"  value={m.baja}  max={m.total} color="var(--success)" badge={`${m.baja} leads`} />
        </Section>

        {/* Presencia digital */}
        <Section title="Presencia digital" icon={<Globe size={13}/>}>
          <HBar label="Tienen web"     value={m.withWeb}   max={m.total} color="var(--ac)"      badge={`${m.total ? Math.round((m.withWeb/m.total)*100) : 0}%`} />
          <HBar label="Tienen teléfono" value={m.withPhone} max={m.total} color="#7c3aed"        badge={`${m.total ? Math.round((m.withPhone/m.total)*100) : 0}%`} />
          <HBar label="Tienen email"   value={m.withEmail} max={m.total} color="#0891b2"         badge={`${m.total ? Math.round((m.withEmail/m.total)*100) : 0}%`} />
        </Section>

        {/* Top sectores */}
        <Section title="Top sectores" icon={<BarChart3 size={13}/>}>
          {m.topSectors.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--txt3)' }}>Sin datos</p>
            : m.topSectors.map(([sector, count]) => (
                <HBar key={sector} label={sector} value={count} max={m.topSectors[0]?.[1] ?? 1} color="var(--ac)" badge={`${count}`} />
              ))
          }
        </Section>
      </div>

      {/* ── Row 3: Hot leads + Top rating + SaaS + Fallos ────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* 🔥 Hot leads */}
        <Section title="Hot leads" icon={<AlertTriangle size={13}/>}>
          {m.hotLeads.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--success)', fontFamily: 'var(--fb)' }}>✓ Todos los leads de alta prioridad contactados</p>
          ) : (
            <>
              <p style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 8 }}>Alta prioridad sin contactar</p>
              {m.hotLeads.map(lead => (
                <LeadRow key={lead.id} lead={lead} badge="Alta" badgeVariant="danger" />
              ))}
            </>
          )}
        </Section>

        {/* ⭐ Top por rating */}
        <Section title="Mejor valorados" icon={<Star size={13}/>}>
          {m.topRated.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--txt3)' }}>Sin valoraciones</p>
          ) : (
            m.topRated.map(lead => (
              <LeadRow key={lead.id} lead={lead} badge={`★ ${lead.rating}`} badgeVariant="warning" />
            ))
          )}
        </Section>

        {/* Oportunidades SaaS */}
        <Section title="Oportunidades SaaS" icon={<Zap size={13}/>}>
          {m.topSaas.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--txt3)' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {m.topSaas.map(([saas, count]) => (
                <div key={saas} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: 'var(--fb)' }}>
                  {saas}
                  <span style={{ background: 'var(--success)', color: '#fff', borderRadius: 99, padding: '0 5px', fontSize: 10, fontFamily: 'var(--fm)' }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Fallos más comunes */}
        <Section title="Fallos frecuentes" icon={<AlertTriangle size={13}/>}>
          {m.topFlaws.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--txt3)' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {m.topFlaws.map(([flaw, count]) => (
                <div key={flaw} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: 'var(--fb)' }}>
                  {flaw}
                  <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 99, padding: '0 5px', fontSize: 10, fontFamily: 'var(--fm)' }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}
