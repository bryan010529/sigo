# KPI Costo por KM — Design Spec
**Fecha:** 2026-05-28

## Resumen

Módulo de KPIs operativos que cruza los kilómetros registrados (programados, ejecutados, efectivos) con la canasta de costo para generar totales monetarios y métricas de eficiencia por período. Se monta tanto en el Dashboard como en Reportes como un componente reutilizable.

---

## Datos y cálculos

### Fuentes de datos
- `registros_diarios`: kms_programados, kms_ejecutados, kms_efectivos, corredor_id, fecha
- `canasta_costo`: costo_por_km por corredor × año (lookup: corredor_id + YEAR(fecha))
- `semanas`: para el filtro por semana (id, numero_semana, periodo, fecha_inicio, fecha_fin)
- `corredores`: lista activa para el desglose por corredor

### KPIs base (por período seleccionado)
| Campo | Cálculo |
|-------|---------|
| Total KMs Programados | SUM(kms_programados) |
| Total KMs Ejecutados | SUM(kms_ejecutados) |
| Total KMs Efectivos | SUM(kms_efectivos) |
| Costo Programado | SUM(kms_programados × costo_por_km) |
| Costo Ejecutado | SUM(kms_ejecutados × costo_por_km) |
| Costo Efectivo | SUM(kms_efectivos × costo_por_km) |

### KPIs cruzados
| KPI | Fórmula | Color umbral |
|-----|---------|-------------|
| % Cumplimiento | ejecutados / programados × 100 | Verde ≥95%, amarillo ≥85%, rojo <85% |
| % Efectividad | efectivos / ejecutados × 100 | Verde ≥95%, amarillo ≥85%, rojo <85% |
| % Aprovechamiento global | efectivos / programados × 100 | Verde ≥90%, amarillo ≥80%, rojo <80% |
| Brecha de costo | (programados − ejecutados) × costo_por_km | Siempre en rojo/naranja si > 0 |

### Lookup canasta de costo
Para cada registro diario: buscar `canasta_costo` donde `corredor_id = registro.corredor_id AND año = YEAR(registro.fecha)`. Si no existe canasta para ese corredor/año, el costo se asume 0 y se marca como "sin canasta".

---

## Filtro de período

El usuario selecciona uno de tres tipos:

| Tipo | Selector | Query |
|------|---------|-------|
| Semana | Dropdown de semanas validadas/publicadas | WHERE semana_id = ? |
| Mes | Selector mes (1-12) + año | WHERE fecha BETWEEN inicio_mes AND fin_mes |
| Año | Selector año | WHERE YEAR(fecha) = ? |

---

## Interfaz de usuario

### Ubicación
- **Dashboard**: sección nueva debajo de los KPIs/gráficas actuales, título "KPIs de Costo Operativo"
- **Reportes**: nueva sección con su bloque independiente de filtros

### Layout del componente KpiPanel

**Selector de período** — tabs: Semana | Mes | Año + campos de selección correspondientes + botón Aplicar

**Fila 1 — Tarjetas de KMs y costo (3 cards)**
- KMs Programados · RD$ programado (azul)
- KMs Ejecutados · RD$ ejecutado (verde)
- KMs Efectivos · RD$ efectivo (teal)

**Fila 2 — KPIs cruzados (4 cards)**
- % Cumplimiento con badge color dinámico
- % Efectividad con badge color dinámico
- % Aprovechamiento global con badge color dinámico
- Brecha de costo RD$ (naranja/rojo)

**Tabla de desglose por corredor** (visible siempre, no colapsable)
Columnas: Corredor | KMs Prog. | KMs Ejec. | KMs Efect. | % Cumpl. | % Efect. | % Aprov. | Costo Prog. | Costo Ejec. | Brecha RD$

**Fila de totales** en pie de tabla.

---

## Componentes y archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/hooks/useKpiPeriodo.ts` | Fetch + cálculo de todos los KPIs dado un filtro de período |
| `src/components/kpi/KpiPanel.tsx` | UI completa: selector de período + cards + tabla |
| `src/pages/Dashboard.tsx` | Montar `<KpiPanel />` debajo de sección actual |
| `src/pages/Reportes.tsx` | Montar `<KpiPanel />` como nueva sección |

---

## Tipos TypeScript

```typescript
export type KpiPeriodoTipo = 'semana' | 'mes' | 'año';

export interface KpiPeriodoFiltro {
  tipo: KpiPeriodoTipo;
  semanaId?: string;
  mes?: number;
  año?: number;
}

export interface KpiCorredorRow {
  corredorId: string;
  corredorCodigo: string;
  corredorNombre: string;
  kmsProgramados: number;
  kmsEjecutados: number;
  kmsEfectivos: number;
  costoProgramado: number;
  costoEjecutado: number;
  costoEfectivo: number;
  pctCumplimiento: number | null;
  pctEfectividad: number | null;
  pctAprovechamiento: number | null;
  brechaCosto: number;
  sinCanasta: boolean;
}

export interface KpiPeriodoResult {
  filas: KpiCorredorRow[];
  totales: Omit<KpiCorredorRow, 'corredorId' | 'corredorCodigo' | 'corredorNombre' | 'sinCanasta'>;
  loading: boolean;
  error: string | null;
}
```
