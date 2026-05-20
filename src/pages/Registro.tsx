import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Save, Send, Upload } from 'lucide-react';
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
  const { corredores, loading: loadingCorredores } = useCorredores();
  const { rowsByCorredor, saving, error, initRows, updateRow, guardarCorredor, guardarTodo } = useRegistros();

  const [step, setStep] = useState<1 | 2>(semanaId ? 2 : 1);
  const [loadingEdit, setLoadingEdit] = useState(!!semanaId);
  const [metaSubmitting, setMetaSubmitting] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!semanaId) return;

    async function loadSemana() {
      const { data, error: semErr } = await supabase
        .from('semanas')
        .select('*')
        .eq('id', semanaId)
        .single();

      if (semErr || !data) {
        navigate('/semanas');
        return;
      }

      setSemana(data as Semana);
      setLoadingEdit(false);

      const { data: registros } = await supabase
        .from('registros_diarios')
        .select('*')
        .eq('semana_id', semanaId);

      initRows((data as Semana).fecha_inicio, corredores, (registros ?? []) as RegistroDiario[]);
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
      const { data, error: insErr } = await supabase
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

      if (insErr) { setMetaError(insErr.message); return; }

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
    setTimeout(() => setFeedback(null), 2500);
  }

  async function handleGuardarTodo() {
    if (!semanaActual) return;
    await guardarTodo(semanaActual.id);
    setFeedback('Semana guardada');
    setTimeout(() => setFeedback(null), 2500);
  }

  async function handleEnviarRevision() {
    if (!semanaActual) return;
    const { error: updErr } = await supabase
      .from('semanas')
      .update({ estado: 'en_revision' })
      .eq('id', semanaActual.id);
    if (!updErr) navigate('/semanas');
  }

  const corredor = corredores.find(c => c.id === corredorActivoId);
  const rows = corredorActivoId ? rowsByCorredor[corredorActivoId] ?? [] : [];
  const fechasSemana = semanaActual ? generarDiasSemana(semanaActual.fecha_inicio) : [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/semanas')} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--muted)' }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>
            {semanaId ? 'Editar Semana' : 'Nuevo Registro'}
          </h1>
          {semanaActual && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Semana {semanaActual.numero_semana} / Período {semanaActual.periodo}
            </p>
          )}
        </div>
      </div>

      {/* Step 1 — Metadatos */}
      {step === 1 && (
        <div className="bg-white rounded-xl border p-6 max-w-xl" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--navy)' }}>
            Paso 1 — Información de la semana
          </h2>
          {metaError && (
            <div className="mb-3 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' }}>
              {metaError}
            </div>
          )}
          <MetadataForm onSubmit={handleMetaSubmit} submitting={metaSubmitting} />
        </div>
      )}

      {/* Step 2 — Cargando (modo edición) */}
      {step === 2 && loadingEdit && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--navy)' }} />
        </div>
      )}

      {/* Step 2 — Contenido principal */}
      {step === 2 && !loadingEdit && semanaActual && (
        <div className="space-y-5">

          {/* Selector de corredor */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>CORREDOR</p>
            {loadingCorredores ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Cargando corredores...</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {corredores.map(c => {
                  const tieneAlgunDato = (rowsByCorredor[c.id] ?? []).some(r => r.kms_programados || r.ica);
                  const activo = corredorActivoId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCorredorActivo(c.id)}
                      className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors"
                      style={{
                        backgroundColor: activo ? 'var(--navy)' : 'white',
                        color: activo ? 'white' : 'var(--navy)',
                        border: `1px solid ${activo ? 'var(--navy)' : 'var(--border)'}`,
                      }}
                    >
                      {c.codigo} — {c.nombre}
                      {tieneAlgunDato && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--green)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selector método */}
          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: 'var(--muted)' }}>Método:</span>
            <span className="font-medium" style={{ color: 'var(--text)' }}>Manual</span>
            <button
              className="flex items-center gap-1 hover:underline"
              style={{ color: 'var(--navy)' }}
              onClick={() => setShowImport(true)}
            >
              <Upload className="w-4 h-4" />
              Cargar archivo
            </button>
          </div>

          {/* Tabla del corredor */}
          {corredor ? (
            <div className="bg-white rounded-xl border overflow-auto" style={{ borderColor: 'var(--border)' }}>
              <CorredorTab
                corredor={corredor}
                rows={rows}
                onChange={(rowIndex, campo, valor) => updateRow(corredorActivoId!, rowIndex, campo, valor)}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Selecciona un corredor para ingresar datos.
              </p>
            </div>
          )}

          {/* Feedback / Error */}
          {(error || feedback) && (
            <div
              className="text-sm px-3 py-2 rounded-lg"
              style={error
                ? { backgroundColor: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' }
                : { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #86efac' }
              }
            >
              {error ?? feedback}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 flex-wrap pt-1">
            <Button
              onClick={handleGuardarCorredor}
              disabled={saving || !corredorActivoId}
              variant="outline"
              className="flex items-center gap-1.5"
              style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar corredor
            </Button>
            <Button
              onClick={handleGuardarTodo}
              disabled={saving}
              className="flex items-center gap-1.5 text-white"
              style={{ backgroundColor: 'var(--navy)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar semana completa
            </Button>
            <Button
              onClick={handleEnviarRevision}
              disabled={saving}
              className="flex items-center gap-1.5 text-white"
              style={{ backgroundColor: 'var(--orange)' }}
            >
              <Send className="w-4 h-4" />
              Enviar a revisión
            </Button>
          </div>
        </div>
      )}

      {/* Modal de importación */}
      {showImport && corredorActivoId && (
        <ImportModal
          fechasSemana={fechasSemana}
          onImport={(importedRows) => {
            const campos = ['kms_programados','kms_ejecutados','kms_efectivos','total_pasajeros',
              'servicios_programados','servicios_ejecutados','servicios_puntuales','ica','ick','icd','ip','ie'] as const;
            importedRows.forEach((row, i) => {
              campos.forEach(campo => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                updateRow(corredorActivoId, i, campo, (row as any)[campo] ?? '');
              });
            });
            setShowImport(false);
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
