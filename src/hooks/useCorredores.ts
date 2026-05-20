import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Corredor } from '../types';

export function useCorredores() {
  const [corredores, setCorredores] = useState<Corredor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('corredores')
      .select('*')
      .eq('activo', true)
      .order('orden')
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) { setError(err.message); return; }
        setCorredores((data || []) as Corredor[]);
      });
  }, []);

  return { corredores, loading, error };
}
