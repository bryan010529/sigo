-- ============================================================
-- SIGO · Migración 006: Fix RLS infinite recursion en usuarios
-- ============================================================

-- Función SECURITY DEFINER para obtener el rol del usuario actual
-- sin pasar por RLS (evita la recursión)
CREATE OR REPLACE FUNCTION public.get_mi_rol()
RETURNS TEXT AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Reemplazar la política recursiva
DROP POLICY IF EXISTS "usuarios_select_propio" ON public.usuarios;

CREATE POLICY "usuarios_select_propio" ON public.usuarios
  FOR SELECT USING (
    id = auth.uid()
    OR public.get_mi_rol() = 'admin'
  );
