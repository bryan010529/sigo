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
