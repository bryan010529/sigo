# SIGO Plan M — Migraciones de Base de Datos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear archivos SQL versionados en el repo + setup de Supabase CLI para que las migraciones se apliquen con un solo comando (`npm run db:push`) en cualquier entorno.

**Architecture:** Supabase CLI maneja las migraciones como archivos `.sql` numerados en `supabase/migrations/`. El comando `supabase db push` aplica los archivos pendientes al proyecto Supabase remoto en orden. Los archivos quedan versionados en git como fuente de verdad del esquema.

**Tech Stack:** Supabase CLI, PostgreSQL, Row Level Security (RLS).

---

## Mapa de Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `supabase/migrations/20260520000001_create_tables.sql` | Tablas: usuarios, corredores, semanas, registros_diarios, auditoria_log |
| `supabase/migrations/20260520000002_indexes.sql` | Índices de rendimiento |
| `supabase/migrations/20260520000003_rls_policies.sql` | Políticas Row Level Security |
| `supabase/migrations/20260520000004_functions_triggers.sql` | updated_at trigger + upsert_registros_semana RPC |
| `supabase/migrations/20260520000005_seed_corredores.sql` | Datos iniciales: 2 corredores del PRD |
| `supabase/config.toml` | Configuración del proyecto Supabase CLI |
| `package.json` | Scripts: db:push, db:reset, db:status |
| `.env.local` | Agregar SUPABASE_PROJECT_REF y SUPABASE_DB_PASSWORD |
| `.env.local.example` | Actualizar con las nuevas variables |

---

## Task 1: Instalar Supabase CLI y configurar proyecto

**Files:**
- Modify: `package.json`
- Create: `supabase/config.toml`
- Modify: `.env.local.example`

- [ ] **Step 1: Instalar Supabase CLI como devDependency**

```bash
cd /Users/torres/proyectos/SIGO && npm install -D supabase
```
Esperado: instala sin errores.

- [ ] **Step 2: Verificar que Supabase CLI funciona**

```bash
cd /Users/torres/proyectos/SIGO && npx supabase --version
```
Esperado: muestra versión (ej: `1.x.x`)

- [ ] **Step 3: Inicializar estructura de Supabase en el repo**

```bash
cd /Users/torres/proyectos/SIGO && npx supabase init --workdir supabase 2>&1 || true
```

Si el comando anterior no crea la estructura correctamente, crear manualmente:
```bash
mkdir -p /Users/torres/proyectos/SIGO/supabase/migrations
```

- [ ] **Step 4: Crear `supabase/config.toml`**

```toml
# supabase/config.toml
[api]
port = 54321

[db]
port = 54322

[studio]
port = 54323

[inbucket]
port = 54324
```

- [ ] **Step 5: Agregar scripts a `package.json`**

Agregar estos scripts al `scripts` block de `package.json`:
```json
"db:push": "supabase db push",
"db:status": "supabase migration list",
"db:new": "supabase migration new"
```

El bloque `scripts` debe quedar así (mantener los existentes, agregar los nuevos):
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "db:push": "supabase db push",
  "db:status": "supabase migration list",
  "db:new": "supabase migration new"
}
```

- [ ] **Step 6: Actualizar `.env.local.example` con variables de Supabase CLI**

Reemplazar el contenido de `.env.local.example`:
```
# Supabase (Frontend)
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]

# Supabase CLI (solo para migraciones, nunca al frontend)
SUPABASE_ACCESS_TOKEN=[personal-access-token de app.supabase.com/account/tokens]
```

- [ ] **Step 7: Asegurarse que `supabase/` NO está en .gitignore**

```bash
grep "supabase" /Users/torres/proyectos/SIGO/.gitignore || echo "OK - supabase not ignored"
```
Esperado: "OK - supabase not ignored". Si aparece en .gitignore, removerlo.

- [ ] **Step 8: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add package.json package-lock.json supabase/ .env.local.example
git commit -m "feat: setup Supabase CLI for database migrations"
git push origin main
```

---

## Task 2: Migración 001 — Crear tablas

**Files:**
- Create: `supabase/migrations/20260520000001_create_tables.sql`

- [ ] **Step 1: Crear archivo de migración de tablas**

Crear `/Users/torres/proyectos/SIGO/supabase/migrations/20260520000001_create_tables.sql`:

