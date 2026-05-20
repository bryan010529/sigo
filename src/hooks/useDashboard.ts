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
