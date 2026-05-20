# SIGO — Migraciones de Base de Datos

Las migraciones están en `supabase/migrations/` y se aplican con el Supabase CLI.

## Prerequisitos

1. `npm install` (incluye Supabase CLI como devDependency)
2. Personal Access Token de Supabase: https://app.supabase.com/account/tokens

## Configuración inicial (una sola vez)

```bash
npx supabase login
npx supabase link --project-ref [TU_PROJECT_REF]
```

El `project-ref` está en Supabase Dashboard → Settings → General → Reference ID.

## Aplicar migraciones

```bash
npm run db:push
```

## Ver estado

```bash
npm run db:status
```

## Nueva migración

```bash
npm run db:new nombre_descripcion
```

## Orden de migraciones

| Archivo | Contenido |
|---------|-----------|
| `20260520000001_create_tables.sql` | Tablas principales |
| `20260520000002_indexes.sql` | Índices de rendimiento |
| `20260520000003_rls_policies.sql` | Row Level Security |
| `20260520000004_functions_triggers.sql` | Triggers + RPC upsert |
| `20260520000005_seed_corredores.sql` | 2 corredores iniciales |
