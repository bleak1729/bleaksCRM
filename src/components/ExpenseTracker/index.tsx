import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Tag, X, Check } from 'lucide-react'
import type { ExpenseCategory, ExpenseRecord, FinanceProject } from '../../types'

/* ── Helpers ──────────────────────────────────────────────────────── */
const fmt = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v)

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

const monthLabel = (y: number, m: number) =>
  new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

const toMonthKey = (y: number, m: number) =>
  `${y}-${String(m).padStart(2, '0')}`

const PALETTE = [
  '#ef4444','#f97316','#eab308','#22c55e','#10b981',
  '#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6b7280',
]

/* ── Calc neto mensual desde proyectos finance ───────────────────── */
function calcNetoMensual(projects: FinanceProject[]): number {
  if (!projects.length) return 0
  const total = projects.reduce((s, p) => {
    const base = (p.tarifa_hora ?? 0) * (p.horas_semana ?? 0) * 4.33
    const irpf = base * ((p.irpf_pct ?? 0) / 100)
    return s + (base - irpf)
  }, 0)
  const cuota = projects[0]?.cuota_autonomos ?? 0
  return total - cuota
}

/* ── Props ────────────────────────────────────────────────────────── */
interface Props {
  categories:        ExpenseCategory[]
  records:           ExpenseRecord[]
  financeProjects:   FinanceProject[]
  selectedMonth:     string          // 'YYYY-MM'
  onMonthChange:     (m: string) => void
  onAddCategory:     (data: Partial<ExpenseCategory>) => Promise<ExpenseCategory>
  onUpdateCategory:  (id: string, data: Partial<ExpenseCategory>) => Promise<ExpenseCategory>
  onDeleteCategory:  (id: string) => Promise<void>
  onAddRecord:       (data: Partial<ExpenseRecord>) => Promise<ExpenseRecord>
  onUpdateRecord:    (id: string, data: Partial<ExpenseRecord>) => Promise<ExpenseRecord>
  onDeleteRecord:    (id: string) => Promise<void>
}

