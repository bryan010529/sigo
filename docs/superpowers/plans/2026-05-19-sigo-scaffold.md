# SIGO Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el repositorio GitHub `sigo`, hacer scaffold completo con Vite + React + TypeScript, instalar todas las dependencias del PRD, configurar Tailwind/shadcn/Supabase/Vercel, y dejar el proyecto listo para que Codex implemente los módulos de la Fase 1.

**Architecture:** Proyecto React SPA con Vite como bundler. Supabase maneja auth, base de datos y storage. React Router v6 maneja el routing del lado del cliente — se requiere `vercel.json` con rewrites para que funcione en Vercel. Zustand maneja el estado global de auth y del formulario de registro.

**Tech Stack:** React 18 + Vite + TypeScript, Tailwind CSS + shadcn/ui, React Router v6, Zustand, Supabase JS v2, Recharts, @react-pdf/renderer, xlsx, PapaParse, Vercel.

---

## Mapa de Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `package.json` | Dependencias y scripts |
| `vite.config.ts` | Configuración de Vite |
| `tailwind.config.ts` | Paleta INTRANT + configuración de shadcn |
| `src/index.css` | Variables CSS INTRANT + directivas Tailwind |
| `src/types/index.ts` | Todos los tipos TypeScript del PRD |
| `src/lib/supabase.ts` | Cliente singleton de Supabase |
| `src/lib/formulas.ts` | calcIC(), calcICS(), getICSColor(), calcTotalesCorredor() |
| `src/lib/dateUtils.ts` | Utilidades de fechas |
| `src/store/authStore.ts` | Zustand store para sesión de usuario |
| `src/store/registroStore.ts` | Zustand store para el formulario de registro |
| `src/App.tsx` | Router raíz con rutas protegidas por rol |
| `src/main.tsx` | Entry point |
| `vercel.json` | Rewrites SPA para React Router |
| `.env.local.example` | Variables de entorno requeridas |
| `.gitignore` | Ignorar node_modules, .env.local, dist |
| `README.md` | Documentación del proyecto |

### Carpetas vacías (placeholders)
Cada carpeta recibe un `.gitkeep`:
- `src/components/layout/`
- `src/components/semanas/`
- `src/components/registro/`
- `src/components/dashboard/`
- `src/components/reportes/`
- `src/pages/`
- `src/hooks/`
- `public/`

---

## Task 1: Verificar prerequisitos

**Files:** ninguno

- [ ] **Step 1: Verificar Node.js ≥ 18**

```bash
node --version
```
Esperado: `v18.x.x` o superior. Si no, instalar desde nodejs.org.

- [ ] **Step 2: Verificar gh CLI instalado y autenticado**

```bash
gh auth status
```
Esperado: `Logged in to github.com as <tu-usuario>`. Si no, ejecutar `gh auth login`.

- [ ] **Step 3: Verificar que el nombre `sigo` esté disponible en GitHub**

```bash
gh repo view sigo 2>&1 || echo "DISPONIBLE"
```
Esperado: mensaje de error "Could not resolve" o "DISPONIBLE". Si ya existe, ver con el usuario qué hacer.

---

## Task 2: Crear repositorio GitHub

**Files:** `.gitignore`

- [ ] **Step 1: Crear el repo en GitHub**

```bash
gh repo create sigo \
  --public \
  --description "SIGO — Sistema de Gestión Operacional · INTRANT · SITPSD" \
  --clone \
  --gitignore Node
```
Esperado: mensaje "Created repository .../sigo" y carpeta `sigo/` creada localmente.

- [ ] **Step 2: Entrar a la carpeta del proyecto**

```bash
cd sigo
```

- [ ] **Step 3: Verificar que el repo remoto está configurado**

```bash
git remote -v
```
Esperado: `origin  https://github.com/<usuario>/sigo.git (fetch)` y `(push)`.

- [ ] **Step 4: Agregar `.env.local` al `.gitignore` generado por GitHub**

El `.gitignore` de Node generado por GitHub ya incluye `.env` pero agregar explícitamente `.env.local`:

