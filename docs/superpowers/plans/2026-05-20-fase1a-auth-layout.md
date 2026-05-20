# SIGO Fase 1A — Auth + Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el shell completo de la aplicación: React Router con rutas protegidas por rol, página de Login con Supabase Auth, y el layout principal con Sidebar role-based y TopBar.

**Architecture:** React Router v6 maneja todas las rutas. El hook `useAuth` inicializa la sesión de Supabase y llena el `authStore` de Zustand al montar la app. `ProtectedRoute` lee el store para proteger rutas por rol sin hacer llamadas extra a Supabase. El `Layout` envuelve todas las rutas protegidas con Sidebar + TopBar + `<Outlet />`.

**Tech Stack:** React 18 + React Router v6 + Zustand (authStore) + Supabase Auth + Tailwind CSS v4 + shadcn/ui + lucide-react.

**Nota sobre Supabase:** Las credenciales son placeholders durante el desarrollo. El Login mostrará error al intentar conectar — eso es esperado. La UI y el routing funcionan correctamente. Los datos reales llegarán cuando se conecte Supabase.

---

## Mapa de Archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|----------------|
| `src/App.tsx` | Modificar | Router raíz + inicialización de auth + rutas |
| `src/hooks/useAuth.ts` | Crear | Sesión Supabase → authStore, listener de cambios, logout |
| `src/pages/Login.tsx` | Crear | Formulario email+password, llamada Supabase Auth |
| `src/components/layout/ProtectedRoute.tsx` | Crear | Guard: redirect /login si no autenticado; redirect /dashboard si rol no permitido |
| `src/components/layout/Sidebar.tsx` | Crear | Sidebar fijo con logo, menú role-based, info usuario, logout |
| `src/components/layout/TopBar.tsx` | Crear | Barra superior con título de página y avatar |
| `src/components/layout/Layout.tsx` | Crear | Wrapper: Sidebar + TopBar + `<Outlet />` |
| `src/pages/Dashboard.tsx` | Crear | Shell vacío (se llenará en Plan B) |
| `src/pages/Semanas.tsx` | Crear | Shell vacío |
| `src/pages/SemanaDetalle.tsx` | Crear | Shell vacío |
| `src/pages/Registro.tsx` | Crear | Shell vacío |
| `src/pages/Reportes.tsx` | Crear | Shell vacío |
| `src/pages/Configuracion.tsx` | Crear | Shell vacío |

---

## Task 1: Actualizar App.tsx con React Router y shells de página

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/Dashboard.tsx`
- Create: `src/pages/Semanas.tsx`
- Create: `src/pages/SemanaDetalle.tsx`
- Create: `src/pages/Registro.tsx`
- Create: `src/pages/Reportes.tsx`
- Create: `src/pages/Configuracion.tsx`

- [ ] **Step 1: Crear shells de página**

Crear `/Users/torres/proyectos/SIGO/src/pages/Dashboard.tsx`:
```tsx
export default function Dashboard() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-navy">Dashboard</h1></div>;
}
```

Crear `/Users/torres/proyectos/SIGO/src/pages/Semanas.tsx`:
```tsx
export default function Semanas() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-navy">Semanas</h1></div>;
}
```

Crear `/Users/torres/proyectos/SIGO/src/pages/SemanaDetalle.tsx`:
```tsx
import { useParams } from 'react-router-dom';

export default function SemanaDetalle() {
  const { id } = useParams<{ id: string }>();
  return <div className="p-6"><h1 className="text-2xl font-bold text-navy">Semana {id}</h1></div>;
}
```

Crear `/Users/torres/proyectos/SIGO/src/pages/Registro.tsx`:
```tsx
export default function Registro() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-navy">Nuevo Registro</h1></div>;
}
```

Crear `/Users/torres/proyectos/SIGO/src/pages/Reportes.tsx`:
```tsx
export default function Reportes() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-navy">Reportes</h1></div>;
}
```

Crear `/Users/torres/proyectos/SIGO/src/pages/Configuracion.tsx`:
```tsx
export default function Configuracion() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-navy">Configuración</h1></div>;
}
```

- [ ] **Step 2: Reemplazar `src/App.tsx` con Router básico (sin auth todavía)**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Semanas from './pages/Semanas';
import SemanaDetalle from './pages/SemanaDetalle';
import Registro from './pages/Registro';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/semanas" element={<Semanas />} />
        <Route path="/semanas/:id" element={<SemanaDetalle />} />
        <Route path="/registro/nuevo" element={<Registro />} />
        <Route path="/registro/:semanaId/editar" element={<Registro />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 4: Verificar build**

```bash
cd /Users/torres/proyectos/SIGO && npm run build 2>&1 | tail -3
```
Esperado: `✓ built in Xs`

- [ ] **Step 5: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/App.tsx src/pages/
git commit -m "feat: add React Router with page shells"
git push origin main
```