```sql
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
  ica   NUMERIC(6,2),   -- % Autobuses Operando       → entrada manual (SIT)
  ick   NUMERIC(6,2),   -- % Cumplimiento Kms         → entrada manual (SIT)
  icd   NUMERIC(6,2),   -- % Cumplimiento Despachos   → entrada manual (SIT)
  ic    NUMERIC(6,2),   -- Índice Cumplimiento        → CALCULADO = (ica+ick+icd)/3
  ip    NUMERIC(6,2),   -- Puntualidad Despachos      → entrada manual (SIT)
  ie    NUMERIC(6,2),   -- Estado Autobuses/Mant.     → entrada manual (default 90)
  ics   NUMERIC(6,2),   -- Calidad de Servicio        → CALCULADO = ic*0.5+ip*0.25+ie*0.25

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
```

- [ ] **Step 2: Verificar que el archivo existe y tiene contenido**

```bash
wc -l /Users/torres/proyectos/SIGO/supabase/migrations/20260520000001_create_tables.sql
```
Esperado: más de 60 líneas.

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add supabase/migrations/20260520000001_create_tables.sql
git commit -m "feat(db): migration 001 - create all tables"
git push origin main
```

---

## Task 3: Migración 002 — Índices

**Files:**
- Create: `supabase/migrations/20260520000002_indexes.sql`

- [ ] **Step 1: Crear archivo de índices**

Crear `/Users/torres/proyectos/SIGO/supabase/migrations/20260520000002_indexes.sql`:

```sql
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add supabase/migrations/20260520000002_indexes.sql
git commit -m "feat(db): migration 002 - add performance indexes"
git push origin main
```

---

## Task 4: Migración 003 — Políticas RLS

**Files:**
- Create: `supabase/migrations/20260520000003_rls_policies.sql`

- [ ] **Step 1: Crear archivo de políticas RLS**

Crear `/Users/torres/proyectos/SIGO/supabase/migrations/20260520000003_rls_policies.sql`:

```sql
-- ============================================================
-- SIGO · Migración 003: Row Level Security
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.usuarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corredores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semanas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_log   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USUARIOS: solo admin puede gestionar; cada uno ve el suyo
-- ============================================================
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

-- ============================================================
-- CORREDORES: lectura para todos; escritura solo admin
-- ============================================================
CREATE POLICY "corredores_select_all" ON public.corredores
  FOR SELECT USING (
    (SELECT activo FROM public.usuarios WHERE id = auth.uid()) = TRUE
  );

CREATE POLICY "corredores_admin" ON public.corredores
  FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- SEMANAS
-- - Digitador: ve sus propias semanas + todas las validadas/publicadas
-- - Supervisor/Admin: ve todas
-- ============================================================
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

