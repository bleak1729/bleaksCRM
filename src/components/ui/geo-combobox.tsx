import { useEffect, useRef, useState } from 'react'
import type { GeoSuggestion } from '../../api'

interface GeoComboboxProps {
  id: string
  value: string
  onChange: (v: string) => void
  fetchSuggestions: (q: string) => Promise<GeoSuggestion[]>
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
}

// Input con sugerencias bajo demanda (debounce 300 ms). Permite texto libre:
// las sugerencias ayudan, pero no bloquean ciudades que Google no autocomplete.
export default function GeoCombobox({ id, value, onChange, fetchSuggestions, placeholder, disabled, invalid }: GeoComboboxProps) {
  const [open, setOpen]               = useState(false)
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [highlight, setHighlight]     = useState(-1)
  const rootRef     = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const requestSeq  = useRef(0)

  // Cerrar al hacer click fuera
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Cancelar el debounce pendiente al desmontar
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const scheduleFetch = (q: string) => {
    clearTimeout(debounceRef.current)
    if (disabled || q.trim().length < 2) {
      requestSeq.current++          // invalida cualquier petición en vuelo
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeq.current
      try {
        const result = await fetchSuggestions(q.trim())
        if (seq !== requestSeq.current) return   // llegó tarde — hay otra petición en curso
        setSuggestions(result)
        setOpen(result.length > 0)
        setHighlight(-1)
      } catch { /* sin sugerencias no se bloquea nada */ }
    }, 300)
  }

  const handleInput = (v: string) => {
    onChange(v)
    scheduleFetch(v)
  }

  const pick = (s: GeoSuggestion) => {
    clearTimeout(debounceRef.current)
    requestSeq.current++
    onChange(s.name)
    setOpen(false)
    setSuggestions([])
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); pick(suggestions[highlight]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <input
        id={id}
        className="field-input"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={value}
        onChange={e => handleInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => scheduleFetch(value)}   // refresco al volver: el país/provincia pueden haber cambiado
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid}
        style={{
          width: '100%', fontFamily: 'var(--fb)', fontSize: '14px',
          ...(invalid ? { borderColor: 'var(--danger)' } : {}),
          ...(disabled ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
        }}
      />
      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            margin: 0, padding: 4, listStyle: 'none',
            background: 'var(--bg2)', border: '1px solid var(--bor2)',
            borderRadius: 'var(--r2)', boxShadow: '0 8px 24px rgba(0,0,0,.14)',
            zIndex: 300, maxHeight: 240, overflowY: 'auto',
          }}
        >
          {suggestions.map((s, i) => (
            <li key={`${s.name}|${s.detail}`} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); pick(s) }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 10px', border: 'none', borderRadius: 'var(--r)',
                  background: i === highlight ? 'var(--ac-tint)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'var(--fb)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--txt)', fontWeight: 600 }}>{s.name}</span>
                {s.detail && (
                  <span style={{ fontSize: 11.5, color: 'var(--txt3)', marginLeft: 6 }}>{s.detail}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
