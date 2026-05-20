# Fase 2: Dashboard Filters + Reportes Avanzados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar el sistema con filtros en el Dashboard y los 3 reportes avanzados: Resumen Mensual, Comparativo de Corredores, y Tendencia de Indicadores.

**Architecture:** Cada reporte tiene su propio hook de datos, componente visual y función de exportación. El Dashboard existente se extiende (no se reescribe) para agregar 2 gráficas faltantes y filtros de corredor/período. Los reportes avanzados se activan en `Reportes.tsx` reemplazando los placeholders "Disponible en Fase 2".

**Tech Stack:** React 18 + TypeScript, Recharts (charts), @react-pdf/renderer (PDF Reporte 2), xlsx/SheetJS (Excel exportes), Supabase JS v2, Tailwind CSS.

---

## Mapa de archivos

| Archivo | Acción | Propósito |
|---------|--------|-----------|
| `src/hooks/useDashboard.ts` | Modificar | Agregar kmsChart, serviciosChart, corredoresOpciones y filtros |
| `src/components/dashboard/Charts.tsx` | Modificar | Agregar 2 BarCharts (Kms y Servicios) |
| `src/pages/Dashboard.tsx` | Modificar | Agregar UI de filtros |
| `src/hooks/useResumenMensual.ts` | Crear | Datos del Resumen Mensual |
| `src/components/reportes/ResumenMensualPDF.tsx` | Crear | PDF del Resumen Mensual |
| `src/hooks/useComparativoCorredores.ts` | Crear | Datos del Comparativo |
| `src/components/reportes/ComparativoChart.tsx` | Crear | BarChart de ICS por corredor |
| `src/hooks/useTendenciaIndicadores.ts` | Crear | Datos de Tendencia |
| `src/components/reportes/TendenciaChart.tsx` | Crear | LineChart de indicadores |
| `src/lib/exportExcel.ts` | Modificar | Agregar 3 funciones de export |
| `src/pages/Reportes.tsx` | Modificar | Activar Reportes 2, 3 y 4 |

---

## Task 1: Dashboard — Filtros + 2 Charts faltantes

**Files:**
- Modify: `src/hooks/useDashboard.ts`
- Modify: `src/components/dashboard/Charts.tsx`
- Modify: `src/pages/Dashboard.tsx`

### Contexto
El PRD (sección 6.3) requiere 4 gráficas en el Dashboard: ICS y Pasajeros (ya implementadas), y "Kms Programados vs Ejecutados" y "Servicios Programados vs Ejecutados" (faltan). También requiere filtros por corredor y rango de períodos.

El hook `useDashboard` en `src/hooks/useDashboard.ts` exporta `DashboardData` con `icsChart`, `pasajerosChart` y `corredores: string[]`. Hay que agregar `kmsChart`, `serviciosChart` y `corredoresOpciones: { id: string; nombre: string }[]`.

- [ ] **Step 1: Actualizar `useDashboard.ts`**

Reemplaza el archivo completo con:

```typescript
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RegistroDiario } from '../types';

export interface KpiData {
  totalSemanas: number;
  semanasValidadas: number;
  totalPasajeros: number;
  kmsEfectivos: number;
  icsPromedio: number | null;
}

export interface ChartPoint {
  semana: string;
  [key: string]: number | string;
}

export interface CorredorOpcion {
  id: string;
  nombre: string;
  codigo: string;
}

export interface DashboardData {
  kpis: KpiData;
  icsChart: ChartPoint[];
  pasajerosChart: ChartPoint[];
  kmsChart: ChartPoint[];
  serviciosChart: ChartPoint[];
  corredores: string[];
  corredoresOpciones: CorredorOpcion[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface DashboardFilters {
  corredorId?: string;
  periodoDesde?: number;
  periodoHasta?: number;
}

async function fetchDashboardData(
  filters: DashboardFilters
): Promise<Omit<DashboardData, 'loading' | 'error' | 'refetch'>> {
  let semanasQuery = supabase
    .from('semanas')
    .select('id, numero_semana, periodo, estado')
    .in('estado', ['validado', 'publicado'])
    .order('periodo', { ascending: true })
    .order('numero_semana', { ascending: true });

  if (filters.periodoDesde != null) {
    semanasQuery = semanasQuery.gte('periodo', filters.periodoDesde);
  }
  if (filters.periodoHasta != null) {
    semanasQuery = semanasQuery.lte('periodo', filters.periodoHasta);
  }

  const { data: semanas, error: semError } = await semanasQuery;
  if (semError) throw semError;

  const { data: allSemanas, error: allError } = await supabase
    .from('semanas')
    .select('id, estado');
  if (allError) throw allError;

  const { data: corredoresData, error: corrError } = await supabase
    .from('corredores')
    .select('id, nombre, codigo')
    .eq('activo', true)
    .order('orden');
  if (corrError) throw corrError;

  const corredoresList = (corredoresData || []) as CorredorOpcion[];

  const semanaIds = (semanas || []).map(s => s.id);
  let registros: RegistroDiario[] = [];

  if (semanaIds.length > 0) {
    let regQuery = supabase
      .from('registros_diarios')
      .select('semana_id, corredor_id, ics, total_pasajeros, kms_efectivos, kms_programados, kms_ejecutados, servicios_programados, servicios_ejecutados, tiene_datos')
      .in('semana_id', semanaIds)
      .eq('tiene_datos', true);

    if (filters.corredorId) {
      regQuery = regQuery.eq('corredor_id', filters.corredorId);
    }

    const { data, error: regError } = await regQuery;
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

  // Corredores a mostrar en charts
  const corredoresToShow = filters.corredorId
    ? corredoresList.filter(c => c.id === filters.corredorId)
    : corredoresList;

  const icsChart: ChartPoint[] = [];
  const pasajerosChart: ChartPoint[] = [];
  const kmsChart: ChartPoint[] = [];
  const serviciosChart: ChartPoint[] = [];

  for (const semana of semanas || []) {
    const semRegs = registros.filter(r => r.semana_id === semana.id);
    const label = `S${semana.numero_semana}`;

    const icsPoint: ChartPoint = { semana: label };
    const pasajerosPoint: ChartPoint = { semana: label };
    const kmsPoint: ChartPoint = { semana: label, 'Prog.': 0, 'Ejec.': 0 };
    const serviciosPoint: ChartPoint = { semana: label, 'Prog.': 0, 'Ejec.': 0 };

    for (const corredor of corredoresToShow) {
      const corrRegs = semRegs.filter(r => r.corredor_id === corredor.id);
      const icsVals = corrRegs.map(r => r.ics).filter((v): v is number => v != null);
      icsPoint[corredor.nombre] = icsVals.length
        ? parseFloat((icsVals.reduce((a, v) => a + v, 0) / icsVals.length).toFixed(2))
        : 0;
      pasajerosPoint[corredor.nombre] = corrRegs.reduce(
        (a, r) => a + (r.total_pasajeros || 0), 0
      );
    }

    // Kms y servicios: totales sobre todos los registros de la semana filtrados
    kmsPoint['Prog.'] = parseFloat(
      semRegs.reduce((a, r) => a + (Number(r.kms_programados) || 0), 0).toFixed(2)
    );
    kmsPoint['Ejec.'] = parseFloat(
      semRegs.reduce((a, r) => a + (Number(r.kms_ejecutados) || 0), 0).toFixed(2)
    );
    serviciosPoint['Prog.'] = semRegs.reduce((a, r) => a + (r.servicios_programados || 0), 0);
    serviciosPoint['Ejec.'] = semRegs.reduce((a, r) => a + (r.servicios_ejecutados || 0), 0);

    icsChart.push(icsPoint);
    pasajerosChart.push(pasajerosPoint);
    kmsChart.push(kmsPoint);
    serviciosChart.push(serviciosPoint);
  }

  return {
    kpis: { totalSemanas, semanasValidadas, totalPasajeros, kmsEfectivos, icsPromedio },
    icsChart,
    pasajerosChart,
    kmsChart,
    serviciosChart,
    corredores: corredoresToShow.map(c => c.nombre),
    corredoresOpciones: corredoresList,
  };
}

export function useDashboard(filters: DashboardFilters = {}): DashboardData {
  const [state, setState] = useState<Omit<DashboardData, 'refetch'>>({
    kpis: { totalSemanas: 0, semanasValidadas: 0, totalPasajeros: 0, kmsEfectivos: 0, icsPromedio: null },
    icsChart: [],
    pasajerosChart: [],
    kmsChart: [],
    serviciosChart: [],
    corredores: [],
    corredoresOpciones: [],
    loading: true,
    error: null,
  });

  const refetch = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    fetchDashboardData(filters)
      .then(data => setState(prev => ({ ...prev, ...data, loading: false })))
      .catch(err => setState(prev => ({ ...prev, loading: false, error: err.message })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.corredorId, filters.periodoDesde, filters.periodoHasta]);

  useEffect(() => {
    refetch();

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

- [ ] **Step 2: Actualizar `Charts.tsx`**

Reemplaza el archivo completo con:

```typescript
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
  kmsChart: ChartPoint[];
  serviciosChart: ChartPoint[];
  corredores: string[];
}

