# SIGO Fase 1C — Módulo Registro + PDF/Excel Export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el módulo de ingreso de datos semanal (Registro) con formulario manual, importación de archivos CSV/Excel, cálculo automático de IC/ICS, y generación de reportes en PDF y Excel.

**Architecture:** Cada corredor activo tiene su propia pestaña en el formulario de registro. El formulario mantiene estado local (`RegistroRow[]` con strings para inputs) y calcula IC/ICS en tiempo real. El hook `useRegistros` maneja la persistencia en Supabase via RPC. La exportación PDF usa `@react-pdf/renderer`; Excel usa `xlsx` (SheetJS). La página Reportes permite seleccionar una semana validada y descargar su informe oficial.

**Tech Stack:** React 18 + TypeScript + Supabase JS v2 + PapaParse + xlsx + @react-pdf/renderer + Tailwind CSS v4 + shadcn/ui + lucide-react.

**Prerequisitos:** Fase 1A completa (Auth + Layout + registroStore). Fase 1B completa (useSemanas, useCorredores). Migraciones de BD aplicadas.

---

## Mapa de Archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|----------------|
| `src/hooks/useRegistros.ts` | Crear | Fetch registros por semana_id; upsert via RPC; cambio de estado |
| `src/lib/importParser.ts` | Crear | Parsear CSV/Excel → `RegistroRow[]` con mapeo de columnas |
| `src/components/registro/MetadataForm.tsx` | Crear | Formulario Paso 1: metadatos de semana |
| `src/components/registro/CorredorTab.tsx` | Crear | Tablas Sección I + Sección II con inputs y cálculos live |
| `src/components/registro/ImportModal.tsx` | Crear | Modal drag&drop con preview, mapeo y validación |
| `src/components/reportes/InformePDF.tsx` | Crear | Documento PDF oficial INTRANT con @react-pdf/renderer |
| `src/lib/exportExcel.ts` | Crear | Exportar semana a Excel (2 hojas: Sec I + Sec II) |
| `src/pages/Registro.tsx` | Modificar | Reemplazar shell con flujo completo de registro |
| `src/pages/Reportes.tsx` | Modificar | Reemplazar shell con selector de semana + PDF viewer + descarga |

---

## Task 1: Hook `useRegistros`

**Files:**
- Create: `src/hooks/useRegistros.ts`

- [ ] **Step 1: Definir tipos locales del formulario**

Abrir `src/hooks/useRegistros.ts` y escribir:

```ts
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calcIC, calcICS } from '../lib/formulas';
import { generarDiasSemana } from '../lib/dateUtils';
import type { RegistroDiario, Corredor, FuenteDato } from '../types';

// Estado editable por fila del formulario (strings para inputs HTML)
export interface RegistroRow {
  fecha: string;
  kms_programados: string;
  kms_ejecutados: string;
  kms_efectivos: string;
  total_pasajeros: string;
  servicios_programados: string;
  servicios_ejecutados: string;
  servicios_puntuales: string;
  ica: string;
  ick: string;
  icd: string;
  ip: string;
  ie: string;
  ic: number | null;    // calculado en tiempo real
  ics: number | null;   // calculado en tiempo real
  fuente: FuenteDato;
}

export interface UseRegistrosResult {
  rowsByCorredor: Record<string, RegistroRow[]>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  initRows: (fechaInicio: string, corredores: Corredor[], existentes: RegistroDiario[]) => void;
  updateRow: (corredorId: string, rowIndex: number, campo: keyof RegistroRow, valor: string) => void;
  guardarCorredor: (semanaId: string, corredorId: string) => Promise<void>;
  guardarTodo: (semanaId: string) => Promise<void>;
}
```

- [ ] **Step 2: Implementar `initRows` — inicializar filas vacías o con datos existentes**

```ts
// Dentro del hook:
function emptyRow(fecha: string): RegistroRow {
  return {
    fecha,
    kms_programados: '', kms_ejecutados: '', kms_efectivos: '',
    total_pasajeros: '',
    servicios_programados: '', servicios_ejecutados: '', servicios_puntuales: '',
    ica: '', ick: '', icd: '',
    ip: '', ie: '90',  // IE default 90 según PRD
    ic: null, ics: null,
    fuente: 'manual',
  };
}

function registroDiarioToRow(rd: RegistroDiario): RegistroRow {
  const ica = rd.ica ?? null;
  const ick = rd.ick ?? null;
  const icd = rd.icd ?? null;
  const ip  = rd.ip  ?? null;
  const ie  = rd.ie  ?? null;
  const ic  = (ica != null && ick != null && icd != null) ? calcIC(ica, ick, icd) : null;
  const ics = (ic != null && ip != null && ie != null) ? calcICS(ic, ip, ie) : null;
  return {
    fecha: rd.fecha,
    kms_programados:   rd.kms_programados?.toString() ?? '',
    kms_ejecutados:    rd.kms_ejecutados?.toString() ?? '',
    kms_efectivos:     rd.kms_efectivos?.toString() ?? '',
    total_pasajeros:   rd.total_pasajeros?.toString() ?? '',
    servicios_programados: rd.servicios_programados?.toString() ?? '',
    servicios_ejecutados:  rd.servicios_ejecutados?.toString() ?? '',
    servicios_puntuales:   rd.servicios_puntuales?.toString() ?? '',
    ica: rd.ica?.toString() ?? '',
    ick: rd.ick?.toString() ?? '',
    icd: rd.icd?.toString() ?? '',
    ip:  rd.ip?.toString()  ?? '',
    ie:  rd.ie?.toString()  ?? '90',
    ic, ics,
    fuente: rd.fuente,
  };
}
```

- [ ] **Step 3: Implementar `updateRow` con cálculo live de IC e ICS**

```ts
const updateRow = useCallback(
  (corredorId: string, rowIndex: number, campo: keyof RegistroRow, valor: string) => {
    setRowsByCorredor(prev => {
      const rows = [...(prev[corredorId] ?? [])];
      const row = { ...rows[rowIndex], [campo]: valor };

      // Recalcular IC e ICS en tiempo real
      const ica = parseFloat(row.ica);
      const ick = parseFloat(row.ick);
      const icd = parseFloat(row.icd);
      const ip  = parseFloat(row.ip);
      const ie  = parseFloat(row.ie);

      row.ic  = (!isNaN(ica) && !isNaN(ick) && !isNaN(icd)) ? calcIC(ica, ick, icd) : null;
      row.ics = (row.ic != null && !isNaN(ip) && !isNaN(ie)) ? calcICS(row.ic, ip, ie) : null;

      rows[rowIndex] = row;
      return { ...prev, [corredorId]: rows };
    });
  },
  []
);
```

- [ ] **Step 4: Implementar `guardarCorredor` — convierte rows a JSONB y llama RPC**

