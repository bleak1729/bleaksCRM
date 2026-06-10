import { useMemo, useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Phone, Globe, MapPin, Plus, TableProperties, FileJson, Upload, ChevronDown, LayoutTemplate } from 'lucide-react'
import { Badge }             from '@/components/ui/badge'
import { Button }            from '@/components/ui/button'
import ConfirmDialog         from './ConfirmDialog'
import LandingPromptModal    from './LandingPromptModal'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

/* ── Tipos ────────────────────────────────────────────────────── */
type SortDir = 'asc' | 'desc'
type SortCol = 'name' | 'sector' | 'priority' | 'status' | 'rating'

interface Lead {
  id: string; name: string; sector: string; loc: string; url: string;
  phone: string; priority: string; rating: number | null; reviews: number;
  flaws: string[]; saas: string[]; source: string;
  country?: string; region?: string; city?: string;
  linkedin?: string; instagram?: string; facebook?: string; twitter?: string; tiktok?: string;
  [k: string]: unknown
}
interface Props {
  leads:         Lead[]
  statuses:      Record<string, string>
  filter:        string
  onFilter:      (v: string) => void
  onNewLead?:    () => void
  onEdit:        (lead: Lead) => void
  onDelete?:     (id: string) => void
  onExportCSV?:  () => void
  onExportJSON?: () => void
  onImport?:     (e: React.ChangeEvent<HTMLInputElement>) => void
}

const FILTER_OPTIONS = [
  { value: 'all',           label: 'Todos los leads'  },
  { value: 'sin contactar', label: 'Sin contactar'    },
  { value: 'en proceso',    label: 'En proceso'       },
  { value: 'mockup',        label: 'MockUp'           },
  { value: 'cliente',       label: 'Clientes'         },
  { value: 'descartado',    label: 'Descartados'      },
]

/* ── Badge helpers ──────────────────────────────────────────────── */
const PRIO: Record<string, { variant: 'danger'|'warning'|'success'; label: string }> = {
  high: { variant: 'danger',  label: 'Alta'  },
  med:  { variant: 'warning', label: 'Media' },
  low:  { variant: 'success', label: 'Baja'  },
}
const STATUS: Record<string, 'neutral'|'warning'|'success'|'danger'|'default'> = {
  'sin contactar': 'neutral',
  'en proceso':    'warning',
  'mockup':        'default',
  'cliente':       'success',
  'descartado':    'danger',
}

/* ── Social icons (SVG inline) ──────────────────────────────────── */
const SOCIAL_NETWORKS = [
  {
    key: 'linkedin' as const,
    label: 'LinkedIn',
    color: '#0a66c2',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    key: 'instagram' as const,
    label: 'Instagram',
    color: '#e1306c',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  {
    key: 'facebook' as const,
    label: 'Facebook',
    color: '#1877f2',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    key: 'twitter' as const,
    label: 'Twitter / X',
    color: '#000000',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    key: 'tiktok' as const,
    label: 'TikTok',
    color: '#010101',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
      </svg>
    ),
  },
]

function normalizeUrl(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  return s.startsWith('http') ? s : `https://${s}`
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={12} className="ml-1 inline opacity-30"/>
  return dir === 'asc'
    ? <ArrowUp   size={12} className="ml-1 inline" style={{ color: 'var(--ac)' }}/>
    : <ArrowDown size={12} className="ml-1 inline" style={{ color: 'var(--ac)' }}/>
}

