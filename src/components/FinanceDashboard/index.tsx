import { useState, useMemo } from 'react'
import type { Customer, FinanceExpenses, FinanceProject } from '@/types'

/* ── Helpers ──────────────────────────────────────────────────── */
const fmt  = (n: number, d = 0) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
const eur  = (n: number)        => `${fmt(n, 2)} €`

function calcProject(p: FinanceProject) {
  const baseMes    = p.tarifa_hora * p.horas_semana * 4.33
  const irpfMes    = baseMes * (p.irpf_pct / 100)
  // La cuota de autónomos NO se descuenta por proyecto — se descuenta una vez en el total
  const aportacionMes = baseMes - irpfMes
  const baseTotal     = p.tarifa_hora * p.horas_semana * p.semanas
  const irpfTotal     = baseTotal * (p.irpf_pct / 100)
  const cuotaTotal    = p.cuota_autonomos * (p.semanas / 4.33)
  const netoTotal     = baseTotal - irpfTotal - cuotaTotal
  return { baseMes, aportacionMes, baseTotal, netoTotal }
}

/* ── SliderRow — edición inline de gastos ─────────────────────── */
function SliderRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--txt2)', fontFamily: 'var(--fd)' }}>{label}</span>
      <div style={{ position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: '6px 0', background: 'var(--bg4)', borderRadius: 99 }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, top: 6, bottom: 6, background: 'var(--ac)', borderRadius: 99 }} />
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'relative', width: '100%', appearance: 'none', background: 'transparent', cursor: 'pointer', WebkitAppearance: 'none' }}
          className="calc-slider" />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ac)', fontFamily: 'var(--fm)', textAlign: 'right' }}>{fmt(value)} €</span>
    </div>
  )
}

const EXPENSE_KEYS: (keyof FinanceExpenses)[] = [
  'alquiler', 'alimentacion', 'transporte', 'suministros',
  'ocio', 'formacion', 'salud', 'gestoria',
]

/* ── EditProjectModal ─────────────────────────────────────────── */
function SliderField({ label, value, min, max, unit = '€', onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ac)', fontFamily: 'var(--fm)', background: 'var(--ac-tint)', padding: '1px 7px', borderRadius: 'var(--r)' }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'var(--bg4)', borderRadius: 99 }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: 4, background: 'var(--ac)', borderRadius: 99 }} />
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'relative', width: '100%', appearance: 'none', background: 'transparent', cursor: 'pointer', WebkitAppearance: 'none' }}
          className="calc-slider" />
      </div>
    </div>
  )
}

interface EditModalProps {
  project:    FinanceProject
  customers:  Customer[]
  onSave:     (data: Partial<FinanceProject>) => Promise<FinanceProject>
  onClose:    () => void
}

