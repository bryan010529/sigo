# PRD — Sistema de Registro Operacional de Corredores Interoperables
## SITPSD · Sistema Integrado de Transporte Público del Gran Santo Domingo

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Organismo:** INTRANT — Dirección de Movilidad Sostenible  
**Autor:** Sr. Torres  
**Estado:** Listo para desarrollo

---

## 1. Resumen Ejecutivo

El sistema SITPSD-Corredores es una aplicación web multiusuario para registrar, validar y analizar los informes de operación semanal de los Corredores Interoperables del Gran Santo Domingo. Reemplaza el proceso actual basado en documentos PDF/Excel manuales con un flujo digital completo: ingreso de datos, cálculo automático de indicadores, flujo de aprobación por roles y generación de reportes en el formato oficial de INTRANT.

### Problema que resuelve
- Datos dispersos en archivos individuales sin historial centralizado
- Cálculo manual de indicadores (IC, ICS) propenso a errores
- Sin control de versiones ni flujo de aprobación formal
- Imposibilidad de comparar tendencias entre semanas o corredores

### Objetivo principal
Centralizar el registro semanal operacional en una plataforma web con backend Supabase, accesible para múltiples usuarios con roles diferenciados, con cálculo automático de indicadores y generación del informe oficial en PDF.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Routing | React Router v6 |
| Estado global | Zustand |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + password) |
| Storage | Supabase Storage (archivos importados, PDFs) |
| Realtime | Supabase Realtime (dashboard en vivo) |
| Charts | Recharts |
| Export PDF | react-pdf / @react-pdf/renderer |
| Export Excel | xlsx (SheetJS) |
| Import archivos | PapaParse (CSV) + xlsx (Excel) |
| Hosting | Vercel (recomendado) o Netlify |

---

## 3. Roles de Usuario y Permisos

### 3.1 Definición de roles

| Rol | Código | Descripción |
|-----|--------|-------------|
| Administrador | `admin` | Control total del sistema |
| Digitador | `digitador` | Ingresa y carga datos semanales |
| Supervisor | `supervisor` | Valida y firma semanas |
| Analista | `analista` | Solo lectura: dashboard y reportes |

### 3.2 Matriz de permisos por módulo

| Módulo / Acción | Admin | Digitador | Supervisor | Analista |
|----------------|-------|-----------|------------|---------|
| Login | ✅ | ✅ | ✅ | ✅ |
| Ver Dashboard | ✅ | ✅ | ✅ | ✅ |
| Crear semana | ✅ | ✅ | ❌ | ❌ |
| Editar semana (borrador) | ✅ | ✅ (propia) | ❌ | ❌ |
| Enviar a revisión | ✅ | ✅ | ❌ | ❌ |
| Aprobar / Rechazar semana | ✅ | ❌ | ✅ | ❌ |
| Eliminar semana | ✅ | ❌ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ✅ | ✅ |
| Exportar PDF/Excel | ✅ | ✅ | ✅ | ✅ |
| Gestionar corredores | ✅ | ❌ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |
| Ver auditoría | ✅ | ❌ | ❌ | ❌ |

### 3.3 Row Level Security (RLS) en Supabase

- `semanas`: digitador solo ve las semanas que él creó + todas las validadas. Supervisor ve todas. Admin ve todas.
- `registros_diarios`: hereda el RLS de su semana padre.
- `usuarios`: solo admin puede leer/modificar todos los usuarios.
- `corredores`: lectura para todos los roles activos; escritura solo admin.

---

## 4. Esquema de Base de Datos (Supabase / PostgreSQL)

### 4.1 Tabla `usuarios`

```sql
CREATE TABLE usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  email       TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('admin','digitador','supervisor','analista')),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Tabla `corredores`

```sql
CREATE TABLE corredores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      TEXT NOT NULL UNIQUE,   -- Ej: "103"
  nombre      TEXT NOT NULL,           -- Ej: "Corredor W. Churchill"
  activo      BOOLEAN DEFAULT TRUE,
  orden       INTEGER DEFAULT 0,       -- Para ordenar en UI
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO corredores (codigo, nombre, orden) VALUES
  ('103', 'Corredor W. Churchill', 1),
  ('105', 'Corredor W. Churchill Corto', 2);
