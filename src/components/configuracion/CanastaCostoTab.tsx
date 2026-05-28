import { useState, useEffect } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useCanastaCosto } from '../../hooks/useCanastaCosto';
import { supabase } from '../../lib/supabase';
import type { CanastaCostoConCorredor } from '../../types';

const EMPTY_FORM = {
  corredor_id: '',
  año: String(new Date().getFullYear()),
  costo_por_km: '',
  combustible_pct: '36',
  conductores_pct: '25.7',
  patio_pct: '14.5',
  administracion_pct: '10.3',
  mantenimiento_pct: '8.2',
  otros_pct: '5.3',
};

type FormState = typeof EMPTY_FORM;

const PCT_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: 'combustible_pct', label: 'Combustible' },
  { key: 'conductores_pct', label: 'Conductores' },
  { key: 'patio_pct', label: 'Patio' },
  { key: 'administracion_pct', label: 'Administración' },
  { key: 'mantenimiento_pct', label: 'Mantenimiento' },
  { key: 'otros_pct', label: 'Otros' },
];

export function CanastaCostoTab() {
  const { canastas, loading, error, crear, actualizar, eliminar } = useCanastaCosto();
  const [corredores, setCorredores] = useState<{ id: string; codigo: string; nombre: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('corredores')
      .select('id, codigo, nombre')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .then(({ data }) => setCorredores((data ?? []) as { id: string; codigo: string; nombre: string }[]));
  }, []);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  function setField(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const pctSum = PCT_FIELDS.reduce((sum, f) => sum + (parseFloat(form[f.key]) || 0), 0);
  const pctValid = Math.abs(pctSum - 100) < 0.01;
  const costoKm = parseFloat(form.costo_por_km) || 0;

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(c: CanastaCostoConCorredor) {
    setEditingId(c.id);
    setForm({
      corredor_id: c.corredor_id,
      año: String(c.año),
      costo_por_km: String(c.costo_por_km),
      combustible_pct: String(c.combustible_pct),
      conductores_pct: String(c.conductores_pct),
      patio_pct: String(c.patio_pct),
      administracion_pct: String(c.administracion_pct),
      mantenimiento_pct: String(c.mantenimiento_pct),
      otros_pct: String(c.otros_pct),
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.corredor_id || !form.costo_por_km || !pctValid) return;
    setSaving(true);
    setFormError(null);

    const data = {
      corredor_id: form.corredor_id,
      año: parseInt(form.año),
      costo_por_km: parseFloat(form.costo_por_km),
      combustible_pct: parseFloat(form.combustible_pct),
      conductores_pct: parseFloat(form.conductores_pct),
      patio_pct: parseFloat(form.patio_pct),
      administracion_pct: parseFloat(form.administracion_pct),
      mantenimiento_pct: parseFloat(form.mantenimiento_pct),
      otros_pct: parseFloat(form.otros_pct),
    };

    const err = editingId
      ? await actualizar(editingId, data)
      : await crear(data);

    setSaving(false);
    if (err) {
      setFormError(err.includes('unique') || err.includes('duplicate')
        ? 'Ya existe una canasta para ese corredor y año'
        : err);
      return;
    }
    closeForm();
    showFeedback(editingId ? 'Canasta actualizada' : 'Canasta creada');
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar esta canasta de costo?')) return;
    const err = await eliminar(id);
    if (err) showFeedback(`Error: ${err}`);
    else showFeedback('Canasta eliminada');
  }

  const inputCls =
    'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy w-full';

  if (loading) return <p className="text-sm text-gray-500 py-4">Cargando canastas...</p>;
  if (error) return <p className="text-sm text-red-500 py-4">{error}</p>;

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{canastas.length} canasta(s) registrada(s)</p>
        <Button
          onClick={openCreate}
          className="flex items-center gap-1 text-sm"
          style={{ backgroundColor: 'var(--navy)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Nueva canasta
        </Button>
      </div>

      {/* Formulario crear/editar */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId ? 'Editar canasta de costo' : 'Nueva canasta de costo'}
          </h3>

          {/* Fila 1: Corredor, Año, Costo/km */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Corredor</label>
              <select
                className={inputCls}
                value={form.corredor_id}
                onChange={e => setField('corredor_id', e.target.value)}
                required
                disabled={!!editingId}
              >
                <option value="">Seleccionar...</option>
                {corredores.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
              <input
                type="number"
                min="2020"
                max="2099"
                className={inputCls}
                value={form.año}
                onChange={e => setField('año', e.target.value)}
                required
                disabled={!!editingId}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Costo por km (RD$)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                className={inputCls}
                placeholder="ej: 107.2256"
                value={form.costo_por_km}
                onChange={e => setField('costo_por_km', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Porcentajes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Desglose del costo (%)</label>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  pctValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
              >
                Suma: {pctSum.toFixed(2)}% {pctValid ? '✓' : '≠ 100%'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PCT_FIELDS.map(({ key, label }) => {
                const pct = parseFloat(form[key]) || 0;
                const monto = costoKm > 0 ? (pct / 100) * costoKm : null;
                return (
                  <div key={key}>
                    <label className="block text-xs text-gray-600 mb-1">{label} (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className={inputCls}
                        value={form[key]}
                        onChange={e => setField(key, e.target.value)}
                        required
                      />
                      {monto !== null && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
                          RD${monto.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {formError && <p className="text-red-500 text-xs">{formError}</p>}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={saving || !pctValid}
              style={{ backgroundColor: 'var(--navy)', color: 'white' }}
              className="text-sm"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm} className="text-sm">
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {feedback && (
        <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">{feedback}</p>
      )}

      {/* Tabla */}
      {canastas.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8 border rounded-lg">
          No hay canastas registradas. Crea la primera con el botón superior.
        </p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead style={{ backgroundColor: 'var(--navy)', color: 'white' }}>
              <tr>
                {['Corredor', 'Año', 'RD$/km', 'Combustible', 'Conductores', 'Patio', 'Admin.', 'Mant.', 'Otros', ''].map(
                  h => (
                    <th key={h} className="text-left px-4 py-2 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {canastas.map(c => {
                const km = Number(c.costo_por_km);
                const rd = (pct: number) =>
                  `RD$${((pct / 100) * km).toFixed(2)}`;
                return (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium whitespace-nowrap">
                      {c.corredor.codigo} — {c.corredor.nombre}
                    </td>
                    <td className="px-4 py-2 font-mono">{c.año}</td>
                    <td className="px-4 py-2 font-mono font-semibold">{km.toFixed(4)}</td>
                    {[
                      c.combustible_pct,
                      c.conductores_pct,
                      c.patio_pct,
                      c.administracion_pct,
                      c.mantenimiento_pct,
                      c.otros_pct,
                    ].map((pct, i) => (
                      <td key={i} className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {rd(Number(pct))}
                        <span className="text-gray-400 ml-1">({pct}%)</span>
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          style={{ color: 'var(--navy)' }}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEliminar(c.id)}
                          className="text-red-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
