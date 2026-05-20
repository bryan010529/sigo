import { useState } from 'react';
import { CheckCircle, UserPlus, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { CrearUsuarioModal } from './CrearUsuarioModal';
import { useUsuarios } from '../../hooks/useUsuarios';
import type { Rol } from '../../types';

const ROLES: Rol[] = ['admin', 'supervisor', 'digitador', 'analista'];

const ROL_COLOR: Record<Rol, string> = {
  admin: 'bg-purple-100 text-purple-700',
  supervisor: 'bg-blue-100 text-blue-700',
  digitador: 'bg-green-100 text-green-700',
  analista: 'bg-yellow-100 text-yellow-700',
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
  if (error) return <p className="text-sm text-red-500 py-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{usuarios.length} usuario(s)</p>
        <Button onClick={() => setShowModal(true)} className="bg-navy text-white hover:bg-navy-dark flex items-center gap-1 text-sm">
          <UserPlus className="w-4 h-4" />
          Crear usuario
        </Button>
      </div>

      {feedback && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">{feedback}</p>}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              {['Nombre', 'Email', 'Rol', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-2 font-medium">
                  {h}
                </th>
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
                        {ROLES.map(r => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
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
                      onClick={() => {
                        setEditingId(u.id);
                        setEditRolVal(u.rol);
                      }}
                      title="Clic para editar"
                    >
                      {u.rol}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.activo ? 'text-green-600' : 'text-gray-400'}`}>
                    {u.activo ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    className={`text-xs font-medium ${
                      u.activo
                        ? 'text-red-500 hover:text-red-700'
                        : 'text-green-600 hover:text-green-800'
                    }`}
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
