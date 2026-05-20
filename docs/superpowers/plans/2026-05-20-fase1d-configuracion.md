# SIGO Fase 1D — Módulo Configuración (Admin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el módulo de Configuración exclusivo para admin: gestión de usuarios (crear, editar rol, activar/desactivar), gestión de corredores (crear, editar, reordenar), y log de auditoría con filtros.

**Architecture:** Una página con tres tabs (Usuarios / Corredores / Auditoría). Cada tab tiene su propio hook de datos. La creación de usuarios usa `supabase.auth.signUp` (cliente) + insert en `usuarios`. No se requieren Edge Functions. El reordenamiento de corredores usa botones ↑↓ (MVP, sin drag-and-drop). La auditoría es solo lectura con filtros locales.

**Tech Stack:** React 18 + TypeScript + Supabase JS v2 + Tailwind CSS v4 + shadcn/ui + lucide-react.

**Prerequisitos:** Fase 1A completa. Migraciones aplicadas (tablas `usuarios`, `corredores`, `auditoria_log`). RLS funcionando con `get_mi_rol()`.

---

## Mapa de Archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|----------------|
| `src/hooks/useUsuarios.ts` | Crear | Fetch todos los usuarios; crear via Auth+tabla; editar rol; toggle activo |
| `src/hooks/useCorredoresAdmin.ts` | Crear | Fetch corredores; crear; editar; reordenar (orden up/down) |
| `src/hooks/useAuditoria.ts` | Crear | Fetch auditoria_log con filtros; join con usuarios para nombre |
| `src/components/configuracion/UsuariosTab.tsx` | Crear | Tabla de usuarios + modal de creación |
| `src/components/configuracion/CrearUsuarioModal.tsx` | Crear | Form: email, nombre, rol, contraseña temporal |
| `src/components/configuracion/CorredoresTab.tsx` | Crear | Tabla de corredores + modal de creación/edición |
| `src/components/configuracion/AuditoriaTab.tsx` | Crear | Tabla de log con filtros por usuario/acción/fecha |
| `src/pages/Configuracion.tsx` | Modificar | Reemplazar shell: tabs Usuarios / Corredores / Auditoría |

---

## Task 1: Hook `useUsuarios`

**Files:**
- Create: `src/hooks/useUsuarios.ts`

- [ ] **Step 1: Crear `src/hooks/useUsuarios.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Usuario, Rol } from '../types';

export interface UseUsuariosResult {
  usuarios: Usuario[];
  loading: boolean;
  error: string | null;
  crearUsuario: (email: string, nombre: string, rol: Rol, password: string) => Promise<string | null>;
  editarRol: (id: string, rol: Rol) => Promise<string | null>;
  toggleActivo: (id: string, activo: boolean) => Promise<string | null>;
  refetch: () => void;
}

export function useUsuarios(): UseUsuariosResult {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (!mounted) return;
        if (err) setError(err.message);
        else setUsuarios((data ?? []) as Usuario[]);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [tick]);

  const crearUsuario = useCallback(
    async (email: string, nombre: string, rol: Rol, password: string): Promise<string | null> => {
      // 1. Crear en Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authErr) return authErr.message;
      if (!authData.user) return 'No se pudo crear el usuario en Auth';

      // 2. Insertar perfil en tabla usuarios
      const { error: insertErr } = await supabase.from('usuarios').insert({
        id:     authData.user.id,
        email,
        nombre,
        rol,
        activo: true,
      });
      if (insertErr) return insertErr.message;

      refetch();
      return null; // null = sin error
    },
    [refetch]
  );

  const editarRol = useCallback(
    async (id: string, rol: Rol): Promise<string | null> => {
      const { error: err } = await supabase
        .from('usuarios')
        .update({ rol })
        .eq('id', id);
      if (err) return err.message;
      refetch();
      return null;
    },
    [refetch]
  );

  const toggleActivo = useCallback(
    async (id: string, activo: boolean): Promise<string | null> => {
      const { error: err } = await supabase
        .from('usuarios')
        .update({ activo })
        .eq('id', id);
      if (err) return err.message;
      refetch();
      return null;
    },
    [refetch]
  );

  return { usuarios, loading, error, crearUsuario, editarRol, toggleActivo, refetch };
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Esperado: 0 errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUsuarios.ts
git commit -m "feat: add useUsuarios hook with CRUD operations"
```

