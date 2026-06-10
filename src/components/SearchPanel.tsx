import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import GeoCombobox from '@/components/ui/geo-combobox'
import { suggestGeo } from '../api'
import { COUNTRIES, DEFAULT_COUNTRY } from '../data/countries'
import type { SearchParams, SearchState } from '../types'

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

interface SearchPanelProps {
  search: SearchState
  onSearch: (params: SearchParams) => void
}

const FIELD_FONT = { fontFamily: 'var(--fb)', fontSize: '14px' }

export default function SearchPanel({ search, onSearch }: SearchPanelProps) {
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY.code)
  const [region,  setRegion]  = useState('')
  const [city,    setCity]    = useState('')
  const [radius,  setRadius]  = useState('10')
  const [sector,  setSector]  = useState('')
  const [cityError, setCityError] = useState(false)

  const countryName = COUNTRIES.find(c => c.code === countryCode)?.name || DEFAULT_COUNTRY.name

  // Cascada: cambiar país limpia provincia y ciudad; cambiar provincia limpia ciudad
  const handleCountry = (code: string) => {
    setCountryCode(code)
    setRegion('')
    setCity('')
  }
  const handleRegion = (v: string) => {
    setRegion(v)
    if (city) setCity('')
  }

  const fetchRegions = useCallback(
    (q: string) => suggestGeo({ type: 'region', country: countryCode, q }).then(r => r.suggestions),
    [countryCode]
  )
  const fetchCities = useCallback(
    (q: string) => suggestGeo({ type: 'city', country: countryCode, region, q }).then(r => r.suggestions),
    [countryCode, region]
  )

  const handleSearch = () => {
    if (!city.trim()) { setCityError(true); return }
    setCityError(false)
    onSearch({
      country: countryName,
      region:  region.trim(),
      city:    city.trim(),
      radius:  parseInt(radius) || 10,
      sector,
    })
  }

  return (
    <section className="search-panel" aria-label="Buscar leads">
      {/* País — combobox precargado */}
      <div className="field">
        <label className="field-label" htmlFor="country-select">País</label>
        <select
          id="country-select"
          className="field-select"
          value={countryCode}
          onChange={e => handleCountry(e.target.value)}
          style={FIELD_FONT}
        >
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      {/* Estado / Provincia — autocompletado acotado al país */}
      <div className="field">
        <label className="field-label" htmlFor="region-input">Estado / Provincia</label>
        <GeoCombobox
          id="region-input"
          value={region}
          onChange={handleRegion}
          fetchSuggestions={fetchRegions}
          placeholder={`Opcional — escribe para buscar en ${countryName}`}
        />
      </div>

      {/* Ciudad — autocompletado acotado a país (+ provincia) */}
      <div className="field">
        <label className="field-label" htmlFor="city-input">Ciudad objetivo</label>
        <GeoCombobox
          id="city-input"
          value={city}
          onChange={v => { setCity(v); if (cityError) setCityError(false) }}
          fetchSuggestions={fetchCities}
          placeholder={region ? `Ciudades de ${region}...` : 'Escribe para buscar ciudades...'}
          invalid={cityError}
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
          style={FIELD_FONT}
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
          style={FIELD_FONT}
        >
          {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Botón buscar */}
      <Button
        onClick={handleSearch}
        disabled={search.loading}
        shape="square"
        aria-label="Buscar leads en Google Maps"
        style={{ fontFamily: 'var(--fd)', fontWeight: 600, height: 40, alignSelf: 'flex-end' }}
      >
        {search.loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Search className="w-4 h-4" />
        }
        {search.loading ? 'Buscando...' : 'Buscar leads'}
      </Button>

      {/* Estado */}
      {(search.status || cityError) && (
        <div
          className="search-status"
          style={{ color: cityError ? 'var(--danger)' : (search.color || 'var(--txt3)') }}
          aria-live="polite"
          aria-atomic="true"
        >
          {cityError ? 'Indica una ciudad donde buscar' : search.status}
        </div>
      )}
    </section>
  )
}
