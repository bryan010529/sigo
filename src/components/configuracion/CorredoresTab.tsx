import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, X, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useCorredoresAdmin } from '../../hooks/useCorredoresAdmin';

export function CorredoresTab() {
  const { corredores, loading, error, crearCorredor, editarCorredor, moverArriba, moverAbajo } =
    useCorredoresAdmin();
  const [showForm, setShowForm] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [costo, setCosto] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCosto, setEditCosto] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo || !nombre) return;
    setSaving(true);
    setFormError(null);
    const err = await crearCorredor(codigo, nombre, costo ? parseFloat(costo) : 0);
    setSaving(false);
    if (err) {
      setFormError(err);
      return;
    }
    setCodigo('');
    setNombre('');
    setCosto('');
    setShowForm(false);
    showFeedback('Corredor creado');
  }

  async function handleEditSave(id: string) {
    const err = await editarCorredor(id, {
      nombre: editNombre.trim(),
      costo_por_km: editCosto ? parseFloat(editCosto) : 0,
    });
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
  if (error) return <p className="text-sm text-red-500 py-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{corredores.length} corredor(es)</p>
        <Button
          onClick={() => setShowForm(f => !f)}
          className="bg-navy text-white hover:bg-navy-dark flex items-center gap-1 text-sm"
          style={{ backgroundColor: 'var(--navy)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Agregar corredor
        </Button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <form onSubmit={handleCrear} className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Costo/km (RD$)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                className={`${inputCls} w-full`}
                placeholder="ej: 45.7823"
                value={costo}
                onChange={e => setCosto(e.target.value)}
              />
            </div>
          </div>
          {formError && <p className="text-red-500 text-xs">{formError}</p>}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-navy text-white hover:bg-navy-dark text-sm"
              style={{ backgroundColor: 'var(--navy)', color: 'white' }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="text-sm">
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {feedback && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">{feedback}</p>}

      {/* Tabla de corredores */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white" style={{ backgroundColor: 'var(--navy)', color: 'white' }}>
            <tr>
              {['Orden', 'Código', 'Nombre', 'Costo/km (RD$)', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-2 font-medium">
                  {h}
                </th>
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
                      style={{ color: 'var(--navy)' }}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moverAbajo(c.id)}
                      disabled={idx === corredores.length - 1}
                      className="text-gray-400 hover:text-navy disabled:opacity-30"
                      style={{ color: 'var(--navy)' }}
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
                    </div>
                  ) : (
                    <span>{c.nombre}</span>
                  )}
                </td>
                {/* Costo/km editable */}
                <td className="px-4 py-2">
                  {editingId === c.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.0001"
                        className="border rounded px-2 py-1 text-xs w-28"
                        value={editCosto}
                        onChange={e => setEditCosto(e.target.value)}
                      />
                      <button onClick={() => handleEditSave(c.id)} className="text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono">{c.costo_por_km?.toFixed(4) ?? '0.0000'}</span>
                  )}
                </td>
                {/* Estado */}
                <td className="px-4 py-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {/* Acciones */}
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditNombre(c.nombre);
                        setEditCosto(String(c.costo_por_km ?? 0));
                      }}
                      className="text-navy hover:text-navy-dark"
                      style={{ color: 'var(--navy)' }}
                      title="Editar nombre"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActivo(c.id, c.activo)}
                      className={`text-xs font-medium ${
                        c.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'
                      }`}
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
