import { useMemo, useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Phone, Globe, MapPin, Plus, TableProperties, FileJson, Upload, ChevronDown } from 'lucide-react'
import { Badge }         from '@/components/ui/badge'
import { Button }        from '@/components/ui/button'
import ConfirmDialog     from './ConfirmDialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

/* ── Tipos ────────────────────────────────────────────────────── */
type SortDir = 'asc' | 'desc'
type SortCol = 'name' | 'sector' | 'priority' | 'status' | 'rating'

interface Lead {
  id: string; name: string; sector: string; loc: string; url: string;
  phone: string; priority: string; rating: number | null; reviews: number;
  flaws: string[]; saas: string[]; source: string; [k: string]: unknown
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

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={12} className="ml-1 inline opacity-30"/>
  return dir === 'asc'
    ? <ArrowUp   size={12} className="ml-1 inline" style={{ color: 'var(--ac)' }}/>
    : <ArrowDown size={12} className="ml-1 inline" style={{ color: 'var(--ac)' }}/>
}

export default function LeadTable({ leads, statuses, filter, onFilter, onNewLead, onEdit, onDelete, onExportCSV, onExportJSON, onImport }: Props) {
  const [search,      setSearch]      = useState('')
  const [sortCol,     setSortCol]     = useState<SortCol>('name')
  const [sortDir,     setSortDir]     = useState<SortDir>('asc')
  const [confirmId,   setConfirmId]   = useState<string | null>(null)
  const [exportOpen,  setExportOpen]  = useState(false)
  const importRef   = useRef<HTMLInputElement>(null)
  const exportRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
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

  const sorted = useMemo(() => {
    const term = search.toLowerCase()
    // Primero filtra por pipeline, luego por búsqueda de texto
    const pipelined = filter === 'all'
      ? leads
      : leads.filter(l => (statuses[l.id] || 'sin contactar') === filter)
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
  }, [leads, statuses, search, sortCol, sortDir])

  const Col = ({ col, children }: { col: SortCol; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => handleSort(col)}
      style={{ fontFamily: 'var(--fd)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, color: 'var(--txt2)', padding: '14px 20px' }}
    >
      {children}<SortIcon active={sortCol === col} dir={sortDir}/>
    </TableHead>
  )

  const StaticHead = ({ children }: { children: React.ReactNode }) => (
    <TableHead style={{ fontFamily: 'var(--fd)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, color: 'var(--txt2)', padding: '14px 20px' }}>
      {children}
    </TableHead>
  )

  return (
    <>
    <div className="flex flex-col" style={{ flex: 1 }}>
      {/* Barra única: pipeline + búsqueda + contador */}
      <div className="filter-controls" aria-label="Filtros">
        <select
          value={filter}
          onChange={e => onFilter(e.target.value)}
          className="pipeline-select"
          aria-label="Filtrar por estado del pipeline"
        >
          {FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              Pipeline: {o.label} — {pipelineCount(o.value)}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="table-search-input"
          placeholder="Buscar por nombre, sector o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          spellCheck={false}
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
      </div>

      {/* Table container */}
      <div className="table-outer">
        <Table>
          <TableHeader>
            <TableRow style={{ borderBottom: '1px solid var(--bor2)', background: 'var(--bg3)' }}>
              <Col col="name">Negocio</Col>
              <Col col="sector">Sector</Col>
              <StaticHead>Teléfono</StaticHead>
              <StaticHead>Web</StaticHead>
              <Col col="priority">Prioridad</Col>
              <Col col="status">Estado</Col>
              <Col col="rating">Rating</Col>
              <TableHead style={{ fontFamily: 'var(--fd)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, color: 'var(--txt2)', padding: '14px 20px', textAlign: 'right' }}>
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} style={{ textAlign: 'center', padding: '56px 0', color: 'var(--txt3)', fontFamily: 'var(--fb)' }}>
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
