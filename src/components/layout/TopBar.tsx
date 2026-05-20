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
