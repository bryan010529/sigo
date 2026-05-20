import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Send, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generarDiasSemana } from '../lib/dateUtils';
import { useAuthStore } from '../store/authStore';
import { useRegistroStore } from '../store/registroStore';
import { useCorredores } from '../hooks/useCorredores';
import { useRegistros } from '../hooks/useRegistros';
import { Button } from '../components/ui/button';
import { MetadataForm, type MetadataValues } from '../components/registro/MetadataForm';
import { CorredorTab } from '../components/registro/CorredorTab';
import { ImportModal } from '../components/registro/ImportModal';
import type { RegistroDiario, Semana } from '../types';

export default function Registro() {
  const { semanaId } = useParams<{ semanaId?: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { semanaActual, setSemana, setCorredorActivo, corredorActivoId } = useRegistroStore();
  const { corredores } = useCorredores();
  const {
    rowsByCorredor,
    saving,
    error,
    initRows,
    updateRow,
    guardarCorredor,
    guardarTodo,
  } = useRegistros();

  const [step, setStep] = useState<1 | 2>(semanaId ? 2 : 1);
  const [metaSubmitting, setMetaSubmitting] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!semanaId) {
      return;
    }

    async function loadSemana() {
      const { data, error } = await supabase
        .from('semanas')
        .select('*')
        .eq('id', semanaId)
        .single();

      if (error || !data) {
        navigate('/semanas');
        return;
      }

      setSemana(data as Semana);

      const { data: registros } = await supabase
        .from('registros_diarios')
        .select('*')
        .eq('semana_id', semanaId);

      if (corredores.length > 0) {
        initRows((data as Semana).fecha_inicio, corredores, (registros ?? []) as RegistroDiario[]);
      }
    }

    void loadSemana();
  }, [semanaId, corredores, navigate, initRows, setSemana]);

  useEffect(() => {
    if (step === 2 && corredores.length > 0 && !corredorActivoId) {
      setCorredorActivo(corredores[0].id);
    }
  }, [step, corredores, corredorActivoId, setCorredorActivo]);

  async function handleMetaSubmit(values: MetadataValues) {
    setMetaSubmitting(true);
    setMetaError(null);

    try {
      const { data, error } = await supabase
        .from('semanas')
        .insert({
          numero_semana: parseInt(values.numero_semana, 10),
          periodo: parseInt(values.periodo, 10),
          fecha_inicio: values.fecha_inicio,
          fecha_fin: values.fecha_fin,
          validado_por: values.validado_por || null,
          observaciones: values.observaciones || null,
          estado: 'borrador',
          creado_por: usuario!.id,
        })
        .select()
        .single();

      if (error) {
        setMetaError(error.message);
        return;
      }

      setSemana(data as Semana);
      initRows(values.fecha_inicio, corredores, []);
      setStep(2);
    } finally {
      setMetaSubmitting(false);
    }
  }

  async function handleGuardarCorredor() {
    if (!semanaActual || !corredorActivoId) return;
    await guardarCorredor(semanaActual.id, corredorActivoId);
    setFeedback('Corredor guardado');
    setTimeout(() => setFeedback(null), 2000);
  }

  async function handleGuardarTodo() {
    if (!semanaActual) return;
    await guardarTodo(semanaActual.id);
    setFeedback('Semana guardada');
    setTimeout(() => setFeedback(null), 2000);
  }

  async function handleEnviarRevision() {
    if (!semanaActual) return;
    const { error } = await supabase
      .from('semanas')
      .update({ estado: 'en_revision' })
      .eq('id', semanaActual.id);
    if (!error) {
      navigate('/semanas');
    }
  }

  const corredor = corredores.find((c) => c.id === corredorActivoId);
  const rows = corredorActivoId ? rowsByCorredor[corredorActivoId] ?? [] : [];
  const fechasSemana = semanaActual ? generarDiasSemana(semanaActual.fecha_inicio) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            navigate('/semanas');
          }}
          className="text-gray-500 hover:text-navy"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-navy">{semanaId ? 'Editar Semana' : 'Nuevo Registro'}</h1>
        {semanaActual && (
          <span className="text-sm text-gray-500">
            Semana {semanaActual.numero_semana} / {semanaActual.periodo}
          </span>
        )}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-lg border p-6 max-w-xl">
          <h2 className="text-base font-semibold text-navy mb-4">Paso 1 — Información de la semana</h2>
          {metaError && <p className="text-red-500 text-sm mb-3">{metaError}</p>}
          <MetadataForm onSubmit={handleMetaSubmit} submitting={metaSubmitting} />
        </div>
      )}

      {step === 2 && semanaActual && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {corredores.map((corredorItem) => {
              const tieneAlgunDato = (rowsByCorredor[corredorItem.id] ?? []).some((r) => r.kms_programados || r.ica);
              return (
                <button
                  key={corredorItem.id}
                  onClick={() => setCorredorActivo(corredorItem.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 border transition-colors ${
                    corredorActivoId === corredorItem.id
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-navy border-navy/30 hover:border-navy'
                  }`}
                >
                  {corredorItem.codigo} — {corredorItem.nombre}
                  {tieneAlgunDato && <span className="w-2 h-2 rounded-full bg-green-500 ml-1" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Método:</span>
            <span className="text-sm font-medium">Manual</span>
            <button
              className="flex items-center gap-1 text-sm text-navy hover:underline"
              onClick={() => {
                setShowImport(true);
              }}
            >
              <Upload className="w-4 h-4" />
              Cargar archivo
            </button>
          </div>

          {corredor && (
            <div className="bg-white rounded-lg border p-4">
              <CorredorTab
                corredor={corredor}
                rows={rows}
                onChange={(rowIndex, campo, valor) => {
                  updateRow(corredorActivoId!, rowIndex, campo, valor);
                }}
              />
            </div>
          )}

          {(error || feedback) && (
            <p className={`text-sm ${error ? 'text-red-500' : 'text-green-600'}`}>
              {error ?? feedback}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleGuardarCorredor}
              disabled={saving}
              variant="outline"
              className="flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Guardar Corredor
            </Button>
            <Button
              onClick={handleGuardarTodo}
              disabled={saving}
              className="bg-navy text-white hover:bg-navy-dark flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Guardar Semana Completa
            </Button>
            <Button
              onClick={handleEnviarRevision}
              disabled={saving}
              className="bg-intrant-orange text-white flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              Enviar a Revisión
            </Button>
          </div>
        </div>
      )}

      {showImport && corredorActivoId && (
        <ImportModal
          fechasSemana={fechasSemana}
          onImport={(importedRows) => {
            importedRows.forEach((row, i) => {
              const campos = [
                'kms_programados',
                'kms_ejecutados',
                'kms_efectivos',
                'total_pasajeros',
                'servicios_programados',
                'servicios_ejecutados',
                'servicios_puntuales',
                'ica',
                'ick',
                'icd',
                'ip',
                'ie',
              ] as const;
              campos.forEach((campo) => {
                updateRow(
                  corredorActivoId,
                  i,
                  campo,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (row as any)[campo] ?? ''
                );
              });
            });
            setShowImport(false);
          }}
          onClose={() => {
            setShowImport(false);
          }}
        />
      )}
    </div>
  );
}
