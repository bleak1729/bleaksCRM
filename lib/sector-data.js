'use strict';

// ── SECTOR → 3 queries distintas (paralelas) × 2 páginas = hasta ~120 resultados
const SECTOR_QUERIES = {
  'Salud':        ['clínica médica salud',          'fisioterapia rehabilitación',    'dentista clínica dental'],
  'Veterinaria':  ['clínica veterinaria mascotas',  'veterinario animales',           'tienda animales acuario'],
  'Belleza':      ['peluquería salón belleza',       'estética spa masajes',           'barbería nail uñas'],
  'Hosteleria':   ['restaurante cocina comida',      'bar pub taberna',                'cafetería pastelería panadería'],
  'Retail':       ['tienda ropa moda complementos',  'comercio local boutique',        'zapatería calzado'],
  'Servicios':    ['fontanero electricista reformas','asesoría gestoría abogado',      'limpieza lavandería'],
  'Mecanica':     ['taller mecánico coches',         'reparación vehículos automóvil', 'taller chapa pintura'],
  'Optica':       ['óptica optometrista gafas',      'lentes contacto visión',         'audiología audífono'],
  'Inmobiliaria': ['inmobiliaria agencia pisos',     'alquiler apartamentos',          'promotora inmobiliaria'],
  'Academia':     ['academia formación clases',      'autoescuela carnet conducir',    'academia idiomas inglés'],
  '':             ['negocio comercio local',         'empresa servicios profesional',  'tienda establecimiento'],
};

// ── Tipos de lugar por sector (para Nearby Search por proximidad) ─────────────
// Nearby Search con DISTANCE devuelve negocios poco visibles que Text Search omite
const SECTOR_TYPES = {
  'Salud':        ['doctor','dentist','physiotherapist','pharmacy','hospital','medical_clinic'],
  'Veterinaria':  ['veterinary_care','pet_store','pet_supplies_store'],
  'Belleza':      ['hair_care','beauty_salon','nail_salon','spa','barber_shop','massage_therapist'],
  'Hosteleria':   ['restaurant','bar','cafe','bakery','meal_takeaway','meal_delivery','food'],
  'Retail':       ['clothing_store','shoe_store','book_store','gift_shop','boutique','jewelry_store'],
  'Servicios':    ['plumber','electrician','moving_company','laundry','locksmith','painter','roofing_contractor'],
  'Mecanica':     ['car_repair','auto_parts_store','car_wash','tire_shop'],
  'Optica':       ['optician','eyeglass_store'],
  'Inmobiliaria': ['real_estate_agency'],
  'Academia':     ['school','driving_school','tutoring_center','language_school','music_school'],
  '':             ['store','restaurant','health','finance','real_estate_agency','school'],
};

const FLAW_MAP = {
  'Veterinaria':  ['Sin cita online','Sin historial digital mascota','Sin recordatorio vacunas','Sin tienda online','Sin ficha Google'],
  'Salud':        ['Sin reserva online','Sin portal paciente','Sin recordatorio cita','Sin historial digital','Sin formulario valoración'],
  'Belleza':      ['Sin booking online','Sin catálogo precios','Sin galería trabajos','Sin fidelización','Solo WhatsApp manual'],
  'Hosteleria':   ['Sin menú digital','Sin reservas online','Sin pedidos online','Sin fidelización','Sin Google Business'],
  'Retail':       ['Sin tienda online','Sin catálogo digital','Sin gestión stock','Sin e-commerce','Sin presencia digital'],
  'Mecanica':     ['Sin cita online','Sin presupuesto digital','Sin historial reparaciones','Sin recordatorio ITV','Sin portal cliente'],
  'Optica':       ['Sin cita de graduación','Sin catálogo monturas online','Sin historial óptico','Sin tienda online','Web desactualizada'],
  'Inmobiliaria': ['Sin portal propio','Sin tour virtual','Sin calculadora hipotecaria','Sin CRM de leads','Sin automatización'],
  'Academia':     ['Sin gestión de alumnos','Sin reserva de clases online','Sin aula virtual','Sin pagos online','Web obsoleta'],
  'Servicios':    ['Sin web moderna','Sin solicitud presupuesto online','Sin CRM','Sin automatización','Sin Google Reviews'],
};

const SAAS_MAP = {
  'Veterinaria':  ['Cita online','Recordatorio vacunas SMS','Historial mascota SaaS','Tienda online','WhatsApp Business'],
  'Salud':        ['Agenda online','Recordatorio WhatsApp','Portal del paciente','Historial clínico SaaS','Email marketing'],
  'Belleza':      ['Booking Fresha/Treatwell','Recordatorio SMS','Galería Instagram','Programa puntos','Email marketing'],
  'Hosteleria':   ['Reservas CoverManager','Menú digital QR','Pedidos online','Fidelización digital','Google Business'],
  'Retail':       ['Tienda WooCommerce','Gestión inventario','Pago online','Email marketing','Catálogo digital'],
  'Mecanica':     ['Cita online','Presupuestador digital','Recordatorio ITV','Portal cliente','WhatsApp seguimiento'],
  'Optica':       ['Cita graduación online','Catálogo monturas web','Recordatorio revisión','Tienda online','Historial óptico'],
  'Inmobiliaria': ['Portal propiedades propio','Tour virtual 360°','CRM compradores','Calculadora hipoteca','Email marketing'],
  'Academia':     ['Plataforma e-learning','Reserva de clases','Pagos online','App alumnos','Seguimiento progreso'],
  'Servicios':    ['Web moderna','Presupuesto online','CRM clientes','Email marketing','Google Reviews automation'],
};