```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 5: Commit inicial**

```bash
git add .gitignore
git commit -m "chore: add .env.local to gitignore"
git push origin main
```

---

## Task 3: Scaffold del proyecto con Vite

**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

**Nota:** `npm create vite` genera el scaffold dentro de la carpeta actual cuando se usa `.` como nombre.

- [ ] **Step 1: Scaffoldear el proyecto Vite dentro de la carpeta `sigo/`**

Ejecutar desde dentro de `sigo/`:
```bash
npm create vite@latest . -- --template react-ts
```
Cuando pregunte si proceder en directorio no vacío: seleccionar **"Ignore files and continue"**.

- [ ] **Step 2: Verificar archivos generados**

```bash
ls src/
```
Esperado: `App.css  App.tsx  assets/  index.css  main.tsx  vite-env.d.ts`

- [ ] **Step 3: Instalar dependencias base de Vite**

```bash
npm install
```
Esperado: `added N packages` sin errores.

- [ ] **Step 4: Verificar que el proyecto inicia**

```bash
npm run dev -- --port 5173 &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
```
Esperado: HTML con `<div id="root">`.

- [ ] **Step 5: Limpiar `src/App.css` — reemplazar con archivo vacío**

```bash
echo "" > src/App.css
```

- [ ] **Step 6: Reemplazar `src/App.tsx` con placeholder limpio**

```tsx
// src/App.tsx
function App() {
  return <div>SIGO — En construcción</div>;
}

export default App;
```

- [ ] **Step 7: Commit del scaffold base**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript base"
git push origin main
```

---

## Task 4: Instalar dependencias del PRD

**Files:** `package.json` (modificado por npm)

- [ ] **Step 1: Instalar dependencias de routing y estado**

```bash
npm install react-router-dom zustand
```
Esperado: sin errores.

- [ ] **Step 2: Instalar Supabase**

```bash
npm install @supabase/supabase-js
```
Esperado: sin errores.

- [ ] **Step 3: Instalar librerías de visualización y exportación**

```bash
npm install recharts @react-pdf/renderer xlsx papaparse
```
Esperado: sin errores.

- [ ] **Step 4: Instalar tipos faltantes**

```bash
npm install -D @types/papaparse
```
Esperado: sin errores.

- [ ] **Step 5: Verificar `package.json` tiene todas las dependencias**

```bash
cat package.json | grep -E '"react-router-dom|zustand|supabase|recharts|react-pdf|xlsx|papaparse'
```
Esperado: todas las librerías listadas.

- [ ] **Step 6: Commit de dependencias**

```bash
git add package.json package-lock.json
git commit -m "feat: install all PRD dependencies"
git push origin main
```

---

## Task 5: Configurar Tailwind CSS

**Files:** `tailwind.config.ts`, `vite.config.ts`, `src/index.css`

- [ ] **Step 1: Instalar Tailwind y su plugin de Vite**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Actualizar `vite.config.ts` para incluir el plugin de Tailwind**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

