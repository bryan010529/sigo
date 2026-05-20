import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { calcIC, calcICS } from './formulas';
import type { RegistroRow } from '../hooks/useRegistros';

const COL_MAP: Record<string, keyof RegistroRow> = {
  fecha: 'fecha',
  kms_programados: 'kms_programados',
  kms_programadosx: 'kms_programados',
  'kms programados': 'kms_programados',
  kmsprog: 'kms_programados',
  kms_ejecutados: 'kms_ejecutados',
  kmsejecutados: 'kms_ejecutados',
  'kms ejecutados': 'kms_ejecutados',
  kmsejec: 'kms_ejecutados',
  kms_efectivos: 'kms_efectivos',
  kmsefectivos: 'kms_efectivos',
  'kms efectivos': 'kms_efectivos',
  kmsefect: 'kms_efectivos',
  pasajeros: 'total_pasajeros',
  total_pasajeros: 'total_pasajeros',
  totalpasajeros: 'total_pasajeros',
  serv_programados: 'servicios_programados',
  servicios_programados: 'servicios_programados',
  servprogramados: 'servicios_programados',
  'servicios programados': 'servicios_programados',
  serv_ejecutados: 'servicios_ejecutados',
  servicios_ejecutados: 'servicios_ejecutados',
  'servicios ejecutados': 'servicios_ejecutados',
  sxe: 'servicios_ejecutados',
  serv_puntuales: 'servicios_puntuales',
  servicios_puntuales: 'servicios_puntuales',
  'servicios puntuales': 'servicios_puntuales',
  ica: 'ica',
  ick: 'ick',
  icd: 'icd',
  ip: 'ip',
  ie: 'ie',
};

export type RawRow = Record<string, string>;

export function detectHeaders(headers: string[]): Record<string, keyof RegistroRow | null> {
  const mapping: Record<string, keyof RegistroRow | null> = {};
  for (const h of headers) {
    const key = h
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z_]/g, '');
    mapping[h] = COL_MAP[key] ?? COL_MAP[h.toLowerCase()] ?? null;
  }
  return mapping;
}

export function parseCSV(text: string): { headers: string[]; rows: RawRow[] } {
  const result = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
  };
}

export function parseExcel(buffer: ArrayBuffer): { headers: string[]; rows: RawRow[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '', raw: false });
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  return { headers, rows: data };
}

export function applyMapping(
  rawRows: RawRow[],
  mapping: Record<string, keyof RegistroRow | null>,
  fechasSemana: string[]
): RegistroRow[] {
  return rawRows.map((raw, i) => {
    const row: Partial<RegistroRow> = {
      fecha: fechasSemana[i] ?? '',
      fuente: 'importado',
      ie: '90',
    };

    for (const [col, campo] of Object.entries(mapping)) {
      if (!campo) continue;
      const val = raw[col]?.toString().trim() ?? '';
      if (campo === 'fecha') {
        const d = new Date(val);
        const iso = isNaN(d.getTime()) ? fechasSemana[i] ?? '' : d.toISOString().split('T')[0];
        row.fecha = iso;
      } else {
        (row as Record<string, string>)[campo] = val;
      }
    }

    const ica = parseFloat(row.ica ?? '');
    const ick = parseFloat(row.ick ?? '');
    const icd = parseFloat(row.icd ?? '');
    const ip = parseFloat(row.ip ?? '90');
    const ie = parseFloat(row.ie ?? '90');

    row.ic = !Number.isNaN(ica) && !Number.isNaN(ick) && !Number.isNaN(icd) ? calcIC(ica, ick, icd) : null;
    row.ics = row.ic != null && !Number.isNaN(ip) && !Number.isNaN(ie) ? calcICS(row.ic, ip, ie) : null;

    return row as RegistroRow;
  });
}
