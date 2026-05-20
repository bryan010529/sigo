# SIGO Fase 1B — Dashboard + Semanas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el Dashboard con KPI cards y 2 gráficas (ICS por semana, pasajeros por semana), y el módulo Semanas con lista de semanas y vista detalle — ambos con datos reales de Supabase.

**Architecture:** Cada módulo tiene su propio hook de datos (`useDashboard`, `useSemanas`) que llama a Supabase directamente. Los componentes son puros (solo props/display). El Dashboard usa Recharts para las gráficas y Supabase Realtime para actualizarse sin recargar cuando se publica una nueva semana.

**Tech Stack:** React 18 + TypeScript + Supabase JS v2 + Recharts + Tailwind CSS v4 + shadcn/ui + lucide-react.

**Prerequisitos:** Fase 1A completa (Auth + Layout). Migraciones de BD aplicadas en Supabase.

---

## Mapa de Archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|----------------|
| `src/hooks/useDashboard.ts` | Crear | Fetch KPIs y datos para gráficas desde Supabase; Realtime subscription |
| `src/hooks/useSemanas.ts` | Crear | Fetch lista de semanas con filtros; acciones de estado |
| `src/hooks/useCorredores.ts` | Crear | Fetch lista de corredores activos |
| `src/components/dashboard/KpiCards.tsx` | Crear | 5 cards de KPI con colores semánticos |
| `src/components/dashboard/Charts.tsx` | Crear | LineChart ICS + BarChart pasajeros (Recharts) |
| `src/components/semanas/EstadoBadge.tsx` | Crear | Badge de estado con colores semánticos |
| `src/components/semanas/SemanaCard.tsx` | Crear | Card de semana con ICS, pasajeros, acciones por rol |
| `src/pages/Dashboard.tsx` | Modificar | Reemplazar shell con implementación real |
| `src/pages/Semanas.tsx` | Modificar | Reemplazar shell con lista + filtros |
| `src/pages/SemanaDetalle.tsx` | Modificar | Reemplazar shell con detalle + acciones |

---

## Task 1: Hook useDashboard

**Files:**
- Create: `src/hooks/useDashboard.ts`

- [ ] **Step 1: Crear `src/hooks/useDashboard.ts`**

