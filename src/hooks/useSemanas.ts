import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Semana, EstadoSemana } from '../types';
import { useAuthStore } from '../store/authStore';

interface FiltrosSemanas {
  estado?: EstadoSemana | '';
  numero_semana?: number | '';
  periodo?: number | '';
  corredor_id?: string;
}

interface UseSemanas {
  semanas: Semana[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  enviarARevision: (id: string) => Promise<void>;
  aprobar: (id: string) => Promise<void>;
  rechazar: (id: string, comentario: string) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  publicar: (id: string) => Promise<void>;
}

export function useSemanas(filtros: FiltrosSemanas = {}): UseSemanas {
  const { usuario } = useAuthStore();
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('semanas')
      .select('*')
      .order('numero_semana', { ascending: false });

    if (filtros.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros.numero_semana) {
      query = query.eq('numero_semana', filtros.numero_semana);
    }
    if (filtros.periodo) {
      query = query.eq('periodo', filtros.periodo);
    }

    query.then(({ data, error: err }) => {
      setLoading(false);
      if (err) { setError(err.message); return; }
      setSemanas((data || []) as Semana[]);
    });
  }, [filtros.estado, filtros.numero_semana, filtros.periodo]);

  useEffect(() => { refetch(); }, [refetch]);

  async function enviarARevision(id: string) {
    const { error: err } = await supabase
      .from('semanas')
      .update({ estado: 'en_revision' })
      .eq('id', id);
    if (err) throw new Error(err.message);
    refetch();
  }

  async function aprobar(id: string) {
    const { error: err } = await supabase
      .from('semanas')
      .update({
        estado: 'validado',
        validado_por: usuario?.id,
        validado_en: new Date().toISOString(),
      })
      .eq('id', id);
    if (err) throw new Error(err.message);
    refetch();
  }

  async function rechazar(id: string, comentario: string) {
    const { error: err } = await supabase
      .from('semanas')
      .update({ estado: 'borrador', comentario_rechazo: comentario })
      .eq('id', id);
    if (err) throw new Error(err.message);
    refetch();
  }

  async function eliminar(id: string) {
    const { error: err } = await supabase
      .from('semanas')
      .delete()
      .eq('id', id);
    if (err) throw new Error(err.message);
    refetch();
  }

  async function publicar(id: string) {
    const { error: err } = await supabase
      .from('semanas')
      .update({ estado: 'publicado' })
      .eq('id', id);
    if (err) throw new Error(err.message);
    refetch();
  }

  return { semanas, loading, error, refetch, enviarARevision, aprobar, rechazar, eliminar, publicar };
}