```

### 4.3 Tabla `semanas`

```sql
CREATE TABLE semanas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_semana   INTEGER NOT NULL,
  periodo         INTEGER NOT NULL,
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador','en_revision','validado','publicado')),
  observaciones   TEXT,
  comentario_rechazo TEXT,             -- Motivo si el supervisor devuelve
  creado_por      UUID REFERENCES usuarios(id),
  validado_por    UUID REFERENCES usuarios(id),
  validado_en     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(numero_semana, periodo)
);
```

### 4.4 Tabla `registros_diarios` ← Tabla principal

```sql
CREATE TABLE registros_diarios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id             UUID NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  corredor_id           UUID NOT NULL REFERENCES corredores(id),
  fecha                 DATE NOT NULL,

  -- SECCIÓN I: Kilómetros y Servicios
  kms_programados       NUMERIC(10,2),
  kms_ejecutados        NUMERIC(10,2),
  kms_efectivos         NUMERIC(10,2),   -- Kms Pago Operador
  total_pasajeros       INTEGER,          -- Boletos Validados
  servicios_programados INTEGER,
  servicios_ejecutados  INTEGER,
  servicios_puntuales   INTEGER,

  -- SECCIÓN II: Indicadores (% como decimal, ej: 89.79)
  ica   NUMERIC(6,2),   -- % Autobuses Operando       → entrada manual (SIT)
  ick   NUMERIC(6,2),   -- % Cumplimiento Kms         → entrada manual (SIT)
  icd   NUMERIC(6,2),   -- % Cumplimiento Despachos   → entrada manual (SIT)
  ic    NUMERIC(6,2),   -- Índice Cumplimiento        → CALCULADO = (ica+ick+icd)/3
  ip    NUMERIC(6,2),   -- Puntualidad Despachos      → entrada manual (SIT)
  ie    NUMERIC(6,2),   -- Estado Autobuses/Mant.     → entrada manual (default 90)
  ics   NUMERIC(6,2),   -- Calidad de Servicio        → CALCULADO = ic*0.5 + ip*0.25 + ie*0.25

  -- Control
  tiene_datos   BOOLEAN DEFAULT FALSE,   -- FALSE = fila vacía (día sin operación)
  fuente        TEXT DEFAULT 'manual'    -- 'manual' | 'importado'
                  CHECK (fuente IN ('manual','importado')),
  creado_por    UUID REFERENCES usuarios(id),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(semana_id, corredor_id, fecha)
);
```

### 4.5 Tabla `auditoria_log`

```sql
CREATE TABLE auditoria_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla       TEXT NOT NULL,
  registro_id UUID,
  accion      TEXT NOT NULL,   -- 'INSERT' | 'UPDATE' | 'DELETE' | 'ESTADO_CAMBIO'
  datos_antes JSONB,
  datos_nuevo JSONB,
  usuario_id  UUID REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.6 Índices recomendados

```sql
CREATE INDEX idx_registros_semana    ON registros_diarios(semana_id);
CREATE INDEX idx_registros_corredor  ON registros_diarios(corredor_id);
CREATE INDEX idx_registros_fecha     ON registros_diarios(fecha);
CREATE INDEX idx_semanas_estado      ON semanas(estado);
CREATE INDEX idx_semanas_periodo     ON semanas(periodo, numero_semana);
```

---

## 5. Lógica de Negocio y Fórmulas

### 5.1 Fórmulas de indicadores (calcular en frontend Y guardar en BD)

```
IC  = (IcA + IcK + IcD) / 3
ICS = IC × 0.50 + IP × 0.25 + IE × 0.25
```

**Reglas de cálculo:**
- Se recalculan en tiempo real al ingresar IcA, IcK, IcD, IP o IE.
- Si algún campo de entrada es nulo/vacío, IC e ICS quedan nulos.
- IE tiene valor por defecto de **90.00** al crear una fila nueva.
- Se almacenan en BD con 2 decimales.
- Los campos IC e ICS son de **solo lectura** en la UI (fondo verde distinguible).

### 5.2 Totales semanales por corredor

Los totales (fila TOTAL SEMANA) se calculan en el frontend como:
- **Kms Programados** = SUMA de filas con `tiene_datos = true`
- **Kms Ejecutados** = SUMA
- **Kms Efectivos** = SUMA
- **Total Pasajeros** = SUMA
- **Servicios Programados** = SUMA
- **Servicios Ejecutados** = SUMA
- **Servicios Puntuales** = SUMA
- **IcA, IcK, IcD, IC, IP, IE, ICS** = PROMEDIO de filas con datos (ignorar filas vacías)