```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Semana, RegistroDiario, Corredor } from '../types';

export interface KpiData {
  totalSemanas: number;
  semanasValidadas: number;
  totalPasajeros: number;
  kmsEfectivos: number;
  icsPromedio: number | null;
}

export interface ChartPoint {
  semana: string;        // "S1", "S2", etc.
  [corredor: string]: number | string;  // ics o pasajeros por corredor
}

export interface DashboardData {
  kpis: KpiData;
  icsChart: ChartPoint[];
  pasajerosChart: ChartPoint[];
  corredores: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

async function fetchDashboardData(): Promise<Omit<DashboardData, 'loading' | 'error' | 'refetch'>> {
  // Traer semanas validadas/publicadas con sus registros
  const { data: semanas, error: semError } = await supabase
    .from('semanas')
    .select('id, numero_semana, periodo, estado')
    .in('estado', ['validado', 'publicado'])
    .order('periodo', { ascending: true })
    .order('numero_semana', { ascending: true });

  if (semError) throw semError;

  const { data: allSemanas, error: allError } = await supabase
    .from('semanas')
    .select('id, estado');

  if (allError) throw allError;

  const { data: corredores, error: corrError } = await supabase
    .from('corredores')
    .select('id, nombre, codigo')
    .eq('activo', true)
    .order('orden');

  if (corrError) throw corrError;

  const semanaIds = (semanas || []).map(s => s.id);
  let registros: RegistroDiario[] = [];

  if (semanaIds.length > 0) {
    const { data, error: regError } = await supabase
      .from('registros_diarios')
      .select('semana_id, corredor_id, ics, total_pasajeros, kms_efectivos, tiene_datos')
      .in('semana_id', semanaIds)
      .eq('tiene_datos', true);

    if (regError) throw regError;
    registros = (data || []) as RegistroDiario[];
  }

  // KPIs
  const totalSemanas = (allSemanas || []).length;
  const semanasValidadas = (allSemanas || []).filter(
    s => s.estado === 'validado' || s.estado === 'publicado'
  ).length;
  const totalPasajeros = registros.reduce((a, r) => a + (r.total_pasajeros || 0), 0);
  const kmsEfectivos = registros.reduce((a, r) => a + (Number(r.kms_efectivos) || 0), 0);
  const icsValues = registros.map(r => r.ics).filter((v): v is number => v != null);
  const icsPromedio = icsValues.length
    ? parseFloat((icsValues.reduce((a, v) => a + v, 0) / icsValues.length).toFixed(2))
    : null;

  // Charts: agrupar por semana + corredor
  const corredorNames = (corredores || []).reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.nombre;
    return acc;
  }, {});
  const corredorLabels = (corredores || []).map(c => c.nombre);

  const icsChart: ChartPoint[] = [];
  const pasajerosChart: ChartPoint[] = [];

  for (const semana of semanas || []) {
    const semRegs = registros.filter(r => r.semana_id === semana.id);
    const label = `S${semana.numero_semana}`;

    const icsPoint: ChartPoint = { semana: label };
    const pasajerosPoint: ChartPoint = { semana: label };

    for (const corredor of corredores || []) {
      const corrRegs = semRegs.filter(r => r.corredor_id === corredor.id);
      const icsVals = corrRegs.map(r => r.ics).filter((v): v is number => v != null);
      icsPoint[corredor.nombre] = icsVals.length
        ? parseFloat((icsVals.reduce((a, v) => a + v, 0) / icsVals.length).toFixed(2))
        : 0;

      pasajerosPoint[corredor.nombre] = corrRegs.reduce(
        (a, r) => a + (r.total_pasajeros || 0), 0
      );
    }

    icsChart.push(icsPoint);
    pasajerosChart.push(pasajerosPoint);
  }

  return {
    kpis: { totalSemanas, semanasValidadas, totalPasajeros, kmsEfectivos, icsPromedio },
    icsChart,
    pasajerosChart,
    corredores: corredorLabels,
  };
}

export function useDashboard(): DashboardData {
  const [state, setState] = useState<Omit<DashboardData, 'refetch'>>({
    kpis: { totalSemanas: 0, semanasValidadas: 0, totalPasajeros: 0, kmsEfectivos: 0, icsPromedio: null },
    icsChart: [],
    pasajerosChart: [],
    corredores: [],
    loading: true,
    error: null,
  });

  const refetch = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    fetchDashboardData()
      .then(data => setState(prev => ({ ...prev, ...data, loading: false })))
      .catch(err => setState(prev => ({ ...prev, loading: false, error: err.message })));
  }, []);

  useEffect(() => {
    refetch();

    // Supabase Realtime: actualizar cuando se publique una semana nueva
    const channel = supabase
      .channel('dashboard-semanas')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'semanas',
        filter: 'estado=eq.publicado',
      }, () => refetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  return { ...state, refetch };
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1 && echo "TS OK"
```
Esperado: `TS OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/hooks/useDashboard.ts
git commit -m "feat: add useDashboard hook with Supabase Realtime"
git push origin main
```

---

## Task 2: Hook useSemanas + useCorredores

**Files:**
- Create: `src/hooks/useSemanas.ts`
- Create: `src/hooks/useCorredores.ts`

- [ ] **Step 1: Crear `src/hooks/useCorredores.ts`**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Corredor } from '../types';

export function useCorredores() {
  const [corredores, setCorredores] = useState<Corredor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('corredores')
      .select('*')
      .eq('activo', true)
      .order('orden')
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) { setError(err.message); return; }
        setCorredores((data || []) as Corredor[]);
      });
  }, []);

  return { corredores, loading, error };
}
```

- [ ] **Step 2: Crear `src/hooks/useSemanas.ts`**

```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Semana, EstadoSemana } from '../types';
import { useAuthStore } from '../store/authStore';