```ts
function rowsToJsonb(corredorId: string, semanaId: string, rows: RegistroRow[]) {
  return rows.map(row => {
    const hasData = [
      row.kms_programados, row.kms_ejecutados, row.kms_efectivos,
      row.total_pasajeros, row.ica, row.ick, row.icd,
    ].some(v => v !== '');

    const n = (v: string) => v === '' ? null : parseFloat(v);
    const i = (v: string) => v === '' ? null : parseInt(v, 10);

    return {
      semana_id:   semanaId,
      corredor_id: corredorId,
      fecha:       row.fecha,
      kms_programados:       n(row.kms_programados),
      kms_ejecutados:        n(row.kms_ejecutados),
      kms_efectivos:         n(row.kms_efectivos),
      total_pasajeros:       i(row.total_pasajeros),
      servicios_programados: i(row.servicios_programados),
      servicios_ejecutados:  i(row.servicios_ejecutados),
      servicios_puntuales:   i(row.servicios_puntuales),
      ica: n(row.ica), ick: n(row.ick), icd: n(row.icd),
      ic:  row.ic,
      ip:  n(row.ip), ie: n(row.ie),
      ics: row.ics,
      tiene_datos: hasData,
      fuente: row.fuente,
    };
  });
}

const guardarCorredor = useCallback(
  async (semanaId: string, corredorId: string) => {
    setSaving(true);
    setError(null);
    try {
      const rows = rowsByCorredor[corredorId] ?? [];
      const registros = rowsToJsonb(corredorId, semanaId, rows);
      const { error } = await supabase.rpc('upsert_registros_semana', {
        p_semana_id: semanaId,
        p_registros: registros,
      });
      if (error) throw error;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  },
  [rowsByCorredor]
);
```

- [ ] **Step 5: Implementar `guardarTodo` y ensamblar el hook completo**

```ts
const guardarTodo = useCallback(
  async (semanaId: string) => {
    setSaving(true);
    setError(null);
    try {
      for (const corredorId of Object.keys(rowsByCorredor)) {
        const rows = rowsByCorredor[corredorId] ?? [];
        const registros = rowsToJsonb(corredorId, semanaId, rows);
        const { error } = await supabase.rpc('upsert_registros_semana', {
          p_semana_id: semanaId,
          p_registros: registros,
        });
        if (error) throw error;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  },
  [rowsByCorredor]
);
```

Estructura del hook completo (unir todo):

```ts
export function useRegistros(): UseRegistrosResult {
  const [rowsByCorredor, setRowsByCorredor] = useState<Record<string, RegistroRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initRows = useCallback(
    (fechaInicio: string, corredores: Corredor[], existentes: RegistroDiario[]) => {
      const fechas = generarDiasSemana(fechaInicio);
      const initial: Record<string, RegistroRow[]> = {};
      for (const corredor of corredores) {
        initial[corredor.id] = fechas.map(fecha => {
          const found = existentes.find(
            r => r.corredor_id === corredor.id && r.fecha === fecha
          );
          return found ? registroDiarioToRow(found) : emptyRow(fecha);
        });
      }
      setRowsByCorredor(initial);
    },
    []
  );

  // updateRow, guardarCorredor, guardarTodo definidas arriba

  return { rowsByCorredor, loading, saving, error, initRows, updateRow, guardarCorredor, guardarTodo };
}
```

- [ ] **Step 6: Verificar que compila**

```bash
cd /ruta/del/proyecto && npm run build
```

Esperado: 0 errores de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useRegistros.ts
git commit -m "feat: add useRegistros hook with form state and RPC upsert"
```

---

## Task 2: `MetadataForm` — Formulario de metadatos de semana

**Files:**
- Create: `src/components/registro/MetadataForm.tsx`

- [ ] **Step 1: Crear `src/components/registro/MetadataForm.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { calcFechaFin } from '../../lib/dateUtils';
import { Button } from '../ui/button';

export interface MetadataValues {
  numero_semana: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  validado_por: string;
  observaciones: string;
}

