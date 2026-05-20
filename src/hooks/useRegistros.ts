import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calcIC, calcICS } from '../lib/formulas';
import { generarDiasSemana } from '../lib/dateUtils';
import type { Corredor, FuenteDato, RegistroDiario } from '../types';

export interface RegistroRow {
  fecha: string;
  kms_programados: string;
  kms_ejecutados: string;
  kms_efectivos: string;
  total_pasajeros: string;
  servicios_programados: string;
  servicios_ejecutados: string;
  servicios_puntuales: string;
  ica: string;
  ick: string;
  icd: string;
  ip: string;
  ie: string;
  ic: number | null;
  ics: number | null;
  fuente: FuenteDato;
}

export interface UseRegistrosResult {
  rowsByCorredor: Record<string, RegistroRow[]>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  initRows: (fechaInicio: string, corredores: Corredor[], existentes: RegistroDiario[]) => void;
  updateRow: (corredorId: string, rowIndex: number, campo: keyof RegistroRow, valor: string) => void;
  guardarCorredor: (semanaId: string, corredorId: string) => Promise<void>;
  guardarTodo: (semanaId: string) => Promise<void>;
}

function emptyRow(fecha: string): RegistroRow {
  return {
    fecha,
    kms_programados: '',
    kms_ejecutados: '',
    kms_efectivos: '',
    total_pasajeros: '',
    servicios_programados: '',
    servicios_ejecutados: '',
    servicios_puntuales: '',
    ica: '',
    ick: '',
    icd: '',
    ip: '',
    ie: '90',
    ic: null,
    ics: null,
    fuente: 'manual',
  };
}

function registroDiarioToRow(rd: RegistroDiario): RegistroRow {
  const ica = rd.ica ?? null;
  const ick = rd.ick ?? null;
  const icd = rd.icd ?? null;
  const ip = rd.ip ?? null;
  const ie = rd.ie ?? null;
  const ic = ica != null && ick != null && icd != null ? calcIC(ica, ick, icd) : null;
  const ics = ic != null && ip != null && ie != null ? calcICS(ic, ip, ie) : null;

  return {
    fecha: rd.fecha,
    kms_programados: rd.kms_programados?.toString() ?? '',
    kms_ejecutados: rd.kms_ejecutados?.toString() ?? '',
    kms_efectivos: rd.kms_efectivos?.toString() ?? '',
    total_pasajeros: rd.total_pasajeros?.toString() ?? '',
    servicios_programados: rd.servicios_programados?.toString() ?? '',
    servicios_ejecutados: rd.servicios_ejecutados?.toString() ?? '',
    servicios_puntuales: rd.servicios_puntuales?.toString() ?? '',
    ica: rd.ica?.toString() ?? '',
    ick: rd.ick?.toString() ?? '',
    icd: rd.icd?.toString() ?? '',
    ip: rd.ip?.toString() ?? '',
    ie: rd.ie?.toString() ?? '90',
    ic,
    ics,
    fuente: rd.fuente as FuenteDato,
  };
}

function rowsToJsonb(corredorId: string, semanaId: string, rows: RegistroRow[]) {
  return rows.map((row) => {
    const hasData = [
      row.kms_programados,
      row.kms_ejecutados,
      row.kms_efectivos,
      row.total_pasajeros,
      row.ica,
      row.ick,
      row.icd,
    ].some((v) => v !== '');

    const n = (v: string) => (v === '' ? null : parseFloat(v));
    const i = (v: string) => (v === '' ? null : parseInt(v, 10));

    return {
      semana_id: semanaId,
      corredor_id: corredorId,
      fecha: row.fecha,
      kms_programados: n(row.kms_programados),
      kms_ejecutados: n(row.kms_ejecutados),
      kms_efectivos: n(row.kms_efectivos),
      total_pasajeros: i(row.total_pasajeros),
      servicios_programados: i(row.servicios_programados),
      servicios_ejecutados: i(row.servicios_ejecutados),
      servicios_puntuales: i(row.servicios_puntuales),
      ica: n(row.ica),
      ick: n(row.ick),
      icd: n(row.icd),
      ic: row.ic,
      ip: n(row.ip),
      ie: n(row.ie),
      ics: row.ics,
      tiene_datos: hasData,
      fuente: row.fuente,
    };
  });
}

export function useRegistros(): UseRegistrosResult {
  const [rowsByCorredor, setRowsByCorredor] = useState<Record<string, RegistroRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initRows = useCallback(
    (fechaInicio: string, corredores: Corredor[], existentes: RegistroDiario[]) => {
      setLoading(true);
      try {
        const fechas = generarDiasSemana(fechaInicio);
        const initial: Record<string, RegistroRow[]> = {};
        for (const corredor of corredores) {
          initial[corredor.id] = fechas.map((fecha) => {
            const found = existentes.find((r) => r.corredor_id === corredor.id && r.fecha === fecha);
            return found ? registroDiarioToRow(found) : emptyRow(fecha);
          });
        }
        setRowsByCorredor(initial);
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateRow = useCallback((corredorId: string, rowIndex: number, campo: keyof RegistroRow, valor: string) => {
    setRowsByCorredor((prev) => {
      const rows = [...(prev[corredorId] ?? [])];
      const row = { ...rows[rowIndex] } as RegistroRow;
      (row as unknown as Record<string, string | number | null>)[campo] = valor;

      const ica = parseFloat(row.ica);
      const ick = parseFloat(row.ick);
      const icd = parseFloat(row.icd);
      const ip = parseFloat(row.ip);
      const ie = parseFloat(row.ie);

      row.ic =
        Number.isNaN(ica) || Number.isNaN(ick) || Number.isNaN(icd)
          ? null
          : calcIC(ica, ick, icd);
      row.ics =
        row.ic == null || Number.isNaN(ip) || Number.isNaN(ie)
          ? null
          : calcICS(row.ic, ip, ie);

      rows[rowIndex] = row;
      return { ...prev, [corredorId]: rows };
    });
  }, []);

  const guardarCorredor = useCallback(
    async (semanaId: string, corredorId: string) => {
      setSaving(true);
      setError(null);
      try {
        const rows = rowsByCorredor[corredorId] ?? [];
        const registros = rowsToJsonb(corredorId, semanaId, rows);
        const { error } = await supabase.rpc('upsert_registros_semana', {
          p_semana_id: semanaId,
          p_registros: registros,
        });
        if (error) throw error;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al guardar');
      } finally {
        setSaving(false);
      }
    },
    [rowsByCorredor]
  );

  const guardarTodo = useCallback(
    async (semanaId: string) => {
      setSaving(true);
      setError(null);
      try {
        for (const corredorId of Object.keys(rowsByCorredor)) {
          const rows = rowsByCorredor[corredorId] ?? [];
          const registros = rowsToJsonb(corredorId, semanaId, rows);
          const { error } = await supabase.rpc('upsert_registros_semana', {
            p_semana_id: semanaId,
            p_registros: registros,
          });
          if (error) throw error;
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al guardar');
      } finally {
        setSaving(false);
      }
    },
    [rowsByCorredor]
  );

  return {
    rowsByCorredor,
    loading,
    saving,
    error,
    initRows,
    updateRow,
    guardarCorredor,
    guardarTodo,
  };
}