const TYPE_LABEL = {
  veterinary_care:     'Salud - Veterinaria',
  dentist:             'Salud - Dental',
  doctor:              'Salud - Médico',
  physiotherapist:     'Salud - Fisioterapia',
  hair_care:           'Belleza - Peluquería',
  beauty_salon:        'Belleza - Estética',
  nail_salon:          'Belleza - Uñas',
  spa:                 'Belleza - Spa',
  restaurant:          'Hostelería - Restaurante',
  bar:                 'Hostelería - Bar',
  cafe:                'Hostelería - Cafetería',
  car_repair:          'Mecánica - Taller',
  optician:            'Óptica',
  real_estate_agency:  'Inmobiliaria',
  school:              'Academia - Colegio',
  driving_school:      'Academia - Autoescuela',
  clothing_store:      'Retail - Moda',
  grocery_store:       'Retail - Alimentación',
  pharmacy:            'Salud - Farmacia',
};

const SECTOR_DESIGN = {
  'Restaurante': { palette: 'cálida (naranja #F97316, crema #FEF3C7, marrón oscuro #1C0A00)', style: 'apetitoso y acogedor', sections: 'menú destacado, ambiente, horarios, reserva de mesa' },
  'Bar':         { palette: 'cálida (naranja #F97316, crema #FEF3C7, marrón oscuro #1C0A00)', style: 'apetitoso y acogedor', sections: 'menú destacado, ambiente, horarios, reserva de mesa' },
  'Cafetería':   { palette: 'cálida (café #6B3F1F, crema #FEF3C7, verde menta #D1FAE5)',     style: 'acogedor y artesanal', sections: 'carta, ambiente, horarios, pedido online' },
  'Clínica':     { palette: 'limpia (azul médico #0EA5E9, blanco #FFFFFF, gris suave #F1F5F9)', style: 'profesional y de confianza', sections: 'especialidades, equipo médico, cómo pedir cita, seguros' },
  'Dentista':    { palette: 'limpia (azul #0EA5E9, blanco #FFFFFF, verde menta #ECFDF5)',     style: 'clínico y amigable',      sections: 'tratamientos, tecnología, equipo, cita online' },
  'Peluquería':  { palette: 'elegante (dorado #D97706, negro #111827, rosa nude #FDE8D8)',    style: 'moderno y estiloso',      sections: 'servicios, galería, equipo, reserva online' },
  'Estética':    { palette: 'elegante (rosa #EC4899, dorado #D97706, blanco roto #FDF4FF)',   style: 'lujoso y femenino',       sections: 'tratamientos, antes/después, equipo, reserva' },
  'Inmobiliaria':{ palette: 'premium (gris oscuro #1F2937, dorado #B45309, blanco #FFFFFF)',  style: 'lujoso y profesional',    sections: 'propiedades destacadas, servicios, equipo, tasación gratuita' },
  'Fontanero':   { palette: 'sólida (azul #1D4ED8, naranja #F97316, gris #374151)',           style: 'confiable y urgente',     sections: 'servicios, emergencias 24h, zona de cobertura, presupuesto gratis' },
  'Electricista':{ palette: 'sólida (amarillo #EAB308, azul oscuro #1E3A5F, gris #374151)',   style: 'técnico y de confianza',  sections: 'servicios, certificaciones, emergencias, presupuesto' },
  'Reformas':    { palette: 'robusta (gris oscuro #374151, naranja #F97316, blanco #FFFFFF)', style: 'sólido y profesional',    sections: 'servicios, proyectos realizados, materiales, presupuesto gratis' },
  'Gimnasio':    { palette: 'energética (rojo #DC2626, negro #111827, gris #374151)',         style: 'enérgico y motivador',    sections: 'clases, tarifas, instalaciones, primer mes gratis' },
  'Abogado':     { palette: 'seria (azul marino #1E3A5F, dorado #D97706, blanco #FFFFFF)',    style: 'serio y de autoridad',    sections: 'áreas de práctica, equipo, casos de éxito, consulta gratuita' },
  'Autoescuela': { palette: 'moderna (azul #2563EB, naranja #F97316, blanco #FFFFFF)',        style: 'dinámico y claro',        sections: 'cursos, precios, método, apúntate ahora' },
};

function getSectorDesign(sector) {
  const key = Object.keys(SECTOR_DESIGN).find(k => sector?.toLowerCase().includes(k.toLowerCase()));
  return SECTOR_DESIGN[key] || {
    palette: 'moderna y profesional (azul oscuro #1E3A5F, acento #2563EB, blanco #FFFFFF)',
    style: 'profesional y orientado a conversión',
    sections: 'servicios principales, ventajas competitivas, zona de cobertura, contacto',
  };
}

module.exports = { SECTOR_QUERIES, SECTOR_TYPES, FLAW_MAP, SAAS_MAP, TYPE_LABEL, SECTOR_DESIGN, getSectorDesign };
