-- ============================================================
-- SIGO · Migración 005: Datos iniciales — Corredores
-- ============================================================
INSERT INTO public.corredores (codigo, nombre, orden)
VALUES
  ('103', 'Corredor W. Churchill',       1),
  ('105', 'Corredor W. Churchill Corto', 2)
ON CONFLICT (codigo) DO NOTHING;
