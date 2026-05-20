-- ============================================================
-- SIGO · Migración 002: Índices de rendimiento
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_registros_semana
  ON public.registros_diarios(semana_id);

CREATE INDEX IF NOT EXISTS idx_registros_corredor
  ON public.registros_diarios(corredor_id);

CREATE INDEX IF NOT EXISTS idx_registros_fecha
  ON public.registros_diarios(fecha);

CREATE INDEX IF NOT EXISTS idx_semanas_estado
  ON public.semanas(estado);

CREATE INDEX IF NOT EXISTS idx_semanas_periodo
  ON public.semanas(periodo, numero_semana);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario
  ON public.auditoria_log(usuario_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_created
  ON public.auditoria_log(created_at DESC);