/* ── Inline category editor ───────────────────────────────────────── */
function CategoryEditor({
  categories, onAdd, onUpdate, onDelete,
}: {
  categories: ExpenseCategory[]
  onAdd: (d: Partial<ExpenseCategory>) => Promise<ExpenseCategory>
  onUpdate: (id: string, d: Partial<ExpenseCategory>) => Promise<ExpenseCategory>
  onDelete: (id: string) => Promise<void>
}) {
  const [newName,  setNewName]  = useState('')
  const [newColor, setNewColor] = useState(PALETTE[0])
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving,   setSaving]   = useState(false)

  const handleAdd = async () => {
    if (!newName.trim() || saving) return
    setSaving(true)
    await onAdd({ name: newName.trim(), color: newColor })
    setNewName('')
    setSaving(false)
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || saving) return
    setSaving(true)
    await onUpdate(id, { name: editName.trim() })
    setEditId(null)
    setSaving(false)
  }

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, fontFamily: 'var(--fd)' }}>
        Categorías
      </p>

      {/* Existing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {categories.map(cat => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 'var(--r2)', background: 'var(--bg3)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }}/>
            {editId === cat.id ? (
              <>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleUpdate(cat.id!); if (e.key === 'Escape') setEditId(null) }}
                  style={{ flex: 1, fontSize: 12, background: 'var(--bg)', border: '1px solid var(--ac)', borderRadius: 'var(--r)', padding: '2px 6px', color: 'var(--txt)', outline: 'none', fontFamily: 'var(--fb)' }}
                />
                <button onClick={() => handleUpdate(cat.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', padding: 2, display: 'flex' }}>
                  <Check size={13}/>
                </button>
                <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 2, display: 'flex' }}>
                  <X size={13}/>
                </button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--txt2)', fontFamily: 'var(--fb)' }}>{cat.name}</span>
                <button onClick={() => { setEditId(cat.id!); setEditName(cat.name) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 2, display: 'flex' }}>
                  <Pencil size={11}/>
                </button>
                <button onClick={() => onDelete(cat.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2, display: 'flex' }}>
                  <Trash2 size={11}/>
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <p style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', marginBottom: 6 }}>Nueva categoría</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        {PALETTE.map(c => (
          <button key={c} onClick={() => setNewColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: newColor === c ? '2px solid var(--txt)' : '2px solid transparent', cursor: 'pointer', padding: 0, outline: 'none' }}/>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nombre…"
          style={{ flex: 1, fontSize: 12, padding: '6px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg)', color: 'var(--txt)', outline: 'none', fontFamily: 'var(--fb)' }}
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || saving}
          style={{ padding: '6px 10px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !newName.trim() ? .5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Plus size={12}/> Añadir
        </button>
      </div>
    </div>
  )
}

/* ── Add record form ──────────────────────────────────────────────── */
function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultDateForMonth(month: string): string {
  const today = localToday()
  return today.startsWith(month) ? today : `${month}-01`
}

function AddRecordForm({
  categories, selectedMonth, onSave,
}: {
  categories: ExpenseCategory[]
  selectedMonth: string
  onSave: (data: Partial<ExpenseRecord>) => Promise<ExpenseRecord>
}) {
  const [amount,      setAmount]      = useState('')
  const [desc,        setDesc]        = useState('')
  const [categoryId,  setCategoryId]  = useState<string>(categories[0]?.id ?? '')
  const [date,        setDate]        = useState(() => defaultDateForMonth(selectedMonth))
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (!categoryId && categories.length) setCategoryId(categories[0].id ?? '')
  }, [categories, categoryId])

  // Sync date when the user navigates to a different month
  useEffect(() => {
    setDate(defaultDateForMonth(selectedMonth))
  }, [selectedMonth])

  const handleSave = async () => {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!amt || amt <= 0) { setError('Importe inválido'); return }
    if (!categoryId)      { setError('Selecciona categoría'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ category_id: categoryId, amount: amt, description: desc.trim(), expense_date: date })
      setAmount('')
      setDesc('')
      setDate(defaultDateForMonth(selectedMonth))
    } catch { setError('Error al guardar') }
    setSaving(false)
  }

  return (
    <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--bor2)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12, fontFamily: 'var(--fd)' }}>
        Añadir gasto
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', display: 'block', marginBottom: 4 }}>Importe (€)</label>
            <input
              type="number" min="0" step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="0.00"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', display: 'block', marginBottom: 4 }}>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--fb)', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', display: 'block', marginBottom: 4 }}>Categoría</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--fb)', outline: 'none' }}
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', display: 'block', marginBottom: 4 }}>Descripción (opcional)</label>
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Ej: Supermercado Lidl…"
            style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--fb)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving || !amount}
          style={{ padding: '9px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !amount ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--fd)' }}
        >
          <Plus size={14}/> {saving ? 'Guardando…' : 'Registrar gasto'}
        </button>
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────────── */
export default function ExpenseTracker({
  categories, records, financeProjects,
  selectedMonth, onMonthChange,
  onAddCategory, onUpdateCategory, onDeleteCategory,
  onAddRecord, onUpdateRecord, onDeleteRecord,
}: Props) {
  const [showCats,    setShowCats]    = useState(false)
  const [editRecord,  setEditRecord]  = useState<ExpenseRecord | null>(null)
  const [editAmount,  setEditAmount]  = useState('')
  const [editDesc,    setEditDesc]    = useState('')
  const [editCat,     setEditCat]     = useState('')
  const [editDate,    setEditDate]    = useState('')
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)

  // Month navigation
  const [year, month] = selectedMonth.split('-').map(Number)

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1)
    onMonthChange(toMonthKey(d.getFullYear(), d.getMonth() + 1))
  }
  const nextMonth = () => {
    const d = new Date(year, month, 1)
    onMonthChange(toMonthKey(d.getFullYear(), d.getMonth() + 1))
  }

  // Totals
  const totalGastado  = useMemo(() => records.reduce((s, r) => s + Number(r.amount), 0), [records])
  const netoMensual   = useMemo(() => calcNetoMensual(financeProjects), [financeProjects])
  const disponible    = netoMensual - totalGastado
  const pct           = netoMensual > 0 ? Math.min((totalGastado / netoMensual) * 100, 100) : 0
  const isOver        = totalGastado > netoMensual

  // Grouped by category for the summary pie-like list
  const byCategory = useMemo(() => {
    const map: Record<string, { cat: ExpenseCategory | null; total: number; count: number }> = {}
    records.forEach(r => {
      const catId = r.category_id ?? 'sin-cat'
      if (!map[catId]) map[catId] = { cat: r.expense_categories ?? null, total: 0, count: 0 }
      map[catId].total += Number(r.amount)
      map[catId].count++
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [records])

  // Edit record
  const openEdit = (r: ExpenseRecord) => {
    setEditRecord(r)
    setEditAmount(String(r.amount))
    setEditDesc(r.description)
    setEditCat(r.category_id ?? '')
    setEditDate(r.expense_date)
  }
  const handleUpdate = async () => {
    if (!editRecord?.id) return
    const amt = parseFloat(editAmount.replace(',', '.'))
    if (!amt || amt <= 0) return
    await onUpdateRecord(editRecord.id, { amount: amt, description: editDesc, category_id: editCat || null, expense_date: editDate })
    setEditRecord(null)
  }

  const barColor = isOver ? 'var(--danger)' : pct > 80 ? 'var(--warning)' : 'var(--success)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--fd)', letterSpacing: '-.02em', margin: 0 }}>Gastos</h1>
            <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 3, fontFamily: 'var(--fb)' }}>
              Registro mensual de gastos reales
            </p>
          </div>
          <button
            onClick={() => setShowCats(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: showCats ? 'var(--ac)' : 'var(--bg2)', color: showCats ? '#fff' : 'var(--txt2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fb)' }}
          >
            <Tag size={13}/> Categorías
          </button>
        </div>

        {/* Month picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={prevMonth} style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', padding: '6px 10px', cursor: 'pointer', color: 'var(--txt2)', display: 'flex' }}>
            <ChevronLeft size={15}/>
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', minWidth: 160, textAlign: 'center', textTransform: 'capitalize' }}>
            {monthLabel(year, month)}
          </span>
          <button onClick={nextMonth} style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', padding: '6px 10px', cursor: 'pointer', color: 'var(--txt2)', display: 'flex' }}>
            <ChevronRight size={15}/>
          </button>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Gasto del mes',    value: fmt(totalGastado), color: isOver ? 'var(--danger)' : 'var(--txt)' },
            { label: 'Ingreso neto',     value: netoMensual > 0 ? fmt(netoMensual) : '—', color: 'var(--success)' },
            { label: 'Disponible',       value: netoMensual > 0 ? fmt(disponible) : '—', color: isOver ? 'var(--danger)' : disponible < netoMensual * 0.2 ? 'var(--warning)' : 'var(--success)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', padding: '16px 20px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 6px', fontFamily: 'var(--fd)' }}>{k.label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: k.color, margin: 0, fontFamily: 'var(--fm)' }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {netoMensual > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--txt3)', fontFamily: 'var(--fb)' }}>
                {isOver ? '⚠ Superaste tu ingreso mensual' : `${pct.toFixed(0)}% del ingreso neto consumido`}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: barColor, fontFamily: 'var(--fm)' }}>
                {fmt(totalGastado)} / {fmt(netoMensual)}
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width .4s ease' }}/>
            </div>
          </div>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px', display: 'grid', gridTemplateColumns: showCats ? '1fr 280px' : '1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Main column ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Add form */}
          <AddRecordForm
            categories={categories}
            selectedMonth={selectedMonth}
            onSave={onAddRecord}
          />

          {/* Summary by category */}
          {byCategory.length > 0 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--bor2)' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--fd)' }}>Por categoría</p>
              </div>
              {byCategory.map(([catId, { cat, total, count }]) => {
                const barPct = totalGastado > 0 ? (total / totalGastado) * 100 : 0
                const color  = cat?.color ?? '#6b7280'
                return (
                  <div key={catId} style={{ padding: '10px 16px', borderBottom: '1px solid var(--bor)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', fontFamily: 'var(--fb)' }}>{cat?.name ?? 'Sin categoría'}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fm)' }}>{fmt(total)}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 99 }}/>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', whiteSpace: 'nowrap' }}>{count} gasto{count !== 1 ? 's' : ''}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Records list */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--bor2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--fd)' }}>
                Gastos registrados
              </p>
              <span style={{ fontSize: 12, color: 'var(--txt3)', fontFamily: 'var(--fb)' }}>{records.length} registros</span>
            </div>

            {records.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
                Sin gastos registrados este mes
              </div>
            ) : (
              records.map(r => (
                <div key={r.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--bor)', display: 'flex', alignItems: 'center', gap: 12, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.expense_categories?.color ?? '#6b7280', flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', fontFamily: 'var(--fb)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.description || r.expense_categories?.name || 'Sin descripción'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 1 }}>
                      {r.expense_categories?.name} · {fmtDate(r.expense_date)}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fm)', flexShrink: 0 }}>
                    {fmt(Number(r.amount))}
                  </span>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 4, borderRadius: 'var(--r)', display: 'flex' }}>
                      <Pencil size={12}/>
                    </button>
                    <button onClick={() => setConfirmDel(r.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4, borderRadius: 'var(--r)', display: 'flex' }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Categories panel ──────────────────────────────── */}
        {showCats && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', padding: '16px', position: 'sticky', top: 0 }}>
            <CategoryEditor
              categories={categories}
              onAdd={onAddCategory}
              onUpdate={onUpdateCategory}
              onDelete={onDeleteCategory}
            />
          </div>
        )}
      </div>

      {/* ── Edit record modal ────────────────────────────────── */}
      {editRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditRecord(null)}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)' }}>Editar gasto</p>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', display: 'flex' }}><X size={16}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', display: 'block', marginBottom: 4 }}>Importe (€)</label>
                  <input type="number" min="0" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg2)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' }}/>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', display: 'block', marginBottom: 4 }}>Fecha</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg2)', color: 'var(--txt)', fontSize: 12, fontFamily: 'var(--fb)', outline: 'none', boxSizing: 'border-box' }}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', display: 'block', marginBottom: 4 }}>Categoría</label>
                <select value={editCat} onChange={e => setEditCat(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg2)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--fb)', outline: 'none' }}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)', display: 'block', marginBottom: 4 }}>Descripción</label>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', background: 'var(--bg2)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--fb)', outline: 'none', boxSizing: 'border-box' }}/>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setEditRecord(null)}
                  style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer', fontFamily: 'var(--fb)' }}>
                  Cancelar
                </button>
                <button onClick={handleUpdate}
                  style={{ flex: 1, padding: '9px', background: 'var(--ac)', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--fd)' }}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete ───────────────────────────────────── */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--bor2)', borderRadius: 'var(--r3)', padding: 28, maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <Trash2 size={28} style={{ color: 'var(--danger)', margin: '0 auto 12px' }}/>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>¿Eliminar gasto?</p>
            <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 22 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ padding: '8px 20px', background: 'transparent', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={async () => { await onDeleteRecord(confirmDel); setConfirmDel(null) }}
                style={{ padding: '8px 20px', background: 'var(--danger)', border: 'none', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