### 5.3 Semanas futuras

- Una semana puede crearse con `fecha_inicio` en el futuro.
- Al crear la semana, se generan automáticamente **7 registros vacíos** (lunes a domingo) por cada corredor activo, con `tiene_datos = false`.
- El digitador puede ir llenando los datos conforme pasan los días.
- Una semana futura queda en estado `borrador` hasta ser enviada a revisión.

### 5.4 Días sin operación (filas vacías)

- Siempre se muestran los 7 días de la semana para cada corredor.
- Si el día no tiene operación, todos los campos numéricos quedan vacíos/nulos.
- `tiene_datos = false` indica que la fila es un placeholder vacío.
- La fila vacía **no se incluye** en los totales ni en los promedios de indicadores.

---

## 6. Módulos del Sistema

### 6.1 Módulo de Autenticación

**Pantalla de Login:**
- Email + contraseña
- Botón "Iniciar Sesión"
- Mensaje de error genérico si credenciales incorrectas (no especificar qué campo falló)
- Sin registro público: los usuarios son creados por el Administrador
- Persistencia de sesión con Supabase Auth (tokens JWT)

**Post-login:**
- Redirigir a `/dashboard`
- El menú de navegación se construye dinámicamente según el rol del usuario autenticado

**Logout:**
- Limpiar sesión de Supabase
- Redirigir a `/login`

---

### 6.2 Navegación / Menú principal

Barra lateral izquierda (sidebar) con:

```
INTRANT logo + nombre sistema
─────────────────────────────
[Avatar] Nombre del usuario
         Rol actual
─────────────────────────────
📊  Dashboard
📝  Nuevo Registro        [solo digitador/admin]
📋  Semanas
📄  Reportes
─────────────────────────────
⚙   Configuración         [solo admin]
─────────────────────────────
🚪  Cerrar Sesión
```

El sidebar colapsa en pantallas medianas (tablet).

---

### 6.3 Módulo: Dashboard

**URL:** `/dashboard`  
**Roles:** Todos

**KPI Cards (fila superior):**
- Total semanas registradas
- Semanas validadas
- Total pasajeros (suma histórica)
- Kms efectivos totales
- ICS promedio global (con color: verde ≥80%, amarillo 70-79%, rojo <70%)

**Gráficas (Recharts):**
1. **ICS por semana** — LineChart, una línea por corredor, X = número semana
2. **Pasajeros por semana** — BarChart agrupado por corredor
3. **Kms Programados vs Ejecutados** — BarChart doble por semana
4. **Servicios Programados vs Ejecutados** — BarChart doble por semana

**Filtros:**
- Selector de corredor (todos o uno específico)
- Selector de rango de períodos (desde / hasta)
- Botón "Aplicar filtros"

**Actualización en tiempo real** con Supabase Realtime: cuando se publica una semana nueva, el dashboard se actualiza sin recargar.

---

### 6.4 Módulo: Nuevo Registro

**URL:** `/registro/nuevo` y `/registro/:semanaId/editar`  
**Roles:** Digitador, Admin

#### Paso 1 — Metadatos de la semana

