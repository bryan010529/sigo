-- ============================================================
-- SIGO · Sistema de Gestión Operacional
-- Migración 001: Creación de tablas principales
-- ============================================================

-- Tabla usuarios (vinculada a Supabase Auth)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('admin','digitador','supervisor','analista')),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla corredores
CREATE TABLE IF NOT EXISTS public.corredores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  activo      BOOLEAN DEFAULT TRUE,
  orden       INTEGER DEFAULT 0,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla semanas
CREATE TABLE IF NOT EXISTS public.semanas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_semana       INTEGER NOT NULL,
  periodo             INTEGER NOT NULL,
  fecha_inicio        DATE NOT NULL,
  fecha_fin           DATE NOT NULL,
  estado              TEXT NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador','en_revision','validado','publicado')),
  observaciones       TEXT,
  comentario_rechazo  TEXT,
  creado_por          UUID REFERENCES public.usuarios(id),
  validado_por        UUID REFERENCES public.usuarios(id),
  validado_en         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(numero_semana, periodo)
);

-- Tabla registros_diarios (tabla principal de datos operacionales)
CREATE TABLE IF NOT EXISTS public.registros_diarios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id             UUID NOT NULL REFERENCES public.semanas(id) ON DELETE CASCADE,
  corredor_id           UUID NOT NULL REFERENCES public.corredores(id),
  fecha                 DATE NOT NULL,

  -- Sección I: Kilómetros y Servicios
  kms_programados       NUMERIC(10,2),
  kms_ejecutados        NUMERIC(10,2),
  kms_efectivos         NUMERIC(10,2),
  total_pasajeros       INTEGER,
  servicios_programados INTEGER,
  servicios_ejecutados  INTEGER,
  servicios_puntuales   INTEGER,

  -- Sección II: Indicadores (% como decimal, ej: 89.79)
  ica   NUMERIC(6,2),
  ick   NUMERIC(6,2),
  icd   NUMERIC(6,2),
  ic    NUMERIC(6,2),
  ip    NUMERIC(6,2),
  ie    NUMERIC(6,2),
  ics   NUMERIC(6,2),

  -- Control
  tiene_datos   BOOLEAN DEFAULT FALSE,
  fuente        TEXT DEFAULT 'manual'
                  CHECK (fuente IN ('manual','importado')),
  creado_por    UUID REFERENCES public.usuarios(id),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(semana_id, corredor_id, fecha)
);

-- Tabla auditoria_log
CREATE TABLE IF NOT EXISTS public.auditoria_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla       TEXT NOT NULL,
  registro_id UUID,
  accion      TEXT NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE','ESTADO_CAMBIO')),
  datos_antes JSONB,
  datos_nuevo JSONB,
  usuario_id  UUID REFERENCES public.usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
