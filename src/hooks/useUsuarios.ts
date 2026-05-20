import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Rol, Usuario } from '../types';

export interface UseUsuariosResult {
  usuarios: Usuario[];
  loading: boolean;
  error: string | null;
  crearUsuario: (email: string, nombre: string, rol: Rol, password: string) => Promise<string | null>;
  editarRol: (id: string, rol: Rol) => Promise<string | null>;
  toggleActivo: (id: string, activo: boolean) => Promise<string | null>;
  refetch: () => void;
}

export function useUsuarios(): UseUsuariosResult {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (!mounted) return;
        if (err) setError(err.message);
        else setUsuarios((data ?? []) as Usuario[]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [tick]);

  const crearUsuario = useCallback(
    async (email: string, nombre: string, rol: Rol, password: string): Promise<string | null> => {
      // 1. Crear en Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authErr) return authErr.message;
      if (!authData.user) return 'No se pudo crear el usuario en Auth';

      // 2. Insertar perfil en tabla usuarios
      const { error: insertErr } = await supabase.from('usuarios').insert({
        id: authData.user.id,
        email,
        nombre,
        rol,
        activo: true,
      });
      if (insertErr) return insertErr.message;

      refetch();
      return null; // null = sin error
    },
    [refetch]
  );

  const editarRol = useCallback(
    async (id: string, rol: Rol): Promise<string | null> => {
      const { error: err } = await supabase
        .from('usuarios')
        .update({ rol })
        .eq('id', id);
      if (err) return err.message;
      refetch();
      return null;
    },
    [refetch]
  );

  const toggleActivo = useCallback(
    async (id: string, activo: boolean): Promise<string | null> => {
      const { error: err } = await supabase
        .from('usuarios')
        .update({ activo })
        .eq('id', id);
      if (err) return err.message;
      refetch();
      return null;
    },
    [refetch]
  );

  return { usuarios, loading, error, crearUsuario, editarRol, toggleActivo, refetch };
}
