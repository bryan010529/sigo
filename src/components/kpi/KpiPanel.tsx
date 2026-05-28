import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useKpiPeriodo } from '../../hooks/useKpiPeriodo';
import type {
  KpiPeriodoTipo,
  KpiPeriodoFiltro,
  KpiCorredorRow,
  KpiPeriodoTotales,
} from '../../types';

const MESES = [
  { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
  { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
  { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
  { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
];

type SemanaOpcion = { id: string; label: string };

function rd(v: number): string {
  return `RD$${Math.round(v).toLocaleString('es-DO')}`;
}

function pctColor(v: number | null, green: number, yellow: number): string {
  if (v === null) return 'var(--muted)';
  if (v >= green) return '#27ae60';
  if (v >= yellow) return '#f39c12';
  return '#e74c3c';
}

function PctBadge({
  v,
  green,
  yellow,
}: {
  v: number | null;
  green: number;
  yellow: number;
}) {
  if (v === null) return <span style={{ color: 'var(--muted)' }}>—</span>;
  const cls =
    v >= green
      ? 'bg-green-100 text-green-700'
      : v >= yellow
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-600';
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cls}`}>
      {v}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col gap-1"
      style={{ border: '1px solid var(--border)' }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: color || 'var(--navy)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function TotalesRow({ totales }: { totales: KpiPeriodoTotales }) {
  return (
    <tr
      className="border-t font-semibold text-xs"
      style={{ borderColor: 'var(--border)', backgroundColor: '#f8f9fa' }}
    >
      <td
        className="px-4 py-2.5 uppercase tracking-wide"
        style={{ color: 'var(--muted)' }}
      >
        Total
      </td>
      <td className="px-4 py-2.5 font-mono">
        {totales.kmsProgramados.toLocaleString('es-DO', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-2.5 font-mono">
        {totales.kmsEjecutados.toLocaleString('es-DO', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-2.5 font-mono">
        {totales.kmsEfectivos.toLocaleString('es-DO', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-2.5">
        <PctBadge v={totales.pctCumplimiento} green={95} yellow={85} />
      </td>
      <td className="px-4 py-2.5">
        <PctBadge v={totales.pctEfectividad} green={95} yellow={85} />
      </td>
      <td className="px-4 py-2.5">
        <PctBadge v={totales.pctAprovechamiento} green={90} yellow={80} />
      </td>
      <td className="px-4 py-2.5 font-mono">{rd(totales.costoProgramado)}</td>
      <td className="px-4 py-2.5 font-mono">{rd(totales.costoEjecutado)}</td>
      <td
        className="px-4 py-2.5 font-mono"
        style={{ color: totales.brechaCosto > 0 ? '#d85a30' : '#27ae60' }}
      >
        {rd(totales.brechaCosto)}
      </td>
    </tr>
  );
}

function FilaCorredor({ f }: { f: KpiCorredorRow }) {
  return (
    <tr
      className="border-t hover:bg-gray-50 text-xs"
      style={{ borderColor: 'var(--border)' }}
    >
      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
        {f.corredorCodigo} — {f.corredorNombre}
        {f.sinCanasta && (
          <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">
            sin canasta
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 font-mono">
        {f.kmsProgramados.toLocaleString('es-DO', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-2.5 font-mono">
        {f.kmsEjecutados.toLocaleString('es-DO', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-2.5 font-mono">
        {f.kmsEfectivos.toLocaleString('es-DO', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-2.5">
        <PctBadge v={f.pctCumplimiento} green={95} yellow={85} />
      </td>
      <td className="px-4 py-2.5">
        <PctBadge v={f.pctEfectividad} green={95} yellow={85} />
      </td>
      <td className="px-4 py-2.5">
        <PctBadge v={f.pctAprovechamiento} green={90} yellow={80} />
      </td>
      <td className="px-4 py-2.5 font-mono">{rd(f.costoProgramado)}</td>
      <td className="px-4 py-2.5 font-mono">{rd(f.costoEjecutado)}</td>
      <td
        className="px-4 py-2.5 font-mono"
        style={{ color: f.brechaCosto > 0 ? '#d85a30' : '#27ae60' }}
      >
        {rd(f.brechaCosto)}
      </td>
    </tr>
  );
}

export function KpiPanel() {
  const [tipo, setTipo] = useState<KpiPeriodoTipo>('semana');
  const [semanaId, setSemanaId] = useState('');
  const [mes, setMes] = useState('');
  const [año, setAño] = useState(String(new Date().getFullYear()));
  const [filtroAplicado, setFiltroAplicado] = useState<KpiPeriodoFiltro | null>(null);
  const [semanas, setSemanas] = useState<SemanaOpcion[]>([]);

  const { filas, totales, loading, error } = useKpiPeriodo(filtroAplicado);

  useEffect(() => {
    supabase
      .from('semanas')
      .select('id, numero_semana, periodo, fecha_inicio, fecha_fin')
      .in('estado', ['validado', 'publicado'])
      .order('periodo', { ascending: false })
      .order('numero_semana', { ascending: false })
      .then(({ data }) => {
        setSemanas(
          (data ?? []).map(s => ({
            id: s.id,
            label: `S${s.numero_semana} · P${s.periodo} (${s.fecha_inicio} → ${s.fecha_fin})`,
          }))
        );
      });
  }, []);

  function handleTipoChange(t: KpiPeriodoTipo) {
    setTipo(t);
    setFiltroAplicado(null);
  }

  function aplicar() {
    const añoNum = parseInt(año) || new Date().getFullYear();
    if (tipo === 'semana') {
      if (!semanaId) return;
      setFiltroAplicado({ tipo: 'semana', semanaId });
    } else if (tipo === 'mes') {
      if (!mes) return;
      setFiltroAplicado({ tipo: 'mes', mes: parseInt(mes), año: añoNum });
    } else {
      setFiltroAplicado({ tipo: 'año', año: añoNum });
    }
  }

  const canAplicar =
    tipo === 'semana'
      ? !!semanaId
      : tipo === 'mes'
      ? !!mes && !!año
      : !!año;

  const selectStyle = {
    border: '1px solid var(--border)',
    color: 'var(--text)',
  };

  return (
    <div className="space-y-4">
      {/* Selector de período */}
      <div
        className="bg-white rounded-xl p-4"
        style={{ border: '1px solid var(--border)' }}
      >
        <h2
          className="text-sm font-semibold mb-3"
          style={{ color: 'var(--navy)' }}
        >
          KPIs de Costo Operativo
        </h2>

        {/* Tabs tipo */}
        <div className="flex gap-1 mb-4">
          {(['semana', 'mes', 'año'] as KpiPeriodoTipo[]).map(t => (
            <button
              key={t}
              onClick={() => handleTipoChange(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
              style={
                tipo === t
                  ? { backgroundColor: 'var(--navy)', color: 'white' }
                  : {
                      backgroundColor: 'transparent',
                      color: 'var(--muted)',
                      border: '1px solid var(--border)',
                    }
              }
            >
              {t === 'año' ? 'Año' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Selectores */}
        <div className="flex flex-wrap items-end gap-3">
          {tipo === 'semana' && (
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--muted)' }}
              >
                Semana
              </label>
              <select
                value={semanaId}
                onChange={e => setSemanaId(e.target.value)}
                className="text-sm rounded-lg px-3 py-2 outline-none"
                style={{ ...selectStyle, minWidth: 340 }}
              >
                <option value="">— Seleccionar semana —</option>
                {semanas.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipo === 'mes' && (
            <>
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: 'var(--muted)' }}
                >
                  Mes
                </label>
                <select
                  value={mes}
                  onChange={e => setMes(e.target.value)}
                  className="text-sm rounded-lg px-3 py-2 outline-none"
                  style={{ ...selectStyle, minWidth: 140 }}
                >
                  <option value="">— Mes —</option>
                  {MESES.map(m => (
                    <option key={m.v} value={m.v}>
                      {m.l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: 'var(--muted)' }}
                >
                  Año
                </label>
                <input
                  type="number"
                  value={año}
                  onChange={e => setAño(e.target.value)}
                  min="2020"
                  max="2099"
                  className="text-sm rounded-lg px-3 py-2 outline-none w-24"
                  style={selectStyle}
                />
              </div>
            </>
          )}

          {tipo === 'año' && (
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--muted)' }}
              >
                Año
              </label>
              <input
                type="number"
                value={año}
                onChange={e => setAño(e.target.value)}
                min="2020"
                max="2099"
                className="text-sm rounded-lg px-3 py-2 outline-none w-24"
                style={selectStyle}
              />
            </div>
          )}

          <button
            onClick={aplicar}
            disabled={!canAplicar}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div
            className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: 'var(--navy)',
              borderTopColor: 'transparent',
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#e74c3c',
          }}
        >
          Error cargando KPIs: {error}
        </div>
      )}

      {/* Estado inicial sin filtro aplicado */}
      {!filtroAplicado && !loading && (
        <div
          className="bg-white rounded-xl p-8 text-center text-sm"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          Selecciona un período y haz clic en "Aplicar" para ver los KPIs.
        </div>
      )}

      {/* Resultados */}
      {!loading && !error && filtroAplicado && (
        <>
          {/* Fila 1: KMs + costo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="KMs Programados"
              value={totales.kmsProgramados.toLocaleString('es-DO', {
                maximumFractionDigits: 2,
              })}
              sub={rd(totales.costoProgramado)}
              color="var(--navy)"
            />
            <KpiCard
              label="KMs Ejecutados"
              value={totales.kmsEjecutados.toLocaleString('es-DO', {
                maximumFractionDigits: 2,
              })}
              sub={rd(totales.costoEjecutado)}
              color="#27ae60"
            />
            <KpiCard
              label="KMs Efectivos"
              value={totales.kmsEfectivos.toLocaleString('es-DO', {
                maximumFractionDigits: 2,
              })}
              sub={rd(totales.costoEfectivo)}
              color="#1d9e75"
            />
          </div>

          {/* Fila 2: KPIs cruzados */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="% Cumplimiento"
              value={
                totales.pctCumplimiento != null
                  ? `${totales.pctCumplimiento}%`
                  : '—'
              }
              sub="ejecutado / programado"
              color={pctColor(totales.pctCumplimiento, 95, 85)}
            />
            <KpiCard
              label="% Efectividad"
              value={
                totales.pctEfectividad != null
                  ? `${totales.pctEfectividad}%`
                  : '—'
              }
              sub="efectivo / ejecutado"
              color={pctColor(totales.pctEfectividad, 95, 85)}
            />
            <KpiCard
              label="% Aprovechamiento"
              value={
                totales.pctAprovechamiento != null
                  ? `${totales.pctAprovechamiento}%`
                  : '—'
              }
              sub="efectivo / programado"
              color={pctColor(totales.pctAprovechamiento, 90, 80)}
            />
            <KpiCard
              label="Brecha de Costo"
              value={rd(totales.brechaCosto)}
              sub="costo no ejecutado"
              color={totales.brechaCosto > 0 ? '#d85a30' : '#27ae60'}
            />
          </div>

          {/* Tabla de desglose */}
          {filas.length > 0 ? (
            <div
              className="bg-white rounded-xl overflow-x-auto"
              style={{ border: '1px solid var(--border)' }}
            >
              <table className="w-full text-sm min-w-[900px]">
                <thead style={{ backgroundColor: 'var(--navy)', color: 'white' }}>
                  <tr>
                    {[
                      'Corredor',
                      'KMs Prog.',
                      'KMs Ejec.',
                      'KMs Efect.',
                      '% Cumpl.',
                      '% Efect.',
                      '% Aprov.',
                      'Costo Prog.',
                      'Costo Ejec.',
                      'Brecha',
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="text-left px-4 py-2.5 font-medium text-xs whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map(f => (
                    <FilaCorredor key={f.corredorId} f={f} />
                  ))}
                  <TotalesRow totales={totales} />
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="bg-white rounded-xl p-8 text-center text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              No hay datos registrados para el período seleccionado.
            </div>
          )}
        </>
      )}
    </div>
  );
}
