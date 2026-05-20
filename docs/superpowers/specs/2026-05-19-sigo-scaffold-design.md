# Design: SIGO — Scaffold y Setup Inicial

**Fecha:** 2026-05-19  
**Estado:** Aprobado  
**Autor:** Sr. Torres + Claude

---

## Contexto

SIGO (Sistema de Gestión Operacional) es una aplicación web multiusuario para INTRANT — Dirección de Movilidad Sostenible — que reemplaza el proceso manual de PDF/Excel para registrar la operación semanal de los Corredores Interoperables del Gran Santo Domingo.

El PRD completo está en `/PRD_SITPSD_Corredores.md`.

Este documento cubre únicamente el **scaffold inicial**: crear el repositorio GitHub, instalar el stack, configurar herramientas, y dejar el proyecto listo para que Codex empiece a implementar módulos.

---

## Decisiones de Diseño

- **Nombre del proyecto:** SIGO (anteriormente sitpsd-corredores)
- **Repositorio:** público en GitHub, nombre `sigo`
- **Hosting:** Vercel (configurado desde el inicio con `vercel.json`)
- **Enfoque de scaffold:** Opción B — repo + scaffold + vercel.json, sin CI/Actions en MVP

---

## Repositorio GitHub

| Campo | Valor |
|-------|-------|
| Nombre | `sigo` |
| Descripción | SIGO — Sistema de Gestión Operacional · INTRANT · SITPSD |
| Visibilidad | Público |
| Licencia | Ninguna |
| `.gitignore` | Node + `.env.local` |

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Routing | React Router v6 |
| Estado global | Zustand |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Charts | Recharts |
| Export PDF | @react-pdf/renderer |
| Export Excel | xlsx (SheetJS) |
| Import archivos | PapaParse + xlsx |
| Hosting | Vercel |

---

## Estructura de Carpetas

```
sigo/
├── public/
│   └── intrant-logo.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── ui/                    # shadcn/ui
│   │   ├── semanas/
│   │   ├── registro/
│   │   ├── dashboard/
│   │   └── reportes/
│   ├── pages/
│   ├── hooks/
│   ├── store/
│   ├── lib/
│   └── types/
├── docs/
│   └── superpowers/specs/
├── .env.local.example
├── vercel.json
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Archivos de Configuración a Crear

### `vercel.json`
Rewrites para React Router SPA: todas las rutas apuntan a `index.html`.

### `tailwind.config.ts`
Paleta INTRANT completa:
- `--navy: #1a3a5c`
- `--orange: #e8541a`
- `--green: #27ae60`
- `--yellow: #f39c12`
- `--red: #e74c3c`

### `src/lib/supabase.ts`
Cliente singleton de Supabase usando `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

### `src/types/index.ts`
Todos los tipos TypeScript del PRD: `Rol`, `EstadoSemana`, `FuenteDato`, `Usuario`, `Corredor`, `Semana`, `RegistroDiario`, `TotalesCorredor`.

### `src/lib/formulas.ts`
Funciones: `calcIC()`, `calcICS()`, `getICSColor()`, `calcTotalesCorredor()`.

### `.env.local.example`
```
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

### `README.md`
- Descripción del sistema y contexto INTRANT
- Stack tecnológico
- Roles de usuario
- Instrucciones de setup local
- Variables de entorno requeridas

---

## Criterios de Éxito

1. `gh repo view` muestra el repo `sigo` en GitHub.
2. `npm run dev` arranca sin errores.
3. `npm run build` compila sin errores de TypeScript.
4. `vercel.json` está presente y configurado para SPA.
5. Todos los tipos del PRD están en `src/types/index.ts` sin uso de `any`.
6. Las fórmulas en `src/lib/formulas.ts` coinciden exactamente con el PRD.
