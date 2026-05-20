import { useDashboard } from '../hooks/useDashboard';
import KpiCards from '../components/dashboard/KpiCards';
import Charts from '../components/dashboard/Charts';

export default function Dashboard() {
  const { kpis, icsChart, pasajerosChart, corredores, loading, error, refetch } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>
          Error cargando datos: {error}
        </p>
        <button
          onClick={refetch}
          className="mt-3 text-sm underline"
          style={{ color: 'var(--navy)' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KpiCards kpis={kpis} />
      <Charts icsChart={icsChart} pasajerosChart={pasajerosChart} corredores={corredores} />
    </div>
  );
}
