# Bleak's Solutions CRM

CRM B2B para prospección y gestión de leads locales, construido con React + Node.js + Supabase.

---

## Características

### Prospección de leads
- Búsqueda automática de negocios locales vía **Google Maps API** (Places API New)
- Filtro por sector, ciudad y radio de búsqueda
- Importación / exportación en CSV y JSON

### Gestión de leads
- Tabla con filtros por estado y búsqueda en tiempo real
- Mapa interactivo con todos los leads geolocalizados
- Seguimiento de contactos: llamada, email, visita
- Notas por lead
- **Redes sociales**: detección automática desde la web del negocio + búsqueda asistida

### Diagnóstico digital
- Análisis automático de presencia web (HTTPS, velocidad móvil, plataforma)
- Detección de fallos digitales del negocio
- Oportunidades SaaS sugeridas por sector

### Clientes (pipeline)
- Conversión de lead → cliente
- Gestión de proyectos, contactos, facturas y documentos por cliente
- Generación de facturas en PDF
- Integración con Google Drive (carpetas por cliente/proyecto)

### Dashboard
- KPIs en tiempo real: leads, clientes, facturación mensual
- Gráficos de pipeline por estado y prioridad

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | Supabase (PostgreSQL) |
| Auth | JWT + bcryptjs |
| APIs externas | Google Maps Places API, Google Drive API, PageSpeed API |
| Deploy | Vercel (serverless) |

---

## Instalación local

### Requisitos
- Node.js ≥ 18
- Cuenta en [Supabase](https://supabase.com)
- Google Maps API Key (Places API New habilitada)

### 1. Clonar e instalar

```bash
git clone https://github.com/bleak1729/bleaksCRM.git
cd bleaksCRM
npm install
```

### 2. Variables de entorno

Crea un archivo `.env` en la raíz:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=tu-secreto-largo-y-aleatorio
GOOGLE_MAPS_API_KEY=AIza...
PORT=3000
```

### 3. Inicializar la base de datos

Ejecuta `schema.sql` en el **SQL Editor** de Supabase (Dashboard → SQL Editor → New query).

### 4. Arrancar en desarrollo

```bash
npm run dev:all      # Lanza Express (puerto 3000) + Vite (puerto 5173) juntos
```

O por separado:

```bash
npm run dev:server   # Solo Express
npm run dev          # Solo Vite
```

### 5. Build de producción

```bash
npm run build        # Genera /dist
npm start            # Sirve Express + estáticos
```

---

## Deploy en Vercel

El proyecto está configurado para Vercel con `vercel.json`:

- El frontend (`/dist`) se sirve como estáticos
- Las rutas `/api/*` se enrutan a `api/index.js` (serverless function)

Añade las variables de entorno en **Vercel Dashboard → Settings → Environment Variables**.

---

## Autenticación

El CRM usa un único usuario administrador:

- **Primera vez**: al acceder se muestra el formulario de creación de cuenta. Al crearla se genera una **clave de recuperación** (guárdala).
- **Recuperar contraseña**: enlace "¿Olvidaste tu contraseña?" en el login.
- **Reset de emergencia** (si estás bloqueado):
  ```bash
  node scripts/reset-admin.js TuNuevaContraseña
  ```
- **Regenerar clave de recuperación**: sidebar → botón "Clave de recuperación".

---

## Scripts útiles

| Script | Descripción |
|---|---|
| `npm run dev:all` | Desarrollo completo (servidor + frontend) |
| `npm run build` | Build de producción |
| `node scripts/reset-admin.js <pass>` | Reset de emergencia de contraseña |

---

## Versión

**v1.6.65** — Ver historial de commits para el changelog completo.
