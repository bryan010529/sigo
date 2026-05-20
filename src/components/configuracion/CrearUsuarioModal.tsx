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
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<Rol>('digitador');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !nombre || !password) return;
    setSaving(true);
    setError(null);
    const err = await onCrear(email.trim(), nombre.trim(), rol, password);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
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
            <input
              className={inputCls}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Correo electrónico</label>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Rol</label>
            <select className={inputCls} value={rol} onChange={e => setRol(e.target.value as Rol)}>
              {ROLES.map(r => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Contraseña temporal</label>
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />
            <p className="text-xs text-gray-500 mt-1">
              El usuario deberá cambiarla en su primer acceso.
            </p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-navy text-white hover:bg-navy-dark">
              {saving ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
