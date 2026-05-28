import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CanastaCosto, CanastaCostoConCorredor } from '../types';

type FormData = Omit<CanastaCosto, 'id' | 'created_at' | 'updated_at'>;
type UpdateData = Partial<Omit<FormData, 'corredor_id'>>;

export interface UseCanastaCostoResult {
  canastas: CanastaCostoConCorredor[];
  loading: boolean;
  error: string | null;
  crear: (data: FormData) => Promise<string | null>;
  actualizar: (id: string, data: UpdateData) => Promise<string | null>;
  eliminar: (id: string) => Promise<string | null>;
  refetch: () => void;
}

export function useCanastaCosto(): UseCanastaCostoResult {
  const [canastas, setCanastas] = useState<CanastaCostoConCorredor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from('canasta_costo')
      .select('*, corredor:corredores(codigo, nombre)')
      .order('año', { ascending: false })
      .then(({ data, error: err }) => {
        if (!mounted) return;
        if (err) setError(err.message);
        else setCanastas((data ?? []) as CanastaCostoConCorredor[]);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [tick]);

  const crear = useCallback(async (data: FormData): Promise<string | null> => {
    const { error: err } = await supabase.from('canasta_costo').insert(data);
    if (err) return err.message;
    refetch();
    return null;
  }, [refetch]);

  const actualizar = useCallback(async (id: string, data: UpdateData): Promise<string | null> => {
    const { error: err } = await supabase.from('canasta_costo').update(data).eq('id', id);
    if (err) return err.message;
    refetch();
    return null;
  }, [refetch]);

  const eliminar = useCallback(async (id: string): Promise<string | null> => {
    const { error: err } = await supabase.from('canasta_costo').delete().eq('id', id);
    if (err) return err.message;
    refetch();
    return null;
  }, [refetch]);

  return { canastas, loading, error, crear, actualizar, eliminar, refetch };
}
