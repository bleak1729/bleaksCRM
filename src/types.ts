// Tipos compartidos entre la API y los componentes — fuente única de verdad

export interface Lead {
  id: string
  name: string
  sector: string
  loc: string
  url: string
  phone: string
  email?: string
  priority: string
  rating: number | null
  reviews: number
  flaws: string[]
  saas: string[]
  source: string
  lat?: number | null
  lng?: number | null
  linkedin?: string
  instagram?: string
  facebook?: string
  twitter?: string
  tiktok?: string
  [k: string]: unknown
}

export interface ContactMethod { done: boolean; date?: string }

export interface LeadContact {
  phone?: ContactMethod
  email?: ContactMethod
  visit?: ContactMethod
}

export type StatusMap   = Record<string, string>
export type NotesMap    = Record<string, string>
export type ContactsMap = Record<string, LeadContact>

export interface DataPayload {
  leads: Lead[]
  contacts: ContactsMap
  notes: NotesMap
  statuses: StatusMap
  /** Ids de leads borrados por el usuario — lo único que el servidor elimina */
  deletedIds?: string[]
  ts?: number
}

export interface Customer {
  id?:              string
  lead_id?:         string | null
  name:             string
  sector:           string
  contact_name:     string
  email:            string
  phone:            string
  address:          string
  website:          string
  drive_folder_url?: string
  status:           'activo' | 'pausado' | 'cancelado'
  contract_start?:  string | null
  contract_end?:    string | null
  monthly_value:    number
  services:         string[]
  notes:            string
  created_at?:      string
}

export interface Project {
  id?:         string
  customer_id: string
  name:        string
  description: string
  status:      'activo' | 'en_pausa' | 'completado' | 'cancelado'
  start_date?: string | null
  end_date?:   string | null
  value:       number
  created_at?: string
}

export interface CustomerContact {
  id?:         string
  customer_id: string
  name:        string
  role:        string
  email:       string
  phone:       string
  is_primary:  boolean
  notes:       string
  created_at?: string
}

export interface LineItem {
  description: string
  quantity:    number
  unit_price:  number
}

export interface Invoice {
  id?:             string
  customer_id:     string
  invoice_number:  string
  issue_date:      string
  due_date?:       string | null
  amount:          number
  tax_pct:         number
  status:          'cotizacion' | 'enviada' | 'pagada' | 'vencida'
  line_items:      LineItem[]
  description:     string
  notes:           string
  created_at?:     string
}

export interface DocumentItem {
  id?:         string
  customer_id: string
  project_id?: string | null
  title:       string
  type:        'contrato' | 'propuesta' | 'informe' | 'presupuesto' | 'otro'
  drive_url:   string
  doc_date?:   string | null
  notes:       string
  created_at?: string
}

export interface Health {
  ok: boolean
  googleMaps?: boolean
  supabase?: boolean
  version?: string
}

export interface SearchState {
  loading: boolean
  status: string
  color: string
}

export interface SearchResult {
  leads: Lead[]
  total: number
  query: string
}
