import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'

const SECTORS = [
  { value: '',             label: 'Todos los sectores' },
  { value: 'Salud',        label: 'Salud (clínicas, fisio, dental)' },
  { value: 'Veterinaria',  label: 'Veterinaria' },
  { value: 'Belleza',      label: 'Belleza y peluquería' },
  { value: 'Hosteleria',   label: 'Hostelería y restauración' },
  { value: 'Retail',       label: 'Retail y comercio' },
  { value: 'Servicios',    label: 'Servicios locales' },
  { value: 'Mecanica',     label: 'Mecánica y talleres' },
  { value: 'Optica',       label: 'Ópticas y optometristas' },
  { value: 'Inmobiliaria', label: 'Inmobiliarias' },
  { value: 'Academia',     label: 'Academias y autoescuelas' },
]

export default function SearchPanel({ search, onSearch }) {
  const [city,   setCity]   = useState('Valladolid')
  const [radius, setRadius] = useState('10')
  const [sector, setSector] = useState('')

  const handleSearch = () =>
    onSearch({ city: city.trim() || 'Valladolid', radius: parseInt(radius) || 10, sector })

  return (
    <section className="search-panel" aria-label="Buscar leads">
      {/* Ciudad */}
      <div className="field">
        <label className="field-label" htmlFor="city-input">Ciudad objetivo</label>
        <input
          id="city-input"
          className="field-input"
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Ej: Burgos, Palencia..."
          autoComplete="off"
          spellCheck={false}
          style={{ fontFamily: 'var(--fb)', fontSize: '14px' }}
        />
      </div>

      {/* Radio */}
      <div className="field">
        <label className="field-label" htmlFor="radius-select">Radio de búsqueda</label>
        <select
          id="radius-select"
          className="field-select"
          value={radius}
          onChange={e => setRadius(e.target.value)}
          style={{ fontFamily: 'var(--fb)', fontSize: '14px' }}
        >
          <option value="5">5 km — solo ciudad</option>
          <option value="10">10 km — ciudad + alrededores</option>
          <option value="20">20 km — área metropolitana</option>
          <option value="50">50 km — provincia</option>
          <option value="0">Sin límite — toda la región</option>
        </select>
      </div>

      {/* Sector */}
      <div className="field">
        <label className="field-label" htmlFor="sector-select">Tipo de negocio</label>
        <select
          id="sector-select"
          className="field-select"
          value={sector}
          onChange={e => setSector(e.target.value)}
          style={{ fontFamily: 'var(--fb)', fontSize: '14px' }}
        >
          {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Botón buscar */}
      <Button
        onClick={handleSearch}
        disabled={search.loading}
        shape="square"
        aria-label="Buscar leads en Google Maps vía Apify"
        style={{ fontFamily: 'var(--fd)', fontWeight: 600, height: 40, alignSelf: 'flex-end' }}
      >
        {search.loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Search className="w-4 h-4" />
        }
        {search.loading ? 'Buscando...' : 'Buscar leads'}
      </Button>

      {/* Estado */}
      {search.status && (
        <div
          className="search-status"
          style={{ color: search.color || 'var(--txt3)' }}
          aria-live="polite"
          aria-atomic="true"
        >
          {search.status}
        </div>
      )}
    </section>
  )
}
