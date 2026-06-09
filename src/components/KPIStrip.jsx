export default function KPIStrip({ leads, statuses, contacts }) {
  const total   = leads.length
  const noWeb   = leads.filter(l => l.url.startsWith('Sin')).length
  const cont    = leads.filter(l => {
    const c = contacts[l.id] || {}
    return c.phone?.done || c.email?.done || c.visit?.done
  }).length
  const inProc  = leads.filter(l => (statuses[l.id] || 'sin contactar') === 'en proceso').length
  const mockup  = leads.filter(l => (statuses[l.id] || 'sin contactar') === 'mockup').length
  const clients = leads.filter(l => (statuses[l.id] || 'sin contactar') === 'cliente').length
  const noTouch = leads.filter(l => (statuses[l.id] || 'sin contactar') === 'sin contactar').length
  const conv    = cont ? Math.round((clients / cont) * 100) : 0

  const kpis = [
    { label: 'Total Leads',    value: total,   sub: 'prospectos',          valueColor: 'var(--txt)' },
    { label: 'Sin Web',        value: noWeb,   sub: 'oportunidades críticas',valueColor: 'var(--danger)' },
    { label: 'Contactados',    value: cont,    sub: `${total ? Math.round((cont/total)*100) : 0}% del total`, valueColor: 'var(--txt)' },
    { label: 'En Proceso',     value: inProc,  sub: 'negociando',           valueColor: 'var(--ac)' },
    { label: 'MockUp',         value: mockup,  sub: 'propuesta visual',      valueColor: 'var(--warning)' },
    { label: 'Clientes',       value: clients, sub: `conversión ${conv}%`,  valueColor: 'var(--success)' },
    { label: 'Sin Contactar',  value: noTouch, sub: 'pipeline disponible',  valueColor: 'var(--txt2)' },
  ]

  return (
    <div className="kpi-grid" role="region" aria-label="Métricas">
      {kpis.map(k => (
        <div key={k.label} className="kpi-card">
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-number" style={{ color: k.valueColor }}>{k.value}</div>
          <div className="kpi-sub">{k.sub}</div>
        </div>
      ))}
    </div>
  )
}