function EditProjectModal({ project, customers, onSave, onClose }: EditModalProps) {
  const [name,       setName]       = useState(project.name)
  const [customerId, setCustomerId] = useState<string>(project.customer_id ?? 'none')
  const [tarifa,     setTarifa]     = useState(project.tarifa_hora)
  const [horas,      setHoras]      = useState(project.horas_semana)
  const [semanas,    setSemanas]    = useState(project.semanas)
  const [irpf,       setIrpf]       = useState(project.irpf_pct)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError('')
    try {
      await onSave({
        name:         name.trim(),
        customer_id:  customerId === 'none' ? null : customerId,
        tarifa_hora:  tarifa,
        horas_semana: horas,
        semanas,
        irpf_pct:     irpf,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background: 'var(--ac)', padding: '18px 24px', position: 'sticky', top: 0, zIndex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Editar Proyecto</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{project.name}</div>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nombre */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg)', color: 'var(--txt)', fontSize: 13, outline: 'none' }} />
          </div>
          {/* Cliente */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>Cliente</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg)', color: 'var(--txt)', fontSize: 13, cursor: 'pointer' }}>
              <option value="none">Sin cliente asignado</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Sliders */}
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--r2)', padding: '16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Parámetros del proyecto</p>
            <SliderField label="Tarifa por hora"           value={tarifa}  min={12} max={80}  unit=" €/h" onChange={setTarifa} />
            <SliderField label="Horas facturadas / semana" value={horas}   min={4}  max={40}  unit=" h"   onChange={setHoras} />
            <SliderField label="Semanas del proyecto"      value={semanas} min={4}  max={52}  unit=" sem" onChange={setSemanas} />
            <SliderField label="IRPF retenido"             value={irpf}    min={7}  max={21}  unit="%"    onChange={setIrpf} />
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: 'var(--r)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'transparent', color: 'var(--txt2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 'var(--r2)', background: saving ? 'var(--bg4)' : 'var(--ac)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Props ────────────────────────────────────────────────────── */
interface Props {
  projects:        FinanceProject[]
  customers:       Customer[]
  expenses:        FinanceExpenses
  onUpdateProject: (id: string, data: Partial<FinanceProject>) => Promise<FinanceProject>
  onDeleteProject: (id: string) => Promise<void>
  onSaveExpenses:  (data: FinanceExpenses) => Promise<void>
}

export default function FinanceDashboard({ projects, customers, expenses, onUpdateProject, onDeleteProject, onSaveExpenses }: Props) {
  const [localExp,    setLocalExp]    = useState<FinanceExpenses>(expenses)
  const [expDirty,    setExpDirty]    = useState(false)
  const [savingExp,   setSavingExp]   = useState(false)
  const [expandExp,   setExpandExp]   = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [editProject, setEditProject] = useState<FinanceProject | null>(null)

  const setExp = (key: keyof FinanceExpenses, val: number) => {
    setLocalExp(prev => ({ ...prev, [key]: val }))
    setExpDirty(true)
  }

  const handleSaveExp = async () => {
    setSavingExp(true)
    try { await onSaveExpenses(localExp); setExpDirty(false) }
    finally { setSavingExp(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proyecto del dashboard?')) return
    setDeletingId(id)
    try { await onDeleteProject(id) }
    finally { setDeletingId(null) }
  }

  /* ── Resumen agregado ── */
  const summary = useMemo(() => {
    // Cuota de autónomos: coste fijo personal mensual — se descuenta una sola vez
    const cuotaUnica     = projects[0]?.cuota_autonomos ?? 0
    const totalNetoMes   = projects.reduce((s, p) => s + calcProject(p).aportacionMes, 0) - cuotaUnica
    const totalGastos    = EXPENSE_KEYS.reduce((s, k) => s + (Number(localExp[k]) || 0), 0)
    const margenLibre    = totalNetoMes - totalGastos - localExp.ahorro_obj
    const barTotal       = Math.max(totalNetoMes, 1)
    const pctGastos      = Math.min(((totalGastos) / barTotal) * 100, 100)
    const pctAhorro      = Math.min((localExp.ahorro_obj / barTotal) * 100, Math.max(0, 100 - pctGastos))
    const pctMargen      = Math.max(0, 100 - pctGastos - pctAhorro)
    const estado         = margenLibre >= 300 ? 'holgado' : margenLibre >= 0 ? 'justo' : 'déficit'
    return { totalNetoMes, totalGastos, margenLibre, pctGastos, pctAhorro, pctMargen, estado }
  }, [projects, localExp])

  const mensajeEstado = {
    holgado: { text: '✅ Con los proyectos en curso tienes margen holgado este mes.', color: 'var(--success)', bg: 'var(--success-bg)' },
    justo:   { text: '⚠️ Los proyectos cubren los gastos pero el margen es ajustado.', color: 'var(--warning)', bg: 'var(--warning-bg)' },
    déficit: { text: '🔴 Los ingresos actuales no cubren tus gastos. Necesitas más proyectos o reducir costes.', color: 'var(--danger)', bg: 'var(--danger-bg)' },
  }[summary.estado]

  const customerMap = useMemo(() => Object.fromEntries(customers.map(c => [c.id, c.name])), [customers])

  return (
    <>
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      {/* slider thumb styles */}
      <style>{`
        .calc-slider::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:var(--ac); border:2px solid var(--bg2); box-shadow:0 0 0 1px var(--ac); cursor:pointer; }
        .calc-slider::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:var(--ac); border:2px solid var(--bg2); cursor:pointer; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--bor2)', background: 'var(--bg2)', padding: '20px 32px', boxShadow: 'var(--shadow-sm)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--fd)', marginBottom: 4 }}>Dashboard Financiero</h1>
        <p style={{ fontSize: 13, color: 'var(--txt2)' }}>Resumen mensual de todos los proyectos en curso</p>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Resumen KPIs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Fila 1: neto / gastos / margen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Neto mensual total', value: eur(summary.totalNetoMes), color: 'var(--ac)', bg: 'var(--ac-tint)' },
              { label: 'Gastos + ahorro',    value: eur(summary.totalGastos + localExp.ahorro_obj), color: 'var(--danger)', bg: 'var(--danger-bg)' },
              { label: 'Margen libre',       value: `${summary.margenLibre >= 0 ? '+' : ''}${eur(summary.margenLibre)}`, color: summary.margenLibre >= 0 ? 'var(--success)' : 'var(--danger)', bg: summary.margenLibre >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 'var(--r3)', padding: '18px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</p>
                <p style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'var(--fm)' }}>{value}</p>
              </div>
            ))}
          </div>
          {/* Fila 2: fiscal */}
          {projects.length > 0 && (() => {
            const totalIva  = projects.reduce((s, p) => s + p.tarifa_hora * p.horas_semana * 4.33 * 0.21, 0)
            const totalIrpf = projects.reduce((s, p) => { const b = p.tarifa_hora * p.horas_semana * 4.33; return s + b * (p.irpf_pct / 100) }, 0)
            const totalDecl = totalIva - totalIrpf
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--warning-bg)', borderRadius: 'var(--r3)', padding: '14px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>IVA cobrado (21%)</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--fm)' }}>{eur(totalIva)}</p>
                  <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>Ingresa en cuenta → va a Hacienda</p>
                </div>
                <div style={{ background: 'var(--danger-bg)', borderRadius: 'var(--r3)', padding: '14px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>IRPF retenido</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--fm)' }}>−{eur(totalIrpf)}</p>
                  <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>Ya lo retiene el cliente</p>
                </div>
                <div style={{ background: totalDecl >= 0 ? 'var(--warning-bg)' : 'var(--success-bg)', borderRadius: 'var(--r3)', padding: '14px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: totalDecl >= 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Neto a pagar trimestral</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: totalDecl >= 0 ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--fm)' }}>{totalDecl >= 0 ? '+' : ''}{eur(totalDecl)}</p>
                  <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>IVA − IRPF retenido</p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Barra apilada */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ height: 20, borderRadius: 99, overflow: 'hidden', display: 'flex', background: 'var(--bg4)', marginBottom: 10 }}>
            <div style={{ width: `${summary.pctGastos}%`, background: '#dc2626', transition: 'width .4s', minWidth: summary.pctGastos > 0 ? 4 : 0 }} />
            <div style={{ width: `${summary.pctAhorro}%`, background: '#d97706', transition: 'width .4s', minWidth: summary.pctAhorro > 0 ? 4 : 0 }} />
            <div style={{ width: `${summary.pctMargen}%`, background: '#15803d', transition: 'width .4s', minWidth: summary.pctMargen > 0 ? 4 : 0 }} />
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[{ label: 'Gastos', color: '#dc2626', pct: summary.pctGastos }, { label: 'Ahorro', color: '#d97706', pct: summary.pctAhorro }, { label: 'Margen', color: '#15803d', pct: summary.pctMargen }]
              .map(({ label, color, pct }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                  <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{label} <strong style={{ color, fontFamily: 'var(--fm)' }}>{fmt(pct, 1)}%</strong></span>
                </div>
              ))}
          </div>
          <div style={{ marginTop: 12, background: mensajeEstado.bg, borderRadius: 'var(--r2)', padding: '8px 12px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: mensajeEstado.color }}>{mensajeEstado.text}</p>
          </div>
        </div>

        {/* ── Tabla de proyectos ── */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bor2)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              📁 Proyectos en curso ({projects.length})
            </h3>
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--txt3)', fontFamily: 'var(--fd)' }}>No hay proyectos en curso.</p>
              <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>Ve a la Calculadora y pulsa "Generar Proyecto".</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)' }}>
                    {['Proyecto', 'Cliente', 'Tarifa/h', 'H/sem', 'Semanas', 'Aportación mensual', 'Total proyecto', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === '' ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--txt2)', fontFamily: 'var(--fd)', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--bor2)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => {
                    const { aportacionMes, netoTotal } = calcProject(p)
                    const customerName = p.customers?.name ?? (p.customer_id ? customerMap[p.customer_id] : null) ?? '—'
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg3)', borderBottom: '1px solid var(--bor)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--txt)', fontFamily: 'var(--fd)' }}>{p.name}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--txt2)' }}>{customerName}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--txt2)', fontFamily: 'var(--fm)' }}>{p.tarifa_hora} €/h</td>
                        <td style={{ padding: '12px 14px', color: 'var(--txt2)', fontFamily: 'var(--fm)' }}>{p.horas_semana} h</td>
                        <td style={{ padding: '12px 14px', color: 'var(--txt2)', fontFamily: 'var(--fm)' }}>{p.semanas} sem</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--ac)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>{eur(aportacionMes)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>{eur(netoTotal)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button onClick={() => setEditProject(p)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 14, padding: '2px 5px', borderRadius: 'var(--r)', transition: 'color .15s', marginRight: 2 }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ac)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--txt3)')}>
                            ✎
                          </button>
                          <button onClick={() => handleDelete(p.id!)} disabled={deletingId === p.id}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 16, lineHeight: 1, padding: '2px 5px', borderRadius: 'var(--r)', transition: 'color .15s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--txt3)')}>
                            {deletingId === p.id ? '…' : '×'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Fila de totales */}
                <tfoot>
                  {/* Fila cuota autónomos — coste fijo único */}
                  {projects.length > 0 && (
                    <tr style={{ borderTop: '1px solid var(--bor2)', background: 'var(--danger-bg)' }}>
                      <td colSpan={5} style={{ padding: '10px 14px', fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--fd)', fontStyle: 'italic' }}>
                        − Cuota autónomos (coste mensual único)
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--danger)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>
                        −{eur(projects[0].cuota_autonomos)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  )}
                  <tr style={{ background: 'var(--ac-tint)', borderTop: '2px solid var(--ac)' }}>
                    <td colSpan={5} style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--ac)', fontFamily: 'var(--fd)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      Neto mensual total
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--ac)', fontFamily: 'var(--fm)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {eur(summary.totalNetoMes)}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--fm)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {eur(projects.reduce((s, p) => s + calcProject(p).netoTotal, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Gastos personales (colapsable) ── */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <button onClick={() => setExpandExp(v => !v)}
            style={{ width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', borderBottom: expandExp ? '1px solid var(--bor2)' : 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              🏠 Gastos personales mensuales
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', fontFamily: 'var(--fm)' }}>
                {eur(summary.totalGastos + localExp.ahorro_obj)}
              </span>
              <span style={{ fontSize: 18, color: 'var(--txt3)', transform: expandExp ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
            </div>
          </button>

          {expandExp && (
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                {([
                  ['alquiler',     'Alquiler',                        100, 900],
                  ['alimentacion', 'Alimentación',                    100, 600],
                  ['transporte',   'Transporte',                      0,   350],
                  ['suministros',  'Suministros (luz/internet/móvil)',20,  250],
                  ['ocio',         'Ocio / extras',                   0,   500],
                  ['formacion',    'Formación / suscripciones',       0,   250],
                  ['salud',        'Salud / gimnasio',                0,   200],
                  ['gestoria',     'Gestoría',                        0,   80],
                  ['ahorro_obj',   'Ahorro mensual objetivo',         0,   1000],
                ] as const).map(([key, label, min, max]) => (
                  <SliderRow key={key} label={label} value={localExp[key]} min={min} max={max} onChange={v => setExp(key, v)} />
                ))}
              </div>
              {expDirty && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleSaveExp} disabled={savingExp}
                    style={{ padding: '9px 20px', background: savingExp ? 'var(--bg4)' : 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r2)', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: 13, cursor: savingExp ? 'default' : 'pointer' }}>
                    {savingExp ? 'Guardando…' : 'Guardar gastos'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tabla obligaciones fiscales ── */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bor2)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              🧾 Obligaciones fiscales mensuales
            </h3>
            <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>IVA e IRPF a declarar/pagar a Hacienda</p>
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--txt3)' }}>Sin proyectos en curso.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)' }}>
                    {['Proyecto', 'Cliente', 'Base mensual', 'IVA (21%)', 'IRPF retenido', 'Total a declarar'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--txt2)', fontFamily: 'var(--fd)', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--bor2)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => {
                    const baseMes   = p.tarifa_hora * p.horas_semana * 4.33
                    const ivaMes    = baseMes * 0.21
                    const irpfMes   = baseMes * (p.irpf_pct / 100)
                    const totalDeclarar = ivaMes - irpfMes
                    const customerName  = p.customers?.name ?? (p.customer_id ? customerMap[p.customer_id] : null) ?? '—'
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg3)', borderBottom: '1px solid var(--bor)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--txt)', fontFamily: 'var(--fd)' }}>{p.name}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--txt2)' }}>{customerName}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--txt2)', fontFamily: 'var(--fm)' }}>{eur(baseMes)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--warning)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>{eur(ivaMes)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--danger)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>−{eur(irpfMes)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: totalDeclarar >= 0 ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>
                          {totalDeclarar >= 0 ? '+' : ''}{eur(totalDeclarar)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--warning-bg)', borderTop: '2px solid var(--warning)' }}>
                    <td colSpan={3} style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--warning)', fontFamily: 'var(--fd)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      Total mensual a Hacienda
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--fm)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {eur(projects.reduce((s, p) => s + p.tarifa_hora * p.horas_semana * 4.33 * 0.21, 0))}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--fm)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      −{eur(projects.reduce((s, p) => { const b = p.tarifa_hora * p.horas_semana * 4.33; return s + b * (p.irpf_pct / 100) }, 0))}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--fm)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {eur(projects.reduce((s, p) => { const b = p.tarifa_hora * p.horas_semana * 4.33; return s + b * 0.21 - b * (p.irpf_pct / 100) }, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>

    {editProject && (
      <EditProjectModal
        project={editProject}
        customers={customers}
        onSave={data => onUpdateProject(editProject.id!, data)}
        onClose={() => setEditProject(null)}
      />
    )}
  </>
  )
}