- [ ] **Step 3: Crear `tailwind.config.ts` con la paleta INTRANT**

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a3a5c',
          dark: '#0f2540',
          light: '#2a5a8c',
        },
        intrant: {
          orange: '#e8541a',
          green: '#27ae60',
          yellow: '#f39c12',
          red: '#e74c3c',
          light: '#f4f6f9',
          border: '#dde3eb',
          text: '#2c3e50',
          muted: '#6c7a8d',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 4: Reemplazar `src/index.css` con variables CSS INTRANT y directivas Tailwind**

```css
/* src/index.css */
@import "tailwindcss";

:root {
  --navy: #1a3a5c;
  --navy-dark: #0f2540;
  --navy-light: #2a5a8c;
  --orange: #e8541a;
  --green: #27ae60;
  --yellow: #f39c12;
  --red: #e74c3c;
  --light: #f4f6f9;
  --border: #dde3eb;
  --text: #2c3e50;
  --muted: #6c7a8d;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--light);
  color: var(--text);
}
```

- [ ] **Step 5: Verificar que Tailwind funciona**

```bash
npm run build 2>&1 | tail -5
```
Esperado: `✓ built in` sin errores.

- [ ] **Step 6: Commit de Tailwind**

```bash
git add tailwind.config.ts vite.config.ts src/index.css package.json package-lock.json
git commit -m "feat: configure Tailwind CSS with INTRANT palette"
git push origin main
```

---

## Task 6: Configurar shadcn/ui

**Files:** `components.json`, `src/lib/utils.ts`

- [ ] **Step 1: Instalar dependencias requeridas por shadcn**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 2: Instalar `@radix-ui/react-slot` (requerido por shadcn Button)**

```bash
npm install @radix-ui/react-slot
```

- [ ] **Step 3: Inicializar shadcn/ui**

```bash
npx shadcn@latest init -d
```
Si pregunta opciones interactivamente, seleccionar:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

- [ ] **Step 4: Verificar que `components.json` fue creado**

```bash
cat components.json | head -10
```
Esperado: JSON con `"style": "default"` o similar.

- [ ] **Step 5: Verificar que `src/lib/utils.ts` fue creado por shadcn**

```bash
cat src/lib/utils.ts
```
Esperado: función `cn()` que combina clsx y tailwind-merge.

- [ ] **Step 6: Commit de shadcn**

```bash
git add -A
git commit -m "feat: initialize shadcn/ui"
git push origin main
```

---

## Task 7: Crear tipos TypeScript (`src/types/index.ts`)

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Crear `src/types/index.ts` con todos los tipos del PRD**

```ts
// src/types/index.ts

export type Rol = 'admin' | 'digitador' | 'supervisor' | 'analista';
export type EstadoSemana = 'borrador' | 'en_revision' | 'validado' | 'publicado';
export type FuenteDato = 'manual' | 'importado';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Corredor {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  orden: number;
  notas?: string;
  created_at: string;
}

export interface Semana {
  id: string;
  numero_semana: number;
  periodo: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoSemana;
  observaciones?: string;
  comentario_rechazo?: string;
  creado_por: string;
  validado_por?: string;
  validado_en?: string;
  created_at: string;
  updated_at: string;
}

export interface RegistroDiario {
  id: string;
  semana_id: string;
  corredor_id: string;
  fecha: string;
  kms_programados?: number;
  kms_ejecutados?: number;
  kms_efectivos?: number;
  total_pasajeros?: number;
  servicios_programados?: number;
  servicios_ejecutados?: number;
  servicios_puntuales?: number;
  ica?: number;
  ick?: number;
  icd?: number;
  ic?: number;
  ip?: number;
  ie?: number;
  ics?: number;
  tiene_datos: boolean;
  fuente: FuenteDato;
  creado_por: string;
  updated_at: string;
}

export interface TotalesCorredor {
  kms_programados: number;
  kms_ejecutados: number;
  kms_efectivos: number;
  total_pasajeros: number;
  servicios_programados: number;
  servicios_ejecutados: number;
  servicios_puntuales: number;
  ica_prom: number;
  ick_prom: number;
  icd_prom: number;
  ic_prom: number;
  ip_prom: number;
  ie_prom: number;
  ics_prom: number;
}

export interface SemanaConTotales extends Semana {
  corredor: Corredor;
  totales: TotalesCorredor;
}
```

- [ ] **Step 2: Verificar que TypeScript acepta los tipos sin errores**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sin output (cero errores).

- [ ] **Step 3: Commit de tipos**

```bash
git add src/types/index.ts
git commit -m "feat: add all TypeScript types from PRD"
git push origin main
```

---

## Task 8: Crear fórmulas (`src/lib/formulas.ts`)

**Files:**
- Create: `src/lib/formulas.ts`

- [ ] **Step 1: Crear `src/lib/formulas.ts` con todas las funciones del PRD**

```ts
// src/lib/formulas.ts
import type { RegistroDiario, TotalesCorredor } from '../types';

export function calcIC(ica: number, ick: number, icd: number): number {
  return parseFloat(((ica + ick + icd) / 3).toFixed(2));
}

export function calcICS(ic: number, ip: number, ie: number): number {
  return parseFloat((ic * 0.5 + ip * 0.25 + ie * 0.25).toFixed(2));
}

export function getICSColor(ics: number): string {
  if (ics >= 80) return '#27ae60';
  if (ics >= 70) return '#f39c12';
  return '#e74c3c';
}

export function calcTotalesCorredor(registros: RegistroDiario[]): TotalesCorredor {
  const conDatos = registros.filter(r => r.tiene_datos);

  const suma = (campo: keyof RegistroDiario): number =>
    conDatos.reduce((acc, r) => acc + (Number(r[campo]) || 0), 0);

  const prom = (campo: keyof RegistroDiario): number => {
    const vals = conDatos.filter(r => r[campo] != null);
    if (!vals.length) return 0;
    return parseFloat(
      (vals.reduce((a, r) => a + Number(r[campo]), 0) / vals.length).toFixed(2)
    );
  };

  return {
    kms_programados: suma('kms_programados'),
    kms_ejecutados: suma('kms_ejecutados'),
    kms_efectivos: suma('kms_efectivos'),
    total_pasajeros: suma('total_pasajeros'),
    servicios_programados: suma('servicios_programados'),
    servicios_ejecutados: suma('servicios_ejecutados'),
    servicios_puntuales: suma('servicios_puntuales'),
    ica_prom: prom('ica'),
    ick_prom: prom('ick'),
    icd_prom: prom('icd'),
    ic_prom: prom('ic'),
    ip_prom: prom('ip'),
    ie_prom: prom('ie'),
    ics_prom: prom('ics'),
  };
}
```

- [ ] **Step 2: Verificar TypeScript sin errores**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 3: Verificar las fórmulas manualmente en Node**

```bash
node -e "
const calcIC = (a,b,c) => parseFloat(((a+b+c)/3).toFixed(2));
const calcICS = (ic,ip,ie) => parseFloat((ic*0.5+ip*0.25+ie*0.25).toFixed(2));
const ic = calcIC(89, 92, 88);
const ics = calcICS(ic, 85, 90);
console.log('IC:', ic, '=== expected: 89.67');
console.log('ICS:', ics, '=== expected: 87.59');
"
```
Esperado: `IC: 89.67` e `ICS: 87.59`.

- [ ] **Step 4: Commit de fórmulas**

```bash
git add src/lib/formulas.ts
git commit -m "feat: add IC/ICS calculation functions"
git push origin main
```

---

## Task 9: Crear cliente Supabase (`src/lib/supabase.ts`)

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Crear `.env.local.example`**

```bash
cat > .env.local.example << 'EOF'
# Supabase
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
EOF
```

- [ ] **Step 2: Crear `src/lib/supabase.ts`**

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Copia .env.local.example a .env.local y rellena los valores.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Crear `.env.local` con valores placeholder para que TypeScript compile**

```bash
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-key
EOF
```

- [ ] **Step 4: Verificar TypeScript sin errores**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts .env.local.example
git commit -m "feat: add Supabase singleton client"
git push origin main
```

---

## Task 10: Crear stores de Zustand

**Files:**
- Create: `src/store/authStore.ts`
- Create: `src/store/registroStore.ts`

- [ ] **Step 1: Crear `src/store/authStore.ts`**

```ts
// src/store/authStore.ts
import { create } from 'zustand';
import type { Usuario } from '../types';

interface AuthState {
  usuario: Usuario | null;
  loading: boolean;
  setUsuario: (usuario: Usuario | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  loading: true,
  setUsuario: (usuario) => set({ usuario }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ usuario: null, loading: false }),
}));
```

- [ ] **Step 2: Crear `src/store/registroStore.ts`**

```ts
// src/store/registroStore.ts
import { create } from 'zustand';
import type { Semana, RegistroDiario } from '../types';

