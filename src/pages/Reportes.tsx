import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../lib/supabase';
import { exportSemanaExcel, exportResumenMensualExcel, exportComparativoExcel, exportTendenciaExcel } from '../lib/exportExcel';
import { InformePDF } from '../components/reportes/InformePDF';
import { ResumenMensualPDF } from '../components/reportes/ResumenMensualPDF';
import { ComparativoChart } from '../components/reportes/ComparativoChart';
import { TendenciaChart } from '../components/reportes/TendenciaChart';
import { Button } from '../components/ui/button';
import { KpiPanel } from '../components/kpi/KpiPanel';
import { useResumenMensual } from '../hooks/useResumenMensual';
import { useComparativoCorredores } from '../hooks/useComparativoCorredores';
import { useTendenciaIndicadores } from '../hooks/useTendenciaIndicadores';
import type { Corredor, RegistroDiario, Semana } from '../types';

export default function Reportes() {
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [corredores, setCorredores] = useState<Corredor[]>([]);
  const [semanaId, setSemanaId] = useState<string>('');
  const [registros, setRegistros] = useState<RegistroDiario[]>([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reporte 2 state
  const [periodoResumen, setPeriodoResumen] = useState('');
  const [periodoResumenApplied, setPeriodoResumenApplied] = useState<number | null>(null);
  const [generandoResumen, setGenerandoResumen] = useState(false);
  const resumen = useResumenMensual(periodoResumenApplied);

  // Reporte 3 state
  const [compPeriodo, setCompPeriodo] = useState('');
  const [compSemanaDesde, setCompSemanaDesde] = useState('');
  const [compSemanaHasta, setCompSemanaHasta] = useState('');
  const [compFilters, setCompFilters] = useState<import('../hooks/useComparativoCorredores').ComparativoFilters>({
    periodo: null, semanaDesde: null, semanaHasta: null,
  });
  const comparativo = useComparativoCorredores(compFilters);

  // Reporte 4 state
  const [tendCorredorId, setTendCorredorId] = useState('');
  const [tendFechaInicio, setTendFechaInicio] = useState('');
  const [tendFechaFin, setTendFechaFin] = useState('');
  const [tendFilters, setTendFilters] = useState<import('../hooks/useTendenciaIndicadores').TendenciaFilters>({
    corredorId: null, fechaInicio: null, fechaFin: null,
  });
  const tendencia = useTendenciaIndicadores(tendFilters);

  useEffect(() => {
    async function load() {
      const [semanasQuery, corredoresQuery] = await Promise.all([
        supabase
          .from('semanas')
          .select('*')
          .in('estado', ['validado', 'publicado'])
          .order('periodo', { ascending: false })
          .order('numero_semana', { ascending: false }),
        supabase
          .from('corredores')
          .select('*')
          .eq('activo', true)
          .order('orden'),
      ]);

      if (semanasQuery.error) setError(semanasQuery.error.message);
      else setSemanas((semanasQuery.data ?? []) as Semana[]);

      if (corredoresQuery.error) setError(corredoresQuery.error.message);
      else setCorredores((corredoresQuery.data ?? []) as Corredor[]);
    }
    void load();
  }, []);

  useEffect(() => {
    if (!semanaId) { setRegistros([]); return; }
    setLoading(true);
    supabase
      .from('registros_diarios')
      .select('*')
      .eq('semana_id', semanaId)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRegistros((data ?? []) as RegistroDiario[]);
        setLoading(false);
      });
  }, [semanaId]);

  const semanaSeleccionada = semanas.find((s) => s.id === semanaId) ?? null;

  async function descargarPDF() {
    if (!semanaSeleccionada) return;
    setGenerando(true);
    try {
      const blob = await pdf(
        <InformePDF semana={semanaSeleccionada} corredores={corredores} registros={registros} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIGO_Semana${semanaSeleccionada.numero_semana}_P${semanaSeleccionada.periodo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar PDF');
    } finally {
      setGenerando(false);
    }
  }

  function descargarExcel() {
    if (!semanaSeleccionada) return;
    exportSemanaExcel(semanaSeleccionada, corredores, registros);
  }

  async function descargarResumenPDF() {
    if (!periodoResumenApplied || resumen.filas.length === 0) return;
    setGenerandoResumen(true);
    try {
      const blob = await pdf(
        <ResumenMensualPDF periodo={periodoResumenApplied} filas={resumen.filas} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIGO_ResumenMensual_P${periodoResumenApplied}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar PDF');
    } finally {
      setGenerandoResumen(false);
    }
  }

  function descargarResumenExcel() {
    if (!periodoResumenApplied || resumen.filas.length === 0) return;
    exportResumenMensualExcel(periodoResumenApplied, resumen.filas);
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-navy" style={{ color: 'var(--navy)' }}>Reportes</h1>

      <KpiPanel />

      {/* Reporte 1 */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-base font-semibold text-navy mb-1" style={{ color: 'var(--navy)' }}>Informe Semanal Oficial</h2>
        <p className="text-sm text-gray-500 mb-4">
          Formato oficial INTRANT / SITPSD con Sección I y Sección II por corredor.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar semana</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              value={semanaId}
              onChange={(e) => setSemanaId(e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {semanas.map((s) => (
                <option key={s.id} value={s.id}>
                  Semana {s.numero_semana} / {s.periodo} ({s.fecha_inicio} → {s.fecha_fin})
                </option>
              ))}
            </select>
          </div>
          {semanaSeleccionada && (
            <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
              <p>
                <span className="font-medium">Estado:</span>{' '}
                <span className={`capitalize font-medium ${semanaSeleccionada.estado === 'validado' ? 'text-green-600' : 'text-blue-600'}`}>
                  {semanaSeleccionada.estado}
                </span>
              </p>
              {semanaSeleccionada.validado_por && (
                <p><span className="font-medium">Validado por:</span> {semanaSeleccionada.validado_por}</p>
              )}
              {loading && (
                <p className="flex items-center gap-1 text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Cargando registros...
                </p>
              )}
              {!loading && registros.length > 0 && <p><span className="font-medium">Registros:</span> {registros.length} días</p>}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <Button
              onClick={descargarPDF}
              disabled={!semanaSeleccionada || loading || generando}
              className="bg-navy text-white hover:bg-navy-dark flex items-center gap-2"
              style={{ backgroundColor: 'var(--navy)', color: 'white' }}
            >
              {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Descargar PDF
            </Button>
            <Button
              onClick={descargarExcel}
              disabled={!semanaSeleccionada || loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Descargar Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Reporte 2: Resumen Mensual */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-base font-semibold text-navy mb-1" style={{ color: 'var(--navy)' }}>Resumen Mensual</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tabla consolidada de todas las semanas de un período. Exporta PDF y Excel.
        </p>
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <input
                type="number"
                value={periodoResumen}
                onChange={e => setPeriodoResumen(e.target.value)}
                placeholder="Ej: 2026"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <Button
              onClick={() => setPeriodoResumenApplied(periodoResumen ? parseInt(periodoResumen) : null)}
              disabled={!periodoResumen}
              className="bg-navy text-white hover:bg-navy-dark"
              style={{ backgroundColor: 'var(--navy)', color: 'white' }}
            >
              Buscar
            </Button>
          </div>

          {resumen.loading && (
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
            </p>
          )}

          {resumen.error && <p className="text-red-500 text-sm">{resumen.error}</p>}

          {!resumen.loading && periodoResumenApplied && resumen.filas.length === 0 && (
            <p className="text-sm text-gray-500">No hay semanas validadas para el período {periodoResumenApplied}.</p>
          )}

          {resumen.filas.length > 0 && (
            <div className="flex gap-3">
                <Button
                onClick={descargarResumenPDF}
                disabled={generandoResumen}
                className="bg-navy text-white hover:bg-navy-dark flex items-center gap-2"
                style={{ backgroundColor: 'var(--navy)', color: 'white' }}
              >
                {generandoResumen ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Descargar PDF
              </Button>
              <Button
                onClick={descargarResumenExcel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Excel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reporte 3: Comparativo de Corredores */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-base font-semibold text-navy mb-1" style={{ color: 'var(--navy)' }}>Comparativo de Corredores</h2>
        <p className="text-sm text-gray-500">
          Indicadores promedio por corredor en un rango de semanas.
        </p>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <input type="number" value={compPeriodo} onChange={e => setCompPeriodo(e.target.value)}
                placeholder="Ej: 2026" className="border border-gray-300 rounded-md px-3 py-2 text-sm w-28 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semana desde</label>
              <input type="number" value={compSemanaDesde} onChange={e => setCompSemanaDesde(e.target.value)}
                placeholder="Ej: 1" className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semana hasta</label>
              <input type="number" value={compSemanaHasta} onChange={e => setCompSemanaHasta(e.target.value)}
                placeholder="Ej: 52" className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24 focus:outline-none" />
            </div>
            <Button
              onClick={() => setCompFilters({
                periodo: compPeriodo ? parseInt(compPeriodo) : null,
                semanaDesde: compSemanaDesde ? parseInt(compSemanaDesde) : null,
                semanaHasta: compSemanaHasta ? parseInt(compSemanaHasta) : null,
              })}
              disabled={!compPeriodo || !compSemanaDesde || !compSemanaHasta}
              className="bg-navy text-white hover:bg-navy-dark"
              style={{ backgroundColor: 'var(--navy)', color: 'white' }}
            >
              Buscar
            </Button>
          </div>

          {comparativo.loading && (
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
            </p>
          )}
          {comparativo.error && <p className="text-red-500 text-sm">{comparativo.error}</p>}

          {comparativo.filas.length > 0 && (
            <>
              <ComparativoChart filas={comparativo.filas} />
              <div className="overflow-x-auto">
                <table className="w-full text-xs border rounded">
                  <thead className="bg-navy text-white" style={{ backgroundColor: 'var(--navy)', color: 'white' }}>
                    <tr>
                      {['Corredor','IcA','IcK','IcD','IC','IP','IE','ICS'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparativo.filas.map(({ corredor, totales }) => (
                      <tr key={corredor.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{corredor.codigo} — {corredor.nombre}</td>
                        <td className="px-3 py-2">{totales.ica_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.ick_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.icd_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.ic_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.ip_prom.toFixed(2)}</td>
                        <td className="px-3 py-2">{totales.ie_prom.toFixed(2)}</td>
                        <td className="px-3 py-2 font-bold" style={{ color: totales.ics_prom > 0 ? '#27ae60' : undefined }}>
                          {totales.ics_prom.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                onClick={() => exportComparativoExcel(
                  comparativo.filas,
                  parseInt(compPeriodo),
                  parseInt(compSemanaDesde),
                  parseInt(compSemanaHasta)
                )}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Excel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Reporte 4: Tendencia de Indicadores */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-base font-semibold text-navy mb-1" style={{ color: 'var(--navy)' }}>Tendencia de Indicadores</h2>
        <p className="text-sm text-gray-500 mb-4">
          Evolución de indicadores de un corredor en el tiempo.
        </p>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corredor</label>
              <select
                value={tendCorredorId}
                onChange={e => setTendCorredorId(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">— Seleccionar —</option>
                {corredores.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input type="date" value={tendFechaInicio} onChange={e => setTendFechaInicio(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
              <input type="date" value={tendFechaFin} onChange={e => setTendFechaFin(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none" />
            </div>
            <Button
              onClick={() => setTendFilters({
                corredorId: tendCorredorId || null,
                fechaInicio: tendFechaInicio || null,
                fechaFin: tendFechaFin || null,
              })}
              disabled={!tendCorredorId || !tendFechaInicio || !tendFechaFin}
              className="bg-navy text-white hover:bg-navy-dark"
              style={{ backgroundColor: 'var(--navy)', color: 'white' }}
            >
              Buscar
            </Button>
          </div>

          {tendencia.loading && (
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
            </p>
          )}
          {tendencia.error && <p className="text-red-500 text-sm">{tendencia.error}</p>}

          {!tendencia.loading && tendencia.registros.length === 0 && tendFilters.corredorId && (
            <p className="text-sm text-gray-500">No hay datos con operación para el rango seleccionado.</p>
          )}

          {tendencia.registros.length > 0 && (
            <>
              <TendenciaChart registros={tendencia.registros} />
              <Button
                onClick={() => tendencia.corredor && exportTendenciaExcel(tendencia.corredor, tendencia.registros)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Excel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