interface Props {
  initialValues?: Partial<MetadataValues>;
  onSubmit: (values: MetadataValues) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function MetadataForm({ initialValues, onSubmit, submitting, submitLabel = 'Continuar →' }: Props) {
  const [values, setValues] = useState<MetadataValues>({
    numero_semana: initialValues?.numero_semana ?? '',
    periodo:       initialValues?.periodo ?? '',
    fecha_inicio:  initialValues?.fecha_inicio ?? '',
    fecha_fin:     initialValues?.fecha_fin ?? '',
    validado_por:  initialValues?.validado_por ?? '',
    observaciones: initialValues?.observaciones ?? '',
  });
  const [errors, setErrors] = useState<Partial<MetadataValues>>({});

  // Auto-calcular fecha_fin cuando cambia fecha_inicio
  useEffect(() => {
    if (values.fecha_inicio) {
      setValues(v => ({ ...v, fecha_fin: calcFechaFin(v.fecha_inicio) }));
    }
  }, [values.fecha_inicio]);

  function set(campo: keyof MetadataValues, valor: string) {
    setValues(v => ({ ...v, [campo]: valor }));
    setErrors(e => ({ ...e, [campo]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<MetadataValues> = {};
    if (!values.numero_semana) errs.numero_semana = 'Requerido';
    if (!values.periodo) errs.periodo = 'Requerido';
    if (!values.fecha_inicio) errs.fecha_inicio = 'Requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(values);
  }

  const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Semana #</label>
          <input
            type="number" min={1} className={inputClass}
            value={values.numero_semana}
            onChange={e => set('numero_semana', e.target.value)}
          />
          {errors.numero_semana && <p className="text-red-500 text-xs mt-1">{errors.numero_semana}</p>}
        </div>
        <div>
          <label className={labelClass}>Período</label>
          <input
            type="number" min={2024} className={inputClass}
            value={values.periodo}
            onChange={e => set('periodo', e.target.value)}
          />
          {errors.periodo && <p className="text-red-500 text-xs mt-1">{errors.periodo}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Fecha Inicio</label>
          <input
            type="date" className={inputClass}
            value={values.fecha_inicio}
            onChange={e => set('fecha_inicio', e.target.value)}
          />
          {errors.fecha_inicio && <p className="text-red-500 text-xs mt-1">{errors.fecha_inicio}</p>}
        </div>
        <div>
          <label className={labelClass}>Fecha Fin (auto)</label>
          <input
            type="date" className={`${inputClass} bg-gray-50 cursor-not-allowed`}
            value={values.fecha_fin} readOnly
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Revisado y validado por</label>
        <input
          type="text" className={inputClass}
          placeholder="Ej: Ing. Erick Marte – Dirección de Movilidad Sostenible"
          value={values.validado_por}
          onChange={e => set('validado_por', e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Observaciones</label>
        <textarea
          className={`${inputClass} h-20 resize-none`}
          value={values.observaciones}
          onChange={e => set('observaciones', e.target.value)}
        />
      </div>

      <Button type="submit" disabled={submitting} className="bg-navy text-white hover:bg-navy-dark">
        {submitting ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/registro/MetadataForm.tsx
git commit -m "feat: add MetadataForm component with auto fecha_fin"
```

---

## Task 3: `CorredorTab` — Tablas Sección I + Sección II

**Files:**
- Create: `src/components/registro/CorredorTab.tsx`

- [ ] **Step 1: Crear `src/components/registro/CorredorTab.tsx`**

```tsx
import { getICSColor, calcTotalesCorredor } from '../../lib/formulas';
import { formatFecha } from '../../lib/dateUtils';
import type { RegistroRow } from '../../hooks/useRegistros';
import type { Corredor, RegistroDiario } from '../../types';

interface Props {
  corredor: Corredor;
  rows: RegistroRow[];
  onChange: (rowIndex: number, campo: keyof RegistroRow, valor: string) => void;
  readOnly?: boolean;
}

const inputCls = 'w-full text-right text-sm px-1 py-0.5 border-0 focus:outline-none focus:ring-1 focus:ring-navy bg-transparent';
const thCls = 'px-2 py-1 text-xs font-semibold text-white bg-navy whitespace-nowrap';
const tdCls = 'px-1 py-0.5 text-xs text-center border-b border-gray-100';

function NumInput({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  return (
    <input
      type="number" step="0.01" className={inputCls}
      value={value}
      onChange={e => onChange(e.target.value)}
      readOnly={readOnly}
    />
  );
}
```

- [ ] **Step 2: Agregar función de totales de Sección I**

```tsx
// Agrega dentro del componente CorredorTab antes del return:

// Convertir RegistroRow[] a RegistroDiario[] parciales para calcTotalesCorredor
function rowsToPartialRD(rows: RegistroRow[]): Partial<RegistroDiario>[] {
  return rows.map(row => ({
    tiene_datos: [row.kms_programados, row.kms_ejecutados, row.kms_efectivos, row.ica].some(v => v !== ''),
    kms_programados:   row.kms_programados   !== '' ? parseFloat(row.kms_programados)   : undefined,
    kms_ejecutados:    row.kms_ejecutados    !== '' ? parseFloat(row.kms_ejecutados)    : undefined,
    kms_efectivos:     row.kms_efectivos     !== '' ? parseFloat(row.kms_efectivos)     : undefined,
    total_pasajeros:   row.total_pasajeros   !== '' ? parseInt(row.total_pasajeros)     : undefined,
    servicios_programados: row.servicios_programados !== '' ? parseInt(row.servicios_programados) : undefined,
    servicios_ejecutados:  row.servicios_ejecutados  !== '' ? parseInt(row.servicios_ejecutados)  : undefined,
    servicios_puntuales:   row.servicios_puntuales   !== '' ? parseInt(row.servicios_puntuales)   : undefined,
    ica: row.ica !== '' ? parseFloat(row.ica) : undefined,
    ick: row.ick !== '' ? parseFloat(row.ick) : undefined,
    icd: row.icd !== '' ? parseFloat(row.icd) : undefined,
    ic:  row.ic  ?? undefined,
    ip:  row.ip  !== '' ? parseFloat(row.ip)  : undefined,
    ie:  row.ie  !== '' ? parseFloat(row.ie)  : undefined,
    ics: row.ics ?? undefined,
  }));
}
```

- [ ] **Step 3: Renderizar Sección I (kms y servicios)**

```tsx
// Dentro del return de CorredorTab:
return (
  <div className="space-y-6">
    {/* Sección I */}
    <div>
      <h3 className="text-sm font-semibold text-navy mb-2">
        Sección I — Kilómetros y Servicios
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 text-xs">
          <thead>
            <tr>
              {['Fecha','Kms Prog.','Kms Ejec.','Kms Efect.','Pasajeros','Serv. Prog.','Serv. Ejec.','Serv. Punt.'].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const vacio = [row.kms_programados, row.kms_ejecutados, row.kms_efectivos].every(v => v === '');
              return (
                <tr key={row.fecha} className={vacio ? 'bg-gray-50' : 'bg-white'}>
                  <td className={`${tdCls} font-medium text-left px-2`}>{formatFecha(row.fecha)}</td>
                  {(['kms_programados','kms_ejecutados','kms_efectivos','total_pasajeros',
                     'servicios_programados','servicios_ejecutados','servicios_puntuales'] as const).map(campo => (
                    <td key={campo} className={tdCls}>
                      <NumInput
                        value={row[campo] as string}
                        onChange={v => onChange(i, campo, v)}
                        readOnly={readOnly}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
            {/* Fila TOTAL */}
            {(() => {
              const t = calcTotalesCorredor(rowsToPartialRD(rows) as RegistroDiario[]);
              return (
                <tr className="bg-navy/10 font-bold">
                  <td className={`${tdCls} text-left px-2 font-bold`}>TOTAL</td>
                  {[t.kms_programados, t.kms_ejecutados, t.kms_efectivos, t.total_pasajeros,
                    t.servicios_programados, t.servicios_ejecutados, t.servicios_puntuales].map((v, i) => (
                    <td key={i} className={tdCls}>{v || '—'}</td>
                  ))}
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
```

- [ ] **Step 4: Agregar Sección II (indicadores con IC/ICS calculados)**

```tsx
    {/* Sección II */}
    <div>
      <h3 className="text-sm font-semibold text-navy mb-2">
        Sección II — Indicadores de Calidad
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 text-xs">
          <thead>
            <tr>
              {['Fecha','IcA','IcK','IcD','IC (auto)','IP','IE','ICS (auto)'].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const icColor  = row.ic  != null ? getICSColor(row.ic)  : undefined;
              const icsColor = row.ics != null ? getICSColor(row.ics) : undefined;
              return (
                <tr key={row.fecha} className="bg-white hover:bg-gray-50">
                  <td className={`${tdCls} font-medium text-left px-2`}>{formatFecha(row.fecha)}</td>
                  {(['ica','ick','icd'] as const).map(campo => (
                    <td key={campo} className={tdCls}>
                      <NumInput
                        value={row[campo]}
                        onChange={v => onChange(i, campo, v)}
                        readOnly={readOnly}
                      />
                    </td>
                  ))}
                  {/* IC calculado (readonly) */}
                  <td className={tdCls}>
                    <span className="font-semibold" style={{ color: icColor }}>
                      {row.ic != null ? row.ic.toFixed(2) : '—'}
                    </span>
                  </td>
                  {/* IP */}
                  <td className={tdCls}>
                    <NumInput value={row.ip} onChange={v => onChange(i, 'ip', v)} readOnly={readOnly} />
                  </td>
                  {/* IE */}
                  <td className={tdCls}>
                    <NumInput value={row.ie} onChange={v => onChange(i, 'ie', v)} readOnly={readOnly} />
                  </td>
                  {/* ICS calculado (readonly) */}
                  <td className={tdCls}>
                    <span className="font-bold" style={{ color: icsColor }}>
                      {row.ics != null ? row.ics.toFixed(2) : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {/* Fila TOTAL (promedios) */}
            {(() => {
              const t = calcTotalesCorredor(rowsToPartialRD(rows) as RegistroDiario[]);
              const icsColor = t.ics_prom ? getICSColor(t.ics_prom) : undefined;
              return (
                <tr className="bg-navy/10 font-bold">
                  <td className={`${tdCls} text-left px-2 font-bold`}>PROM</td>
                  {[t.ica_prom, t.ick_prom, t.icd_prom].map((v, i) => (
                    <td key={i} className={tdCls}>{v ? v.toFixed(2) : '—'}</td>
                  ))}
                  <td className={tdCls}>{t.ic_prom ? t.ic_prom.toFixed(2) : '—'}</td>
                  <td className={tdCls}>{t.ip_prom ? t.ip_prom.toFixed(2) : '—'}</td>
                  <td className={tdCls}>{t.ie_prom ? t.ie_prom.toFixed(2) : '—'}</td>
                  <td className={tdCls}>
                    <span className="font-bold" style={{ color: icsColor }}>
                      {t.ics_prom ? t.ics_prom.toFixed(2) : '—'}
                    </span>
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

Esperado: 0 errores de TypeScript.

- [ ] **Step 6: Commit**

```bash
git add src/components/registro/CorredorTab.tsx
git commit -m "feat: add CorredorTab with Sección I/II tables and live IC/ICS calculation"
```

---

## Task 4: `importParser.ts` + `ImportModal`

**Files:**
- Create: `src/lib/importParser.ts`
- Create: `src/components/registro/ImportModal.tsx`

- [ ] **Step 1: Crear `src/lib/importParser.ts`**

```ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { calcIC, calcICS } from './formulas';
import type { RegistroRow } from '../hooks/useRegistros';

// Nombres de columna aceptados (case-insensitive)
const COL_MAP: Record<string, keyof RegistroRow> = {
  fecha: 'fecha',
  kms_programados: 'kms_programados', 'kms programados': 'kms_programados', kmsprog: 'kms_programados',
  kms_ejecutados:  'kms_ejecutados',  'kms ejecutados':  'kms_ejecutados',  kmsejec: 'kms_ejecutados',
  kms_efectivos:   'kms_efectivos',   'kms efectivos':   'kms_efectivos',   kmsefect: 'kms_efectivos',
  pasajeros: 'total_pasajeros', total_pasajeros: 'total_pasajeros',
  serv_programados: 'servicios_programados', servicios_programados: 'servicios_programados',
  serv_ejecutados:  'servicios_ejecutados',  servicios_ejecutados:  'servicios_ejecutados',
  serv_puntuales:   'servicios_puntuales',   servicios_puntuales:   'servicios_puntuales',
  ica: 'ica', ick: 'ick', icd: 'icd', ip: 'ip', ie: 'ie',
};

export type RawRow = Record<string, string>;

export function detectHeaders(headers: string[]): Record<string, keyof RegistroRow | null> {
  const mapping: Record<string, keyof RegistroRow | null> = {};
  for (const h of headers) {
    const key = h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
    mapping[h] = COL_MAP[key] ?? COL_MAP[h.toLowerCase()] ?? null;
  }
  return mapping;
}

export function parseCSV(text: string): { headers: string[]; rows: RawRow[] } {
  const result = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
  };
}

export function parseExcel(buffer: ArrayBuffer): { headers: string[]; rows: RawRow[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '', raw: false });
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  return { headers, rows: data };
}

export function applyMapping(
  rawRows: RawRow[],
  mapping: Record<string, keyof RegistroRow | null>,
  fechasSemana: string[]
): RegistroRow[] {
  return rawRows.map((raw, i) => {
    const row: Partial<RegistroRow> = {
      fecha:  fechasSemana[i] ?? '',
      fuente: 'importado',
      ie: '90',
    };

    for (const [col, campo] of Object.entries(mapping)) {
      if (!campo) continue;
      const val = raw[col]?.toString().trim() ?? '';
      if (campo === 'fecha') {
        // Normalizar fecha a YYYY-MM-DD
        const d = new Date(val);
        row.fecha = isNaN(d.getTime()) ? fechasSemana[i] ?? '' : d.toISOString().split('T')[0];
      } else {
        (row as Record<string, string | number | null>)[campo] = val;
      }
    }

    // Calcular IC e ICS
    const ica = parseFloat(row.ica as string ?? '');
    const ick = parseFloat(row.ick as string ?? '');
    const icd = parseFloat(row.icd as string ?? '');
    const ip  = parseFloat(row.ip  as string ?? '');
    const ie  = parseFloat(row.ie  as string ?? '90');

    row.ic  = (!isNaN(ica) && !isNaN(ick) && !isNaN(icd)) ? calcIC(ica, ick, icd) : null;
    row.ics = (row.ic != null && !isNaN(ip) && !isNaN(ie)) ? calcICS(row.ic, ip, ie) : null;

    return row as RegistroRow;
  });
}
```

- [ ] **Step 2: Crear `src/components/registro/ImportModal.tsx`**

```tsx
import { useRef, useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { parseCSV, parseExcel, detectHeaders, applyMapping, type RawRow } from '../../lib/importParser';
import type { RegistroRow } from '../../hooks/useRegistros';

interface Props {
  fechasSemana: string[];
  onImport: (rows: RegistroRow[]) => void;
  onClose: () => void;
}

type Step = 'upload' | 'preview' | 'confirm';

export function ImportModal({ fechasSemana, onImport, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const CAMPOS = [
    'fecha','kms_programados','kms_ejecutados','kms_efectivos','total_pasajeros',
    'servicios_programados','servicios_ejecutados','servicios_puntuales',
    'ica','ick','icd','ip','ie',
  ];

  async function handleFile(file: File) {
    setError(null);
    try {
      let result: { headers: string[]; rows: RawRow[] };
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        result = parseCSV(text);
      } else {
        const buffer = await file.arrayBuffer();
        result = parseExcel(buffer);
      }
      setHeaders(result.headers);
      setRawRows(result.rows);
      // Auto-detectar mapeo
      const detected = detectHeaders(result.headers);
      const initialMap: Record<string, string> = {};
      for (const [col, campo] of Object.entries(detected)) {
        initialMap[col] = campo ?? '';
      }
      setMapping(initialMap);
      setStep('preview');
    } catch {
      setError('Error al leer el archivo. Verifica que sea CSV o Excel válido.');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleConfirm() {
    const typedMapping = mapping as Record<string, import('../../hooks/useRegistros').keyof_RegistroRow | null>;
    const rows = applyMapping(rawRows, typedMapping as Parameters<typeof applyMapping>[1], fechasSemana);
    onImport(rows);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-navy">Importar Archivo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Step: upload */}
          {step === 'upload' && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragging ? 'border-navy bg-navy/5' : 'border-gray-300'
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-3">
                Arrastra un archivo CSV o Excel aquí, o
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                Seleccionar archivo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <p className="text-xs text-gray-400 mt-2">Formatos: CSV, .xlsx, .xls</p>
            </div>
          )}

          {/* Step: preview + mapeo */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Se encontraron <strong>{rawRows.length}</strong> filas.
                Verifica el mapeo de columnas:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {headers.map(col => (
                  <div key={col} className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded flex-1 truncate">{col}</span>
                    <span className="text-gray-400 text-xs">→</span>
                    <select
                      className="text-xs border rounded px-1 py-1 flex-1"
                      value={mapping[col] ?? ''}
                      onChange={e => setMapping(m => ({ ...m, [col]: e.target.value }))}
                    >
                      <option value="">Ignorar</option>
                      {CAMPOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview primeras 5 filas */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Vista previa (5 primeras filas):</p>
                <div className="overflow-x-auto border rounded">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        {headers.map(h => <th key={h} className="px-2 py-1 text-left whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          {headers.map(h => <td key={h} className="px-2 py-1 whitespace-nowrap">{row[h]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {step === 'preview' && (
            <Button
              onClick={handleConfirm}
              className="bg-navy text-white hover:bg-navy-dark"
            >
              Confirmar Importación
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

Nota: en `handleConfirm` ajustar el tipo para evitar el error de `keyof_RegistroRow`:

```tsx
// Reemplazar handleConfirm con:
function handleConfirm() {
  import('../../hooks/useRegistros').then(({ useRegistros: _ }) => {});  // no necesario
  const rows = applyMapping(
    rawRows,
    mapping as Record<string, import('../../hooks/useRegistros').RegistroRow extends infer T ? keyof T : never | null>,
    fechasSemana
  );
  onImport(rows);
  onClose();
}
```

Más simple — cambiar a:

```tsx
function handleConfirm() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = applyMapping(rawRows, mapping as any, fechasSemana);
  onImport(rows);
  onClose();
}
```

- [ ] **Step 3: Exportar el tipo `RegistroRow` correctamente desde `useRegistros.ts`**

Verificar que `RegistroRow` esté exported con `export interface RegistroRow` (ya está en Task 1 Step 1). El archivo `importParser.ts` lo importa directamente desde `'../hooks/useRegistros'`.

- [ ] **Step 4: Build check**

```bash
npm run build
```

Esperado: 0 errores. Si hay errores de tipo en `applyMapping`, usar `as any` en el punto de llamada.

- [ ] **Step 5: Commit**

```bash
git add src/lib/importParser.ts src/components/registro/ImportModal.tsx
git commit -m "feat: add CSV/Excel import parser and ImportModal"
```

---

## Task 5: Página `Registro`

**Files:**
- Modify: `src/pages/Registro.tsx`

- [ ] **Step 1: Reemplazar el shell con la página completa**

```tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRegistros } from '../hooks/useRegistros';
import { useCorredores } from '../hooks/useCorredores';
import { useRegistroStore } from '../store/registroStore';
import { useAuthStore } from '../store/authStore';
import { MetadataForm, type MetadataValues } from '../components/registro/MetadataForm';
import { CorredorTab } from '../components/registro/CorredorTab';
import { ImportModal } from '../components/registro/ImportModal';
import { generarDiasSemana } from '../lib/dateUtils';
import { Button } from '../components/ui/button';
import { ChevronLeft, Save, Send, Upload } from 'lucide-react';
import type { Semana, RegistroDiario } from '../types';

export default function Registro() {
  const { semanaId } = useParams<{ semanaId?: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { semanaActual, setSemana, setCorredorActivo, corredorActivoId } = useRegistroStore();
  const { corredores } = useCorredores();
  const { rowsByCorredor, saving, error, initRows, updateRow, guardarCorredor, guardarTodo } = useRegistros();

  const [step, setStep] = useState<1 | 2>(semanaId ? 2 : 1);
  const [metaSubmitting, setMetaSubmitting] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Si hay semanaId en URL → modo edición, cargar semana existente
  useEffect(() => {
    if (!semanaId) return;
    async function loadSemana() {
      const { data, error } = await supabase
        .from('semanas')
        .select('*')
        .eq('id', semanaId)
        .single();
      if (error || !data) { navigate('/semanas'); return; }
      setSemana(data as Semana);

      // Cargar registros existentes
      const { data: registros } = await supabase
        .from('registros_diarios')
        .select('*')
        .eq('semana_id', semanaId);

      if (corredores.length > 0) {
        initRows(data.fecha_inicio, corredores, (registros ?? []) as RegistroDiario[]);
      }
    }
    loadSemana();
  }, [semanaId, corredores]);

  // Inicializar corredor activo al llegar al paso 2
  useEffect(() => {
    if (step === 2 && corredores.length > 0 && !corredorActivoId) {
      setCorredorActivo(corredores[0].id);
    }
  }, [step, corredores]);

  // Paso 1: crear semana en Supabase
  async function handleMetaSubmit(values: MetadataValues) {
    setMetaSubmitting(true);
    setMetaError(null);
    try {
      const { data, error } = await supabase.from('semanas').insert({
        numero_semana: parseInt(values.numero_semana),
        periodo:       parseInt(values.periodo),
        fecha_inicio:  values.fecha_inicio,
        fecha_fin:     values.fecha_fin,
        validado_por:  values.validado_por || null,
        observaciones: values.observaciones || null,
        estado:        'borrador',
        creado_por:    usuario!.id,
      }).select().single();
      if (error) { setMetaError(error.message); return; }
      setSemana(data as Semana);
      initRows(values.fecha_inicio, corredores, []);
      setStep(2);
    } finally {
      setMetaSubmitting(false);
    }
  }

  async function handleGuardarCorredor() {
    if (!semanaActual || !corredorActivoId) return;
    await guardarCorredor(semanaActual.id, corredorActivoId);
    setFeedback('Corredor guardado');
    setTimeout(() => setFeedback(null), 2000);
  }

  async function handleGuardarTodo() {
    if (!semanaActual) return;
    await guardarTodo(semanaActual.id);
    setFeedback('Semana guardada');
    setTimeout(() => setFeedback(null), 2000);
  }

  async function handleEnviarRevision() {
    if (!semanaActual) return;
    const { error } = await supabase.from('semanas')
      .update({ estado: 'en_revision' })
      .eq('id', semanaActual.id);
    if (!error) navigate('/semanas');
  }

  const corredor = corredores.find(c => c.id === corredorActivoId);
  const rows = corredorActivoId ? (rowsByCorredor[corredorActivoId] ?? []) : [];
  const fechasSemana = semanaActual ? generarDiasSemana(semanaActual.fecha_inicio) : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/semanas')} className="text-gray-500 hover:text-navy">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-navy">
          {semanaId ? 'Editar Semana' : 'Nuevo Registro'}
        </h1>
        {semanaActual && (
          <span className="text-sm text-gray-500">
            Semana {semanaActual.numero_semana} / {semanaActual.periodo}
          </span>
        )}
      </div>

      {/* Paso 1: Metadatos */}
      {step === 1 && (
        <div className="bg-white rounded-lg border p-6 max-w-xl">
          <h2 className="text-base font-semibold text-navy mb-4">
            Paso 1 — Información de la semana
          </h2>
          {metaError && (
            <p className="text-red-500 text-sm mb-3">{metaError}</p>
          )}
          <MetadataForm
            onSubmit={handleMetaSubmit}
            submitting={metaSubmitting}
          />
        </div>
      )}

      {/* Paso 2: Ingreso de datos */}
      {step === 2 && semanaActual && (
        <div className="space-y-4">
          {/* Selector de corredor */}
          <div className="flex gap-2 flex-wrap">
            {corredores.map(c => {
              const tieneAlgunDato = (rowsByCorredor[c.id] ?? []).some(r =>
                r.kms_programados || r.ica
              );
              return (
                <button
                  key={c.id}
                  onClick={() => setCorredorActivo(c.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 border transition-colors ${
                    corredorActivoId === c.id
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-navy border-navy/30 hover:border-navy'
                  }`}
                >
                  {c.codigo} — {c.nombre}
                  {tieneAlgunDato && (
                    <span className="w-2 h-2 rounded-full bg-green-500 ml-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selector de método + botón importar */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Método:</span>
            <span className="text-sm font-medium">Manual</span>
            <button
              className="flex items-center gap-1 text-sm text-navy hover:underline"
              onClick={() => setShowImport(true)}
            >
              <Upload className="w-4 h-4" />
              Cargar archivo
            </button>
          </div>

          {/* Tablas del corredor activo */}
          {corredor && (
            <div className="bg-white rounded-lg border p-4">
              <CorredorTab
                corredor={corredor}
                rows={rows}
                onChange={(rowIndex, campo, valor) =>
                  updateRow(corredorActivoId!, rowIndex, campo, valor)
                }
              />
            </div>
          )}

          {/* Mensajes */}
          {(error || feedback) && (
            <p className={`text-sm ${error ? 'text-red-500' : 'text-green-600'}`}>
              {error ?? feedback}
            </p>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleGuardarCorredor}
              disabled={saving}
              variant="outline"
              className="flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Guardar Corredor
            </Button>
            <Button
              onClick={handleGuardarTodo}
              disabled={saving}
              className="bg-navy text-white hover:bg-navy-dark flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Guardar Semana Completa
            </Button>
            <Button
              onClick={handleEnviarRevision}
              disabled={saving}
              className="bg-intrant-orange text-white flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              Enviar a Revisión
            </Button>
          </div>
        </div>
      )}

      {/* Modal de importación */}
      {showImport && corredorActivoId && (
        <ImportModal
          fechasSemana={fechasSemana}
          onImport={importedRows => {
            importedRows.forEach((row, i) => {
              const campos = [
                'kms_programados','kms_ejecutados','kms_efectivos','total_pasajeros',
                'servicios_programados','servicios_ejecutados','servicios_puntuales',
                'ica','ick','icd','ip','ie',
              ] as const;
              campos.forEach(campo => {
                updateRow(corredorActivoId, i, campo as keyof import('../hooks/useRegistros').RegistroRow, row[campo] as string);
              });
            });
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Ajustar el import de `useAuthStore`**

El store de auth se llama `useAuthStore` y está en `src/store/authStore.ts`. Verificar la exportación correcta:

```bash
grep -n "export" src/store/authStore.ts
```

Si exporta `useAuthStore`, el import de `Registro.tsx` es correcto. Si tiene un nombre diferente, ajustar.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Esperado: 0 errores. Corregir cualquier import incorrecto que aparezca.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Registro.tsx
git commit -m "feat: implement Registro page with 2-step flow and import support"
```

---

## Task 6: `InformePDF` — Informe oficial INTRANT

**Files:**
- Create: `src/components/reportes/InformePDF.tsx`

- [ ] **Step 1: Crear `src/components/reportes/InformePDF.tsx`**

```tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { calcTotalesCorredor } from '../../lib/formulas';
import { formatFecha } from '../../lib/dateUtils';
import type { Semana, Corredor, RegistroDiario } from '../../types';

Font.register({
  family: 'Helvetica',
  fonts: [{ src: 'Helvetica' }, { src: 'Helvetica-Bold', fontWeight: 'bold' }],
});

const NAVY  = '#1a3a5c';
const WHITE = '#ffffff';
const GRAY  = '#f5f5f5';
const BLACK = '#000000';

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 8, padding: 24, color: BLACK },
  header:      { backgroundColor: NAVY, padding: 10, marginBottom: 10 },
  headerTitle: { color: WHITE, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  headerSub:   { color: WHITE, fontSize: 9, textAlign: 'center', marginTop: 2 },
  sectionTitle:{ backgroundColor: NAVY, color: WHITE, padding: '3 6', fontWeight: 'bold',
                 fontSize: 9, marginTop: 8, marginBottom: 2 },
  table:       { border: '1 solid #cccccc' },
  th:          { backgroundColor: NAVY, color: WHITE, padding: '3 4', fontWeight: 'bold',
                 textAlign: 'center', fontSize: 7, flex: 1, borderRight: '0.5 solid #ffffff' },
  td:          { padding: '2 4', textAlign: 'center', fontSize: 7, flex: 1,
                 borderRight: '0.5 solid #cccccc', borderBottom: '0.5 solid #cccccc' },
  tdLabel:     { padding: '2 4', fontSize: 7, flex: 1.4,
                 borderRight: '0.5 solid #cccccc', borderBottom: '0.5 solid #cccccc' },
  row:         { flexDirection: 'row' },
  totalRow:    { flexDirection: 'row', backgroundColor: GRAY, fontWeight: 'bold' },
  footer:      { marginTop: 16, fontSize: 8 },
});

interface Props {
  semana: Semana;
  corredores: Corredor[];
  registros: RegistroDiario[];
}

function getRegistrosDe(corredor: Corredor, registros: RegistroDiario[]): RegistroDiario[] {
  return registros
    .filter(r => r.corredor_id === corredor.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function SeccionI({ corredor, regs }: { corredor: Corredor; regs: RegistroDiario[] }) {
  const totales = calcTotalesCorredor(regs);
  return (
    <View>
      <Text style={s.sectionTitle}>
        SECCIÓN I — KILÓMETROS Y SERVICIOS · {corredor.codigo} {corredor.nombre}
      </Text>
      <View style={s.table}>
        <View style={s.row}>
          {['Fecha','Kms Prog.','Kms Ejec.','Kms Efect.','Pasajeros',
            'Serv. Prog.','Serv. Ejec.','Serv. Punt.'].map(h => (
            <Text key={h} style={s.th}>{h}</Text>
          ))}
        </View>
        {regs.map(r => (
          <View key={r.fecha} style={s.row}>
            <Text style={s.tdLabel}>{formatFecha(r.fecha)}</Text>
            <Text style={s.td}>{r.kms_programados ?? '—'}</Text>
            <Text style={s.td}>{r.kms_ejecutados ?? '—'}</Text>
            <Text style={s.td}>{r.kms_efectivos ?? '—'}</Text>
            <Text style={s.td}>{r.total_pasajeros ?? '—'}</Text>
            <Text style={s.td}>{r.servicios_programados ?? '—'}</Text>
            <Text style={s.td}>{r.servicios_ejecutados ?? '—'}</Text>
            <Text style={s.td}>{r.servicios_puntuales ?? '—'}</Text>
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={s.tdLabel}>TOTAL</Text>
          <Text style={s.td}>{totales.kms_programados}</Text>
          <Text style={s.td}>{totales.kms_ejecutados}</Text>
          <Text style={s.td}>{totales.kms_efectivos}</Text>
          <Text style={s.td}>{totales.total_pasajeros}</Text>
          <Text style={s.td}>{totales.servicios_programados}</Text>
          <Text style={s.td}>{totales.servicios_ejecutados}</Text>
          <Text style={s.td}>{totales.servicios_puntuales}</Text>
        </View>
      </View>
    </View>
  );
}

function SeccionII({ corredor, regs }: { corredor: Corredor; regs: RegistroDiario[] }) {
  const totales = calcTotalesCorredor(regs);
  return (
    <View>
      <Text style={s.sectionTitle}>
        SECCIÓN II — INDICADORES · {corredor.codigo} {corredor.nombre}
      </Text>
      <View style={s.table}>
        <View style={s.row}>
          {['Fecha','IcA','IcK','IcD','IC','IP','IE','ICS'].map(h => (
            <Text key={h} style={s.th}>{h}</Text>
          ))}
        </View>
        {regs.map(r => (
          <View key={r.fecha} style={s.row}>
            <Text style={s.tdLabel}>{formatFecha(r.fecha)}</Text>
            <Text style={s.td}>{r.ica?.toFixed(2) ?? '—'}</Text>
            <Text style={s.td}>{r.ick?.toFixed(2) ?? '—'}</Text>
            <Text style={s.td}>{r.icd?.toFixed(2) ?? '—'}</Text>
            <Text style={s.td}>{r.ic?.toFixed(2)  ?? '—'}</Text>
            <Text style={s.td}>{r.ip?.toFixed(2)  ?? '—'}</Text>
            <Text style={s.td}>{r.ie?.toFixed(2)  ?? '—'}</Text>
            <Text style={s.td}>{r.ics?.toFixed(2) ?? '—'}</Text>
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={s.tdLabel}>PROM</Text>
          <Text style={s.td}>{totales.ica_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ick_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.icd_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ic_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ip_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ie_prom.toFixed(2)}</Text>
          <Text style={s.td}>{totales.ics_prom.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

export function InformePDF({ semana, corredores, registros }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Encabezado */}
        <View style={s.header}>
          <Text style={s.headerTitle}>
            SEMANA OPERACIONAL {semana.numero_semana} — PERIODO {semana.periodo}
          </Text>
          <Text style={s.headerSub}>
            Corredores Interoperables del Gran Santo Domingo · INTRANT / SITPSD
          </Text>
          <Text style={s.headerSub}>
            Del {semana.fecha_inicio} al {semana.fecha_fin}
          </Text>
        </View>

        {/* Tablas por corredor */}
        {corredores.map(corredor => {
          const regs = getRegistrosDe(corredor, registros);
          return (
            <View key={corredor.id} wrap={false}>
              <SeccionI corredor={corredor} regs={regs} />
              <SeccionII corredor={corredor} regs={regs} />
            </View>
          );
        })}

        {/* Pie */}
        <View style={s.footer}>
          {semana.validado_por && (
            <Text>Revisado y validado por: {semana.validado_por}</Text>
          )}
          {semana.observaciones && (
            <Text style={{ marginTop: 4 }}>Observaciones: {semana.observaciones}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Esperado: 0 errores. `@react-pdf/renderer` usa sus propios tipos internos, puede haber warnings menores de `any` — son aceptables.

- [ ] **Step 3: Commit**

```bash
git add src/components/reportes/InformePDF.tsx
git commit -m "feat: add InformePDF component with INTRANT official format"
```

---

## Task 7: `exportExcel.ts` — Exportar a Excel

**Files:**
- Create: `src/lib/exportExcel.ts`

- [ ] **Step 1: Crear `src/lib/exportExcel.ts`**

```ts
import * as XLSX from 'xlsx';
import { calcTotalesCorredor } from './formulas';
import { formatFecha } from './dateUtils';
import type { Semana, Corredor, RegistroDiario } from '../types';

export function exportSemanaExcel(
  semana: Semana,
  corredores: Corredor[],
  registros: RegistroDiario[]
): void {
  const wb = XLSX.utils.book_new();

  for (const corredor of corredores) {
    const regs = registros
      .filter(r => r.corredor_id === corredor.id)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const totales = calcTotalesCorredor(regs);

    // Sección I
    const secI: unknown[][] = [
      [`Semana ${semana.numero_semana} | Período ${semana.periodo} | ${semana.fecha_inicio} — ${semana.fecha_fin}`],
      [`CORREDOR: ${corredor.codigo} — ${corredor.nombre}`],
      [],
      ['Fecha','Kms Prog.','Kms Ejec.','Kms Efect.','Pasajeros',
       'Serv. Prog.','Serv. Ejec.','Serv. Punt.'],
      ...regs.map(r => [
        formatFecha(r.fecha),
        r.kms_programados ?? '', r.kms_ejecutados ?? '', r.kms_efectivos ?? '',
        r.total_pasajeros ?? '',
        r.servicios_programados ?? '', r.servicios_ejecutados ?? '', r.servicios_puntuales ?? '',
      ]),
      ['TOTAL',
        totales.kms_programados, totales.kms_ejecutados, totales.kms_efectivos,
        totales.total_pasajeros,
        totales.servicios_programados, totales.servicios_ejecutados, totales.servicios_puntuales,
      ],
      [],
      // Sección II en la misma hoja, debajo
      ['SECCIÓN II — INDICADORES'],
      ['Fecha','IcA','IcK','IcD','IC','IP','IE','ICS'],
      ...regs.map(r => [
        formatFecha(r.fecha),
        r.ica ?? '', r.ick ?? '', r.icd ?? '', r.ic ?? '',
        r.ip  ?? '', r.ie  ?? '', r.ics ?? '',
      ]),
      ['PROM',
        totales.ica_prom, totales.ick_prom, totales.icd_prom, totales.ic_prom,
        totales.ip_prom,  totales.ie_prom,  totales.ics_prom,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(secI);
    XLSX.utils.book_append_sheet(wb, ws, `${corredor.codigo}`);
  }

  const filename = `SIGO_Semana${semana.numero_semana}_P${semana.periodo}.xlsx`;
  XLSX.writeFile(wb, filename);
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/exportExcel.ts
git commit -m "feat: add exportSemanaExcel utility with SheetJS"
```

---

## Task 8: Página `Reportes`

**Files:**
- Modify: `src/pages/Reportes.tsx`

- [ ] **Step 1: Reemplazar el shell con la página de reportes**

```tsx
import { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../lib/supabase';
import { InformePDF } from '../components/reportes/InformePDF';
import { exportSemanaExcel } from '../lib/exportExcel';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import type { Semana, Corredor, RegistroDiario } from '../types';

export default function Reportes() {
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [corredores, setCorredores] = useState<Corredor[]>([]);
  const [semanaId, setSemanaId] = useState<string>('');
  const [registros, setRegistros] = useState<RegistroDiario[]>([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar semanas validadas o publicadas + corredores
  useEffect(() => {
    async function load() {
      const [{ data: sems }, { data: cors }] = await Promise.all([
        supabase.from('semanas')
          .select('*')
          .in('estado', ['validado', 'publicado'])
          .order('periodo', { ascending: false })
          .order('numero_semana', { ascending: false }),
        supabase.from('corredores')
          .select('*')
          .eq('activo', true)
          .order('orden'),
      ]);
      setSemanas((sems ?? []) as Semana[]);
      setCorredores((cors ?? []) as Corredor[]);
    }
    load();
  }, []);

  // Cargar registros cuando se selecciona una semana
  useEffect(() => {
    if (!semanaId) { setRegistros([]); return; }
    setLoading(true);
    supabase.from('registros_diarios')
      .select('*')
      .eq('semana_id', semanaId)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRegistros((data ?? []) as RegistroDiario[]);
        setLoading(false);
      });
  }, [semanaId]);

  const semanaSeleccionada = semanas.find(s => s.id === semanaId) ?? null;

  async function descargarPDF() {
    if (!semanaSeleccionada) return;
    setGenerando(true);
    try {
      const blob = await pdf(
        <InformePDF
          semana={semanaSeleccionada}
          corredores={corredores}
          registros={registros}
        />
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-navy">Reportes</h1>

      {/* Reporte 1: Informe Semanal Oficial */}
      <div className="bg-white rounded-lg border p-6 max-w-2xl">
        <h2 className="text-base font-semibold text-navy mb-1">
          Informe Semanal Oficial
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Formato oficial INTRANT / SITPSD con Sección I y Sección II por corredor.
        </p>

        <div className="space-y-4">
          {/* Selector de semana */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar semana
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              value={semanaId}
              onChange={e => setSemanaId(e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {semanas.map(s => (
                <option key={s.id} value={s.id}>
                  Semana {s.numero_semana} / {s.periodo} ({s.fecha_inicio} → {s.fecha_fin})
                </option>
              ))}
            </select>
          </div>

          {/* Resumen de la semana seleccionada */}
          {semanaSeleccionada && (
            <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
              <p><span className="font-medium">Estado:</span>{' '}
                <span className={`capitalize font-medium ${
                  semanaSeleccionada.estado === 'validado' ? 'text-green-600' : 'text-blue-600'
                }`}>
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

          {/* Botones de descarga */}
          <div className="flex gap-3">
            <Button
              onClick={descargarPDF}
              disabled={!semanaSeleccionada || loading || generando}
              className="bg-navy text-white hover:bg-navy-dark flex items-center gap-2"
            >
              {generando
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileDown className="w-4 h-4" />
              }
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

      {/* Placeholder: Reportes futuros */}
      <div className="bg-white rounded-lg border p-6 max-w-2xl opacity-50">
        <h2 className="text-base font-semibold text-navy mb-1">Resumen Mensual</h2>
        <p className="text-sm text-gray-500">Disponible en Fase 2.</p>
      </div>

      <div className="bg-white rounded-lg border p-6 max-w-2xl opacity-50">
        <h2 className="text-base font-semibold text-navy mb-1">Comparativo de Corredores</h2>
        <p className="text-sm text-gray-500">Disponible en Fase 2.</p>
      </div>

      <div className="bg-white rounded-lg border p-6 max-w-2xl opacity-50">
        <h2 className="text-base font-semibold text-navy mb-1">Tendencia de Indicadores</h2>
        <p className="text-sm text-gray-500">Disponible en Fase 2.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check final**

```bash
npm run build
```

Esperado: 0 errores de TypeScript. Si hay error con `pdf()` de `@react-pdf/renderer` en un módulo ESM, agregar al `vite.config.ts`:

```ts
// vite.config.ts — en optimizeDeps.include:
optimizeDeps: {
  include: ['@react-pdf/renderer'],
}
```

- [ ] **Step 3: Commit final**

```bash
git add src/pages/Reportes.tsx
git commit -m "feat: implement Reportes page with PDF and Excel export"
```

- [ ] **Step 4: Push al repositorio**

```bash
git push
```

---

## Criterios de Éxito Fase 1C

1. `npm run build` completa sin errores.
2. `/registro/nuevo` muestra el Paso 1 (MetadataForm) correctamente.
3. Tras crear la semana, el Paso 2 muestra las tabs de corredores.
4. Ingresar IcA/IcK/IcD en cualquier fila auto-calcula IC. Ingresar IP/IE auto-calcula ICS con el color correcto.
5. "Guardar Corredor" llama a `upsert_registros_semana` sin error (cuando Supabase esté conectado).
6. Modal de importación acepta un archivo CSV o Excel, muestra preview y mapeo de columnas.
7. `/reportes` lista las semanas validadas/publicadas y permite descargar el PDF oficial con Sección I y II por corredor.
8. El Excel descargado tiene una hoja por corredor con Sección I y Sección II.