CREATE POLICY "semanas_update_digitador" ON public.semanas
  FOR UPDATE USING (
    -- Digitador solo puede editar su propia semana en borrador
    (
      (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'digitador'
      AND creado_por = auth.uid()
      AND estado = 'borrador'
    )
    -- Supervisor puede cambiar estado (aprobar/rechazar)
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'supervisor'
    -- Admin puede todo
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "semanas_delete_admin" ON public.semanas
  FOR DELETE USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- REGISTROS_DIARIOS: hereda visibilidad de semana padre
-- ============================================================
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

-- ============================================================
-- AUDITORIA_LOG: solo admin puede leer
-- ============================================================
CREATE POLICY "auditoria_select_admin" ON public.auditoria_log
  FOR SELECT USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "auditoria_insert_system" ON public.auditoria_log
  FOR INSERT WITH CHECK (TRUE);
```

- [ ] **Step 2: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add supabase/migrations/20260520000003_rls_policies.sql
git commit -m "feat(db): migration 003 - RLS policies for all tables"
git push origin main
```

---

## Task 5: Migración 004 — Funciones y Triggers

**Files:**
- Create: `supabase/migrations/20260520000004_functions_triggers.sql`

- [ ] **Step 1: Crear archivo de funciones y triggers**

Crear `/Users/torres/proyectos/SIGO/supabase/migrations/20260520000004_functions_triggers.sql`:

```sql
-- ============================================================
-- SIGO · Migración 004: Funciones y Triggers
-- ============================================================

-- ============================================================
-- Función: actualizar updated_at automáticamente
-- ============================================================
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

-- ============================================================
-- Función: trigger de auditoría automática en semanas
-- ============================================================
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

-- ============================================================
-- RPC: upsert_registros_semana
-- Guarda todos los registros de una semana en una sola transacción
-- ============================================================
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add supabase/migrations/20260520000004_functions_triggers.sql
git commit -m "feat(db): migration 004 - triggers, audit log, and upsert RPC"
git push origin main
```

---

## Task 6: Migración 005 — Seed: Corredores iniciales

**Files:**
- Create: `supabase/migrations/20260520000005_seed_corredores.sql`

- [ ] **Step 1: Crear archivo de seed**

Crear `/Users/torres/proyectos/SIGO/supabase/migrations/20260520000005_seed_corredores.sql`:

```sql
-- ============================================================
-- SIGO · Migración 005: Datos iniciales — Corredores
-- ============================================================
-- Los 2 corredores interoperables del Gran Santo Domingo
-- definidos en el PRD del SITPSD

INSERT INTO public.corredores (codigo, nombre, orden)
VALUES
  ('103', 'Corredor W. Churchill',       1),
  ('105', 'Corredor W. Churchill Corto', 2)
ON CONFLICT (codigo) DO NOTHING;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add supabase/migrations/20260520000005_seed_corredores.sql
git commit -m "feat(db): migration 005 - seed initial corredores"
git push origin main
```

---

## Task 7: Documentar cómo aplicar migraciones

**Files:**
- Create: `database/README.md`

- [ ] **Step 1: Crear `database/README.md`**

Crear `/Users/torres/proyectos/SIGO/database/README.md`:

```markdown
# SIGO — Migraciones de Base de Datos

Las migraciones están en `supabase/migrations/` y se aplican con el Supabase CLI.

## Prerequisitos

1. Tener el Supabase CLI disponible (ya incluido en devDependencies: `npm install`)
2. Tener un Personal Access Token de Supabase:
   - Ve a https://app.supabase.com/account/tokens
   - Crea un token con nombre "SIGO migrations"
   - Cópialo

## Configuración inicial (una sola vez por máquina)

```bash
npx supabase login
# Pega tu Personal Access Token cuando lo pida
```

Luego vincula el proyecto local con tu proyecto Supabase:
```bash
npx supabase link --project-ref [TU_PROJECT_REF]
# El project-ref está en Supabase Dashboard → Settings → General → Reference ID
```

## Aplicar migraciones

```bash
npm run db:push
```

Esto aplica todos los archivos en `supabase/migrations/` que no se hayan aplicado aún, en orden numérico.

## Ver estado de migraciones

```bash
npm run db:status
```

## Crear una nueva migración

```bash
npm run db:new nombre_de_la_migracion
```

Crea un nuevo archivo en `supabase/migrations/` con timestamp automático.

## Orden de migraciones

| Archivo | Contenido |
|---------|-----------|
| `20260520000001_create_tables.sql` | Tablas: usuarios, corredores, semanas, registros_diarios, auditoria_log |
| `20260520000002_indexes.sql` | Índices de rendimiento |
| `20260520000003_rls_policies.sql` | Políticas Row Level Security |
| `20260520000004_functions_triggers.sql` | Triggers updated_at, audit log, RPC upsert_registros_semana |
| `20260520000005_seed_corredores.sql` | Datos iniciales: 2 corredores |
```

- [ ] **Step 2: Commit final**

```bash
cd /Users/torres/proyectos/SIGO
git add database/
git commit -m "docs: add database migration guide"
git push origin main
```

---

## Self-Review

**Spec coverage vs PRD:**
- [x] Tabla `usuarios` con roles — migración 001
- [x] Tabla `corredores` con código, nombre, orden — migración 001
- [x] Tabla `semanas` con estados y campos de validación — migración 001
- [x] Tabla `registros_diarios` con Sección I y II completas — migración 001
- [x] Tabla `auditoria_log` — migración 001
- [x] Índices recomendados del PRD — migración 002
- [x] RLS para semanas, registros, corredores, usuarios — migración 003
- [x] Trigger `updated_at` en semanas y registros_diarios — migración 004
- [x] RPC `upsert_registros_semana` exactamente como el PRD — migración 004
- [x] Seed con los 2 corredores del PRD — migración 005
- [x] Scripts npm: `db:push`, `db:status`, `db:new` — Task 1
