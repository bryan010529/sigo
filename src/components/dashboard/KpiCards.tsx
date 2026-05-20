import type { KpiData } from '../../hooks/useDashboard';
import { getICSColor } from '../../lib/formulas';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function KpiCard({ label, value, sub, color }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col gap-1"
      style={{ border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: color || 'var(--navy)' }}>
        {value}
      </p>
      {sub && <p className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  );
}

interface Props {
  kpis: KpiData;
}

export default function KpiCards({ kpis }: Props) {
  const icsColor = kpis.icsPromedio != null ? getICSColor(kpis.icsPromedio) : 'var(--muted)';
  const icsValue = kpis.icsPromedio != null ? `${kpis.icsPromedio}%` : '—';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard
        label="Total Semanas"
        value={kpis.totalSemanas}
        sub="registradas"
      />
      <KpiCard
        label="Semanas Validadas"
        value={kpis.semanasValidadas}
        sub="validadas o publicadas"
        color="var(--green)"
      />
      <KpiCard
        label="Total Pasajeros"
        value={kpis.totalPasajeros.toLocaleString('es-DO')}
        sub="boletos validados"
      />
      <KpiCard
        label="Kms Efectivos"
        value={kpis.kmsEfectivos.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
        sub="kilómetros pagados"
      />
      <KpiCard
        label="ICS Promedio"
        value={icsValue}
        sub="calidad de servicio"
        color={icsColor}
      />
    </div>
  );
}