---

## Task 2: Hook useAuth

**Files:**
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Crear `src/hooks/useAuth.ts`**

```ts
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Usuario } from '../types';

async function fetchUsuario(userId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Usuario;
}

export function useAuth() {
  const { setUsuario, setLoading, reset } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const usuario = await fetchUsuario(session.user.id);
        if (mounted) setUsuario(usuario);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          const usuario = await fetchUsuario(session.user.id);
          setUsuario(usuario);
        } else if (event === 'SIGNED_OUT') {
          reset();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUsuario, setLoading, reset]);
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/hooks/useAuth.ts
git commit -m "feat: add useAuth hook with Supabase session management"
git push origin main
```

---

## Task 3: Página Login

**Files:**
- Create: `src/pages/Login.tsx`

- [ ] **Step 1: Crear `src/pages/Login.tsx`**

```tsx
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      return;
    }
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--light)' }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            <span className="text-white text-2xl font-bold">SI</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>SIGO</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Sistema de Gestión Operacional
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            INTRANT · Dirección de Movilidad Sostenible
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text)' }}>
            Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text)' }}
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  backgroundColor: 'white',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--navy)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                placeholder="usuario@intrant.gob.do"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text)' }}
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  backgroundColor: 'white',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--navy)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--red)', backgroundColor: '#fef2f2' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'var(--navy)' }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--muted)' }}>
          No tienes cuenta — contacta al Administrador del sistema.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/pages/Login.tsx
git commit -m "feat: add Login page with Supabase Auth"
git push origin main
```

---

## Task 4: ProtectedRoute

**Files:**
- Create: `src/components/layout/ProtectedRoute.tsx`

- [ ] **Step 1: Crear `src/components/layout/ProtectedRoute.tsx`**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { Rol } from '../../types';

interface Props {
  children: React.ReactNode;
  roles?: Rol[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { usuario, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--light)' }}>
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/components/layout/ProtectedRoute.tsx
git commit -m "feat: add ProtectedRoute with role-based guards"
git push origin main
```

---

## Task 5: Sidebar

**Files:**
- Create: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Crear `src/components/layout/Sidebar.tsx`**

```tsx
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Rol } from '../../types';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: Rol[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    icon: <LayoutDashboard size={18} />,
    label: 'Dashboard',
    roles: ['admin', 'digitador', 'supervisor', 'analista'],
  },
  {
    to: '/registro/nuevo',
    icon: <FilePlus size={18} />,
    label: 'Nuevo Registro',
    roles: ['admin', 'digitador'],
  },
  {
    to: '/semanas',
    icon: <ClipboardList size={18} />,
    label: 'Semanas',
    roles: ['admin', 'digitador', 'supervisor', 'analista'],
  },
  {
    to: '/reportes',
    icon: <FileText size={18} />,
    label: 'Reportes',
    roles: ['admin', 'digitador', 'supervisor', 'analista'],
  },
];