---

## Task 2: Hook `useCorredoresAdmin`

**Files:**
- Create: `src/hooks/useCorredoresAdmin.ts`

- [ ] **Step 1: Crear `src/hooks/useCorredoresAdmin.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Corredor } from '../types';

export interface UseCorredoresAdminResult {
  corredores: Corredor[];
  loading: boolean;
  error: string | null;
  crearCorredor: (codigo: string, nombre: string) => Promise<string | null>;
  editarCorredor: (id: string, campos: Partial<Pick<Corredor, 'nombre' | 'activo'>>) => Promise<string | null>;
  moverArriba: (id: string) => Promise<void>;
  moverAbajo: (id: string) => Promise<void>;
  refetch: () => void;
}

export function useCorredoresAdmin(): UseCorredoresAdminResult {
  const [corredores, setCorredores] = useState<Corredor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from('corredores')
      .select('*')
      .order('orden', { ascending: true })
      .then(({ data, error: err }) => {
        if (!mounted) return;
        if (err) setError(err.message);
        else setCorredores((data ?? []) as Corredor[]);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [tick]);

  const crearCorredor = useCallback(
    async (codigo: string, nombre: string): Promise<string | null> => {
      // El orden del nuevo corredor es el mayor orden actual + 1
      const maxOrden = corredores.reduce((m, c) => Math.max(m, c.orden), 0);
      const { error: err } = await supabase.from('corredores').insert({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        activo: true,
        orden:  maxOrden + 1,
      });
      if (err) return err.message;
      refetch();
      return null;
    },
    [corredores, refetch]
  );

  const editarCorredor = useCallback(
    async (id: string, campos: Partial<Pick<Corredor, 'nombre' | 'activo'>>): Promise<string | null> => {
      const { error: err } = await supabase
        .from('corredores')
        .update(campos)
        .eq('id', id);
      if (err) return err.message;
      refetch();
      return null;
    },
    [refetch]
  );

  // Intercambia el orden de dos corredores adyacentes
  async function swapOrden(idA: string, ordenA: number, idB: string, ordenB: number) {
    await supabase.from('corredores').update({ orden: ordenB }).eq('id', idA);
    await supabase.from('corredores').update({ orden: ordenA }).eq('id', idB);
    refetch();
  }

  const moverArriba = useCallback(
    async (id: string) => {
      const idx = corredores.findIndex(c => c.id === id);
      if (idx <= 0) return;
      const curr = corredores[idx];
      const prev = corredores[idx - 1];
      await swapOrden(curr.id, curr.orden, prev.id, prev.orden);
    },
    [corredores]
  );

  const moverAbajo = useCallback(
    async (id: string) => {
      const idx = corredores.findIndex(c => c.id === id);
      if (idx < 0 || idx >= corredores.length - 1) return;
      const curr = corredores[idx];
      const next = corredores[idx + 1];
      await swapOrden(curr.id, curr.orden, next.id, next.orden);
    },
    [corredores]
  );

  return { corredores, loading, error, crearCorredor, editarCorredor, moverArriba, moverAbajo, refetch };
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCorredoresAdmin.ts
git commit -m "feat: add useCorredoresAdmin hook with reorder support"
```

---

## Task 3: Hook `useAuditoria`

**Files:**
- Create: `src/hooks/useAuditoria.ts`

- [ ] **Step 1: Crear `src/hooks/useAuditoria.ts`**

```ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AuditoriaEntry {
  id: string;
  tabla: string;
  registro_id: string | null;
  accion: string;
  datos_antes: Record<string, unknown> | null;
  datos_nuevo: Record<string, unknown> | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  created_at: string;
}

export interface AuditoriaFiltros {
  usuarioId: string;
  accion: string;
  desde: string;
  hasta: string;
}

export interface UseAuditoriaResult {
  entradas: AuditoriaEntry[];
  loading: boolean;
  error: string | null;
  filtros: AuditoriaFiltros;
  setFiltros: (f: Partial<AuditoriaFiltros>) => void;
}

const FILTROS_DEFAULT: AuditoriaFiltros = {
  usuarioId: '',
  accion: '',
  desde: '',
  hasta: '',
};

export function useAuditoria(): UseAuditoriaResult {
  const [entradas, setEntradas] = useState<AuditoriaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltrosState] = useState<AuditoriaFiltros>(FILTROS_DEFAULT);

  function setFiltros(f: Partial<AuditoriaFiltros>) {
    setFiltrosState(prev => ({ ...prev, ...f }));
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    let query = supabase
      .from('auditoria_log')
      .select(`
        id, tabla, registro_id, accion,
        datos_antes, datos_nuevo, usuario_id, created_at,
        usuarios ( nombre, email )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filtros.usuarioId) query = query.eq('usuario_id', filtros.usuarioId);
    if (filtros.accion)    query = query.eq('accion', filtros.accion);
    if (filtros.desde)     query = query.gte('created_at', filtros.desde);
    if (filtros.hasta)     query = query.lte('created_at', filtros.hasta + 'T23:59:59');

    query.then(({ data, error: err }) => {
      if (!mounted) return;
      if (err) { setError(err.message); setLoading(false); return; }
      const mapped: AuditoriaEntry[] = (data ?? []).map((r: Record<string, unknown>) => {
        const u = r.usuarios as { nombre: string; email: string } | null;
        return {
          id:             r.id as string,
          tabla:          r.tabla as string,
          registro_id:    r.registro_id as string | null,
          accion:         r.accion as string,
          datos_antes:    r.datos_antes as Record<string, unknown> | null,
          datos_nuevo:    r.datos_nuevo as Record<string, unknown> | null,
          usuario_id:     r.usuario_id as string | null,
          usuario_nombre: u?.nombre ?? null,
          usuario_email:  u?.email ?? null,
          created_at:     r.created_at as string,
        };
      });
      setEntradas(mapped);
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [filtros]);

  return { entradas, loading, error, filtros, setFiltros };
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuditoria.ts
git commit -m "feat: add useAuditoria hook with filterable log"
```

---

## Task 4: `CrearUsuarioModal` + `UsuariosTab`

**Files:**
- Create: `src/components/configuracion/CrearUsuarioModal.tsx`
- Create: `src/components/configuracion/UsuariosTab.tsx`

- [ ] **Step 1: Crear `src/components/configuracion/CrearUsuarioModal.tsx`**

```tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import type { Rol } from '../../types';

interface Props {
  onCrear: (email: string, nombre: string, rol: Rol, password: string) => Promise<string | null>;
  onClose: () => void;
}

const ROLES: Rol[] = ['admin', 'supervisor', 'digitador', 'analista'];

export function CrearUsuarioModal({ onCrear, onClose }: Props) {
  const [email, setEmail]       = useState('');
  const [nombre, setNombre]     = useState('');
  const [rol, setRol]           = useState<Rol>('digitador');
  const [password, setPassword] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !nombre || !password) return;
    setSaving(true);
    setError(null);
    const err = await onCrear(email.trim(), nombre.trim(), rol, password);
    setSaving(false);
    if (err) { setError(err); return; }
    onClose();
  }

  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-navy">Crear Usuario</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre completo</label>
            <input className={inputCls} value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Correo electrónico</label>
            <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Rol</label>
            <select className={inputCls} value={rol} onChange={e => setRol(e.target.value as Rol)}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Contraseña temporal</label>
            <input type="password" className={inputCls} value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6}
              placeholder="Mínimo 6 caracteres" />
            <p className="text-xs text-gray-500 mt-1">
              El usuario deberá cambiarla en su primer acceso.
            </p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-navy text-white hover:bg-navy-dark">
              {saving ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/components/configuracion/UsuariosTab.tsx`**

```tsx
import { useState } from 'react';
import { UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { CrearUsuarioModal } from './CrearUsuarioModal';
import { useUsuarios } from '../../hooks/useUsuarios';
import type { Rol } from '../../types';

const ROLES: Rol[] = ['admin', 'supervisor', 'digitador', 'analista'];

const ROL_COLOR: Record<Rol, string> = {
  admin:      'bg-purple-100 text-purple-700',
  supervisor: 'bg-blue-100 text-blue-700',
  digitador:  'bg-green-100 text-green-700',
  analista:   'bg-yellow-100 text-yellow-700',
};

export function UsuariosTab() {
  const { usuarios, loading, error, crearUsuario, editarRol, toggleActivo } = useUsuarios();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRolVal, setEditRolVal] = useState<Rol>('digitador');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleRolSave(id: string) {
    setSaving(true);
    const err = await editarRol(id, editRolVal);
    setSaving(false);
    setEditingId(null);
    if (err) setFeedback(`Error: ${err}`);
    else setFeedback('Rol actualizado');
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleToggle(id: string, activo: boolean) {
    const err = await toggleActivo(id, !activo);
    if (err) setFeedback(`Error: ${err}`);
    else setFeedback(activo ? 'Usuario desactivado' : 'Usuario activado');
    setTimeout(() => setFeedback(null), 3000);
  }

  if (loading) return <p className="text-sm text-gray-500 py-4">Cargando usuarios...</p>;
  if (error)   return <p className="text-sm text-red-500 py-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{usuarios.length} usuario(s)</p>
        <Button onClick={() => setShowModal(true)} className="bg-navy text-white hover:bg-navy-dark flex items-center gap-1 text-sm">
          <UserPlus className="w-4 h-4" />
          Crear usuario
        </Button>
      </div>

      {feedback && (
        <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">{feedback}</p>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              {['Nombre','Email','Rol','Estado','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{u.nombre}</td>
                <td className="px-4 py-2 text-gray-600">{u.email}</td>
                <td className="px-4 py-2">
                  {editingId === u.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        value={editRolVal}
                        onChange={e => setEditRolVal(e.target.value as Rol)}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button
                        className="text-green-600 hover:text-green-800 text-xs font-medium"
                        onClick={() => handleRolSave(u.id)}
                        disabled={saving}
                      >
                        Guardar
                      </button>
                      <button
                        className="text-gray-400 hover:text-gray-600 text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${ROL_COLOR[u.rol]}`}
                      onClick={() => { setEditingId(u.id); setEditRolVal(u.rol); }}
                      title="Clic para editar"
                    >
                      {u.rol}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.activo ? 'text-green-600' : 'text-gray-400'}`}>
                    {u.activo
                      ? <CheckCircle className="w-3.5 h-3.5" />
                      : <XCircle className="w-3.5 h-3.5" />
                    }
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    className={`text-xs font-medium ${u.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                    onClick={() => handleToggle(u.id, u.activo)}
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CrearUsuarioModal
          onCrear={crearUsuario}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Esperado: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/configuracion/CrearUsuarioModal.tsx src/components/configuracion/UsuariosTab.tsx
git commit -m "feat: add CrearUsuarioModal and UsuariosTab components"
```

---

## Task 5: `CorredoresTab`

**Files:**
- Create: `src/components/configuracion/CorredoresTab.tsx`

- [ ] **Step 1: Crear `src/components/configuracion/CorredoresTab.tsx`**

```tsx
import { useState } from 'react';
import { Plus, ChevronUp, ChevronDown, Pencil, X, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useCorredoresAdmin } from '../../hooks/useCorredoresAdmin';

export function CorredoresTab() {
  const { corredores, loading, error, crearCorredor, editarCorredor, moverArriba, moverAbajo } = useCorredoresAdmin();
  const [showForm, setShowForm]   = useState(false);
  const [codigo, setCodigo]       = useState('');
  const [nombre, setNombre]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [feedback, setFeedback]   = useState<string | null>(null);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo || !nombre) return;
    setSaving(true);
    setFormError(null);
    const err = await crearCorredor(codigo, nombre);
    setSaving(false);
    if (err) { setFormError(err); return; }
    setCodigo(''); setNombre('');
    setShowForm(false);
    showFeedback('Corredor creado');
  }

  async function handleEditSave(id: string) {
    const err = await editarCorredor(id, { nombre: editNombre.trim() });
    setEditingId(null);
    if (err) showFeedback(`Error: ${err}`);
    else showFeedback('Corredor actualizado');
  }

  async function handleToggleActivo(id: string, activo: boolean) {
    const err = await editarCorredor(id, { activo: !activo });
    if (err) showFeedback(`Error: ${err}`);
    else showFeedback(activo ? 'Corredor desactivado' : 'Corredor activado');
  }

  const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy';

  if (loading) return <p className="text-sm text-gray-500 py-4">Cargando corredores...</p>;
  if (error)   return <p className="text-sm text-red-500 py-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{corredores.length} corredor(es)</p>
        <Button
          onClick={() => setShowForm(f => !f)}
          className="bg-navy text-white hover:bg-navy-dark flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" />
          Agregar corredor
        </Button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <form onSubmit={handleCrear} className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
              <input
                className={`${inputCls} w-full uppercase`}
                placeholder="ej: 107"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
              <input
                className={`${inputCls} w-full`}
                placeholder="ej: Av. Independencia"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>
          </div>
          {formError && <p className="text-red-500 text-xs">{formError}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="bg-navy text-white hover:bg-navy-dark text-sm">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="text-sm">
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {feedback && (
        <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">{feedback}</p>
      )}

      {/* Tabla de corredores */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              {['Orden','Código','Nombre','Estado','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {corredores.map((c, idx) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                {/* Orden */}
                <td className="px-4 py-2">
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => moverArriba(c.id)}
                      disabled={idx === 0}
                      className="text-gray-400 hover:text-navy disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moverAbajo(c.id)}
                      disabled={idx === corredores.length - 1}
                      className="text-gray-400 hover:text-navy disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                {/* Código */}
                <td className="px-4 py-2 font-mono font-medium">{c.codigo}</td>
                {/* Nombre editable */}
                <td className="px-4 py-2">
                  {editingId === c.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        className="border rounded px-2 py-1 text-xs w-full"
                        value={editNombre}
                        onChange={e => setEditNombre(e.target.value)}
                      />
                      <button onClick={() => handleEditSave(c.id)} className="text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span>{c.nombre}</span>
                  )}
                </td>
                {/* Estado */}
                <td className="px-4 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {/* Acciones */}
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingId(c.id); setEditNombre(c.nombre); }}
                      className="text-navy hover:text-navy-dark"
                      title="Editar nombre"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActivo(c.id, c.activo)}
                      className={`text-xs font-medium ${c.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/configuracion/CorredoresTab.tsx
git commit -m "feat: add CorredoresTab with create, edit, and reorder"
```

---

## Task 6: `AuditoriaTab`

**Files:**
- Create: `src/components/configuracion/AuditoriaTab.tsx`

- [ ] **Step 1: Crear `src/components/configuracion/AuditoriaTab.tsx`**

```tsx
import { useAuditoria } from '../../hooks/useAuditoria';

const ACCIONES = ['', 'INSERT', 'UPDATE', 'DELETE', 'ESTADO_CAMBIO'];

const ACCION_COLOR: Record<string, string> = {
  INSERT:        'bg-green-100 text-green-700',
  UPDATE:        'bg-blue-100 text-blue-700',
  DELETE:        'bg-red-100 text-red-700',
  ESTADO_CAMBIO: 'bg-yellow-100 text-yellow-700',
};

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function AuditoriaTab() {
  const { entradas, loading, error, filtros, setFiltros } = useAuditoria();

  const inputCls = 'border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy';

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Acción</label>
          <select
            className={inputCls}
            value={filtros.accion}
            onChange={e => setFiltros({ accion: e.target.value })}
          >
            {ACCIONES.map(a => (
              <option key={a} value={a}>{a || 'Todas'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
          <input
            type="date" className={inputCls}
            value={filtros.desde}
            onChange={e => setFiltros({ desde: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
          <input
            type="date" className={inputCls}
            value={filtros.hasta}
            onChange={e => setFiltros({ hasta: e.target.value })}
          />
        </div>
        <button
          className="text-xs text-gray-500 hover:text-navy underline pb-1.5"
          onClick={() => setFiltros({ accion: '', desde: '', hasta: '', usuarioId: '' })}
        >
          Limpiar filtros
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando log...</p>}
      {error   && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-navy text-white">
              <tr>
                {['Fecha/Hora','Tabla','Acción','Usuario','Detalle'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    No hay registros de auditoría
                  </td>
                </tr>
              ) : (
                entradas.map(e => (
                  <tr key={e.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {formatFechaHora(e.created_at)}
                    </td>
                    <td className="px-3 py-2 font-mono">{e.tabla}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ACCION_COLOR[e.accion] ?? 'bg-gray-100'}`}>
                        {e.accion}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span title={e.usuario_email ?? ''}>
                        {e.usuario_nombre ?? e.usuario_id?.slice(0, 8) ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate text-gray-500">
                      {e.datos_nuevo
                        ? JSON.stringify(e.datos_nuevo).slice(0, 80)
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando últimas 200 entradas. Solo lectura.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/configuracion/AuditoriaTab.tsx
git commit -m "feat: add AuditoriaTab with filters"
```

---

## Task 7: Página `Configuracion`

**Files:**
- Modify: `src/pages/Configuracion.tsx`

- [ ] **Step 1: Reemplazar shell con la página completa**

```tsx
import { useState } from 'react';
import { UsuariosTab } from '../components/configuracion/UsuariosTab';
import { CorredoresTab } from '../components/configuracion/CorredoresTab';
import { AuditoriaTab } from '../components/configuracion/AuditoriaTab';

type Tab = 'usuarios' | 'corredores' | 'auditoria';

const TABS: { id: Tab; label: string }[] = [
  { id: 'usuarios',   label: 'Usuarios' },
  { id: 'corredores', label: 'Corredores' },
  { id: 'auditoria',  label: 'Auditoría' },
];

export default function Configuracion() {
  const [tab, setTab] = useState<Tab>('usuarios');

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-navy">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión del sistema — solo administradores</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-500 hover:text-navy hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido del tab activo */}
      <div>
        {tab === 'usuarios'   && <UsuariosTab />}
        {tab === 'corredores' && <CorredoresTab />}
        {tab === 'auditoria'  && <AuditoriaTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check final**

```bash
npm run build
```

Esperado: 0 errores de TypeScript.

- [ ] **Step 3: Commit y push**

```bash
git add src/pages/Configuracion.tsx
git commit -m "feat: implement Configuracion page with Usuarios, Corredores, Auditoria tabs"
git push
```

---

## Criterios de Éxito Fase 1D

1. `npm run build` completa sin errores.
2. `/configuracion` solo es accesible con rol `admin` — usuarios con otro rol redirigen al dashboard.
3. Tab **Usuarios**: lista todos los usuarios; clic en badge de rol permite editar inline; botón activa/desactiva usuario; modal "Crear usuario" crea en Supabase Auth + inserta en `usuarios`.
4. Tab **Corredores**: lista con orden correcto; botones ↑↓ reordenan en la BD; clic en ícono lápiz permite editar nombre inline; botón activa/desactiva.
5. Tab **Auditoría**: muestra el log de cambios de estado de semanas; filtros por acción y fecha funcionan.
6. El nuevo corredor aparece disponible en el módulo de Registro sin reiniciar la app.
