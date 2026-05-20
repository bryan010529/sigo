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