Formulario:
- `Semana #` (número entero, requerido)
- `Período` (número entero, por defecto igual a Semana #)
- `Fecha Inicio` (date picker, requerido)
- `Fecha Fin` (auto-calculada: fecha_inicio + 6 días, solo lectura)
- `Validado por` (texto, ej: "Ing. Erick Marte – Dirección de Movilidad Sostenible")
- `Observaciones` (textarea, opcional)

Validaciones:
- No puede existir otra semana con el mismo `numero_semana + periodo`
- `fecha_fin` siempre = `fecha_inicio + 6 días`

#### Paso 2 — Ingreso de datos por corredor

**Selector de corredor:** tabs o pills horizontales para cada corredor activo. Indicador visual si el corredor ya tiene datos guardados (checkmark verde).

**Método de ingreso (selector):**
- `Manual` → formulario editable
- `Cargar archivo` → modal de importación

**Tabla de Sección I (por corredor, 7 filas):**

| Fecha | Kms Prog. | Kms Ejec. | Kms Efect. | Pasajeros | Serv. Prog. | Serv. Ejec. | Serv. Punt. |
|-------|-----------|-----------|------------|-----------|-------------|-------------|-------------|
| lun dd-mmm-yy | input | input | input | input | input | input | input |
| ... | | | | | | | |
| TOTAL | suma | suma | suma | suma | suma | suma | suma |

**Tabla de Sección II (por corredor, 7 filas):**

| Fecha | IcA | IcK | IcD | IC (auto) | IP | IE | ICS (auto) |
|-------|-----|-----|-----|-----------|----|----|------------|
| lun dd-mmm-yy | input | input | input | readonly verde | input | input (def:90) | readonly verde |
| ... | | | | | | | |
| TOTAL | prom | prom | prom | prom | prom | prom | prom |

**Comportamiento de filas vacías:**
- Si una fila tiene todos los campos vacíos, `tiene_datos = false` al guardar.
- Si tiene al menos un campo con valor, `tiene_datos = true`.
- Las filas vacías se muestran siempre con fondo gris claro.

**Botones por corredor:**
- `Guardar Corredor` → guarda los datos de ese corredor (UPSERT en `registros_diarios`)
- `Limpiar` → borra los datos del corredor actual (solo en borrador)

**Botón principal:**
- `Guardar Semana Completa` → guarda todos los corredores y deja en estado `borrador`
- `Enviar a Revisión` → cambia estado a `en_revision` (requiere al menos 1 corredor con datos)

---

### 6.5 Sub-módulo: Importación de Archivo

**Modal de importación, activado desde "Cargar archivo"**

**Formatos soportados:**
- CSV (delimitado por coma o punto y coma)
- Excel (.xlsx, .xls)

**Columnas esperadas en el archivo (nombres flexibles, mapeo inteligente):**

```
Corredor | Fecha | Kms_Programados | Kms_Ejecutados | Kms_Efectivos |
Pasajeros | Serv_Programados | Serv_Ejecutados | Serv_Puntuales |
IcA | IcK | IcD | IP | IE
```

**Flujo del modal:**
1. Drag & drop o botón "Seleccionar archivo"
2. Parseo del archivo (PapaParse / xlsx)
3. Vista previa de los primeros 5 registros con detección de columnas
4. Mapeo de columnas si los nombres no coinciden exactamente (dropdown por columna)
5. Validación: resaltar errores en rojo (tipo de dato incorrecto, fecha fuera de rango)
6. Botón `Confirmar Importación` → carga los datos en el formulario
7. El usuario puede editar manualmente antes de guardar

**Reglas de importación:**
- Si ya existen datos para esa semana/corredor/fecha, preguntar si sobreescribir.
- Los campos IC e ICS se recalculan automáticamente al importar.
- `fuente = 'importado'` en los registros resultantes.

---

### 6.6 Módulo: Semanas

**URL:** `/semanas`  
**Roles:** Todos (filtrado por RLS)

**Vista principal — lista de semanas:**

Cards ordenadas por `numero_semana DESC` con:
- Badge del número de semana
- Período y rango de fechas
- Corredores incluidos
- Badge de estado: `Borrador` (gris) / `En Revisión` (amarillo) / `Validado` (verde) / `Publicado` (azul)
- ICS promedio de la semana (con color)
- Total pasajeros de la semana
- Botones de acción según rol y estado

**Filtros:**
- Por estado
- Por corredor
- Por período (rango)
- Búsqueda por número de semana

**Acciones disponibles:**

| Estado | Digitador | Supervisor | Admin |
|--------|-----------|------------|-------|
| Borrador | Ver · Editar · Enviar a revisión | Ver | Ver · Editar · Eliminar |
| En Revisión | Ver | Ver · Aprobar · Rechazar | Ver · Aprobar · Rechazar |
| Validado | Ver · Exportar | Ver · Exportar | Ver · Exportar |
| Publicado | Ver · Exportar | Ver · Exportar | Ver · Exportar |

**Vista detalle de semana (`/semanas/:id`):**
- Reproduce el informe en el formato oficial del documento INTRANT
- Sección I y Sección II por corredor, con totales
- Botones: Imprimir PDF, Exportar Excel, Volver

**Flujo de Aprobación (modal):**
- Supervisor ve botón `Aprobar` → confirmación → cambia a `validado`
- Supervisor ve botón `Rechazar` → modal con campo de texto obligatorio "Motivo" → cambia a `borrador` con `comentario_rechazo`
- Digitador ve notificación/badge si su semana fue rechazada con el motivo visible

---

### 6.7 Módulo: Reportes

**URL:** `/reportes`  
**Roles:** Todos

**Reportes disponibles:**

#### Reporte 1: Informe Semanal Oficial (PDF)
- Seleccionar semana
- Reproduce exactamente el formato del documento "SEMANA OPERACIONAL" de INTRANT:
  - Encabezado: logo INTRANT, título, semana, período, fechas
  - Sección I: tabla de kms y servicios por corredor/día con totales
  - Sección II: tabla de indicadores por corredor/día con totales
  - Pie: "Revisado y validado por:" + nombre del supervisor + observaciones
- Exportar como PDF

#### Reporte 2: Resumen Mensual
- Selector de mes/año
- Tabla consolidada de todas las semanas del período
- Totales agregados por corredor
- Exportar como PDF o Excel

#### Reporte 3: Comparativo de Corredores
- Seleccionar rango de semanas
- Tabla comparativa con todos los indicadores promedio por corredor
- Gráfica de barras: ICS por corredor
- Exportar como Excel

#### Reporte 4: Tendencia de Indicadores
- Seleccionar corredor y rango de fechas
- LineChart de todos los indicadores en el tiempo
- Tabla de datos exportable como Excel

---

### 6.8 Módulo: Configuración (solo Admin)

**URL:** `/configuracion`

**Sub-secciones:**

#### Usuarios
- Lista de todos los usuarios con nombre, email, rol y estado (activo/inactivo)
- Botón `Invitar usuario` → envía email de invitación de Supabase Auth + asigna rol
- Editar rol de usuario existente
- Activar / Desactivar usuario (no eliminar)

#### Corredores
- Lista de corredores (código, nombre, estado)
- Agregar nuevo corredor (código único + nombre)
- Editar nombre o estado de corredor existente
- No se permite eliminar corredores con registros asociados (desactivar en su lugar)
- Cambiar orden de visualización (drag & drop)

#### Auditoría
- Log de acciones del sistema: quién hizo qué y cuándo
- Filtros por usuario, tipo de acción, fecha
- Solo lectura, no exportable en MVP

---

## 7. Especificación de UI/UX

### 7.1 Paleta de colores

```css
--navy:        #1a3a5c   /* Color principal, header, sidebar */
--navy-dark:   #0f2540   /* Hover estados activos */
--navy-light:  #2a5a8c   /* Elementos secundarios */
--orange:      #e8541a   /* Acento INTRANT, CTAs primarios */
--green:       #27ae60   /* Éxito, validado, ICS bueno */
--yellow:      #f39c12   /* Advertencia, en revisión */
--red:         #e74c3c   /* Error, rechazado, ICS bajo */
--light:       #f4f6f9   /* Fondo general */
--border:      #dde3eb   /* Bordes de cards y tablas */
--text:        #2c3e50   /* Texto principal */
--muted:       #6c7a8d   /* Texto secundario */
```

### 7.2 Umbrales de color para ICS

```
ICS ≥ 80%  → verde  (#27ae60)
ICS 70–79% → amarillo (#f39c12)
ICS < 70%  → rojo   (#e74c3c)
```

### 7.3 Componentes clave

- **Sidebar fijo** con logo INTRANT en el top, menú de navegación, info de usuario y logout al fondo.
- **Cards de KPI** en dashboard con valor grande, etiqueta pequeña y color de tendencia.
- **Tablas de datos** con cabeceras sticky al hacer scroll horizontal, fila de totales con fondo azul.
- **Campos auto-calculados** (IC, ICS): fondo verde claro `#f0fff8`, borde verde, cursor `not-allowed`.
- **Filas vacías** (sin operación): fondo gris muy claro `#f8f9fa`, texto `–` en campos vacíos.
- **Badge de estado** de semana con colores semánticos.
- **Toasts** de notificación para acciones exitosas y errores (top-right, auto-dismiss 4s).

### 7.4 Responsive

- Desktop (≥1280px): sidebar fijo + contenido principal
- Tablet (768–1279px): sidebar colapsable + menú hamburguesa
- Mobile (<768px): solo lectura y dashboard; no se optimiza el formulario de ingreso para móvil en MVP

---

## 8. Estados y Transiciones de Semana

```
[borrador] ──enviar──→ [en_revision] ──aprobar──→ [validado] ──publicar──→ [publicado]
               ↑              │
               └──rechazar────┘ (vuelve a borrador con comentario)
```

Reglas:
- Solo el **digitador que creó** la semana (o admin) puede enviar a revisión.
- Solo **supervisor o admin** puede aprobar o rechazar.
- Al aprobar, se registra `validado_por` y `validado_en`.
- Al rechazar, se guarda el `comentario_rechazo` y notifica al digitador.
- Una semana en estado `validado` o `publicado` no se puede editar (solo admin puede forzarlo).
- La transición `validado → publicado` puede ser automática al validar, o manual (decisión de implementación: automática en MVP).

---

## 9. Notificaciones

### Email (vía Supabase Edge Functions o servicio externo como Resend)

| Evento | Destinatario | Asunto |
|--------|-------------|--------|
| Semana enviada a revisión | Todos los supervisores | "Semana #X lista para revisión" |
| Semana aprobada | Digitador creador | "Semana #X ha sido validada" |
| Semana rechazada | Digitador creador | "Semana #X devuelta — revisa los comentarios" |
| Semana publicada | Todos los usuarios | "Semana #X publicada — disponible en reportes" |

_Nota: Las notificaciones por email son opcionales en MVP; priorizarlas en Fase 2._

---

## 10. Supabase — Setup y Configuración

### 10.1 Variables de entorno requeridas

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

### 10.2 Políticas RLS sugeridas

```sql
-- semanas: digitador solo ve las suyas o las validadas
CREATE POLICY "digitador_ver_semanas" ON semanas
  FOR SELECT USING (
    creado_por = auth.uid()
    OR estado IN ('validado', 'publicado')
    OR (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('supervisor','admin')
  );

-- registros_diarios: heredar visibilidad de semana padre
CREATE POLICY "ver_registros" ON registros_diarios
  FOR SELECT USING (
    semana_id IN (SELECT id FROM semanas)  -- RLS de semanas aplica via JOIN
  );

-- Solo admin puede modificar corredores
CREATE POLICY "admin_corredores" ON corredores
  FOR ALL USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin'
  );
```

### 10.3 Trigger para `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON semanas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_registros
  BEFORE UPDATE ON registros_diarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 10.4 Función RPC para guardar semana completa

```sql
-- Guardar todos los registros de una semana en una sola transacción
CREATE OR REPLACE FUNCTION upsert_registros_semana(
  p_semana_id UUID,
  p_registros JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO registros_diarios (
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

---

## 11. Estructura de Proyecto Recomendada

```
sitpsd-corredores/
├── public/
│   └── intrant-logo.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── Layout.tsx
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── semanas/
│   │   │   ├── SemanaCard.tsx
│   │   │   ├── SemanaDetalle.tsx
│   │   │   └── EstadoBadge.tsx
│   │   ├── registro/
│   │   │   ├── FormMetadatos.tsx
│   │   │   ├── TablaSeccionI.tsx
│   │   │   ├── TablaSeccionII.tsx
│   │   │   ├── CorredorPills.tsx
│   │   │   └── ImportModal.tsx
│   │   ├── dashboard/
│   │   │   ├── KpiCards.tsx
│   │   │   └── Charts.tsx
│   │   └── reportes/
│   │       ├── InformePDF.tsx     # @react-pdf/renderer
│   │       └── ExportExcel.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Registro.tsx
│   │   ├── Semanas.tsx
│   │   ├── SemanaDetalle.tsx
│   │   ├── Reportes.tsx
│   │   └── Configuracion.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSemanas.ts
│   │   ├── useRegistros.ts
│   │   └── useCorredores.ts
│   ├── store/
│   │   ├── authStore.ts           # Zustand
│   │   └── registroStore.ts
│   ├── lib/
│   │   ├── supabase.ts            # Cliente Supabase
│   │   ├── formulas.ts            # calcIC(), calcICS()
│   │   ├── dateUtils.ts
│   │   └── importParser.ts        # CSV/Excel → registros
│   ├── types/
│   │   └── index.ts               # Tipos TypeScript de todas las entidades
│   ├── App.tsx
│   └── main.tsx
├── .env.local
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 12. Tipos TypeScript principales

```typescript
// src/types/index.ts

export type Rol = 'admin' | 'digitador' | 'supervisor' | 'analista';
export type EstadoSemana = 'borrador' | 'en_revision' | 'validado' | 'publicado';
export type FuenteDato = 'manual' | 'importado';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
}

export interface Corredor {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  orden: number;
  notas?: string;
}

export interface Semana {
  id: string;
  numero_semana: number;
  periodo: number;
  fecha_inicio: string;       // ISO date "2026-05-04"
  fecha_fin: string;
  estado: EstadoSemana;
  observaciones?: string;
  comentario_rechazo?: string;
  creado_por: string;
  validado_por?: string;
  validado_en?: string;
  created_at: string;
  updated_at: string;
}

export interface RegistroDiario {
  id: string;
  semana_id: string;
  corredor_id: string;
  fecha: string;              // ISO date
  // Sección I
  kms_programados?: number;
  kms_ejecutados?: number;
  kms_efectivos?: number;
  total_pasajeros?: number;
  servicios_programados?: number;
  servicios_ejecutados?: number;
  servicios_puntuales?: number;
  // Sección II
  ica?: number;
  ick?: number;
  icd?: number;
  ic?: number;                // calculado
  ip?: number;
  ie?: number;
  ics?: number;               // calculado
  // Control
  tiene_datos: boolean;
  fuente: FuenteDato;
  creado_por: string;
  updated_at: string;
}

// Helpers de cálculo
export interface TotalesCorredor {
  kms_programados: number;
  kms_ejecutados: number;
  kms_efectivos: number;
  total_pasajeros: number;
  servicios_programados: number;
  servicios_ejecutados: number;
  servicios_puntuales: number;
  ica_prom: number;
  ick_prom: number;
  icd_prom: number;
  ic_prom: number;
  ip_prom: number;
  ie_prom: number;
  ics_prom: number;
}
```

---

## 13. Funciones de Fórmulas (src/lib/formulas.ts)

```typescript
export function calcIC(ica: number, ick: number, icd: number): number {
  return parseFloat(((ica + ick + icd) / 3).toFixed(2));
}

export function calcICS(ic: number, ip: number, ie: number): number {
  return parseFloat((ic * 0.5 + ip * 0.25 + ie * 0.25).toFixed(2));
}

export function getICSColor(ics: number): string {
  if (ics >= 80) return '#27ae60';
  if (ics >= 70) return '#f39c12';
  return '#e74c3c';
}

export function calcTotalesCorredor(registros: RegistroDiario[]): TotalesCorredor {
  const conDatos = registros.filter(r => r.tiene_datos);
  const suma = (campo: keyof RegistroDiario) =>
    conDatos.reduce((acc, r) => acc + (Number(r[campo]) || 0), 0);
  const prom = (campo: keyof RegistroDiario) => {
    const vals = conDatos.filter(r => r[campo] != null);
    if (!vals.length) return 0;
    return parseFloat((vals.reduce((a, r) => a + Number(r[campo]), 0) / vals.length).toFixed(2));
  };
  return {
    kms_programados: suma('kms_programados'),
    kms_ejecutados: suma('kms_ejecutados'),
    kms_efectivos: suma('kms_efectivos'),
    total_pasajeros: suma('total_pasajeros'),
    servicios_programados: suma('servicios_programados'),
    servicios_ejecutados: suma('servicios_ejecutados'),
    servicios_puntuales: suma('servicios_puntuales'),
    ica_prom: prom('ica'),
    ick_prom: prom('ick'),
    icd_prom: prom('icd'),
    ic_prom: prom('ic'),
    ip_prom: prom('ip'),
    ie_prom: prom('ie'),
    ics_prom: prom('ics'),
  };
}
```

---

## 14. Fases de Implementación

### Fase 1 — MVP (4–6 semanas)
Objetivo: sistema funcional para registrar y consultar semanas.

- [x] Setup: Vite + React + TypeScript + Tailwind + shadcn/ui
- [x] Supabase: crear proyecto, tablas, RLS básico
- [x] Autenticación: login, logout, protección de rutas por rol
- [x] Layout: sidebar, menú adaptado al rol
- [x] Módulo Registro: metadatos + ingreso manual + cálculo IC/ICS
- [x] Módulo Semanas: lista + detalle + estados básicos (borrador/validado)
- [x] Dashboard: KPI cards + 2 gráficas básicas (ICS, pasajeros)
- [x] Exportar PDF básico del informe semanal

### Fase 2 — Flujo completo (2–3 semanas adicionales)
- [x] Flujo de aprobación completo (borrador → revisión → validado)
- [x] Importación de archivos CSV/Excel
- [x] Semanas futuras (crear con anticipación, filas vacías)
- [x] Dashboard con filtros por corredor y período
- [x] Módulo Reportes completo (mensual, comparativo, tendencias)
- [x] Exportar Excel

### Fase 3 — Mejoras (post-lanzamiento)
- [x] Notificaciones por email
- [x] Módulo de auditoría
- [x] Gestión de usuarios desde la UI
- [x] Mejoras mobile (responsive completo)
- [x] Drag & drop para ordenar corredores
- [x] Importación con mapeo de columnas personalizado

---

## 15. Criterios de Aceptación — MVP

1. Un digitador puede crear una semana, ingresar datos de 2+ corredores y guardar como borrador.
2. IC e ICS se calculan automáticamente al ingresar los indicadores base.
3. Las filas vacías (días sin operación) se muestran pero no alteran los totales.
4. Un supervisor puede ver la semana en revisión y aprobarla o rechazarla con comentario.
5. El informe PDF generado reproduce el formato del documento oficial INTRANT.
6. Dos usuarios en sesiones distintas pueden trabajar simultáneamente sin conflicto.
7. Los datos persisten en Supabase y son accesibles desde cualquier navegador.
8. Un analista solo puede ver datos, no modificar nada.

---

## 16. Roles de Agentes en este Proyecto

Este proyecto opera bajo un modelo de colaboración entre dos agentes con responsabilidades claramente separadas:

### 🎨 Claude — Diseñador y Arquitecto del Proyecto
Claude es el responsable del **diseño, la arquitectura y la toma de decisiones** del sistema:
- Define la estructura del proyecto, los módulos y los flujos de usuario
- Diseña el esquema de base de datos, las relaciones y las políticas RLS
- Establece la lógica de negocio, las fórmulas y las reglas de validación
- Determina la paleta visual, los componentes UI y la experiencia de usuario
- Escribe y mantiene el PRD como fuente de verdad
- Toma decisiones de arquitectura cuando surgen ambigüedades
- Cualquier cambio de diseño o requisito debe pasar primero por Claude

### 💻 Codex — Programador y Ejecutor
Codex es el responsable de **implementar lo que Claude diseña**:
- Traduce el PRD en código funcional siguiendo exactamente las especificaciones
- No toma decisiones de diseño por cuenta propia; si algo no está claro en el PRD, debe preguntar antes de asumir
- Implementa los módulos en el orden definido en las Fases de Implementación
- Sigue la estructura de carpetas, tipos TypeScript y convenciones definidas en este PRD
- Reporta al diseñador si detecta una inconsistencia o imposibilidad técnica en el diseño
- No cambia nombres de tablas, campos, rutas ni componentes sin aprobación del diseñador

### 🔄 Flujo de trabajo entre agentes

```
Sr. Torres (Product Owner)
       │
       ▼
   Claude (Diseñador)
   - Actualiza el PRD
   - Define qué construir
       │
       ▼
   Codex (Programador)
   - Lee el PRD
   - Implementa lo especificado
   - Reporta bloqueos al diseñador
```

---

## 17. Notas Técnicas para Codex

- El proyecto debe inicializarse con `npm create vite@latest sitpsd-corredores -- --template react-ts`
- Instalar: `@supabase/supabase-js`, `react-router-dom`, `zustand`, `recharts`, `@react-pdf/renderer`, `xlsx`, `papaparse`, `tailwindcss`, `shadcn/ui`
- Las variables de entorno van en `.env.local` (nunca en el repo)
- El archivo `src/lib/supabase.ts` debe exportar el cliente singleton de Supabase
- Todas las llamadas a Supabase deben manejar errores y mostrar toasts al usuario
- Los tipos en `src/types/index.ts` deben coincidir exactamente con el esquema de BD
- No usar `any` en TypeScript
- Las fórmulas IC e ICS están en `src/lib/formulas.ts` y se reutilizan en frontend y en el trigger de BD
- El PDF del informe debe reproducir el layout del documento "SEMANA OPERACIONAL 04-10 MAYO 2026 Corredores" adjunto como referencia visual
- Ante cualquier duda de implementación que implique una decisión de diseño, **consultar con Claude antes de proceder**

---

*Fin del PRD — SITPSD v1.0*  
*Sistema de Registro Operacional de Corredores Interoperables*  
*INTRANT · Dirección de Movilidad Sostenible · Gran Santo Domingo*
