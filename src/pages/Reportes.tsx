import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../lib/supabase';
import { exportSemanaExcel } from '../lib/exportExcel';
import { InformePDF } from '../components/reportes/InformePDF';
import { Button } from '../components/ui/button';
import type { Corredor, RegistroDiario, Semana } from '../types';

export default function Reportes() {
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [corredores, setCorredores] = useState<Corredor[]>([]);
  const [semanaId, setSemanaId] = useState<string>('');
  const [registros, setRegistros] = useState<RegistroDiario[]>([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (semanasQuery.error) {
        setError(semanasQuery.error.message);
      } else {
        setSemanas((semanasQuery.data ?? []) as Semana[]);
      }

      if (corredoresQuery.error) {
        setError(corredoresQuery.error.message);
      } else {
        setCorredores((corredoresQuery.data ?? []) as Corredor[]);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    if (!semanaId) {
      setRegistros([]);
      return;
    }

    setLoading(true);
    supabase
      .from('registros_diarios')
      .select('*')
      .eq('semana_id', semanaId)
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          setRegistros((data ?? []) as RegistroDiario[]);
        }
        setLoading(false);
      });
  }, [semanaId]);

  const semanaSeleccionada = semanas.find((s) => s.id === semanaId) ?? null;

  async function descargarPDF() {
    if (!semanaSeleccionada) return;
    setGenerando(true);

    try {
      const blob = await pdf(
        <InformePDF
          semana={semanaSeleccionada}
          corredores={corredores}
          registros={registros}
        />
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-navy">Reportes</h1>

      <div className="bg-white rounded-lg border p-6 max-w-2xl">
        <h2 className="text-base font-semibold text-navy mb-1">Informe Semanal Oficial</h2>
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
                <span
                  className={`capitalize font-medium ${
                    semanaSeleccionada.estado === 'validado' ? 'text-green-600' : 'text-blue-600'
                  }`}
                >
                  {semanaSeleccionada.estado}
                </span>
              </p>
              {semanaSeleccionada.validado_por && (
                <p>
                  <span className="font-medium">Validado por:</span> {semanaSeleccionada.validado_por}
                </p>
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

      <div className="bg-white rounded-lg border p-6 max-w-2xl opacity-50">
        <h2 className="text-base font-semibold text-navy mb-1">Resumen Mensual</h2>
        <p className="text-sm text-gray-500">Disponible en Fase 2.</p>
      </div>

      <div className="bg-white rounded-lg border p-6 max-w-2xl opacity-50">
        <h2 className="text-base font-semibold text-navy mb-1">Comparativo de Corredores</h2>
        <p className="text-sm text-gray-500">Disponible en Fase 2.</p>
      </div>

      <div className="bg-white rounded-lg border p-6 max-w-2xl opacity-50">
        <h2 className="text-base font-semibold text-navy mb-1">Tendencia de Indicadores</h2>
        <p className="text-sm text-gray-500">Disponible en Fase 2.</p>
      </div>
    </div>
  );
}
