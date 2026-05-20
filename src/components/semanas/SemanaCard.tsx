import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Send, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import EstadoBadge from './EstadoBadge';
import { useAuthStore } from '../../store/authStore';
import type { Semana } from '../../types';

interface Props {
  semana: Semana;
  onEnviar: (id: string) => void;
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
  onEliminar: (id: string) => void;
  onPublicar: (id: string) => void;
}

export default function SemanaCard({
  semana,
  onEnviar,
  onAprobar,
  onRechazar,
  onEliminar,
  onPublicar,
}: Props) {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const rol = usuario?.rol;

  const fechaInicio = new Date(semana.fecha_inicio + 'T00:00:00').toLocaleDateString('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const fechaFin = new Date(semana.fecha_fin + 'T00:00:00').toLocaleDateString('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col gap-4"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--navy)' }}
            >
              Semana {semana.numero_semana}
            </span>
            <EstadoBadge estado={semana.estado} />
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Período {semana.periodo} · {fechaInicio} – {fechaFin}
          </p>
        </div>
      </div>

      {/* Comentario de rechazo */}
      {semana.comentario_rechazo && semana.estado === 'borrador' && (
        <div
          className="text-xs rounded-lg px-3 py-2"
          style={{ backgroundColor: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' }}
        >
          <span className="font-semibold">Rechazada:</span> {semana.comentario_rechazo}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Ver detalle — todos */}
        <button
          onClick={() => navigate(`/semanas/${semana.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--light)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          <Eye size={13} /> Ver
        </button>

        {/* Editar — digitador/admin en borrador */}
        {(rol === 'admin' || rol === 'digitador') && semana.estado === 'borrador' && (
          <button
            onClick={() => navigate(`/registro/${semana.id}/editar`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--navy)', color: 'white' }}
          >
            <Edit size={13} /> Editar
          </button>
        )}

        {/* Enviar a revisión — digitador/admin en borrador */}
        {(rol === 'admin' || rol === 'digitador') && semana.estado === 'borrador' && (
          <button
            onClick={() => onEnviar(semana.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}
          >
            <Send size={13} /> Enviar a revisión
          </button>
        )}

        {/* Aprobar — supervisor/admin en revisión */}
        {(rol === 'admin' || rol === 'supervisor') && semana.estado === 'en_revision' && (
          <button
            onClick={() => onAprobar(semana.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}
          >
            <CheckCircle size={13} /> Aprobar
          </button>
        )}

        {/* Rechazar — supervisor/admin en revisión */}
        {(rol === 'admin' || rol === 'supervisor') && semana.estado === 'en_revision' && (
          <button
            onClick={() => onRechazar(semana.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' }}
          >
            <XCircle size={13} /> Rechazar
          </button>
        )}

        {/* Publicar — solo admin en validado */}
        {rol === 'admin' && semana.estado === 'validado' && (
          <button
            onClick={() => onPublicar(semana.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }}
          >
            Publicar
          </button>
        )}

        {/* Eliminar — solo admin */}
        {rol === 'admin' && (
          <button
            onClick={() => onEliminar(semana.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80 ml-auto"
            style={{ color: 'var(--red)' }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
