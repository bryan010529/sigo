import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Usuario } from '../types';

export async function fetchUsuario(userId: string): Promise<{ usuario: Usuario | null; errorMsg: string | null }> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return { usuario: null, errorMsg: `${error.code}: ${error.message}` };
  return { usuario: data as Usuario, errorMsg: null };
}

export function useAuth() {
  const { setUsuario, setLoading, reset } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    // Restaurar sesión existente al cargar la app (ej: reload de página)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const { usuario } = await fetchUsuario(session.user.id);
        if (mounted) setUsuario(usuario);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, _session) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT') {
          reset();
        }
        // SIGNED_IN es manejado en Login.tsx directamente para evitar
        // el timing issue donde el JWT no está listo para queries RLS
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUsuario, setLoading, reset]);
}