interface RegistroState {
  semanaActual: Semana | null;
  registros: RegistroDiario[];
  corredorActivoId: string | null;
  dirty: boolean;
  setSemana: (semana: Semana | null) => void;
  setRegistros: (registros: RegistroDiario[]) => void;
  setCorredorActivo: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  reset: () => void;
}

export const useRegistroStore = create<RegistroState>((set) => ({
  semanaActual: null,
  registros: [],
  corredorActivoId: null,
  dirty: false,
  setSemana: (semanaActual) => set({ semanaActual }),
  setRegistros: (registros) => set({ registros }),
  setCorredorActivo: (corredorActivoId) => set({ corredorActivoId }),
  setDirty: (dirty) => set({ dirty }),
  reset: () => set({ semanaActual: null, registros: [], corredorActivoId: null, dirty: false }),
}));
```

- [ ] **Step 3: Verificar TypeScript sin errores**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 4: Commit de stores**

```bash
git add src/store/
git commit -m "feat: add Zustand stores for auth and registro"
git push origin main
```

---

## Task 11: Crear utilidades de fechas (`src/lib/dateUtils.ts`)

**Files:**
- Create: `src/lib/dateUtils.ts`

- [ ] **Step 1: Crear `src/lib/dateUtils.ts`**

```ts
// src/lib/dateUtils.ts

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calcFechaFin(fechaInicio: string): string {
  const inicio = new Date(fechaInicio + 'T00:00:00');
  return toISODate(addDays(inicio, 6));
}

export function formatFecha(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-DO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

export function generarDiasSemana(fechaInicio: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const inicio = new Date(fechaInicio + 'T00:00:00');
    return toISODate(addDays(inicio, i));
  });
}
```

- [ ] **Step 2: Verificar TypeScript sin errores**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 3: Verificar `calcFechaFin` manualmente**

```bash
node -e "
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function toISO(d) { return d.toISOString().split('T')[0]; }
function calcFechaFin(fi) { return toISO(addDays(new Date(fi+'T00:00:00'), 6)); }
console.log(calcFechaFin('2026-05-04'), '=== expected: 2026-05-10');
"
```
Esperado: `2026-05-10`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/dateUtils.ts
git commit -m "feat: add date utility functions"
git push origin main
```

---

