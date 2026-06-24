import { useState, useMemo } from 'react'
import type { Customer, FinanceProject } from '@/types'

/* ── Types ────────────────────────────────────────────────────── */
interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}

interface Props {
  customers:            Customer[]
  onCreateCustomer:     (data: Partial<Customer>) => Promise<Customer>
  onSaveFinanceProject: (data: Partial<FinanceProject>) => Promise<FinanceProject>
}

/* ── Helpers ──────────────────────────────────────────────────── */
const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
const eur = (n: number) => `${fmt(n, 2)} €`

/* ── SliderField ──────────────────────────────────────────────── */
function SliderField({ label, value, min, max, step = 1, unit = '€', onChange }: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', fontFamily: 'var(--fd)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ac)', fontFamily: 'var(--fm)', background: 'var(--ac-tint)', padding: '2px 8px', borderRadius: 'var(--r)', minWidth: 72, textAlign: 'right' }}>
          {fmt(value)}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'var(--bg4)', borderRadius: 99 }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: 4, background: 'var(--ac)', borderRadius: 99, transition: 'width .1s' }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'relative', width: '100%', appearance: 'none', background: 'transparent', cursor: 'pointer', height: 20, WebkitAppearance: 'none' }}
          className="calc-slider" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--fm)' }}>{fmt(min)}{unit}</span>
        <span style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--fm)' }}>{fmt(max)}{unit}</span>
      </div>
    </div>
  )
}

/* ── ResultRow ────────────────────────────────────────────────── */
function ResultRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--bor)' }}>
      <span style={{ fontSize: 12, color: 'var(--txt2)', fontFamily: 'var(--fd)', fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: color ?? 'var(--txt)', fontFamily: 'var(--fm)' }}>{value}</span>
    </div>
  )
}

/* ── SectionCard ──────────────────────────────────────────────── */
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', padding: '20px 24px', boxShadow: 'var(--shadow)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '.07em' }}>
        <span style={{ fontSize: 16 }}>{icon}</span>{title}
      </h3>
      {children}
    </div>
  )
}

/* ── NewProjectModal ──────────────────────────────────────────── */
interface ModalProps {
  customers:        Customer[]
  onCreateCustomer: (data: Partial<Customer>) => Promise<Customer>
  onSave:           (name: string, customerId: string | null) => Promise<void>
  onClose:          () => void
}

