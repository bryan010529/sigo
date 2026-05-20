-- ============================================================
-- SIGO · Migración 004: Funciones y Triggers
-- ============================================================

-- updated_at automático
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_usuarios
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_semanas
  BEFORE UPDATE ON public.semanas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_registros
  BEFORE UPDATE ON public.registros_diarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auditoría de cambios de estado en semanas
CREATE OR REPLACE FUNCTION public.log_semana_estado_cambio()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.auditoria_log (tabla, registro_id, accion, datos_antes, datos_nuevo, usuario_id)
    VALUES (
      'semanas',
      NEW.id,
      'ESTADO_CAMBIO',
      jsonb_build_object('estado', OLD.estado),
      jsonb_build_object('estado', NEW.estado),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_semana_estado
  AFTER UPDATE ON public.semanas
  FOR EACH ROW EXECUTE FUNCTION public.log_semana_estado_cambio();

-- RPC: guardar todos los registros de una semana en una transacción
CREATE OR REPLACE FUNCTION public.upsert_registros_semana(
  p_semana_id UUID,
  p_registros JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.registros_diarios (
    semana_id, corredor_id, fecha,
    kms_programados, kms_ejecutados, kms_efectivos, total_pasajeros,
    servicios_programados, servicios_ejecutados, servicios_puntuales,
    ica, ick, icd, ic, ip, ie, ics,
    tiene_datos, fuente, creado_por
  )
  SELECT
    p_semana_id,
    (r->>'corredor_id')::UUID,
    (r->>'fecha')::DATE,
    (r->>'kms_programados')::NUMERIC,
    (r->>'kms_ejecutados')::NUMERIC,
    (r->>'kms_efectivos')::NUMERIC,
    (r->>'total_pasajeros')::INTEGER,
    (r->>'servicios_programados')::INTEGER,
    (r->>'servicios_ejecutados')::INTEGER,
    (r->>'servicios_puntuales')::INTEGER,
    (r->>'ica')::NUMERIC,
    (r->>'ick')::NUMERIC,
    (r->>'icd')::NUMERIC,
    (r->>'ic')::NUMERIC,
    (r->>'ip')::NUMERIC,
    (r->>'ie')::NUMERIC,
    (r->>'ics')::NUMERIC,
    (r->>'tiene_datos')::BOOLEAN,
    COALESCE(r->>'fuente', 'manual'),
    auth.uid()
  FROM jsonb_array_elements(p_registros) AS r
  ON CONFLICT (semana_id, corredor_id, fecha)
  DO UPDATE SET
    kms_programados       = EXCLUDED.kms_programados,
    kms_ejecutados        = EXCLUDED.kms_ejecutados,
    kms_efectivos         = EXCLUDED.kms_efectivos,
    total_pasajeros       = EXCLUDED.total_pasajeros,
    servicios_programados = EXCLUDED.servicios_programados,
    servicios_ejecutados  = EXCLUDED.servicios_ejecutados,
    servicios_puntuales   = EXCLUDED.servicios_puntuales,
    ica = EXCLUDED.ica, ick = EXCLUDED.ick, icd = EXCLUDED.icd,
    ic  = EXCLUDED.ic,  ip  = EXCLUDED.ip,  ie  = EXCLUDED.ie,
    ics = EXCLUDED.ics,
    tiene_datos = EXCLUDED.tiene_datos,
    fuente      = EXCLUDED.fuente,
    updated_at  = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