const HEAD_STYLE: React.CSSProperties = { fontFamily: 'var(--fd)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, color: 'var(--txt2)', padding: '14px 20px' }

function Col({ col, sortCol, sortDir, onSort, children }: { col: SortCol; sortCol: SortCol; sortDir: SortDir; onSort: (c: SortCol) => void; children: React.ReactNode }) {
  return (
    <TableHead className="cursor-pointer select-none" onClick={() => onSort(col)} style={HEAD_STYLE}>
      {children}<SortIcon active={sortCol === col} dir={sortDir}/>
    </TableHead>
  )
}

function GeoSelect({ value, onChange, placeholder, options, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: string[]; disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      aria-label={placeholder}
      style={{
        height: 32, padding: '0 8px', maxWidth: 150,
        fontFamily: 'var(--fb)', fontSize: '13px',
        background: 'var(--bg2)', color: value ? 'var(--ac)' : 'var(--txt2)',
        border: '1px solid var(--bor2)', borderRadius: 'var(--r2)',
        cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: value ? 600 : 400,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function StaticHead({ children }: { children: React.ReactNode }) {
  return <TableHead style={HEAD_STYLE}>{children}</TableHead>
}

export default function LeadTable({ leads, statuses, filter, onFilter, onNewLead, onEdit, onDelete, onExportCSV, onExportJSON, onImport }: Props) {
  const [search,      setSearch]      = useState('')
  const [sortCol,     setSortCol]     = useState<SortCol>('name')
  const [sortDir,     setSortDir]     = useState<SortDir>('asc')
  const [confirmId,   setConfirmId]   = useState<string | null>(null)
  const [exportOpen,   setExportOpen]   = useState(false)
  const [pipelineOpen, setPipelineOpen] = useState(false)
  const [landingLead,  setLandingLead]  = useState<Lead | null>(null)
  const [geoCountry, setGeoCountry] = useState('')
  const [geoRegion,  setGeoRegion]  = useState('')
  const [geoCity,    setGeoCity]    = useState('')
  const importRef    = useRef<HTMLInputElement>(null)
  const exportRef    = useRef<HTMLDivElement>(null)
  const pipelineRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setExportOpen(false)
      if (pipelineRef.current && !pipelineRef.current.contains(e.target as Node))
        setPipelineOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const confirmLead = confirmId ? leads.find(l => l.id === confirmId) : null

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // Cuenta para las opciones del pipeline select
  const pipelineCount = (id: string) =>
    id === 'all'
      ? leads.length
      : leads.filter(l => (statuses[l.id] || 'sin contactar') === id).length

  // Opciones en cascada para el filtro demográfico (a partir de los leads)
  const geoOptions = useMemo(() => {
    const distinct = (vals: (string | undefined)[]) =>
      [...new Set(vals.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, 'es'))
    const countries = distinct(leads.map(l => l.country))
    const inCountry = geoCountry ? leads.filter(l => l.country === geoCountry) : leads
    const regions   = distinct(inCountry.map(l => l.region))
    const inRegion  = geoRegion ? inCountry.filter(l => l.region === geoRegion) : inCountry
    const cities    = distinct(inRegion.map(l => l.city))
    return { countries, regions, cities }
  }, [leads, geoCountry, geoRegion])

  const sorted = useMemo(() => {
    const term = search.toLowerCase()
    // Primero filtra por pipeline, luego por búsqueda de texto
    let pipelined = filter === 'all'
      ? leads
      : leads.filter(l => (statuses[l.id] || 'sin contactar') === filter)
    // Filtro demográfico
    if (geoCountry) pipelined = pipelined.filter(l => l.country === geoCountry)
    if (geoRegion)  pipelined = pipelined.filter(l => l.region === geoRegion)
    if (geoCity)    pipelined = pipelined.filter(l => l.city === geoCity)
    const filtered = pipelined.filter(l =>
      l.name.toLowerCase().includes(term) ||
      l.sector.toLowerCase().includes(term) ||
      (l.phone && l.phone.includes(term))
    )
    return [...filtered].sort((a, b) => {
      let av: string | number = '', bv: string | number = ''
      if (sortCol === 'name')     { av = a.name;     bv = b.name }
      if (sortCol === 'sector')   { av = a.sector;   bv = b.sector }
      if (sortCol === 'priority') { av = ({high:0,med:1,low:2} as Record<string,number>)[a.priority]??1; bv = ({high:0,med:1,low:2} as Record<string,number>)[b.priority]??1 }
      if (sortCol === 'status')   { av = statuses[a.id]||'sin contactar'; bv = statuses[b.id]||'sin contactar' }
      if (sortCol === 'rating')   { av = a.rating??-1; bv = b.rating??-1 }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [leads, statuses, filter, geoCountry, geoRegion, geoCity, search, sortCol, sortDir])

  return (
    <>
    <div className="flex flex-col" style={{ flex: 1 }}>
      {/* Barra única: pipeline + búsqueda + contador */}
      <div className="filter-controls" aria-label="Filtros">
        {/* ── Split button Pipeline ───────────────────────────── */}
        <div ref={pipelineRef} style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            onClick={() => setPipelineOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 10px', height: 32,
              fontFamily: 'var(--fd)', fontSize: '13px', fontWeight: 500,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--bor2)', borderRight: 'none',
              borderRadius: 'var(--r2) 0 0 var(--r2)',
              cursor: 'pointer', transition: 'background .15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
          >
            Pipeline: {FILTER_OPTIONS.find(o => o.value === filter)?.label ?? 'Todos los leads'}
          </button>
          <button
            onClick={() => setPipelineOpen(v => !v)}
            aria-label="Seleccionar filtro de pipeline"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 32,
              background: pipelineOpen ? 'var(--bg3)' : 'var(--bg2)',
              color: 'var(--txt2)',
              border: '1px solid var(--bor2)',
              borderRadius: '0 var(--r2) var(--r2) 0',
              cursor: 'pointer', transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
            onMouseLeave={e => (e.currentTarget.style.background = pipelineOpen ? 'var(--bg3)' : 'var(--bg2)')}
          >
            <ChevronDown size={12} style={{ transition: 'transform .15s', transform: pipelineOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}/>
          </button>

          {pipelineOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              background: 'var(--bg2)', border: '1px solid var(--bor2)',
              borderRadius: 'var(--r2)', padding: 4, minWidth: 200,
              zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            }}>
              {FILTER_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => { onFilter(o.value); setPipelineOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '7px 10px',
                    fontFamily: 'var(--fb)', fontSize: '13px',
                    color: filter === o.value ? 'var(--ac)' : 'var(--txt)',
                    background: filter === o.value ? 'var(--ac-tint)' : 'transparent',
                    border: 'none', borderRadius: 'var(--r)', cursor: 'pointer',
                    textAlign: 'left', transition: 'background .12s', fontWeight: filter === o.value ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (filter !== o.value) (e.currentTarget.style.background = 'var(--bg3)') }}
                  onMouseLeave={e => { (e.currentTarget.style.background = filter === o.value ? 'var(--ac-tint)' : 'transparent') }}
                >
                  <span>{o.label}</span>
                  <span style={{ fontSize: '11px', color: filter === o.value ? 'var(--ac)' : 'var(--txt3)', fontFamily: 'var(--fd)', fontWeight: 600 }}>
                    {pipelineCount(o.value)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          className="table-search-input"
          placeholder="Buscar por nombre, sector o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          spellCheck={false}
        />

        {/* ── Filtro demográfico (en cascada) ─────────────────── */}
        <GeoSelect
          value={geoCountry}
          onChange={v => { setGeoCountry(v); setGeoRegion(''); setGeoCity('') }}
          placeholder="País: todos"
          options={geoOptions.countries}
        />
        <GeoSelect
          value={geoRegion}
          onChange={v => { setGeoRegion(v); setGeoCity('') }}
          placeholder="Provincia: todas"
          options={geoOptions.regions}
          disabled={geoOptions.regions.length === 0}
        />
        <GeoSelect
          value={geoCity}
          onChange={setGeoCity}
          placeholder="Ciudad: todas"
          options={geoOptions.cities}
          disabled={geoOptions.cities.length === 0}
        />

        {(onExportCSV || onExportJSON || onImport) && (
          <div style={{ display: 'flex', gap: 6 }}>

            {/* ── Split button Exportar ─────────────────────────── */}
            <div ref={exportRef} style={{ position: 'relative', display: 'inline-flex' }}>
              {/* Acción principal: exportar CSV */}
              <button
                onClick={() => { onExportCSV?.(); setExportOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '0 10px', height: 32,
                  fontFamily: 'var(--fd)', fontSize: '13px', fontWeight: 500,
                  background: 'var(--bg2)', color: 'var(--txt2)',
                  border: '1px solid var(--bor2)', borderRight: 'none',
                  borderRadius: 'var(--r2) 0 0 var(--r2)',
                  cursor: 'pointer', transition: 'background .15s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
              >
                <TableProperties size={13}/> Exportar
              </button>

              {/* Flecha dropdown */}
              <button
                onClick={() => setExportOpen(v => !v)}
                aria-label="Más opciones"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 32,
                  background: exportOpen ? 'var(--bg3)' : 'var(--bg2)',
                  color: 'var(--txt2)',
                  border: '1px solid var(--bor2)',
                  borderRadius: '0 var(--r2) var(--r2) 0',
                  cursor: 'pointer', transition: 'background .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = exportOpen ? 'var(--bg3)' : 'var(--bg2)')}
              >
                <ChevronDown size={12} style={{ transition: 'transform .15s', transform: exportOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}/>
              </button>

              {/* Menú desplegable */}
              {exportOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                  background: 'var(--bg2)', border: '1px solid var(--bor2)',
                  borderRadius: 'var(--r2)', padding: 4, minWidth: 178,
                  zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                }}>
                  {onExportCSV && (
                    <button
                      onClick={() => { onExportCSV(); setExportOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '7px 10px',
                        fontFamily: 'var(--fb)', fontSize: '13px',
                        color: 'var(--txt)', background: 'transparent',
                        border: 'none', borderRadius: 'var(--r)', cursor: 'pointer',
                        textAlign: 'left', transition: 'background .12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <TableProperties size={13} style={{ color: 'var(--txt3)', flexShrink: 0 }}/>
                      <span>
                        <span style={{ display: 'block', fontWeight: 500 }}>Exportar CSV</span>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--txt3)' }}>Tabla de leads</span>
                      </span>
                    </button>
                  )}
                  {onExportJSON && (
                    <button
                      onClick={() => { onExportJSON(); setExportOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '7px 10px',
                        fontFamily: 'var(--fb)', fontSize: '13px',
                        color: 'var(--txt)', background: 'transparent',
                        border: 'none', borderRadius: 'var(--r)', cursor: 'pointer',
                        textAlign: 'left', transition: 'background .12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <FileJson size={13} style={{ color: 'var(--txt3)', flexShrink: 0 }}/>
                      <span>
                        <span style={{ display: 'block', fontWeight: 500 }}>Exportar JSON</span>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--txt3)' }}>Copia de seguridad</span>
                      </span>
                    </button>
                  )}
                  {onImport && (
                    <>
                      <div style={{ height: 1, background: 'var(--bor2)', margin: '4px 0' }}/>
                      <button
                        onClick={() => { setExportOpen(false); importRef.current?.click() }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '7px 10px',
                          fontFamily: 'var(--fb)', fontSize: '13px',
                          color: 'var(--txt)', background: 'transparent',
                          border: 'none', borderRadius: 'var(--r)', cursor: 'pointer',
                          textAlign: 'left', transition: 'background .12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Upload size={13} style={{ color: 'var(--txt3)', flexShrink: 0 }}/>
                        <span>
                          <span style={{ display: 'block', fontWeight: 500 }}>Importar JSON</span>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--txt3)' }}>Restaurar datos</span>
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {onImport && (
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={onImport}/>
            )}

          </div>
        )}

        <span className="results-count" style={{ fontFamily: 'var(--fb)' }}>
          {sorted.length} lead{sorted.length !== 1 ? 's' : ''} encontrados
        </span>

        {onNewLead && (
          <Button
            variant="ghost" size="sm" shape="square"
            onClick={onNewLead}
            style={{ fontFamily: 'var(--fd)', fontWeight: 600, background: 'var(--ac)', color: '#fff', border: '1px solid var(--ac)', marginLeft: 8, whiteSpace: 'nowrap' }}
          >
            <Plus size={14} /> Nuevo lead
          </Button>
        )}
      </div>

      {/* Table container */}
      <div className="table-outer">
        <Table>
          <TableHeader>
            <TableRow style={{ borderBottom: '1px solid var(--bor2)', background: 'var(--bg3)' }}>
              <Col col="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Negocio</Col>
              <Col col="sector" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Sector</Col>
              <StaticHead>Teléfono</StaticHead>
              <StaticHead>Web</StaticHead>
              <StaticHead>Redes</StaticHead>
              <Col col="priority" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Prioridad</Col>
              <Col col="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Estado</Col>
              <Col col="rating" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Rating</Col>
              <TableHead style={{ fontFamily: 'var(--fd)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, color: 'var(--txt2)', padding: '14px 20px', textAlign: 'right' }}>
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} style={{ textAlign: 'center', padding: '56px 0', color: 'var(--txt3)', fontFamily: 'var(--fb)' }}>
                  No hay leads con este filtro.
                </TableCell>
              </TableRow>
            ) : sorted.map(lead => {
              const status = statuses[lead.id] || 'sin contactar'
              const urlBad = lead.url.startsWith('Sin')
              const prio = PRIO[lead.priority] || { variant: 'neutral' as const, label: lead.priority }

              return (
                <TableRow
                  key={lead.id}
                  className="group"
                  style={{ borderBottom: '1px solid var(--bor)' }}
                >
                  {/* Negocio */}
                  <TableCell style={{ padding: '16px 20px', fontWeight: 600, fontSize: '14px', color: 'var(--txt)', fontFamily: 'var(--fb)' }}>
                    {lead.name}
                  </TableCell>

                  {/* Sector */}
                  <TableCell style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--txt2)', fontFamily: 'var(--fb)' }}>
                    {lead.sector}
                  </TableCell>

                  {/* Teléfono */}
                  <TableCell style={{ padding: '16px 20px' }}>
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5"
                        style={{ fontSize: '13px', color: 'var(--ac)', fontFamily: 'var(--fb)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        <Phone size={12}/>{lead.phone}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--txt3)', fontSize: '13px' }}>—</span>
                    )}
                  </TableCell>

                  {/* Web */}
                  <TableCell style={{ padding: '16px 20px', maxWidth: '160px' }}>
                    {urlBad ? (
                      <Badge variant="danger">Sin web</Badge>
                    ) : (
                      <a href={lead.url.startsWith('http') ? lead.url : `https://${lead.url}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1"
                        style={{ fontSize: '13px', color: 'var(--ac)', fontFamily: 'var(--fb)', textDecoration: 'none', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        <Globe size={12} style={{ flexShrink: 0 }}/>
                        {lead.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </TableCell>

                  {/* Redes sociales */}
                  <TableCell style={{ padding: '16px 20px' }}>
                    {(() => {
                      const links = SOCIAL_NETWORKS.filter(n => lead[n.key])
                      if (links.length === 0)
                        return <span style={{ color: 'var(--txt3)', fontSize: '13px' }}>—</span>
                      return (
                        <div className="flex items-center gap-1.5">
                          {links.map(n => (
                            <a
                              key={n.key}
                              href={normalizeUrl(lead[n.key] as string)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={n.label}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                                color: n.color, background: 'var(--bg2)',
                                border: '1px solid var(--bor2)', textDecoration: 'none',
                                transition: 'background .15s, border-color .15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--ac-tint)'; e.currentTarget.style.borderColor = 'var(--ac)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--bor2)' }}
                            >
                              {n.icon}
                            </a>
                          ))}
                        </div>
                      )
                    })()}
                  </TableCell>

                  {/* Prioridad */}
                  <TableCell style={{ padding: '16px 20px' }}>
                    <Badge variant={prio.variant}>{prio.label}</Badge>
                  </TableCell>

                  {/* Estado */}
                  <TableCell style={{ padding: '16px 20px' }}>
                    <Badge variant={STATUS[status] || 'neutral'}>{status}</Badge>
                  </TableCell>

                  {/* Rating */}
                  <TableCell style={{ padding: '16px 20px' }}>
                    {lead.rating ? (
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', fontFamily: 'var(--fb)' }}>
                        <span style={{ color: '#f59e0b', marginRight: 2 }}>★</span>
                        {lead.rating}
                        {lead.reviews > 0 && (
                          <span style={{ color: 'var(--txt2)', fontWeight: 400, marginLeft: 4 }}>({lead.reviews})</span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--txt3)', fontSize: '13px' }}>—</span>
                    )}
                  </TableCell>

                  {/* Acciones */}
                  <TableCell style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-1">
                      {/* Generar Landing (solo mockup) */}
                      {status === 'mockup' && (
                        <Button
                          variant="ghost" size="icon-sm" shape="square"
                          onClick={() => setLandingLead(lead)}
                          title="Generar landing page"
                          style={{ color: 'var(--ac)', border: '1px solid var(--ac)', background: 'var(--ac-tint)' }}
                        >
                          <LayoutTemplate size={13}/>
                        </Button>
                      )}
                      {/* Abrir en Google Maps */}
                      <a
                        href={
                          (lead as any).lat && (lead as any).lng
                            ? `https://maps.google.com/?q=${(lead as any).lat},${(lead as any).lng}`
                            : lead.loc
                              ? `https://maps.google.com/maps?q=${encodeURIComponent(lead.loc + ' ' + lead.name)}`
                              : undefined
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver en Google Maps"
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 32, height: 32, flexShrink: 0,
                          color: 'var(--ac)', border: '1px solid var(--bor2)',
                          background: 'var(--bg2)', borderRadius: 'var(--r)',
                          textDecoration: 'none', transition: 'background .15s',
                          pointerEvents: (lead.loc || (lead as any).lat) ? 'auto' : 'none',
                          opacity: (lead.loc || (lead as any).lat) ? 1 : 0.3,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ac-tint)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
                      >
                        <MapPin size={13}/>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        shape="square"
                        onClick={() => onEdit(lead)}
                        title="Editar lead"
                        style={{ color: 'var(--txt2)', border: '1px solid var(--bor2)', background: 'var(--bg2)' }}
                      >
                        <Pencil size={13}/>
                      </Button>
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          shape="square"
                          onClick={() => setConfirmId(lead.id)}
                          title="Eliminar lead"
                          style={{ color: 'var(--danger)', border: '1px solid var(--bor2)', background: 'var(--bg2)' }}
                        >
                          <Trash2 size={13}/>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>

    {landingLead && (
      <LandingPromptModal
        lead={landingLead}
        onClose={() => setLandingLead(null)}
      />
    )}

    {confirmLead && (
      <ConfirmDialog
        title="Eliminar lead"
        message={`¿Seguro que quieres eliminar "${confirmLead.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        onConfirm={() => { onDelete!(confirmLead.id); setConfirmId(null) }}
        onCancel={() => setConfirmId(null)}
      />
    )}
    </>
  )
}
