import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AuditoriaEntry {
  id: string;
  tabla: string;
  registro_id: string | null;
  accion: string;
  datos_antes: Record<string, unknown> | null;
  datos_nuevo: Record<string, unknown> | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  created_at: string;
}

export interface AuditoriaFiltros {
  usuarioId: string;
  accion: string;
  desde: string;
  hasta: string;
}

export interface UseAuditoriaResult {
  entradas: AuditoriaEntry[];
  loading: boolean;
  error: string | null;
  filtros: AuditoriaFiltros;
  setFiltros: (f: Partial<AuditoriaFiltros>) => void;
}

const FILTROS_DEFAULT: AuditoriaFiltros = {
  usuarioId: '',
  accion: '',
  desde: '',
  hasta: '',
};

export function useAuditoria(): UseAuditoriaResult {
  const [entradas, setEntradas] = useState<AuditoriaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltrosState] = useState<AuditoriaFiltros>(FILTROS_DEFAULT);

  function setFiltros(f: Partial<AuditoriaFiltros>) {
    setFiltrosState(prev => ({ ...prev, ...f }));
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    let query = supabase
      .from('auditoria_log')
      .select(
        `
        id, tabla, registro_id, accion,
        datos_antes, datos_nuevo, usuario_id, created_at,
        usuarios ( nombre, email )
      `
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (filtros.usuarioId) query = query.eq('usuario_id', filtros.usuarioId);
    if (filtros.accion) query = query.eq('accion', filtros.accion);
    if (filtros.desde) query = query.gte('created_at', filtros.desde);
    if (filtros.hasta) query = query.lte('created_at', `${filtros.hasta}T23:59:59`);

    query.then(({ data, error: err }) => {
      if (!mounted) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const mapped: AuditoriaEntry[] = (data ?? []).map((r: Record<string, unknown>) => {
        const u = r.usuarios as { nombre: string; email: string } | null;
        return {
          id: r.id as string,
          tabla: r.tabla as string,
          registro_id: r.registro_id as string | null,
          accion: r.accion as string,
          datos_antes: r.datos_antes as Record<string, unknown> | null,
          datos_nuevo: r.datos_nuevo as Record<string, unknown> | null,
          usuario_id: r.usuario_id as string | null,
          usuario_nombre: u?.nombre ?? null,
          usuario_email: u?.email ?? null,
          created_at: r.created_at as string,
        };
      });
      setEntradas(mapped);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [filtros]);

  return { entradas, loading, error, filtros, setFiltros };
}
