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