const ROL_LABELS: Record<Rol, string> = {
  admin: 'Administrador',
  digitador: 'Digitador',
  supervisor: 'Supervisor',
  analista: 'Analista',
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const visibleItems = NAV_ITEMS.filter(
    item => !usuario || item.roles.includes(usuario.rol)
  );

  return (
    <aside
      className="flex flex-col h-screen w-60 shrink-0"
      style={{ backgroundColor: 'var(--navy)', color: 'white' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--orange)' }}
          >
            <span className="text-white text-sm font-bold">SI</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">SIGO</p>
            <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Gestión Operacional
            </p>
          </div>
        </div>
      </div>

      {/* User info */}
      {usuario && (
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
              style={{ backgroundColor: 'var(--navy-light)' }}
            >
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{usuario.nombre}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {ROL_LABELS[usuario.rol]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'hover:bg-white/10'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: 'var(--navy-light)' }
                : { color: 'rgba(255,255,255,0.75)' }
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Admin section */}
      {usuario?.rol === 'admin' && (
        <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <NavLink
            to="/configuracion"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'text-white' : 'hover:bg-white/10'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: 'var(--navy-light)' }
                : { color: 'rgba(255,255,255,0.75)' }
            }
          >
            <Settings size={18} />
            Configuración
          </NavLink>
        </div>
      )}

      {/* Logout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left hover:bg-white/10 transition-colors"
          style={{ color: 'rgba(255,255,255,0.75)' }}
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add role-based Sidebar component"
git push origin main
```

---

## Task 6: TopBar

**Files:**
- Create: `src/components/layout/TopBar.tsx`

- [ ] **Step 1: Crear `src/components/layout/TopBar.tsx`**

```tsx
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/semanas': 'Semanas',
  '/registro/nuevo': 'Nuevo Registro',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/semanas/')) return 'Detalle de Semana';
  if (pathname.startsWith('/registro/') && pathname.endsWith('/editar')) return 'Editar Registro';
  return 'SIGO';
}

export default function TopBar() {
  const { pathname } = useLocation();
  const { usuario } = useAuthStore();
  const title = getTitle(pathname);

  return (
    <header
      className="h-14 flex items-center justify-between px-6 shrink-0 border-b bg-white"
      style={{ borderColor: 'var(--border)' }}
    >
      <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
        {title}
      </h1>
      {usuario && (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm hidden sm:block" style={{ color: 'var(--muted)' }}>
            {usuario.nombre}
          </span>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/components/layout/TopBar.tsx
git commit -m "feat: add TopBar component"
git push origin main
```

---

## Task 7: Layout

**Files:**
- Create: `src/components/layout/Layout.tsx`

- [ ] **Step 1: Crear `src/components/layout/Layout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--light)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 3: Commit**

```bash
cd /Users/torres/proyectos/SIGO
git add src/components/layout/Layout.tsx
git commit -m "feat: add Layout wrapper with Sidebar and TopBar"
git push origin main
```

---

## Task 8: Conectar todo en App.tsx con auth + rutas protegidas

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Reemplazar `src/App.tsx` con la versión final**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Semanas from './pages/Semanas';
import SemanaDetalle from './pages/SemanaDetalle';
import Registro from './pages/Registro';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

function AppRoutes() {
  useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="semanas" element={<Semanas />} />
        <Route path="semanas/:id" element={<SemanaDetalle />} />
        <Route
          path="registro/nuevo"
          element={
            <ProtectedRoute roles={['admin', 'digitador']}>
              <Registro />
            </ProtectedRoute>
          }
        />
        <Route
          path="registro/:semanaId/editar"
          element={
            <ProtectedRoute roles={['admin', 'digitador']}>
              <Registro />
            </ProtectedRoute>
          }
        />
        <Route path="reportes" element={<Reportes />} />
        <Route
          path="configuracion"
          element={
            <ProtectedRoute roles={['admin']}>
              <Configuracion />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/torres/proyectos/SIGO && npx tsc --noEmit 2>&1
```
Esperado: sin output.

- [ ] **Step 3: Verificar build**

```bash
cd /Users/torres/proyectos/SIGO && npm run build 2>&1 | tail -4
```
Esperado: `✓ built in Xs` sin errores.

- [ ] **Step 4: Verificar que el dev server muestra el Login**

```bash
cd /Users/torres/proyectos/SIGO && timeout 8 npm run dev -- --port 5173 2>&1 | grep -E "Local|ready"
```
Esperado: `Local:   http://localhost:5173/`

- [ ] **Step 5: Commit final**

```bash
cd /Users/torres/proyectos/SIGO
git add src/App.tsx
git commit -m "feat: wire auth, routes, and layout — Fase 1A complete"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- [x] Login: email + contraseña, error genérico, sin registro público → Task 3
- [x] Post-login: redirigir a /dashboard → Task 3 (navigate('/dashboard'))
- [x] Logout: limpiar sesión, redirigir a /login → Task 5 (Sidebar.handleLogout)
- [x] Sidebar con logo, avatar, menú role-based → Task 5
- [x] Menú colapsa en tablet → no implementado en MVP (PRD dice sidebar colapsable en tablet — defer a Plan B)
- [x] ProtectedRoute por rol → Task 4
- [x] Menú dinámico según rol → Task 5 (visibleItems filter)
- [x] Todas las rutas del PRD definidas → Task 1 + Task 8

**Gap detectado:** El PRD menciona sidebar colapsable en tablet (768–1279px). Esto se puede agregar en una iteración futura — es CSS/state, no lógica de negocio. No bloquea Fase 1.