function numFmt(v: number | string | readonly (string | number)[] | undefined): [string, string] {
  if (v == null) return ['0', ''];
  const n = Array.isArray(v) ? v[0] : v;
  return [Number(n).toLocaleString('es-DO'), ''];
}

export default function Charts({ icsChart, pasajerosChart, kmsChart, serviciosChart, corredores }: Props) {
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
      <div className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          ICS por Semana
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={icsChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={(v) => { const val = Array.isArray(v) ? v[0] : v; return [`${Number(val)}%`, '']; }} />
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
      <div className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Pasajeros por Semana
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={pasajerosChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={numFmt} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {corredores.map((corredor, i) => (
              <Bar key={corredor} dataKey={corredor} fill={CORREDOR_COLORS[i % CORREDOR_COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kms Programados vs Ejecutados */}
      <div className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Kms Programados vs Ejecutados
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={kmsChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={numFmt} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Prog." fill="#1a3a5c" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Ejec." fill="#e8541a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Servicios Programados vs Ejecutados */}
      <div className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Servicios Programados vs Ejecutados
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={serviciosChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={numFmt} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Prog." fill="#1a3a5c" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Ejec." fill="#27ae60" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Actualizar `Dashboard.tsx`**

Reemplaza el archivo completo con:

```typescript
import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import KpiCards from '../components/dashboard/KpiCards';
import Charts from '../components/dashboard/Charts';
import type { DashboardFilters } from '../hooks/useDashboard';

export default function Dashboard() {
  const [corredorId, setCorredorId] = useState('');
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  const [applied, setApplied] = useState<DashboardFilters>({});

  const { kpis, icsChart, pasajerosChart, kmsChart, serviciosChart, corredores, corredoresOpciones, loading, error, refetch } = useDashboard(applied);

  function aplicarFiltros() {
    setApplied({
      corredorId: corredorId || undefined,
      periodoDesde: periodoDesde ? parseInt(periodoDesde) : undefined,
      periodoHasta: periodoHasta ? parseInt(periodoHasta) : undefined,
    });
  }

  function limpiarFiltros() {
    setCorredorId('');
    setPeriodoDesde('');
    setPeriodoHasta('');
    setApplied({});
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 flex flex-wrap items-end gap-3" style={{ border: '1px solid var(--border)' }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Corredor</label>
          <select
            value={corredorId}
            onChange={e => setCorredorId(e.target.value)}
            className="text-sm rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--text)', minWidth: 180 }}
          >
            <option value="">Todos los corredores</option>
            {corredoresOpciones.map(c => (
              <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Período desde</label>
          <input
            type="number"
            value={periodoDesde}
            onChange={e => setPeriodoDesde(e.target.value)}
            placeholder="Ej: 2026"
            className="text-sm rounded-lg px-3 py-2 outline-none w-28"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Período hasta</label>
          <input
            type="number"
            value={periodoHasta}
            onChange={e => setPeriodoHasta(e.target.value)}
            placeholder="Ej: 2026"
            className="text-sm rounded-lg px-3 py-2 outline-none w-28"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <button
          onClick={aplicarFiltros}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--navy)' }}
        >
          Aplicar filtros
        </button>
        {(applied.corredorId || applied.periodoDesde || applied.periodoHasta) && (
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--muted)' }}
          >
            Limpiar
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>
            Error cargando datos: {error}
          </p>
          <button onClick={refetch} className="mt-3 text-sm underline" style={{ color: 'var(--navy)' }}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <KpiCards kpis={kpis} />
          <Charts
            icsChart={icsChart}
            pasajerosChart={pasajerosChart}
            kmsChart={kmsChart}
            serviciosChart={serviciosChart}
            corredores={corredores}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Expected: `✓ built in X.XXs` sin errores TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDashboard.ts src/components/dashboard/Charts.tsx src/pages/Dashboard.tsx
git commit -m "feat(dashboard): filtros por corredor/período y 4 gráficas completas"
```

---

## Task 2: Reporte 2 — Resumen Mensual

**Files:**
- Create: `src/hooks/useResumenMensual.ts`
- Create: `src/components/reportes/ResumenMensualPDF.tsx`
- Modify: `src/lib/exportExcel.ts`
- Modify: `src/pages/Reportes.tsx`

### Contexto

El Reporte 2 muestra una tabla consolidada de una semanas de un período dado. El usuario selecciona un período (número entero). Se buscan todas las semanas validadas/publicadas de ese período, se traen sus registros, y se calcula totales por corredor usando `calcTotalesCorredor` de `src/lib/formulas.ts`.

Tipos relevantes (de `src/types/index.ts`):
- `Corredor`: `{ id, codigo, nombre, activo, orden, notas?, costo_por_km?, created_at }`
- `RegistroDiario`: todos los campos numéricos opcionales + `tiene_datos: boolean`
- `TotalesCorredor`: `{ kms_programados, kms_ejecutados, kms_efectivos, total_pasajeros, servicios_programados, servicios_ejecutados, servicios_puntuales, ica_prom, ick_prom, icd_prom, ic_prom, ip_prom, ie_prom, ics_prom }`

- [ ] **Step 1: Crear `useResumenMensual.ts`**

```typescript
// src/hooks/useResumenMensual.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calcTotalesCorredor } from '../lib/formulas';
import type { Corredor, RegistroDiario, TotalesCorredor } from '../types';

export interface FilaResumen {
  corredor: Corredor;
  totales: TotalesCorredor;
  numSemanas: number;
}

export interface ResumenMensualData {
  filas: FilaResumen[];
  periodo: number | null;
  loading: boolean;
  error: string | null;
}

export function useResumenMensual(periodo: number | null): ResumenMensualData {
  const [state, setState] = useState<Omit<ResumenMensualData, 'periodo'>>({
    filas: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (periodo == null) {
      setState({ filas: [], loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    async function load() {
      const { data: semanas, error: semError } = await supabase
        .from('semanas')
        .select('id')
        .in('estado', ['validado', 'publicado'])
        .eq('periodo', periodo);

      if (semError) throw semError;

      const semanaIds = (semanas || []).map(s => s.id);

      const { data: corredoresData, error: corrError } = await supabase
        .from('corredores')
        .select('*')
        .eq('activo', true)
        .order('orden');
      if (corrError) throw corrError;

      const corredores = (corredoresData || []) as Corredor[];

      let registros: RegistroDiario[] = [];
      if (semanaIds.length > 0) {
        const { data, error: regError } = await supabase
          .from('registros_diarios')
          .select('*')
          .in('semana_id', semanaIds);
        if (regError) throw regError;
        registros = (data || []) as RegistroDiario[];
      }

      const filas: FilaResumen[] = corredores.map(corredor => {
        const regs = registros.filter(r => r.corredor_id === corredor.id);
        return {
          corredor,
          totales: calcTotalesCorredor(regs),
          numSemanas: semanaIds.length,
        };
      });

      setState({ filas, loading: false, error: null });
    }

    load().catch(err =>
      setState(prev => ({ ...prev, loading: false, error: err.message }))
    );
  }, [periodo]);

  return { ...state, periodo };
}
```

- [ ] **Step 2: Crear `ResumenMensualPDF.tsx`**

```typescript
// src/components/reportes/ResumenMensualPDF.tsx
import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { getICSColor } from '../../lib/formulas';
import type { FilaResumen } from '../../hooks/useResumenMensual';

Font.register({
  family: 'Helvetica',
  fonts: [{ src: 'Helvetica' }, { src: 'Helvetica-Bold', fontWeight: 'bold' }],
});

const NAVY = '#1a3a5c';
const WHITE = '#ffffff';
const GRAY = '#f5f5f5';
const BLACK = '#000000';

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: 24, color: BLACK },
  header: { backgroundColor: NAVY, padding: 10, marginBottom: 10 },
  headerTitle: { color: WHITE, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  headerSub: { color: WHITE, fontSize: 9, textAlign: 'center', marginTop: 2 },
  table: { border: '1 solid #cccccc', marginTop: 8 },
  row: { flexDirection: 'row' },
  totalRow: { flexDirection: 'row', backgroundColor: GRAY, fontWeight: 'bold' },
  th: {
    backgroundColor: NAVY, color: WHITE,
    paddingTop: 3, paddingBottom: 3, paddingLeft: 4, paddingRight: 4,
    fontWeight: 'bold', textAlign: 'center', fontSize: 7, flex: 1,
    borderRight: '0.5 solid #ffffff',
  },
  thWide: {
    backgroundColor: NAVY, color: WHITE,
    paddingTop: 3, paddingBottom: 3, paddingLeft: 4, paddingRight: 4,
    fontWeight: 'bold', fontSize: 7, flex: 2,
    borderRight: '0.5 solid #ffffff',
  },
  td: {
    paddingTop: 2, paddingBottom: 2, paddingLeft: 4, paddingRight: 4,
    textAlign: 'center', fontSize: 7, flex: 1,
    borderRight: '0.5 solid #cccccc', borderBottom: '0.5 solid #cccccc',
  },
  tdWide: {
    paddingTop: 2, paddingBottom: 2, paddingLeft: 4, paddingRight: 4,
    fontSize: 7, flex: 2,
    borderRight: '0.5 solid #cccccc', borderBottom: '0.5 solid #cccccc',
  },
});

function n2(v: number): string { return v.toFixed(2); }
function n0(v: number): string { return Math.round(v).toLocaleString('es-DO'); }

interface Props {
  periodo: number;
  filas: FilaResumen[];
}

export function ResumenMensualPDF({ periodo, filas }: Props) {
  const ICS_HEADERS = ['IcA', 'IcK', 'IcD', 'IC', 'IP', 'IE', 'ICS'];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>RESUMEN MENSUAL DE OPERACIÓN</Text>
          <Text style={s.headerSub}>Período {periodo} — INTRANT · Dirección de Movilidad Sostenible</Text>
        </View>

        {/* Sección I */}
        <Text style={{ fontWeight: 'bold', fontSize: 9, marginBottom: 4 }}>
          SECCIÓN I — KILÓMETROS Y SERVICIOS
        </Text>
        <View style={s.table}>
          <View style={s.row}>
            <Text style={s.thWide}>Corredor</Text>
            {['Kms Prog.','Kms Ejec.','Kms Efect.','Pasajeros','S. Prog.','S. Ejec.','S. Punt.'].map(h => (
              <Text key={h} style={s.th}>{h}</Text>
            ))}
          </View>
          {filas.map(({ corredor, totales }) => (
            <View key={corredor.id} style={s.row}>
              <Text style={s.tdWide}>{corredor.codigo} — {corredor.nombre}</Text>
              <Text style={s.td}>{n0(totales.kms_programados)}</Text>
              <Text style={s.td}>{n0(totales.kms_ejecutados)}</Text>
              <Text style={s.td}>{n0(totales.kms_efectivos)}</Text>
              <Text style={s.td}>{n0(totales.total_pasajeros)}</Text>
              <Text style={s.td}>{n0(totales.servicios_programados)}</Text>
              <Text style={s.td}>{n0(totales.servicios_ejecutados)}</Text>
              <Text style={s.td}>{n0(totales.servicios_puntuales)}</Text>
            </View>
          ))}
        </View>

        {/* Sección II */}
        <Text style={{ fontWeight: 'bold', fontSize: 9, marginTop: 12, marginBottom: 4 }}>
          SECCIÓN II — INDICADORES (PROMEDIO)
        </Text>
        <View style={s.table}>
          <View style={s.row}>
            <Text style={s.thWide}>Corredor</Text>
            {ICS_HEADERS.map(h => <Text key={h} style={s.th}>{h}</Text>)}
          </View>
          {filas.map(({ corredor, totales }) => (
            <View key={corredor.id} style={s.row}>
              <Text style={s.tdWide}>{corredor.codigo} — {corredor.nombre}</Text>
              <Text style={s.td}>{n2(totales.ica_prom)}</Text>
              <Text style={s.td}>{n2(totales.ick_prom)}</Text>
              <Text style={s.td}>{n2(totales.icd_prom)}</Text>
              <Text style={s.td}>{n2(totales.ic_prom)}</Text>
              <Text style={s.td}>{n2(totales.ip_prom)}</Text>
              <Text style={s.td}>{n2(totales.ie_prom)}</Text>
              <Text style={{ ...s.td, color: getICSColor(totales.ics_prom) }}>{n2(totales.ics_prom)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: Agregar `exportResumenMensualExcel` a `exportExcel.ts`**

Abre `src/lib/exportExcel.ts` y AGREGA al final del archivo (después de la función `exportSemanaExcel`):

```typescript
export function exportResumenMensualExcel(
  periodo: number,
  filas: import('../hooks/useResumenMensual').FilaResumen[]
): void {
  const wb = XLSX.utils.book_new();

  // Hoja Sección I
  const s1Rows: unknown[][] = [
    [`Resumen Mensual — Período ${periodo}`],
    [],
    ['Corredor', 'Kms Prog.', 'Kms Ejec.', 'Kms Efect.', 'Pasajeros', 'S. Prog.', 'S. Ejec.', 'S. Punt.'],
    ...filas.map(({ corredor, totales }) => [
      `${corredor.codigo} — ${corredor.nombre}`,
      totales.kms_programados,
      totales.kms_ejecutados,
      totales.kms_efectivos,
      totales.total_pasajeros,
      totales.servicios_programados,
      totales.servicios_ejecutados,
      totales.servicios_puntuales,
    ]),
  ];

  // Hoja Sección II
  const s2Rows: unknown[][] = [
    [`Resumen Mensual — Período ${periodo} — Indicadores`],
    [],
    ['Corredor', 'IcA', 'IcK', 'IcD', 'IC', 'IP', 'IE', 'ICS'],
    ...filas.map(({ corredor, totales }) => [
      `${corredor.codigo} — ${corredor.nombre}`,
      totales.ica_prom,
      totales.ick_prom,
      totales.icd_prom,
      totales.ic_prom,
      totales.ip_prom,
      totales.ie_prom,
      totales.ics_prom,
    ]),
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1Rows), 'Sec I - Kms');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2Rows), 'Sec II - Indicadores');

  XLSX.writeFile(wb, `SIGO_ResumenMensual_P${periodo}.xlsx`);
}
```

- [ ] **Step 4: Activar Reporte 2 en `Reportes.tsx`**

Abre `src/pages/Reportes.tsx`. El archivo actual tiene el bloque de Resumen Mensual:

```tsx
      <div className="bg-white rounded-lg border p-6 max-w-2xl opacity-50">
        <h2 className="text-base font-semibold text-navy mb-1">Resumen Mensual</h2>
        <p className="text-sm text-gray-500">Disponible en Fase 2.</p>
      </div>
```

Reemplaza ese bloque con el Reporte 2 activo. El archivo modificado completo queda:

```typescript
import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../lib/supabase';
import { exportSemanaExcel, exportResumenMensualExcel } from '../lib/exportExcel';
import { InformePDF } from '../components/reportes/InformePDF';
import { ResumenMensualPDF } from '../components/reportes/ResumenMensualPDF';
import { Button } from '../components/ui/button';
import { useResumenMensual } from '../hooks/useResumenMensual';
import type { Corredor, RegistroDiario, Semana } from '../types';

export default function Reportes() {
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [corredores, setCorredores] = useState<Corredor[]>([]);
  const [semanaId, setSemanaId] = useState<string>('');
  const [registros, setRegistros] = useState<RegistroDiario[]>([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reporte 2 state
  const [periodoResumen, setPeriodoResumen] = useState('');
  const [periodoResumenApplied, setPeriodoResumenApplied] = useState<number | null>(null);
  const [generandoResumen, setGenerandoResumen] = useState(false);
  const resumen = useResumenMensual(periodoResumenApplied);

  useEffect(() => {
    async function load() {
      const [semanasQuery, corredoresQuery] = await Promise.all([
        supabase
          .from('semanas')
          .select('*')
          .in('estado', ['validado', 'publicado'])
          .order('periodo', { ascending: false })
          .order('numero_semana', { ascending: false }),
        supabase
          .from('corredores')
          .select('*')
          .eq('activo', true)
          .order('orden'),
      ]);

      if (semanasQuery.error) setError(semanasQuery.error.message);
      else setSemanas((semanasQuery.data ?? []) as Semana[]);

      if (corredoresQuery.error) setError(corredoresQuery.error.message);
      else setCorredores((corredoresQuery.data ?? []) as Corredor[]);
    }
    void load();
  }, []);

  useEffect(() => {
    if (!semanaId) { setRegistros([]); return; }
    setLoading(true);
    supabase
      .from('registros_diarios')
      .select('*')
      .eq('semana_id', semanaId)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRegistros((data ?? []) as RegistroDiario[]);
        setLoading(false);
      });
  }, [semanaId]);

  const semanaSeleccionada = semanas.find((s) => s.id === semanaId) ?? null;

  async function descargarPDF() {
    if (!semanaSeleccionada) return;
    setGenerando(true);
    try {
      const blob = await pdf(
        <InformePDF semana={semanaSeleccionada} corredores={corredores} registros={registros} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIGO_Semana${semanaSeleccionada.numero_semana}_P${semanaSeleccionada.periodo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar PDF');
    } finally {
      setGenerando(false);
    }
  }

  function descargarExcel() {
    if (!semanaSeleccionada) return;
    exportSemanaExcel(semanaSeleccionada, corredores, registros);
  }

  async function descargarResumenPDF() {
    if (!periodoResumenApplied || resumen.filas.length === 0) return;
    setGenerandoResumen(true);
    try {
      const blob = await pdf(
        <ResumenMensualPDF periodo={periodoResumenApplied} filas={resumen.filas} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIGO_ResumenMensual_P${periodoResumenApplied}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar PDF');
    } finally {
      setGenerandoResumen(false);
    }
  }

  function descargarResumenExcel() {
    if (!periodoResumenApplied || resumen.filas.length === 0) return;
    exportResumenMensualExcel(periodoResumenApplied, resumen.filas);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-navy">Reportes</h1>

      {/* Reporte 1 */}
      <div className="bg-white rounded-lg border p-6 max-w-2xl">
        <h2 className="text-base font-semibold text-navy mb-1">Informe Semanal Oficial</h2>
        <p className="text-sm text-gray-500 mb-4">
          Formato oficial INTRANT / SITPSD con Sección I y Sección II por corredor.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar semana</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              value={semanaId}
              onChange={(e) => setSemanaId(e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {semanas.map((s) => (
                <option key={s.id} value={s.id}>
                  Semana {s.numero_semana} / {s.periodo} ({s.fecha_inicio} → {s.fecha_fin})
                </option>
              ))}
            </select>
          </div>
          {semanaSeleccionada && (
            <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
              <p>
                <span className="font-medium">Estado:</span>{' '}
                <span className={`capitalize font-medium ${semanaSeleccionada.estado === 'validado' ? 'text-green-600' : 'text-blue-600'}`}>
                  {semanaSeleccionada.estado}
                </span>
              </p>
              {semanaSeleccionada.validado_por && (
                <p><span className="font-medium">Validado por:</span> {semanaSeleccionada.validado_por}</p>
              )}
              {loading && (
                <p className="flex items-center gap-1 text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Cargando registros...
                </p>
              )}
              {!loading && registros.length > 0 && (
                <p><span className="font-medium">Registros:</span> {registros.length} días</p>
              )}
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3">
            <Button
              onClick={descargarPDF}
              disabled={!semanaSeleccionada || loading || generando}
              className="bg-navy text-white hover:bg-navy-dark flex items-center gap-2"
            >
              {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Descargar PDF
            </Button>
            <Button
              onClick={descargarExcel}
              disabled={!semanaSeleccionada || loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Descargar Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Reporte 2: Resumen Mensual */}
      <div className="bg-white rounded-lg border p-6 max-w-2xl">
        <h2 className="text-base font-semibold text-navy mb-1">Resumen Mensual</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tabla consolidada de todas las semanas de un período. Exporta PDF y Excel.
        </p>
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <input
                type="number"
                value={periodoResumen}
                onChange={e => setPeriodoResumen(e.target.value)}
                placeholder="Ej: 2026"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <Button
              onClick={() => setPeriodoResumenApplied(periodoResumen ? parseInt(periodoResumen) : null)}
              disabled={!periodoResumen}
              className="bg-navy text-white hover:bg-navy-dark"
            >
              Buscar
            </Button>
          </div>

          {resumen.loading && (
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
            </p>
          )}

          {resumen.error && <p className="text-red-500 text-sm">{resumen.error}</p>}

          {!resumen.loading && periodoResumenApplied && resumen.filas.length === 0 && (
            <p className="text-sm text-gray-500">No hay semanas validadas para el período {periodoResumenApplied}.</p>
          )}

          {resumen.filas.length > 0 && (
            <div className="flex gap-3">
              <Button
                onClick={descargarResumenPDF}
                disabled={generandoResumen}
                className="bg-navy text-white hover:bg-navy-dark flex items-center gap-2"
              >
                {generandoResumen ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Descargar PDF
              </Button>
              <Button
                onClick={descargarResumenExcel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Excel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reporte 3: Comparativo — Task 3 */}
      <div className="bg-white rounded-lg border p-6 max-w-2xl opacity-50">
        <h2 className="text-base font-semibold text-navy mb-1">Comparativo de Corredores</h2>
        <p className="text-sm text-gray-500">Disponible en Task 3.</p>
      </div>

      {/* Reporte 4: Tendencia — Task 4 */}
      <div className="bg-white rounded-lg border p-6 max-w-2xl opacity-50">
        <h2 className="text-base font-semibold text-navy mb-1">Tendencia de Indicadores</h2>
        <p className="text-sm text-gray-500">Disponible en Task 4.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Expected: `✓ built in X.XXs` sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useResumenMensual.ts src/components/reportes/ResumenMensualPDF.tsx src/lib/exportExcel.ts src/pages/Reportes.tsx
git commit -m "feat(reportes): Reporte 2 — Resumen Mensual con PDF y Excel"
```

---

## Task 3: Reporte 3 — Comparativo de Corredores

**Files:**
- Create: `src/hooks/useComparativoCorredores.ts`
- Create: `src/components/reportes/ComparativoChart.tsx`
- Modify: `src/lib/exportExcel.ts`
- Modify: `src/pages/Reportes.tsx`

### Contexto

El Reporte 3 compara los indicadores promedio de cada corredor en un rango de semanas. El usuario selecciona período + semana_desde + semana_hasta. Se buscan todas las semanas validadas/publicadas en ese rango y se calculan promedios de indicadores por corredor. Se muestra una tabla y un BarChart de ICS.

- [ ] **Step 1: Crear `useComparativoCorredores.ts`**

```typescript
// src/hooks/useComparativoCorredores.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calcTotalesCorredor } from '../lib/formulas';
import type { Corredor, RegistroDiario, TotalesCorredor } from '../types';

export interface FilaComparativo {
  corredor: Corredor;
  totales: TotalesCorredor;
}

export interface ComparativoFilters {
  periodo: number | null;
  semanaDesde: number | null;
  semanaHasta: number | null;
}

export interface ComparativoData {
  filas: FilaComparativo[];
  loading: boolean;
  error: string | null;
}

export function useComparativoCorredores(filters: ComparativoFilters): ComparativoData {
  const [state, setState] = useState<ComparativoData>({
    filas: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (filters.periodo == null || filters.semanaDesde == null || filters.semanaHasta == null) {
      setState({ filas: [], loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    async function load() {
      const { data: semanas, error: semError } = await supabase
        .from('semanas')
        .select('id')
        .in('estado', ['validado', 'publicado'])
        .eq('periodo', filters.periodo!)
        .gte('numero_semana', filters.semanaDesde!)
        .lte('numero_semana', filters.semanaHasta!);

      if (semError) throw semError;

      const semanaIds = (semanas || []).map(s => s.id);

      const { data: corredoresData, error: corrError } = await supabase
        .from('corredores')
        .select('*')
        .eq('activo', true)
        .order('orden');
      if (corrError) throw corrError;

      const corredores = (corredoresData || []) as Corredor[];

      let registros: RegistroDiario[] = [];
      if (semanaIds.length > 0) {
        const { data, error: regError } = await supabase
          .from('registros_diarios')
          .select('*')
          .in('semana_id', semanaIds);
        if (regError) throw regError;
        registros = (data || []) as RegistroDiario[];
      }

      const filas: FilaComparativo[] = corredores.map(corredor => ({
        corredor,
        totales: calcTotalesCorredor(registros.filter(r => r.corredor_id === corredor.id)),
      }));

      setState({ filas, loading: false, error: null });
    }

    load().catch(err =>
      setState(prev => ({ ...prev, loading: false, error: err.message }))
    );
  }, [filters.periodo, filters.semanaDesde, filters.semanaHasta]);

  return state;
}
```

- [ ] **Step 2: Crear `ComparativoChart.tsx`**

```typescript
// src/components/reportes/ComparativoChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getICSColor } from '../../lib/formulas';
import type { FilaComparativo } from '../../hooks/useComparativoCorredores';

interface Props {
  filas: FilaComparativo[];
}

export function ComparativoChart({ filas }: Props) {
  const data = filas.map(({ corredor, totales }) => ({
    nombre: corredor.codigo,
    ICS: totales.ics_prom,
    color: getICSColor(totales.ics_prom),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, 'ICS']} />
        <Bar dataKey="ICS" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Agregar `exportComparativoExcel` a `exportExcel.ts`**

Abre `src/lib/exportExcel.ts` y AGREGA al final:

```typescript
export function exportComparativoExcel(
  filas: import('../hooks/useComparativoCorredores').FilaComparativo[],
  periodo: number,
  semanaDesde: number,
  semanaHasta: number
): void {
  const wb = XLSX.utils.book_new();

  const rows: unknown[][] = [
    [`Comparativo de Corredores — Período ${periodo} / Semanas ${semanaDesde}–${semanaHasta}`],
    [],
    ['Corredor', 'IcA prom', 'IcK prom', 'IcD prom', 'IC prom', 'IP prom', 'IE prom', 'ICS prom',
     'Kms Prog.', 'Kms Ejec.', 'Kms Efect.', 'Pasajeros'],
    ...filas.map(({ corredor, totales }) => [
      `${corredor.codigo} — ${corredor.nombre}`,
      totales.ica_prom,
      totales.ick_prom,
      totales.icd_prom,
      totales.ic_prom,
      totales.ip_prom,
      totales.ie_prom,
      totales.ics_prom,
      totales.kms_programados,
      totales.kms_ejecutados,
      totales.kms_efectivos,
      totales.total_pasajeros,
    ]),
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Comparativo');
  XLSX.writeFile(wb, `SIGO_Comparativo_P${periodo}_S${semanaDesde}-${semanaHasta}.xlsx`);
}
```

- [ ] **Step 4: Activar Reporte 3 en `Reportes.tsx`**

En `src/pages/Reportes.tsx`, agrega las siguientes importaciones al inicio:

```typescript
import { ComparativoChart } from '../components/reportes/ComparativoChart';
import { useComparativoCorredores } from '../hooks/useComparativoCorredores';
import { exportComparativoExcel } from '../lib/exportExcel';
```

Agrega los estados para el Reporte 3 junto al resto del state:

```typescript
  // Reporte 3 state
  const [compPeriodo, setCompPeriodo] = useState('');
  const [compSemanaDesde, setCompSemanaDesde] = useState('');
  const [compSemanaHasta, setCompSemanaHasta] = useState('');
  const [compFilters, setCompFilters] = useState<import('../hooks/useComparativoCorredores').ComparativoFilters>({
    periodo: null, semanaDesde: null, semanaHasta: null,
  });
  const comparativo = useComparativoCorredores(compFilters);
```

Reemplaza el placeholder del Reporte 3 con:

```tsx
      {/* Reporte 3: Comparativo de Corredores */}
      <div className="bg-white rounded-lg border p-6 max-w-2xl">
        <h2 className="text-base font-semibold text-navy mb-1">Comparativo de Corredores</h2>
        <p className="text-sm text-gray-500 mb-4">
          Indicadores promedio por corredor en un rango de semanas.
        </p>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <input type="number" value={compPeriodo} onChange={e => setCompPeriodo(e.target.value)}
                placeholder="Ej: 2026" className="border border-gray-300 rounded-md px-3 py-2 text-sm w-28 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semana desde</label>
              <input type="number" value={compSemanaDesde} onChange={e => setCompSemanaDesde(e.target.value)}
                placeholder="Ej: 1" className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semana hasta</label>
              <input type="number" value={compSemanaHasta} onChange={e => setCompSemanaHasta(e.target.value)}
                placeholder="Ej: 52" className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24 focus:outline-none" />
            </div>
            <Button
              onClick={() => setCompFilters({
                periodo: compPeriodo ? parseInt(compPeriodo) : null,
                semanaDesde: compSemanaDesde ? parseInt(compSemanaDesde) : null,
                semanaHasta: compSemanaHasta ? parseInt(compSemanaHasta) : null,
              })}
              disabled={!compPeriodo || !compSemanaDesde || !compSemanaHasta}
              className="bg-navy text-white hover:bg-navy-dark"
            >
              Buscar
            </Button>
          </div>

          {comparativo.loading && (
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
            </p>
          )}
          {comparativo.error && <p className="text-red-500 text-sm">{comparativo.error}</p>}

          {comparativo.filas.length > 0 && (
            <>
              <ComparativoChart filas={comparativo.filas} />
              <div className="overflow-x-auto">
                <table className="w-full text-xs border rounded">
                  <thead className="bg-navy text-white">
                    <tr>
                      {['Corredor','IcA','IcK','IcD','IC','IP','IE','ICS'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparativo.filas.map(({ corredor, totales }) => (
                      <tr key={corredor.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{corredor.codigo} — {corredor.nombre}</td>
                        <td className="px-3 py-2">{totales.ica_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.ick_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.icd_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.ic_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.ip_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.ie_prom.toFixed(2)}</td>
                        <td className="px-3 py-2 font-bold" style={{ color: totales.ics_prom > 0 ? '#27ae60' : undefined }}>
                          {totales.ics_prom.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                onClick={() => exportComparativoExcel(
                  comparativo.filas,
                  parseInt(compPeriodo),
                  parseInt(compSemanaDesde),
                  parseInt(compSemanaHasta)
                )}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Excel
              </Button>
            </>
          )}
        </div>
      </div>
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Expected: `✓ built in X.XXs` sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useComparativoCorredores.ts src/components/reportes/ComparativoChart.tsx src/lib/exportExcel.ts src/pages/Reportes.tsx
git commit -m "feat(reportes): Reporte 3 — Comparativo de Corredores con chart y Excel"
```

---

## Task 4: Reporte 4 — Tendencia de Indicadores

**Files:**
- Create: `src/hooks/useTendenciaIndicadores.ts`
- Create: `src/components/reportes/TendenciaChart.tsx`
- Modify: `src/lib/exportExcel.ts`
- Modify: `src/pages/Reportes.tsx`

### Contexto

El Reporte 4 muestra la evolución de todos los indicadores (IcA, IcK, IcD, IC, IP, IE, ICS) de un corredor a lo largo del tiempo. El usuario selecciona un corredor y un rango de fechas (fecha_inicio y fecha_fin en formato YYYY-MM-DD). Se buscan todos los `registros_diarios` con `tiene_datos = true` en ese rango para ese corredor, ordenados por fecha.

La tabla de corredores disponibles viene del mismo Supabase. El hook recibe el ID del corredor y las fechas como strings.

- [ ] **Step 1: Crear `useTendenciaIndicadores.ts`**

```typescript
// src/hooks/useTendenciaIndicadores.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Corredor, RegistroDiario } from '../types';

export interface TendenciaFilters {
  corredorId: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export interface TendenciaData {
  registros: RegistroDiario[];
  corredor: Corredor | null;
  loading: boolean;
  error: string | null;
}

export function useTendenciaIndicadores(filters: TendenciaFilters): TendenciaData {
  const [state, setState] = useState<TendenciaData>({
    registros: [],
    corredor: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!filters.corredorId || !filters.fechaInicio || !filters.fechaFin) {
      setState({ registros: [], corredor: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    async function load() {
      const { data: corrData, error: corrError } = await supabase
        .from('corredores')
        .select('*')
        .eq('id', filters.corredorId!)
        .single();
      if (corrError) throw corrError;

      const { data, error: regError } = await supabase
        .from('registros_diarios')
        .select('*')
        .eq('corredor_id', filters.corredorId!)
        .eq('tiene_datos', true)
        .gte('fecha', filters.fechaInicio!)
        .lte('fecha', filters.fechaFin!)
        .order('fecha', { ascending: true });
      if (regError) throw regError;

      setState({
        registros: (data || []) as RegistroDiario[],
        corredor: corrData as Corredor,
        loading: false,
        error: null,
      });
    }

    load().catch(err =>
      setState(prev => ({ ...prev, loading: false, error: err.message }))
    );
  }, [filters.corredorId, filters.fechaInicio, filters.fechaFin]);

  return state;
}
```

- [ ] **Step 2: Crear `TendenciaChart.tsx`**

```typescript
// src/components/reportes/TendenciaChart.tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatFecha } from '../../lib/dateUtils';
import type { RegistroDiario } from '../../types';

interface Props {
  registros: RegistroDiario[];
}

const INDICADORES: { key: keyof RegistroDiario; label: string; color: string }[] = [
  { key: 'ica', label: 'IcA', color: '#1a3a5c' },
  { key: 'ick', label: 'IcK', color: '#e8541a' },
  { key: 'icd', label: 'IcD', color: '#f39c12' },
  { key: 'ic',  label: 'IC',  color: '#9b59b6' },
  { key: 'ip',  label: 'IP',  color: '#3498db' },
  { key: 'ie',  label: 'IE',  color: '#1abc9c' },
  { key: 'ics', label: 'ICS', color: '#27ae60' },
];

export function TendenciaChart({ registros }: Props) {
  const data = registros.map(r => ({
    fecha: formatFecha(r.fecha),
    ica: r.ica ?? null,
    ick: r.ick ?? null,
    icd: r.icd ?? null,
    ic: r.ic ?? null,
    ip: r.ip ?? null,
    ie: r.ie ?? null,
    ics: r.ics ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v) => v != null ? [`${Number(v).toFixed(2)}%`, ''] : ['-', '']} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {INDICADORES.map(ind => (
          <Line
            key={ind.key as string}
            type="monotone"
            dataKey={ind.key as string}
            name={ind.label}
            stroke={ind.color}
            strokeWidth={1.5}
            dot={{ r: 2 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Agregar `exportTendenciaExcel` a `exportExcel.ts`**

Abre `src/lib/exportExcel.ts` y AGREGA al final:

```typescript
export function exportTendenciaExcel(
  corredor: import('../types').Corredor,
  registros: import('../types').RegistroDiario[]
): void {
  const wb = XLSX.utils.book_new();

  const rows: unknown[][] = [
    [`Tendencia de Indicadores — ${corredor.codigo} ${corredor.nombre}`],
    [],
    ['Fecha', 'IcA', 'IcK', 'IcD', 'IC', 'IP', 'IE', 'ICS'],
    ...registros.map(r => [
      r.fecha,
      r.ica ?? '',
      r.ick ?? '',
      r.icd ?? '',
      r.ic ?? '',
      r.ip ?? '',
      r.ie ?? '',
      r.ics ?? '',
    ]),
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Tendencia');
  XLSX.writeFile(wb, `SIGO_Tendencia_${corredor.codigo}.xlsx`);
}
```

- [ ] **Step 4: Activar Reporte 4 en `Reportes.tsx`**

Agrega las importaciones al inicio de `src/pages/Reportes.tsx`:

```typescript
import { TendenciaChart } from '../components/reportes/TendenciaChart';
import { useTendenciaIndicadores } from '../hooks/useTendenciaIndicadores';
import { exportTendenciaExcel } from '../lib/exportExcel';
```

Agrega los estados para el Reporte 4 junto al resto:

```typescript
  // Reporte 4 state
  const [tendCorredorId, setTendCorredorId] = useState('');
  const [tendFechaInicio, setTendFechaInicio] = useState('');
  const [tendFechaFin, setTendFechaFin] = useState('');
  const [tendFilters, setTendFilters] = useState<import('../hooks/useTendenciaIndicadores').TendenciaFilters>({
    corredorId: null, fechaInicio: null, fechaFin: null,
  });
  const tendencia = useTendenciaIndicadores(tendFilters);
```

Para el selector de corredores en Reporte 4 necesitamos la lista de corredores. El estado `corredores` ya está cargado (de Reporte 1). Úsalo directamente.

Reemplaza el placeholder del Reporte 4:

```tsx
      {/* Reporte 4: Tendencia de Indicadores */}
      <div className="bg-white rounded-lg border p-6 max-w-2xl">
        <h2 className="text-base font-semibold text-navy mb-1">Tendencia de Indicadores</h2>
        <p className="text-sm text-gray-500 mb-4">
          Evolución de indicadores de un corredor en el tiempo.
        </p>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corredor</label>
              <select
                value={tendCorredorId}
                onChange={e => setTendCorredorId(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">— Seleccionar —</option>
                {corredores.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input type="date" value={tendFechaInicio} onChange={e => setTendFechaInicio(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
              <input type="date" value={tendFechaFin} onChange={e => setTendFechaFin(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none" />
            </div>
            <Button
              onClick={() => setTendFilters({
                corredorId: tendCorredorId || null,
                fechaInicio: tendFechaInicio || null,
                fechaFin: tendFechaFin || null,
              })}
              disabled={!tendCorredorId || !tendFechaInicio || !tendFechaFin}
              className="bg-navy text-white hover:bg-navy-dark"
            >
              Buscar
            </Button>
          </div>

          {tendencia.loading && (
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
            </p>
          )}
          {tendencia.error && <p className="text-red-500 text-sm">{tendencia.error}</p>}

          {!tendencia.loading && tendencia.registros.length === 0 && tendFilters.corredorId && (
            <p className="text-sm text-gray-500">No hay datos con operación para el rango seleccionado.</p>
          )}

          {tendencia.registros.length > 0 && (
            <>
              <TendenciaChart registros={tendencia.registros} />
              <Button
                onClick={() => tendencia.corredor && exportTendenciaExcel(tendencia.corredor, tendencia.registros)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Excel
              </Button>
            </>
          )}
        </div>
      </div>
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Expected: `✓ built in X.XXs` sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTendenciaIndicadores.ts src/components/reportes/TendenciaChart.tsx src/lib/exportExcel.ts src/pages/Reportes.tsx
git commit -m "feat(reportes): Reporte 4 — Tendencia de Indicadores con LineChart y Excel"
```

---

## Verificación final

```bash
npm run build
git log --oneline -6
```

Expected log:
```
feat(reportes): Reporte 4 — Tendencia de Indicadores con LineChart y Excel
feat(reportes): Reporte 3 — Comparativo de Corredores con chart y Excel
feat(reportes): Reporte 2 — Resumen Mensual con PDF y Excel
feat(dashboard): filtros por corredor/período y 4 gráficas completas
feat: add costo_por_km per corredor
feat(fase1d): módulo Configuración completo
```