## Task 12: Crear estructura de carpetas con placeholders

**Files:** `.gitkeep` en cada carpeta vacía

- [ ] **Step 1: Crear todas las carpetas del PRD con `.gitkeep`**

```bash
mkdir -p src/components/layout \
         src/components/semanas \
         src/components/registro \
         src/components/dashboard \
         src/components/reportes \
         src/pages \
         src/hooks \
         public

touch src/components/layout/.gitkeep \
      src/components/semanas/.gitkeep \
      src/components/registro/.gitkeep \
      src/components/dashboard/.gitkeep \
      src/components/reportes/.gitkeep \
      src/pages/.gitkeep \
      src/hooks/.gitkeep
```

- [ ] **Step 2: Verificar estructura**

```bash
find src -name ".gitkeep" | sort
```
Esperado: 7 rutas listadas.

- [ ] **Step 3: Commit de estructura**

```bash
git add src/components/ src/pages/ src/hooks/
git commit -m "feat: create folder structure from PRD"
git push origin main
```

---

## Task 13: Configurar `vercel.json`

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Crear `vercel.json` con rewrites para React Router SPA**

```json
{
  "rewrites": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

- [ ] **Step 2: Verificar que el build de Vite produce `dist/`**

```bash
npm run build 2>&1 | tail -5
ls dist/
```
Esperado: carpeta `dist/` con `index.html` y `assets/`.

- [ ] **Step 3: Commit de vercel.json**

```bash
git add vercel.json
git commit -m "feat: add vercel.json for SPA routing"
git push origin main
```

---

## Task 14: Escribir README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Crear `README.md`**

```markdown
# SIGO — Sistema de Gestión Operacional

**INTRANT · Dirección de Movilidad Sostenible · Gran Santo Domingo**

Sistema web para registrar, validar y analizar los informes de operación semanal de los Corredores Interoperables del SITPSD. Reemplaza el proceso manual de PDF/Excel con un flujo digital completo: ingreso de datos, cálculo automático de indicadores, flujo de aprobación por roles y generación del informe oficial INTRANT.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
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
git clone https://github.com/<usuario>/sigo.git
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
│   ├── semanas/    # SemanaCard, EstadoBadge
│   ├── registro/   # Tablas, formularios, ImportModal
│   ├── dashboard/  # KpiCards, Charts
│   └── reportes/   # InformePDF, ExportExcel
├── pages/          # Páginas: Login, Dashboard, Registro, etc.
├── hooks/          # Custom hooks de Supabase
├── store/          # Zustand: authStore, registroStore
├── lib/            # supabase.ts, formulas.ts, dateUtils.ts
└── types/          # Tipos TypeScript de todas las entidades
```

---

## Documentación

El PRD completo está en `PRD_SITPSD_Corredores.md`.  
El diseño del scaffold está en `docs/superpowers/specs/2026-05-19-sigo-scaffold-design.md`.

---

*SIGO v1.0 · Mayo 2026*
```

- [ ] **Step 2: Commit del README**

```bash
git add README.md
git commit -m "docs: add project README"
git push origin main
```

---

## Task 15: Verificación final

**Files:** ninguno nuevo

- [ ] **Step 1: TypeScript limpio — cero errores**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sin output (cero errores).

- [ ] **Step 2: Build de producción exitoso**

```bash
npm run build 2>&1
```
Esperado: `✓ built in Xs` sin errores ni warnings de tipo.

- [ ] **Step 3: Verificar estructura completa**

```bash
find src -type f | sort
```
Esperado: ver `src/lib/formulas.ts`, `src/lib/supabase.ts`, `src/lib/dateUtils.ts`, `src/types/index.ts`, `src/store/authStore.ts`, `src/store/registroStore.ts`.

- [ ] **Step 4: Verificar repo en GitHub**

```bash
gh repo view sigo --web
```
Esperado: abre el repo en el navegador con README visible.

- [ ] **Step 5: Push final del PRD y docs al repo**

```bash
# Copiar el PRD y docs al repo
cp /Users/torres/proyectos/SIGO/PRD_SITPSD_Corredores.md .
mkdir -p docs/superpowers/specs
cp /Users/torres/proyectos/SIGO/docs/superpowers/specs/2026-05-19-sigo-scaffold-design.md docs/superpowers/specs/

git add PRD_SITPSD_Corredores.md docs/
git commit -m "docs: add PRD and scaffold design spec"
git push origin main
```

- [ ] **Step 6: Verificar commits en GitHub**

```bash
gh repo view sigo
```
Esperado: mostrar descripción, README, y últimos commits.
```
