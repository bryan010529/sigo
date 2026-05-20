# SIGO — Sistema de Gestión Operacional

**INTRANT · Dirección de Movilidad Sostenible · Gran Santo Domingo**

Sistema web para registrar, validar y analizar los informes de operación semanal de los Corredores Interoperables del SITPSD. Reemplaza el proceso manual de PDF/Excel con un flujo digital completo: ingreso de datos, cálculo automático de indicadores, flujo de aprobación por roles y generación del informe oficial INTRANT.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Routing | React Router v6 |
| Estado | Zustand |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Charts | Recharts |
| Export PDF | @react-pdf/renderer |
| Export Excel | xlsx (SheetJS) |
| Hosting | Vercel |

---

## Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| `admin` | Control total del sistema |
| `digitador` | Ingresa y carga datos semanales |
| `supervisor` | Valida y firma semanas |
| `analista` | Solo lectura: dashboard y reportes |

---

## Setup Local

### Prerequisitos
- Node.js 18+
- Cuenta de Supabase con el proyecto configurado

### Instalación

```bash
git clone https://github.com/bryan010529/sigo.git
cd sigo
npm install
cp .env.local.example .env.local
```

Editar `.env.local` con las credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Build de producción

```bash
npm run build
```

---

## Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase | Sí |

---

## Estructura del Proyecto

```
src/
├── components/     # Componentes reutilizables por módulo
│   ├── layout/     # Sidebar, TopBar, Layout
│   ├── ui/         # shadcn/ui components
│   ├── semanas/    # SemanaCard, EstadoBadge
│   ├── registro/   # Tablas, formularios, ImportModal
│   ├── dashboard/  # KpiCards, Charts
│   └── reportes/   # InformePDF, ExportExcel
├── pages/          # Páginas: Login, Dashboard, Registro, etc.
├── hooks/          # Custom hooks de Supabase
├── store/          # Zustand: authStore, registroStore
├── lib/            # supabase.ts, formulas.ts, dateUtils.ts, utils.ts
└── types/          # Tipos TypeScript de todas las entidades
```

---

## Documentación

El PRD completo está en `PRD_SITPSD_Corredores.md`.
El diseño del scaffold está en `docs/superpowers/specs/2026-05-19-sigo-scaffold-design.md`.

---

*SIGO v1.0 · Mayo 2026 · INTRANT*
