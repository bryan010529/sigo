import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  Route,
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

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
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
      className={`
        flex flex-col h-screen w-60 shrink-0
        fixed md:relative z-30 md:z-auto
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
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
            onClick={onClose}
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
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Admin section */}
      {usuario?.rol === 'admin' && (
        <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <NavLink
            to="/configuracion?tab=corredores"
            onClick={onClose}
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
            <Route size={18} />
            Corredores
          </NavLink>
          <NavLink
            to="/configuracion"
            onClick={onClose}
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
