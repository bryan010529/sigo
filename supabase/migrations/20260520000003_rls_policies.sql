-- ============================================================
-- SIGO · Migración 003: Row Level Security
-- ============================================================

ALTER TABLE public.usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corredores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semanas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_log     ENABLE ROW LEVEL SECURITY;

-- USUARIOS
CREATE POLICY "usuarios_select_propio" ON public.usuarios
  FOR SELECT USING (
    id = auth.uid()
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "usuarios_update_admin" ON public.usuarios
  FOR UPDATE USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "usuarios_insert_admin" ON public.usuarios
  FOR INSERT WITH CHECK (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

-- CORREDORES
CREATE POLICY "corredores_select_all" ON public.corredores
  FOR SELECT USING (
    (SELECT activo FROM public.usuarios WHERE id = auth.uid()) = TRUE
  );

CREATE POLICY "corredores_admin" ON public.corredores
  FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

-- SEMANAS
CREATE POLICY "semanas_select" ON public.semanas
  FOR SELECT USING (
    creado_por = auth.uid()
    OR estado IN ('validado', 'publicado')
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('supervisor','admin')
  );

CREATE POLICY "semanas_insert_digitador" ON public.semanas
  FOR INSERT WITH CHECK (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin','digitador')
  );

CREATE POLICY "semanas_update" ON public.semanas
  FOR UPDATE USING (
    (
      (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'digitador'
      AND creado_por = auth.uid()
      AND estado = 'borrador'
    )
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'supervisor'
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "semanas_delete_admin" ON public.semanas
  FOR DELETE USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

-- REGISTROS_DIARIOS
CREATE POLICY "registros_select" ON public.registros_diarios
  FOR SELECT USING (
    semana_id IN (SELECT id FROM public.semanas)
  );

CREATE POLICY "registros_insert" ON public.registros_diarios
  FOR INSERT WITH CHECK (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin','digitador')
    AND semana_id IN (SELECT id FROM public.semanas WHERE estado = 'borrador')
  );

CREATE POLICY "registros_update" ON public.registros_diarios
  FOR UPDATE USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin','digitador')
    AND semana_id IN (SELECT id FROM public.semanas WHERE estado = 'borrador')
  );

-- AUDITORIA_LOG
CREATE POLICY "auditoria_select_admin" ON public.auditoria_log
  FOR SELECT USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "auditoria_insert_system" ON public.auditoria_log
  FOR INSERT WITH CHECK (TRUE);
