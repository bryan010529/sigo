import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import KpiCards from '../components/dashboard/KpiCards';
import Charts from '../components/dashboard/Charts';
import { KpiPanel } from '../components/kpi/KpiPanel';
import type { DashboardFilters } from '../hooks/useDashboard';

export default function Dashboard() {
  const [corredorId, setCorredorId] = useState('');
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  const [applied, setApplied] = useState<DashboardFilters>({});

  const { kpis, icsChart, pasajerosChart, kmsChart, serviciosChart, corredores, corredoresOpciones, loading, error, refetch } = useDashboard(applied);

  function aplicarFiltros() {
    setApplied({
      corredorId: corredorId || undefined,
      periodoDesde: periodoDesde ? parseInt(periodoDesde) : undefined,
      periodoHasta: periodoHasta ? parseInt(periodoHasta) : undefined,
    });
  }

  function limpiarFiltros() {
    setCorredorId('');
    setPeriodoDesde('');
    setPeriodoHasta('');
    setApplied({});
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 flex flex-wrap items-end gap-3" style={{ border: '1px solid var(--border)' }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Corredor</label>
          <select
            value={corredorId}
            onChange={e => setCorredorId(e.target.value)}
            className="text-sm rounded-lg px-3 py-2 outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--text)', minWidth: 180 }}
          >
            <option value="">Todos los corredores</option>
            {corredoresOpciones.map(c => (
              <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Período desde</label>
          <input
            type="number"
            value={periodoDesde}
            onChange={e => setPeriodoDesde(e.target.value)}
            placeholder="Ej: 2026"
            className="text-sm rounded-lg px-3 py-2 outline-none w-28"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Período hasta</label>
          <input
            type="number"
            value={periodoHasta}
            onChange={e => setPeriodoHasta(e.target.value)}
            placeholder="Ej: 2026"
            className="text-sm rounded-lg px-3 py-2 outline-none w-28"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <button
          onClick={aplicarFiltros}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--navy)' }}
        >
          Aplicar filtros
        </button>
        {(applied.corredorId || applied.periodoDesde || applied.periodoHasta) && (
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--muted)' }}
          >
            Limpiar
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>
            Error cargando datos: {error}
          </p>
          <button onClick={refetch} className="mt-3 text-sm underline" style={{ color: 'var(--navy)' }}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <KpiCards kpis={kpis} />
          <Charts
            icsChart={icsChart}
            pasajerosChart={pasajerosChart}
            kmsChart={kmsChart}
            serviciosChart={serviciosChart}
            corredores={corredores}
          />
        </>
      )}

      <KpiPanel />
    </div>
  );
}
