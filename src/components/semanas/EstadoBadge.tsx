import type { EstadoSemana } from '../../types';

const ESTADO_CONFIG: Record<EstadoSemana, { label: string; bg: string; color: string }> = {
  borrador:    { label: 'Borrador',    bg: '#f1f5f9', color: '#64748b' },
  en_revision: { label: 'En Revisión', bg: '#fef9c3', color: '#854d0e' },
  validado:    { label: 'Validado',    bg: '#dcfce7', color: '#166534' },
  publicado:   { label: 'Publicado',   bg: '#dbeafe', color: '#1e40af' },
};

interface Props {
  estado: EstadoSemana;
  size?: 'sm' | 'md';
}

export default function EstadoBadge({ estado, size = 'md' }: Props) {
  const cfg = ESTADO_CONFIG[estado];
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${padding}`}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
