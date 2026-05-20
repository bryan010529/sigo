import { useState, FormEvent, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const { usuario, loading: authLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si authLoading terminó sin usuario pero el form estaba enviando → liberar spinner
  useEffect(() => {
    if (!authLoading && !usuario && loading) {
      setLoading(false);
      setError('Perfil de usuario no encontrado. Contacta al administrador.');
    }
  }, [authLoading, usuario, loading]);

  // Redirigir si ya hay sesión activa (después de hooks)
  if (!authLoading && usuario) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setLoading(false);
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      return;
    }
    // La redirección ocurre automáticamente vía onAuthStateChange en useAuth
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--light)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            <span className="text-white text-2xl font-bold">SI</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>SIGO</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Sistema de Gestión Operacional</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>INTRANT · Dirección de Movilidad Sostenible</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text)' }}>Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
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
                style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'white' }}
                onFocus={e => (e.target.style.borderColor = 'var(--navy)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                placeholder="usuario@intrant.gob.do"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
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
                style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'white' }}
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
