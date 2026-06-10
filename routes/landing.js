'use strict';
const express = require('express');
const { supabase, requireSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');
const { getSectorDesign } = require('../lib/sector-data');
const { scanSiteForSocials } = require('../lib/social-scan');

const router = express.Router();

// ── GENERADOR DE PROMPT PARA LANDING PAGE ────────────────────────────────────
router.post('/prompt', requireAuth, requireSupabase, async (req, res) => {
  const { leadId } = req.body;
  if (!leadId) return res.status(400).json({ error: 'leadId requerido' });

  // 1. Obtener datos del lead
  const { data: rows, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .limit(1);
  if (error || !rows?.length) return res.status(404).json({ error: 'Lead no encontrado' });
  const lead = rows[0];

  // 2. Re-escanear redes sociales si están vacías
  let socials = {
    linkedin:  lead.linkedin  || '',
    instagram: lead.instagram || '',
    facebook:  lead.facebook  || '',
    twitter:   lead.twitter   || '',
    tiktok:    lead.tiktok    || '',
  };

  const hasSomeSocial = Object.values(socials).some(Boolean);
  if (!hasSomeSocial && lead.url && !lead.url.startsWith('Sin')) {
    socials = { ...socials, ...(await scanSiteForSocials(lead.url, { extraPages: false, timeoutMs: 5000 })) };
  }

  // 3. Construir el prompt
  const design  = getSectorDesign(lead.sector);
  const hasWeb  = lead.url && !lead.url.startsWith('Sin');
  const webInfo = hasWeb
    ? `Tiene web en: ${lead.url} (puede estar desactualizada o con problemas)`
    : 'NO tiene web propia actualmente';

  const socialLines = [
    socials.instagram && `- Instagram: ${socials.instagram}`,
    socials.facebook  && `- Facebook: ${socials.facebook}`,
    socials.linkedin  && `- LinkedIn: ${socials.linkedin}`,
    socials.twitter   && `- Twitter/X: ${socials.twitter}`,
    socials.tiktok    && `- TikTok: ${socials.tiktok}`,
  ].filter(Boolean);

  const flawLines = (lead.flaws || []).map(f => `- ${f}`).join('\n') || '- Sin análisis previo';
  const saasLines = (lead.saas  || []).map(s => `- ${s}`).join('\n') || '- Sin análisis previo';

  const ratingLine = lead.rating
    ? `${lead.rating} ⭐ en Google (${lead.reviews} reseñas)`
    : 'Sin valoración registrada';

  const prompt = `Eres un diseñador web experto en negocios locales españoles. Genera una landing page completa, moderna e interactiva en un solo archivo HTML autocontenido para el siguiente negocio.

════════════════════════════════════════
DATOS DEL NEGOCIO
════════════════════════════════════════
Nombre:       ${lead.name}
Sector:       ${lead.sector}
Localización: ${lead.loc || 'España'}
Web actual:   ${webInfo}
Teléfono:     ${lead.phone || 'No disponible'}
Email:        ${lead.email || 'No disponible'}
Valoración:   ${ratingLine}

════════════════════════════════════════
PRESENCIA EN REDES SOCIALES
════════════════════════════════════════
${socialLines.length > 0 ? socialLines.join('\n') : 'Sin presencia en redes sociales detectada'}

════════════════════════════════════════
PROBLEMAS DIGITALES DETECTADOS
(úsalos para construir el argumento de venta — la landing debe resolver estos problemas visualmente)
════════════════════════════════════════
${flawLines}

════════════════════════════════════════
OPORTUNIDADES IDENTIFICADAS
(servicios/funcionalidades que el negocio necesita y que la landing debe comunicar)
════════════════════════════════════════
${saasLines}

════════════════════════════════════════
INSTRUCCIONES TÉCNICAS
════════════════════════════════════════
- HTML autocontenido en un solo archivo (sin dependencias externas salvo CDN)
- Tailwind CSS via CDN (https://cdn.tailwindcss.com)
- Animaciones de scroll con AOS via CDN o CSS/JS puro
- 100% responsive — diseño mobile-first
- Sin imágenes externas — usa gradientes CSS, emojis como iconos decorativos o SVG inline
- Scroll suave entre secciones con anclas (#section)
- Navbar fija con el nombre del negocio y CTA visible
- Botón de WhatsApp/llamada flotante si hay teléfono disponible

════════════════════════════════════════
DISEÑO VISUAL — SECTOR: ${lead.sector.toUpperCase()}
════════════════════════════════════════
Paleta de colores: ${design.palette}
Estilo visual:     ${design.style}
Secciones clave del sector: ${design.sections}

════════════════════════════════════════
ESTRUCTURA DE SECCIONES (en este orden)
════════════════════════════════════════
1. HERO — Headline potente, subheadline con propuesta de valor, CTA principal ("Pide presupuesto" / "Reserva ahora" / según sector). Fondo con gradiente llamativo.
2. EL PROBLEMA — Sección que muestra los problemas actuales del sector (basada en los fallos detectados) de forma empática. Estilo visual moderno con iconos.
3. NUESTRA SOLUCIÓN — Cómo este negocio resuelve esos problemas. 3-4 cards con ventajas competitivas.
4. SERVICIOS — Grid de los servicios principales con iconos SVG, descripción breve y precio orientativo si aplica.
5. POR QUÉ ELEGIRNOS — Diferenciadores: ${lead.rating ? `${lead.rating}⭐ con ${lead.reviews} valoraciones en Google,` : ''} experiencia, profesionalidad, rapidez.
6. REDES SOCIALES — ${socialLines.length > 0 ? 'Mostrar los perfiles detectados con iconos de las redes y links reales: ' + socialLines.map(l => l.replace('- ','')).join(' | ') : 'Sección de comunidad/redes aunque no tenga links (invitar a seguirles).'}
7. CONTACTO — Formulario simple (nombre, teléfono, mensaje) + datos de contacto reales + mapa de ubicación placeholder.
8. FOOTER — Logo/nombre, links a secciones, datos de contacto, copyright.

════════════════════════════════════════
COPY E IDIOMA
════════════════════════════════════════
- Español de España (tuteo o ustedeo según el sector: tuteo para hostelería/belleza/gym, ustedeo para clínicas/abogados/inmobiliaria)
- Tono: ${design.style}
- Copy orientado a conversión — cada sección debe terminar empujando al usuario hacia el CTA
- Usar los problemas detectados como argumentos de venta reales, no genéricos
- El nombre del negocio (${lead.name}) debe aparecer al menos 3 veces de forma natural

Genera ÚNICAMENTE el código HTML completo. Sin explicaciones, sin markdown, sin comentarios fuera del HTML. El resultado debe poder guardarse como .html y abrirse directamente en el navegador.`;

  res.json({ prompt, lead: { name: lead.name, sector: lead.sector, socials } });
});

module.exports = router;