interface FiltrosSemanas {
  estado?: EstadoSemana | '';
  corredor_id?: string;
}

interface UseSemanas {
  semanas: Semana[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  enviarARevision: (id: string) => Promise<void>;
  aprobar: (id: string) => Promise<void>;
  rechazar: (id: string, comentario: string) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
}

export function useSemanas(filtros: FiltrosSemanas = {}): UseSemanas {
  const { usuario } = useAuthStore();
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('semanas')
      .select('*')
      .order('numero_semana', { ascending: false });

    if (filtros.estado) {
      query = query.eq('estado', filtros.estado);
    }

    query.then(({ data, error: err }) => {
      setLoading(false);
      if (err) { setError(err.message); return; }
      setSemanas((data || []) as Semana[]);
    });
  }, [filtros.estado]);

  useEffect(() => { refetch(); }, [refetch]);

  async function enviarARevision(id: string) {
    const { error: err } = await supabase
      .from('semanas')
      .update({ estado: 'en_revision' })
      .eq('id', id);
    if (err) throw new Error(err.message);
    refetch();
  }

  async function aprobar(id: string) {
    const { error: err } = await supabase
      .from('semanas')
      .update({
        estado: 'validado',
        validado_por: usuario?.id,
        validado_en: new Date().toISOString(),
      })
      .eq('id', id);
    if (err) throw new Error(err.message);
    refetch();
  }

  async function rechazar(id: string, comentario: string) {
    const { error: err } = await supabase
      .from('semanas')
      .update({ estado: 'borrador', comentario_rechazo: comentario })
      .eq('id', id);
    if (err) throw new Error(err.message);
    refetch();
  }

  async function eliminar(id: string) {
    const { error: err } = await supabase
      .from('semanas')
      .delete()
      .eq('id', id);
    if (err) throw new Error(err.message);
    refetch();
  }

  return { semanas, loading, error, refetch, enviarARevision, aprobar, rechazar, eliminar };
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1 && echo "TS OK"
```
Esperado: `TS OK`

- [ ] **Step 4: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/hooks/useSemanas.ts src/hooks/useCorredores.ts
git commit -m "feat: add useSemanas and useCorredores hooks"
git push origin main
```

---

## Task 3: Componentes KpiCards y EstadoBadge

**Files:**
- Create: `src/components/dashboard/KpiCards.tsx`
- Create: `src/components/semanas/EstadoBadge.tsx`

- [ ] **Step 1: Crear `src/components/semanas/EstadoBadge.tsx`**

```tsx
import type { EstadoSemana } from '../../types';

const ESTADO_CONFIG: Record<EstadoSemana, { label: string; bg: string; color: string }> = {
  borrador:    { label: 'Borrador',    bg: '#f1f5f9', color: '#64748b' },
  en_revision: { label: 'En Revisión', bg: '#fef9c3', color: '#854d0e' },
  validado:    { label: 'Validado',    bg: '#dcfce7', color: '#166534' },
  publicado:   { label: 'Publicado',   bg: '#dbeafe', color: '#1e40af' },
};

interface Props {
  estado: EstadoSemana;
  size?: 'sm' | 'md';
}

export default function EstadoBadge({ estado, size = 'md' }: Props) {
  const cfg = ESTADO_CONFIG[estado];
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${padding}`}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
```

- [ ] **Step 2: Crear `src/components/dashboard/KpiCards.tsx`**

```tsx
import type { KpiData } from '../../hooks/useDashboard';
import { getICSColor } from '../../lib/formulas';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function KpiCard({ label, value, sub, color }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col gap-1"
      style={{ border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: color || 'var(--navy)' }}>
        {value}
      </p>
      {sub && <p className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  );
}

