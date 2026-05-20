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
