import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  KpiPeriodoFiltro,
  KpiCorredorRow,
  KpiPeriodoTotales,
  KpiPeriodoResult,
  RegistroDiario,
} from '../types';

function safePct(num: number, den: number): number | null {
  if (den === 0) return null;
  return parseFloat(((num / den) * 100).toFixed(2));
}

const EMPTY_TOTALES: KpiPeriodoTotales = {
  kmsProgramados: 0,
  kmsEjecutados: 0,
  kmsEfectivos: 0,
  costoProgramado: 0,
  costoEjecutado: 0,
  costoEfectivo: 0,
  pctCumplimiento: null,
  pctEfectividad: null,
  pctAprovechamiento: null,
  brechaCosto: 0,
};

async function fetchKpiData(
  filtro: KpiPeriodoFiltro
): Promise<{ filas: KpiCorredorRow[]; totales: KpiPeriodoTotales }> {
  // 1. Corredores activos
  const { data: corrData, error: corrErr } = await supabase
    .from('corredores')
    .select('id, codigo, nombre')
    .eq('activo', true)
    .order('orden');
  if (corrErr) throw corrErr;
  const corredores = (corrData ?? []) as { id: string; codigo: string; nombre: string }[];

  // 2. Obtener IDs de semanas validadas para el período y el año de referencia
  let semanaIds: string[] = [];
  let año = filtro.año ?? new Date().getFullYear();

  if (filtro.tipo === 'semana' && filtro.semanaId) {
    semanaIds = [filtro.semanaId];
    const { data: semData, error: semYearErr } = await supabase
      .from('semanas')
      .select('periodo')
      .eq('id', filtro.semanaId)
      .single();
    if (semYearErr) throw semYearErr;
    if (semData) año = semData.periodo;

  } else if (filtro.tipo === 'mes' && filtro.mes && filtro.año) {
    año = filtro.año;
    const mesStr = String(filtro.mes).padStart(2, '0');
    const fechaInicio = `${año}-${mesStr}-01`;
    const lastDay = new Date(año, filtro.mes, 0).getDate();
    const fechaFin = `${año}-${mesStr}-${String(lastDay).padStart(2, '0')}`;
    const { data: semData, error: semErr } = await supabase
      .from('semanas')
      .select('id')
      .in('estado', ['validado', 'publicado'])
      .lte('fecha_inicio', fechaFin)
      .gte('fecha_fin', fechaInicio);
    if (semErr) throw semErr;
    semanaIds = (semData ?? []).map(s => s.id);

  } else if (filtro.tipo === 'año' && filtro.año) {
    año = filtro.año;
    const { data: semData, error: semErr } = await supabase
      .from('semanas')
      .select('id')
      .in('estado', ['validado', 'publicado'])
      .eq('periodo', año);
    if (semErr) throw semErr;
    semanaIds = (semData ?? []).map(s => s.id);
  }

  // 3. Registros del período
  let registros: RegistroDiario[] = [];
  if (semanaIds.length > 0) {
    const { data: regData, error: regErr } = await supabase
      .from('registros_diarios')
      .select('corredor_id, kms_programados, kms_ejecutados, kms_efectivos, tiene_datos')
      .in('semana_id', semanaIds)
      .eq('tiene_datos', true);
    if (regErr) throw regErr;
    registros = (regData ?? []) as RegistroDiario[];
  }

  // 4. Canasta de costo para el año (lookup por corredor)
  const { data: canastaData, error: canastaErr } = await supabase
    .from('canasta_costo')
    .select('corredor_id, costo_por_km')
    .eq('año', año);
  if (canastaErr) throw canastaErr;
  const canastaMap = new Map<string, number>(
    (canastaData ?? []).map(c => [c.corredor_id, Number(c.costo_por_km)])
  );

  // 5. Calcular fila por corredor
  const filas: KpiCorredorRow[] = corredores.map(c => {
    const regs = registros.filter(r => r.corredor_id === c.id);
    const kmsProg = parseFloat(
      regs.reduce((a, r) => a + (Number(r.kms_programados) || 0), 0).toFixed(2)
    );
    const kmsEjec = parseFloat(
      regs.reduce((a, r) => a + (Number(r.kms_ejecutados) || 0), 0).toFixed(2)
    );
    const kmsEfec = parseFloat(
      regs.reduce((a, r) => a + (Number(r.kms_efectivos) || 0), 0).toFixed(2)
    );
    const ckm = canastaMap.get(c.id) ?? 0;
    return {
      corredorId: c.id,
      corredorCodigo: c.codigo,
      corredorNombre: c.nombre,
      kmsProgramados: kmsProg,
      kmsEjecutados: kmsEjec,
      kmsEfectivos: kmsEfec,
      costoProgramado: parseFloat((kmsProg * ckm).toFixed(2)),
      costoEjecutado: parseFloat((kmsEjec * ckm).toFixed(2)),
      costoEfectivo: parseFloat((kmsEfec * ckm).toFixed(2)),
      pctCumplimiento: safePct(kmsEjec, kmsProg),
      pctEfectividad: safePct(kmsEfec, kmsEjec),
      pctAprovechamiento: safePct(kmsEfec, kmsProg),
      brechaCosto: parseFloat(((kmsProg - kmsEjec) * ckm).toFixed(2)),
      sinCanasta: !canastaMap.has(c.id),
    };
  });

  // 6. Totales globales
  const tProg = filas.reduce((a, f) => a + f.kmsProgramados, 0);
  const tEjec = filas.reduce((a, f) => a + f.kmsEjecutados, 0);
  const tEfec = filas.reduce((a, f) => a + f.kmsEfectivos, 0);
  const totales: KpiPeriodoTotales = {
    kmsProgramados: parseFloat(tProg.toFixed(2)),
    kmsEjecutados: parseFloat(tEjec.toFixed(2)),
    kmsEfectivos: parseFloat(tEfec.toFixed(2)),
    costoProgramado: parseFloat(filas.reduce((a, f) => a + f.costoProgramado, 0).toFixed(2)),
    costoEjecutado: parseFloat(filas.reduce((a, f) => a + f.costoEjecutado, 0).toFixed(2)),
    costoEfectivo: parseFloat(filas.reduce((a, f) => a + f.costoEfectivo, 0).toFixed(2)),
    pctCumplimiento: safePct(tEjec, tProg),
    pctEfectividad: safePct(tEfec, tEjec),
    pctAprovechamiento: safePct(tEfec, tProg),
    brechaCosto: parseFloat(filas.reduce((a, f) => a + f.brechaCosto, 0).toFixed(2)),
  };

  return { filas, totales };
}

export function useKpiPeriodo(filtro: KpiPeriodoFiltro | null): KpiPeriodoResult {
  const [state, setState] = useState<KpiPeriodoResult>({
    filas: [],
    totales: EMPTY_TOTALES,
    loading: false,
    error: null,
  });

  const run = useCallback(() => {
    if (!filtro) {
      setState({ filas: [], totales: EMPTY_TOTALES, loading: false, error: null });
      return;
    }
    setState(prev => ({ ...prev, loading: true, error: null }));
    fetchKpiData(filtro)
      .then(({ filas, totales }) =>
        setState({ filas, totales, loading: false, error: null })
      )
      .catch(err =>
        setState(prev => ({ ...prev, loading: false, error: String(err.message) }))
      );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro?.tipo, filtro?.semanaId, filtro?.mes, filtro?.año]);

  useEffect(() => { run(); }, [run]);

  return state;
}
