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
