-- ============================================================
-- SIGO · Migración 007: Agregar costo_por_km a corredores
-- ============================================================
ALTER TABLE public.corredores
  ADD COLUMN IF NOT EXISTS costo_por_km NUMERIC(10,4) DEFAULT 0;

COMMENT ON COLUMN public.corredores.costo_por_km
  IS 'Costo operacional por kilómetro en RD$. Ejemplo: 45.7823';
