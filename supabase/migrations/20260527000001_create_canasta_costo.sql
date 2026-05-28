-- ============================================================
-- SIGO · Migración 008: crear tabla canasta_costo
-- ============================================================

CREATE TABLE public.canasta_costo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corredor_id uuid NOT NULL REFERENCES public.corredores(id) ON DELETE CASCADE,
  año integer NOT NULL,
  costo_por_km numeric(10,4) NOT NULL,
  combustible_pct numeric(5,2) NOT NULL DEFAULT 0,
  conductores_pct numeric(5,2) NOT NULL DEFAULT 0,
  patio_pct numeric(5,2) NOT NULL DEFAULT 0,
  administracion_pct numeric(5,2) NOT NULL DEFAULT 0,
  mantenimiento_pct numeric(5,2) NOT NULL DEFAULT 0,
  otros_pct numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(corredor_id, año)
);

CREATE TRIGGER set_updated_at_canasta_costo
  BEFORE UPDATE ON public.canasta_costo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.canasta_costo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "canasta_costo_select" ON public.canasta_costo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "canasta_costo_insert" ON public.canasta_costo
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
  );

CREATE POLICY "canasta_costo_update" ON public.canasta_costo
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
  );

CREATE POLICY "canasta_costo_delete" ON public.canasta_costo
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
  );

-- Eliminar costo_por_km de corredores (migra a canasta_costo)
ALTER TABLE public.corredores DROP COLUMN IF EXISTS costo_por_km;