interface Props {
  kpis: KpiData;
}

export default function KpiCards({ kpis }: Props) {
  const icsColor = kpis.icsPromedio != null ? getICSColor(kpis.icsPromedio) : 'var(--muted)';
  const icsValue = kpis.icsPromedio != null ? `${kpis.icsPromedio}%` : '—';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard
        label="Total Semanas"
        value={kpis.totalSemanas}
        sub="registradas"
      />
      <KpiCard
        label="Semanas Validadas"
        value={kpis.semanasValidadas}
        sub="validadas o publicadas"
        color="var(--green)"
      />
      <KpiCard
        label="Total Pasajeros"
        value={kpis.totalPasajeros.toLocaleString('es-DO')}
        sub="boletos validados"
      />
      <KpiCard
        label="Kms Efectivos"
        value={kpis.kmsEfectivos.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
        sub="kilómetros pagados"
      />
      <KpiCard
        label="ICS Promedio"
        value={icsValue}
        sub="calidad de servicio"
        color={icsColor}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1 && echo "TS OK"
```
Esperado: `TS OK`

- [ ] **Step 4: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/components/dashboard/KpiCards.tsx src/components/semanas/EstadoBadge.tsx
git commit -m "feat: add KpiCards and EstadoBadge components"
git push origin main
```

---

## Task 4: Charts (Recharts)

**Files:**
- Create: `src/components/dashboard/Charts.tsx`

- [ ] **Step 1: Crear `src/components/dashboard/Charts.tsx`**

```tsx
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartPoint } from '../../hooks/useDashboard';

const CORREDOR_COLORS = ['#1a3a5c', '#e8541a', '#27ae60', '#f39c12'];

interface Props {
  icsChart: ChartPoint[];
  pasajerosChart: ChartPoint[];
  corredores: string[];
}

export default function Charts({ icsChart, pasajerosChart, corredores }: Props) {
  if (!icsChart.length) {
    return (
      <div
        className="bg-white rounded-xl p-8 text-center"
        style={{ border: '1px solid var(--border)' }}
      >
        <p style={{ color: 'var(--muted)' }}>No hay semanas validadas para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ICS por semana */}
      <div
        className="bg-white rounded-xl p-5"
        style={{ border: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          ICS por Semana
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={icsChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={(v: number) => [`${v}%`, '']} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {corredores.map((corredor, i) => (
              <Line
                key={corredor}
                type="monotone"
                dataKey={corredor}
                stroke={CORREDOR_COLORS[i % CORREDOR_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pasajeros por semana */}
      <div
        className="bg-white rounded-xl p-5"
        style={{ border: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Pasajeros por Semana
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={pasajerosChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [v.toLocaleString('es-DO'), '']} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {corredores.map((corredor, i) => (
              <Bar
                key={corredor}
                dataKey={corredor}
                fill={CORREDOR_COLORS[i % CORREDOR_COLORS.length]}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1 && echo "TS OK"
```
Esperado: `TS OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/components/dashboard/Charts.tsx
git commit -m "feat: add Recharts dashboard charts (ICS + pasajeros)"
git push origin main
```

---

## Task 5: Página Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Reemplazar `src/pages/Dashboard.tsx`**

```tsx
import { useDashboard } from '../hooks/useDashboard';
import KpiCards from '../components/dashboard/KpiCards';
import Charts from '../components/dashboard/Charts';

export default function Dashboard() {
  const { kpis, icsChart, pasajerosChart, corredores, loading, error, refetch } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>
          Error cargando datos: {error}
        </p>
        <button
          onClick={refetch}
          className="mt-3 text-sm underline"
          style={{ color: 'var(--navy)' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KpiCards kpis={kpis} />
      <Charts icsChart={icsChart} pasajerosChart={pasajerosChart} corredores={corredores} />
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1 && echo "TS OK"
```
Esperado: `TS OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/pages/Dashboard.tsx
git commit -m "feat: implement Dashboard page with KPIs and charts"
git push origin main
```

---

## Task 6: Componente SemanaCard

**Files:**
- Create: `src/components/semanas/SemanaCard.tsx`

- [ ] **Step 1: Crear `src/components/semanas/SemanaCard.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Send, CheckCircle, XCircle, Trash2, Download } from 'lucide-react';
import EstadoBadge from './EstadoBadge';
import { getICSColor } from '../../lib/formulas';
import { useAuthStore } from '../../store/authStore';
import type { Semana } from '../../types';

interface Props {
  semana: Semana;
  onEnviar: (id: string) => void;
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
  onEliminar: (id: string) => void;
}

export default function SemanaCard({ semana, onEnviar, onAprobar, onRechazar, onEliminar }: Props) {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const rol = usuario?.rol;

  const fechaInicio = new Date(semana.fecha_inicio + 'T00:00:00').toLocaleDateString('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const fechaFin = new Date(semana.fecha_fin + 'T00:00:00').toLocaleDateString('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col gap-4"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--navy)' }}
            >
              Semana {semana.numero_semana}
            </span>
            <EstadoBadge estado={semana.estado} />
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Período {semana.periodo} · {fechaInicio} – {fechaFin}
          </p>
        </div>
      </div>

      {/* Comentario de rechazo */}
      {semana.comentario_rechazo && semana.estado === 'borrador' && (
        <div
          className="text-xs rounded-lg px-3 py-2"
          style={{ backgroundColor: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' }}
        >
          <span className="font-semibold">Rechazada:</span> {semana.comentario_rechazo}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Ver detalle — todos */}
        <button
          onClick={() => navigate(`/semanas/${semana.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--light)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          <Eye size={13} /> Ver
        </button>

        {/* Editar — digitador/admin en borrador */}
        {(rol === 'admin' || rol === 'digitador') && semana.estado === 'borrador' && (
          <button
            onClick={() => navigate(`/registro/${semana.id}/editar`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--navy)', color: 'white' }}
          >
            <Edit size={13} /> Editar
          </button>
        )}

        {/* Enviar a revisión — digitador/admin en borrador */}
        {(rol === 'admin' || rol === 'digitador') && semana.estado === 'borrador' && (
          <button
            onClick={() => onEnviar(semana.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}
          >
            <Send size={13} /> Enviar a revisión
          </button>
        )}

        {/* Aprobar — supervisor/admin en revisión */}
        {(rol === 'admin' || rol === 'supervisor') && semana.estado === 'en_revision' && (
          <button
            onClick={() => onAprobar(semana.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}
          >
            <CheckCircle size={13} /> Aprobar
          </button>
        )}

        {/* Rechazar — supervisor/admin en revisión */}
        {(rol === 'admin' || rol === 'supervisor') && semana.estado === 'en_revision' && (
          <button
            onClick={() => onRechazar(semana.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' }}
          >
            <XCircle size={13} /> Rechazar
          </button>
        )}

        {/* Eliminar — solo admin */}
        {rol === 'admin' && (
          <button
            onClick={() => onEliminar(semana.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80 ml-auto"
            style={{ color: 'var(--red)' }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1 && echo "TS OK"
```
Esperado: `TS OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/components/semanas/SemanaCard.tsx
git commit -m "feat: add SemanaCard component with role-based actions"
git push origin main
```

---

## Task 7: Página Semanas + Modal Rechazo

**Files:**
- Modify: `src/pages/Semanas.tsx`

- [ ] **Step 1: Reemplazar `src/pages/Semanas.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useSemanas } from '../hooks/useSemanas';
import SemanaCard from '../components/semanas/SemanaCard';
import type { EstadoSemana } from '../types';
import { useAuthStore } from '../store/authStore';

const ESTADOS: { value: EstadoSemana | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'en_revision', label: 'En Revisión' },
  { value: 'validado', label: 'Validado' },
  { value: 'publicado', label: 'Publicado' },
];

export default function Semanas() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const [filtroEstado, setFiltroEstado] = useState<EstadoSemana | ''>('');
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [actionError, setActionError] = useState('');

  const { semanas, loading, error, enviarARevision, aprobar, rechazar, eliminar } = useSemanas({
    estado: filtroEstado,
  });

  async function handleRechazar() {
    if (!rechazandoId || !motivoRechazo.trim()) return;
    try {
      await rechazar(rechazandoId, motivoRechazo.trim());
      setRechazandoId(null);
      setMotivoRechazo('');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al rechazar');
    }
  }

  async function handleEnviar(id: string) {
    try {
      await enviarARevision(id);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al enviar');
    }
  }

  async function handleAprobar(id: string) {
    try {
      await aprobar(id);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al aprobar');
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar esta semana? Esta acción no se puede deshacer.')) return;
    try {
      await eliminar(id);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as EstadoSemana | '')}
            className="text-sm rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'white' }}
          >
            {ESTADOS.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>

        {(usuario?.rol === 'admin' || usuario?.rol === 'digitador') && (
          <button
            onClick={() => navigate('/registro/nuevo')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            <Plus size={15} /> Nueva Semana
          </button>
        )}
      </div>

      {/* Error de acción */}
      {actionError && (
        <div
          className="text-sm rounded-lg px-4 py-3"
          style={{ backgroundColor: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' }}
        >
          {actionError}
          <button onClick={() => setActionError('')} className="ml-3 underline">Cerrar</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {/* Error de carga */}
      {error && !loading && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--red)' }}>{error}</p>
      )}

      {/* Empty state */}
      {!loading && !error && semanas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay semanas registradas.</p>
        </div>
      )}

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {semanas.map(semana => (
          <SemanaCard
            key={semana.id}
            semana={semana}
            onEnviar={handleEnviar}
            onAprobar={handleAprobar}
            onRechazar={id => { setRechazandoId(id); setMotivoRechazo(''); }}
            onEliminar={handleEliminar}
          />
        ))}
      </div>

      {/* Modal Rechazo */}
      {rechazandoId && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            style={{ border: '1px solid var(--border)' }}
          >
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Motivo de rechazo
            </h3>
            <textarea
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              rows={4}
              placeholder="Describe el motivo por el que se devuelve esta semana..."
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setRechazandoId(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--muted)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={!motivoRechazo.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--red)' }}
              >
                Rechazar semana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1 && echo "TS OK"
```
Esperado: `TS OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/pages/Semanas.tsx
git commit -m "feat: implement Semanas page with filters and approval flow"
git push origin main
```

---

## Task 8: Página SemanaDetalle

**Files:**
- Modify: `src/pages/SemanaDetalle.tsx`

- [ ] **Step 1: Reemplazar `src/pages/SemanaDetalle.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EstadoBadge from '../components/semanas/EstadoBadge';
import type { Semana, RegistroDiario, Corredor } from '../types';
import { calcTotalesCorredor } from '../lib/formulas';
import { generarDiasSemana, formatFecha } from '../lib/dateUtils';

interface SemanaDetalle extends Semana {
  registros: RegistroDiario[];
  corredores: Corredor[];
}

export default function SemanaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SemanaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('semanas').select('*').eq('id', id).single(),
      supabase.from('registros_diarios').select('*').eq('semana_id', id).order('fecha'),
      supabase.from('corredores').select('*').eq('activo', true).order('orden'),
    ]).then(([semRes, regRes, corrRes]) => {
      setLoading(false);
      if (semRes.error) { setError(semRes.error.message); return; }
      setData({
        ...(semRes.data as Semana),
        registros: (regRes.data || []) as RegistroDiario[],
        corredores: (corrRes.data || []) as Corredor[],
      });
    });
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (error || !data) return (
    <p className="text-sm text-center py-8" style={{ color: 'var(--red)' }}>
      {error || 'Semana no encontrada'}
    </p>
  );

  const dias = generarDiasSemana(data.fecha_inicio);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/semanas')}
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={15} /> Volver
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>
            Semana {data.numero_semana} — Período {data.periodo}
          </h2>
          <EstadoBadge estado={data.estado} />
        </div>
      </div>

      {/* Tablas por corredor */}
      {data.corredores.map(corredor => {
        const regs = data.registros.filter(r => r.corredor_id === corredor.id);
        const totales = calcTotalesCorredor(regs);

        const regPorDia = dias.reduce<Record<string, RegistroDiario | undefined>>((acc, dia) => {
          acc[dia] = regs.find(r => r.fecha === dia);
          return acc;
        }, {});

        return (
          <div key={corredor.id} className="bg-white rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--navy)' }}>
              <h3 className="text-sm font-semibold text-white">
                Corredor {corredor.codigo} — {corredor.nombre}
              </h3>
            </div>

            {/* Sección I */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: 'var(--light)' }}>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--muted)' }}>Fecha</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>Kms Prog.</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>Kms Ejec.</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>Kms Efect.</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>Pasajeros</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>IC</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>ICS</th>
                  </tr>
                </thead>
                <tbody>
                  {dias.map(dia => {
                    const reg = regPorDia[dia];
                    const empty = !reg?.tiene_datos;
                    return (
                      <tr key={dia} style={{ backgroundColor: empty ? '#f8f9fa' : 'white', borderTop: '1px solid var(--border)' }}>
                        <td className="px-3 py-2" style={{ color: empty ? 'var(--muted)' : 'var(--text)' }}>
                          {formatFecha(dia)}
                        </td>
                        <td className="px-3 py-2 text-right">{reg?.kms_programados ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.kms_ejecutados ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.kms_efectivos ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.total_pasajeros?.toLocaleString('es-DO') ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.ic ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.ics ?? '—'}</td>
                      </tr>
                    );
                  })}
                  {/* Fila de totales */}
                  <tr style={{ backgroundColor: 'var(--navy)', color: 'white', fontWeight: 600 }}>
                    <td className="px-3 py-2">TOTAL SEMANA</td>
                    <td className="px-3 py-2 text-right">{totales.kms_programados.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{totales.kms_ejecutados.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{totales.kms_efectivos.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{totales.total_pasajeros.toLocaleString('es-DO')}</td>
                    <td className="px-3 py-2 text-right">{totales.ic_prom.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{totales.ics_prom.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1 && echo "TS OK"
```
Esperado: `TS OK`

- [ ] **Step 3: Verificar build completo**

```bash
cd /Users/torres/proyectos/SIGO && npm run build 2>&1 | tail -4
```
Esperado: `✓ built in Xs`

- [ ] **Step 4: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/pages/SemanaDetalle.tsx
git commit -m "feat: implement SemanaDetalle with full data table"
git push origin main
```

---

## Self-Review

**Spec coverage vs PRD:**
- [x] Dashboard KPI cards: totalSemanas, semanasValidadas, totalPasajeros, kmsEfectivos, ICS promedio con color → Task 3, 5
- [x] Gráfica ICS por semana (LineChart por corredor) → Task 4
- [x] Gráfica Pasajeros por semana (BarChart) → Task 4
- [x] Actualización en tiempo real con Supabase Realtime → Task 1 (useDashboard)
- [x] Lista de semanas con badge de estado → Task 6, 7
- [x] Filtro por estado → Task 7
- [x] Botón Nueva Semana para digitador/admin → Task 7
- [x] Acciones por rol y estado (editar, enviar, aprobar, rechazar, eliminar) → Task 6
- [x] Modal de rechazo con motivo obligatorio → Task 7
- [x] Comentario de rechazo visible en la card → Task 6
- [x] Vista detalle con tabla Sección I + totales → Task 8
- [x] Fila TOTAL SEMANA con fondo navy → Task 8
- [x] Filas vacías con fondo gris → Task 8
