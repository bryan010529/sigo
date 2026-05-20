import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useSemanas } from '../hooks/useSemanas';
import SemanaCard from '../components/semanas/SemanaCard';
import type { EstadoSemana } from '../types';
import { useAuthStore } from '../store/authStore';

const ESTADOS: { value: EstadoSemana | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'en_revision', label: 'En Revisión' },
  { value: 'validado', label: 'Validado' },
  { value: 'publicado', label: 'Publicado' },
];

export default function Semanas() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const [filtroEstado, setFiltroEstado] = useState<EstadoSemana | ''>('');
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [actionError, setActionError] = useState('');

  const { semanas, loading, error, enviarARevision, aprobar, rechazar, eliminar } = useSemanas({
    estado: filtroEstado,
  });

  async function handleRechazar() {
    if (!rechazandoId || !motivoRechazo.trim()) return;
    try {
      await rechazar(rechazandoId, motivoRechazo.trim());
      setRechazandoId(null);
      setMotivoRechazo('');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al rechazar');
    }
  }

  async function handleEnviar(id: string) {
    try {
      await enviarARevision(id);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al enviar');
    }
  }

  async function handleAprobar(id: string) {
    try {
      await aprobar(id);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al aprobar');
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar esta semana? Esta acción no se puede deshacer.')) return;
    try {
      await eliminar(id);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as EstadoSemana | '')}
            className="text-sm rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'white' }}
          >
            {ESTADOS.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>

        {(usuario?.rol === 'admin' || usuario?.rol === 'digitador') && (
          <button
            onClick={() => navigate('/registro/nuevo')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            <Plus size={15} /> Nueva Semana
          </button>
        )}
      </div>

      {/* Error de acción */}
      {actionError && (
        <div
          className="text-sm rounded-lg px-4 py-3"
          style={{ backgroundColor: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' }}
        >
          {actionError}
          <button onClick={() => setActionError('')} className="ml-3 underline">Cerrar</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {/* Error de carga */}
      {error && !loading && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--red)' }}>{error}</p>
      )}

      {/* Empty state */}
      {!loading && !error && semanas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay semanas registradas.</p>
        </div>
      )}

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {semanas.map(semana => (
          <SemanaCard
            key={semana.id}
            semana={semana}
            onEnviar={handleEnviar}
            onAprobar={handleAprobar}
            onRechazar={id => { setRechazandoId(id); setMotivoRechazo(''); }}
            onEliminar={handleEliminar}
          />
        ))}
      </div>

      {/* Modal Rechazo */}
      {rechazandoId && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            style={{ border: '1px solid var(--border)' }}
          >
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Motivo de rechazo
            </h3>
            <textarea
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              rows={4}
              placeholder="Describe el motivo por el que se devuelve esta semana..."
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setRechazandoId(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--muted)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={!motivoRechazo.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--red)' }}
              >
                Rechazar semana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