function NewProjectModal({ customers, onCreateCustomer, onSave, onClose }: ModalProps) {
  const [projectName,   setProjectName]   = useState('')
  const [customerId,    setCustomerId]    = useState<string>('none')
  const [creating,      setCreating]      = useState(false)
  const [newName,       setNewName]       = useState('')
  const [newEmail,      setNewEmail]      = useState('')
  const [newPhone,      setNewPhone]      = useState('')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')

  const handleSubmit = async () => {
    if (!projectName.trim()) { setError('El nombre del proyecto es obligatorio'); return }
    setSaving(true)
    setError('')
    try {
      let finalCustomerId: string | null = customerId === 'none' ? null : customerId
      if (customerId === 'new') {
        if (!newName.trim()) { setError('El nombre del cliente es obligatorio'); setSaving(false); return }
        const c = await onCreateCustomer({
          name: newName.trim(), email: newEmail.trim(), phone: newPhone.trim(),
          sector: '', contact_name: '', address: '', website: '',
          status: 'activo', monthly_value: 0, services: [], notes: '',
        })
        finalCustomerId = c.id ?? null
      }
      await onSave(projectName.trim(), finalCustomerId)
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
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'var(--ac)', padding: '18px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'var(--fd)' }}>Generar Proyecto</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>Guardar configuración actual como proyecto activo</div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nombre del proyecto */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>
              Nombre del proyecto *
            </label>
            <input
              value={projectName} onChange={e => setProjectName(e.target.value)}
              placeholder="Ej: Web corporativa / App móvil..."
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--fd)', outline: 'none' }}
            />
          </div>

          {/* Selector de cliente */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>
              Cliente
            </label>
            <select value={customerId} onChange={e => { setCustomerId(e.target.value); setCreating(e.target.value === 'new') }}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--fd)', cursor: 'pointer' }}>
              <option value="none">Sin cliente asignado</option>
              <option value="new">+ Crear nuevo cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Formulario nuevo cliente inline */}
          {creating && (
            <div style={{ background: 'var(--bg3)', borderRadius: 'var(--r2)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.05em', margin: 0 }}>Nuevo cliente</p>
              {[
                { label: 'Nombre *', value: newName, set: setNewName, placeholder: 'Empresa o persona' },
                { label: 'Email',    value: newEmail, set: setNewEmail, placeholder: 'email@empresa.com' },
                { label: 'Teléfono', value: newPhone, set: setNewPhone, placeholder: '+34 600 000 000' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, color: 'var(--txt3)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--txt)', fontSize: 12, fontFamily: 'var(--fd)', outline: 'none' }} />
                </div>
              ))}
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: 'var(--r)', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'transparent', color: 'var(--txt2)', fontSize: 13, fontFamily: 'var(--fd)', fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 'var(--r2)', background: saving ? 'var(--bg4)' : 'var(--ac)', color: '#fff', fontSize: 13, fontFamily: 'var(--fd)', fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Guardando...' : 'Guardar proyecto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══ FreelanceCalculator ════════════════════════════════════════ */
export default function FreelanceCalculator({ customers, onCreateCustomer, onSaveFinanceProject }: Props) {
  /* Sección 1 — Proyecto */
  const [tarifaHora,   setTarifaHora]   = useState(28)
  const [horasSemana,  setHorasSemana]  = useState(16)
  const [semanasProj,  setSemanasProj]  = useState(12)
  const [cuotaAut,     setCuotaAut]     = useState(88)
  const [irpfPct,      setIrpfPct]      = useState(15)

  /* Sección 2 — Gastos fijos */
  const [alquiler,     setAlquiler]     = useState(400)
  const [alimentacion, setAlimentacion] = useState(280)
  const [transporte,   setTransporte]   = useState(80)
  const [suministros,  setSuministros]  = useState(70)
  const [ocio,         setOcio]         = useState(100)
  const [formacion,    setFormacion]    = useState(0)
  const [salud,        setSalud]        = useState(0)
  const [gestoria,     setGestoria]     = useState(0)

  /* Sección 3 — Ahorro */
  const [ahorroObj, setAhorroObj] = useState(200)

  /* Modal */
  const [showModal, setShowModal] = useState(false)

  /* ── Cálculos fiscales ── */
  const calc = useMemo(() => {
    const horasTotales   = horasSemana * semanasProj
    const baseTotal      = tarifaHora * horasTotales
    const ivaTotal       = baseTotal * 0.21
    const irpfTotal      = baseTotal * (irpfPct / 100)
    const baseMes        = tarifaHora * horasSemana * 4.33
    const ivaMes         = baseMes * 0.21
    const irpfMes        = baseMes * (irpfPct / 100)
    const netoMes        = baseMes - irpfMes - cuotaAut
    const totalGastosMes = alquiler + alimentacion + transporte + suministros + ocio + formacion + salud + gestoria
    const margenLibre    = netoMes - totalGastosMes - ahorroObj
    const barTotal       = Math.max(netoMes, 1)
    const pctGastos      = Math.min((totalGastosMes / barTotal) * 100, 100)
    const pctAhorro      = Math.min((ahorroObj / barTotal) * 100, Math.max(0, 100 - pctGastos))
    const pctMargen      = Math.max(0, 100 - pctGastos - pctAhorro)
    const estado         = margenLibre >= 300 ? 'holgado' : margenLibre >= 0 ? 'justo' : 'déficit'
    return { horasTotales, baseTotal, ivaTotal, irpfTotal, baseMes, ivaMes, irpfMes, netoMes, totalGastosMes, margenLibre, pctGastos, pctAhorro, pctMargen, estado }
  }, [tarifaHora, horasSemana, semanasProj, cuotaAut, irpfPct, alquiler, alimentacion, transporte, suministros, ocio, formacion, salud, gestoria, ahorroObj])

  const mensajeEstado = {
    holgado: { text: '✅ Margen holgado — tienes capacidad de ahorro extra o de bajar tarifas.', color: 'var(--success)', bg: 'var(--success-bg)' },
    justo:   { text: '⚠️ Margen justo — cubre gastos pero sin colchón. Considera subir tarifa o reducir gastos.', color: 'var(--warning)', bg: 'var(--warning-bg)' },
    déficit: { text: '🔴 En déficit — los gastos superan el neto. Revisa tu tarifa o reduce costes fijos.', color: 'var(--danger)', bg: 'var(--danger-bg)' },
  }[calc.estado]

  const handleSaveProject = async (name: string, customerId: string | null) => {
    await onSaveFinanceProject({
      name, customer_id: customerId,
      tarifa_hora: tarifaHora, horas_semana: horasSemana, semanas: semanasProj,
      cuota_autonomos: cuotaAut, irpf_pct: irpfPct,
    })
  }

  return (
    <>
      <style>{`
        .calc-slider::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:var(--ac); border:2px solid var(--bg2); box-shadow:0 0 0 1px var(--ac); cursor:pointer; transition:transform .15s; }
        .calc-slider::-webkit-slider-thumb:hover { transform:scale(1.2); }
        .calc-slider::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:var(--ac); border:2px solid var(--bg2); box-shadow:0 0 0 1px var(--ac); cursor:pointer; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--fd)', marginBottom: 4 }}>Calculadora Freelance</h2>
          <p style={{ fontSize: 13, color: 'var(--txt2)' }}>Fiscalidad española · IVA 21% · Cotización autónomos</p>
        </div>

        {/* Sección 1 */}
        <SectionCard title="Proyecto / Ingresos" icon="💼">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            <SliderField label="Tarifa por hora"              value={tarifaHora}  min={12} max={80}  unit="€/h"  onChange={setTarifaHora} />
            <SliderField label="Horas facturadas / semana"    value={horasSemana} min={4}  max={40}  unit="h"    onChange={setHorasSemana} />
            <SliderField label="Semanas del proyecto"         value={semanasProj} min={4}  max={52}  unit=" sem" onChange={setSemanasProj} />
            <SliderField label="Cuota autónomos / mes"        value={cuotaAut}    min={88} max={530} unit="€"    onChange={setCuotaAut} />
            <SliderField label="IRPF retenido"                value={irpfPct}     min={7}  max={21}  unit="%"    onChange={setIrpfPct} />
          </div>
          <div style={{ marginTop: 8, background: 'var(--bg3)', borderRadius: 'var(--r2)', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <ResultRow label="Horas totales"                value={`${fmt(calc.horasTotales)} h`} />
            <ResultRow label="Facturación base (proyecto)"  value={eur(calc.baseTotal)} />
            <ResultRow label="IVA cobrado al cliente"       value={eur(calc.ivaTotal)}   color="var(--warning)" />
            <ResultRow label="IRPF retenido por cliente"    value={`−${eur(calc.irpfTotal)}`} color="var(--danger)" />
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Desglose mensual</p>
            <div style={{ background: 'var(--bg3)', borderRadius: 'var(--r2)', padding: '14px 16px' }}>
              <ResultRow label="Base mensual (tarifa × h × 4.33)"  value={eur(calc.baseMes)} />
              <ResultRow label="IVA mensual (va a Hacienda)"        value={eur(calc.ivaMes)}   color="var(--warning)" />
              <ResultRow label={`IRPF mensual (−${irpfPct}%)`}     value={`−${eur(calc.irpfMes)}`} color="var(--danger)" />
              <ResultRow label="Cuota autónomos"                    value={`−${eur(cuotaAut)}`}     color="var(--danger)" />
              <div style={{ borderTop: '2px solid var(--bor2)', marginTop: 6, paddingTop: 6 }}>
                <ResultRow label="Neto mensual real" value={eur(calc.netoMes)} color={calc.netoMes >= 0 ? 'var(--success)' : 'var(--danger)'} bold />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Sección 2 */}
        <SectionCard title="Gastos fijos mensuales" icon="🏠">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            <SliderField label="Alquiler"                        value={alquiler}     min={100} max={900} onChange={setAlquiler} />
            <SliderField label="Alimentación"                    value={alimentacion} min={100} max={600} onChange={setAlimentacion} />
            <SliderField label="Transporte"                      value={transporte}   min={0}   max={350} onChange={setTransporte} />
            <SliderField label="Suministros (luz / internet / móvil)" value={suministros} min={20} max={250} onChange={setSuministros} />
            <SliderField label="Ocio / extras"                   value={ocio}         min={0}   max={500} onChange={setOcio} />
            <SliderField label="Formación / suscripciones"       value={formacion}    min={0}   max={250} onChange={setFormacion} />
            <SliderField label="Salud / gimnasio"                value={salud}        min={0}   max={200} onChange={setSalud} />
            <SliderField label="Gestoría"                        value={gestoria}     min={0}   max={80}  onChange={setGestoria} />
          </div>
          <div style={{ marginTop: 8, background: 'var(--danger-bg)', borderRadius: 'var(--r2)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', fontFamily: 'var(--fd)' }}>Total gastos fijos / mes</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--fm)' }}>{eur(calc.totalGastosMes)}</span>
          </div>
        </SectionCard>

        {/* Sección 3 */}
        <SectionCard title="Ahorro mensual objetivo" icon="🎯">
          <SliderField label="Ahorro mensual" value={ahorroObj} min={0} max={1000} onChange={setAhorroObj} />
        </SectionCard>

        {/* Resultado final */}
        <div style={{ background: 'var(--bg2)', border: '2px solid var(--ac)', borderRadius: 'var(--r3)', padding: '20px 24px', boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.07em' }}>
            📊 Resultado final
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 'var(--r2)', padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--txt2)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Neto mensual</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--ac)', fontFamily: 'var(--fm)' }}>{eur(calc.netoMes)}</p>
            </div>
            <div style={{ background: 'var(--danger-bg)', borderRadius: 'var(--r2)', padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Gastos + ahorro</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--fm)' }}>{eur(calc.totalGastosMes + ahorroObj)}</p>
            </div>
            <div style={{ background: calc.margenLibre >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 'var(--r2)', padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: calc.margenLibre >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Margen libre</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: calc.margenLibre >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--fm)' }}>
                {calc.margenLibre >= 0 ? '+' : ''}{eur(calc.margenLibre)}
              </p>
            </div>
          </div>

          {/* Barra apilada */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 24, borderRadius: 99, overflow: 'hidden', display: 'flex', background: 'var(--bg4)' }}>
              <div style={{ width: `${calc.pctGastos}%`, background: '#dc2626', transition: 'width .3s ease', minWidth: calc.pctGastos > 0 ? 4 : 0 }} />
              <div style={{ width: `${calc.pctAhorro}%`, background: '#d97706', transition: 'width .3s ease', minWidth: calc.pctAhorro > 0 ? 4 : 0 }} />
              <div style={{ width: `${calc.pctMargen}%`, background: '#15803d', transition: 'width .3s ease', minWidth: calc.pctMargen > 0 ? 4 : 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {[{ label: 'Gastos', color: '#dc2626', pct: calc.pctGastos }, { label: 'Ahorro', color: '#d97706', pct: calc.pctAhorro }, { label: 'Margen', color: '#15803d', pct: calc.pctMargen }]
                .map(({ label, color, pct }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--txt2)', fontFamily: 'var(--fd)' }}>
                      {label} <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, color }}>{fmt(pct, 1)}%</span>
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Mensaje */}
          <div style={{ background: mensajeEstado.bg, borderRadius: 'var(--r2)', padding: '10px 14px', border: `1px solid ${mensajeEstado.color}22`, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: mensajeEstado.color, fontFamily: 'var(--fd)', lineHeight: 1.5 }}>{mensajeEstado.text}</p>
          </div>

          {/* Botón generar proyecto */}
          <button onClick={() => setShowModal(true)}
            style={{ width: '100%', padding: '12px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r2)', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ac-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--ac)')}>
            ＋ Generar Proyecto
          </button>
        </div>
      </div>

      {showModal && (
        <NewProjectModal
          customers={customers}
          onCreateCustomer={onCreateCustomer}
          onSave={handleSaveProject}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
