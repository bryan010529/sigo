import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Corredor } from '../types';

export interface UseCorredoresAdminResult {
  corredores: Corredor[];
  loading: boolean;
  error: string | null;
  crearCorredor: (codigo: string, nombre: string) => Promise<string | null>;
  editarCorredor: (
    id: string,
    campos: Partial<Pick<Corredor, 'nombre' | 'activo'>>
  ) => Promise<string | null>;
  moverArriba: (id: string) => Promise<void>;
  moverAbajo: (id: string) => Promise<void>;
  refetch: () => void;
}

export function useCorredoresAdmin(): UseCorredoresAdminResult {
  const [corredores, setCorredores] = useState<Corredor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from('corredores')
      .select('*')
      .order('orden', { ascending: true })
      .then(({ data, error: err }) => {
        if (!mounted) return;
        if (err) setError(err.message);
        else setCorredores((data ?? []) as Corredor[]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [tick]);

  const crearCorredor = useCallback(
    async (codigo: string, nombre: string): Promise<string | null> => {
      const maxOrden = corredores.reduce((m, c) => Math.max(m, c.orden), 0);
      const { error: err } = await supabase.from('corredores').insert({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        activo: true,
        orden: maxOrden + 1,
      });
      if (err) return err.message;
      refetch();
      return null;
    },
    [corredores, refetch]
  );

  const editarCorredor = useCallback(
    async (
      id: string,
      campos: Partial<Pick<Corredor, 'nombre' | 'activo'>>
    ): Promise<string | null> => {
      const { error: err } = await supabase.from('corredores').update(campos).eq('id', id);
      if (err) return err.message;
      refetch();
      return null;
    },
    [refetch]
  );

  // Intercambia el orden de dos corredores adyacentes
  async function swapOrden(idA: string, ordenA: number, idB: string, ordenB: number) {
    await supabase.from('corredores').update({ orden: ordenB }).eq('id', idA);
    await supabase.from('corredores').update({ orden: ordenA }).eq('id', idB);
    refetch();
  }

  const moverArriba = useCallback(
    async (id: string) => {
      const idx = corredores.findIndex(c => c.id === id);
      if (idx <= 0) return;
      const curr = corredores[idx];
      const prev = corredores[idx - 1];
      await swapOrden(curr.id, curr.orden, prev.id, prev.orden);
    },
    [corredores]
  );

  const moverAbajo = useCallback(
    async (id: string) => {
      const idx = corredores.findIndex(c => c.id === id);
      if (idx < 0 || idx >= corredores.length - 1) return;
      const curr = corredores[idx];
      const next = corredores[idx + 1];
      await swapOrden(curr.id, curr.orden, next.id, next.orden);
    },
    [corredores]
  );

  return {
    corredores,
    loading,
    error,
    crearCorredor,
    editarCorredor,
    moverArriba,
    moverAbajo,
    refetch,
  };
}
