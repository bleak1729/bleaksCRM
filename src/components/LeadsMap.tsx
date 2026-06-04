import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Lead {
  id: string; name: string; sector: string; priority: string;
  lat?: number | null; lng?: number | null; loc?: string;
  rating?: number | null; [k: string]: unknown
}

interface Props {
  leads:    Lead[]
  statuses: Record<string, string>
  height?:  number
}

const PRIORITY_COLOR: Record<string, string> = {
  high: '#dc2626',
  med:  '#d97706',
  low:  '#15803d',
}

const STATUS_LABEL: Record<string, string> = {
  'sin contactar': 'Sin contactar',
  'en proceso':    'En proceso',
  'mockup':        'MockUp',
  'cliente':       'Cliente',
  'descartado':    'Descartado',
}

export default function LeadsMap({ leads, statuses, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)

  // Solo los leads con coordenadas
  const mapped = useMemo(
    () => leads.filter(l => l.lat != null && l.lng != null),
    [leads]
  )

  // Centro del mapa: media de todas las coords
  const center = useMemo((): [number, number] => {
    if (mapped.length === 0) return [41.6528, -4.7245] // Valladolid por defecto
    const lat = mapped.reduce((s, l) => s + (l.lat as number), 0) / mapped.length
    const lng = mapped.reduce((s, l) => s + (l.lng as number), 0) / mapped.length
    return [lat, lng]
  }, [mapped])

  useEffect(() => {
    if (!containerRef.current) return

    // Destruir mapa anterior si existe
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(containerRef.current, {
      center,
      zoom:        13,
      zoomControl: true,
    })
    mapRef.current = map

    // Tiles OpenStreetMap (gratis, sin API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Marcadores por lead
    mapped.forEach(lead => {
      const color  = PRIORITY_COLOR[lead.priority] || '#64748b'
      const status = statuses[lead.id] || 'sin contactar'

      const circle = L.circleMarker([lead.lat as number, lead.lng as number], {
        radius:      8,
        fillColor:   color,
        color:       '#fff',
        weight:      2,
        opacity:     1,
        fillOpacity: 0.85,
      })

      const mapsUrl = `https://maps.google.com/?q=${lead.lat},${lead.lng}`

      circle.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #1e293b;">${lead.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${lead.sector}</div>
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
            <span style="
              display:inline-block; padding:2px 8px; border-radius:99px;
              font-size:10px; font-weight:600;
              background:${color}22; color:${color};
            ">${lead.priority === 'high' ? 'Alta' : lead.priority === 'med' ? 'Media' : 'Baja'}</span>
            <span style="font-size:10px; color:#64748b;">${STATUS_LABEL[status] ?? status}</span>
          </div>
          ${lead.rating ? `<div style="font-size:11px; color:#d97706;">★ ${lead.rating}</div>` : ''}
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
            style="display:inline-block; margin-top:6px; font-size:11px; color:#2d5a70; text-decoration:underline;">
            Abrir en Google Maps ↗
          </a>
        </div>
      `, { maxWidth: 240 })

      circle.addTo(map)
    })

    // Fit bounds si hay marcadores
    if (mapped.length > 1) {
      const bounds = L.latLngBounds(mapped.map(l => [l.lat as number, l.lng as number]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapped, statuses])

  if (mapped.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px dashed var(--bor2)' }}>
        <p style={{ fontSize: 13, color: 'var(--txt3)', fontFamily: 'var(--fb)' }}>
          Sin coordenadas disponibles — busca leads vía Google Maps para verlos aquí
        </p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ height, borderRadius: 'var(--r2)', overflow: 'hidden', border: '1px solid var(--bor2)' }} />
      {/* Badge: nº leads con coords */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        background: 'var(--bg2)', border: '1px solid var(--bor2)',
        borderRadius: 'var(--r2)', padding: '4px 10px',
        fontSize: 11, fontWeight: 600, color: 'var(--txt2)',
        fontFamily: 'var(--fb)', boxShadow: 'var(--shadow-sm)',
      }}>
        {mapped.length} / {leads.length} leads
      </div>
      {/* Leyenda */}
      <div style={{
        position: 'absolute', bottom: 28, left: 10, zIndex: 1000,
        background: 'var(--bg2)', border: '1px solid var(--bor2)',
        borderRadius: 'var(--r2)', padding: '6px 10px',
        fontSize: 11, fontFamily: 'var(--fb)', boxShadow: 'var(--shadow-sm)',
        display: 'flex', gap: 10,
      }}>
        {[['high','#dc2626','Alta'],['med','#d97706','Media'],['low','#15803d','Baja']].map(([, color, label]) => (
          <span key={label} style={{ display:'flex', alignItems:'center', gap:4, color:'var(--txt2)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background: color, display:'inline-block' }}/>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
