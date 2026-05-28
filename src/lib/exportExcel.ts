import * as XLSX from 'xlsx';
import { calcTotalesCorredor } from './formulas';
import { formatFecha } from './dateUtils';
import type { Corredor, RegistroDiario, Semana } from '../types';

export function exportSemanaExcel(
  semana: Semana,
  corredores: Corredor[],
  registros: RegistroDiario[]
): void {
  const wb = XLSX.utils.book_new();

  for (const corredor of corredores) {
    const regs = registros
      .filter((r) => r.corredor_id === corredor.id)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const totales = calcTotalesCorredor(regs);

    const sheetRows: unknown[][] = [
      [`Semana ${semana.numero_semana} | Período ${semana.periodo} | ${semana.fecha_inicio} — ${semana.fecha_fin}`],
      [`CORREDOR: ${corredor.codigo} — ${corredor.nombre}`],
      [],
      ['Fecha', 'Kms Prog.', 'Kms Ejec.', 'Kms Efect.', 'Pasajeros', 'Serv. Prog.', 'Serv. Ejec.', 'Serv. Punt.'],
      ...regs.map((r) => [
        formatFecha(r.fecha),
        r.kms_programados ?? '',
        r.kms_ejecutados ?? '',
        r.kms_efectivos ?? '',
        r.total_pasajeros ?? '',
        r.servicios_programados ?? '',
        r.servicios_ejecutados ?? '',
        r.servicios_puntuales ?? '',
      ]),
      [
        'TOTAL',
        totales.kms_programados,
        totales.kms_ejecutados,
        totales.kms_efectivos,
        totales.total_pasajeros,
        totales.servicios_programados,
        totales.servicios_ejecutados,
        totales.servicios_puntuales,
      ],
      [],
      ['SECCIÓN II — INDICADORES'],
      ['Fecha', 'IcA', 'IcK', 'IcD', 'IC', 'IP', 'IE', 'ICS'],
      ...regs.map((r) => [
        formatFecha(r.fecha),
        r.ica ?? '',
        r.ick ?? '',
        r.icd ?? '',
        r.ic ?? '',
        r.ip ?? '',
        r.ie ?? '',
        r.ics ?? '',
      ]),
      [
        'PROM',
        totales.ica_prom,
        totales.ick_prom,
        totales.icd_prom,
        totales.ic_prom,
        totales.ip_prom,
        totales.ie_prom,
        totales.ics_prom,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(wb, ws, `${corredor.codigo}`);
  }

  const filename = `SIGO_Semana${semana.numero_semana}_P${semana.periodo}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportResumenMensualExcel(
  periodo: number,
  filas: import('../hooks/useResumenMensual').FilaResumen[]
): void {
  const wb = XLSX.utils.book_new();

  // Hoja Sección I
  const s1Rows: unknown[][] = [
    [`Resumen Mensual — Período ${periodo}`],
    [],
    ['Corredor', 'Kms Prog.', 'Kms Ejec.', 'Kms Efect.', 'Pasajeros', 'S. Prog.', 'S. Ejec.', 'S. Punt.'],
    ...filas.map(({ corredor, totales }) => [
      `${corredor.codigo} — ${corredor.nombre}`,
      totales.kms_programados,
      totales.kms_ejecutados,
      totales.kms_efectivos,
      totales.total_pasajeros,
      totales.servicios_programados,
      totales.servicios_ejecutados,
      totales.servicios_puntuales,
    ]),
  ];

  // Hoja Sección II
  const s2Rows: unknown[][] = [
    [`Resumen Mensual — Período ${periodo} — Indicadores`],
    [],
    ['Corredor', 'IcA', 'IcK', 'IcD', 'IC', 'IP', 'IE', 'ICS'],
    ...filas.map(({ corredor, totales }) => [
      `${corredor.codigo} — ${corredor.nombre}`,
      totales.ica_prom,
      totales.ick_prom,
      totales.icd_prom,
      totales.ic_prom,
      totales.ip_prom,
      totales.ie_prom,
      totales.ics_prom,
    ]),
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1Rows), 'Sec I - Kms');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2Rows), 'Sec II - Indicadores');

  XLSX.writeFile(wb, `SIGO_ResumenMensual_P${periodo}.xlsx`);
}

export function exportComparativoExcel(
  filas: import('../hooks/useComparativoCorredores').FilaComparativo[],
  periodo: number,
  semanaDesde: number,
  semanaHasta: number
): void {
  const wb = XLSX.utils.book_new();

  const rows: unknown[][] = [
    [`Comparativo de Corredores — Período ${periodo} / Semanas ${semanaDesde}–${semanaHasta}`],
    [],
    ['Corredor', 'IcA prom', 'IcK prom', 'IcD prom', 'IC prom', 'IP prom', 'IE prom', 'ICS prom',
     'Kms Prog.', 'Kms Ejec.', 'Kms Efect.', 'Pasajeros'],
    ...filas.map(({ corredor, totales }) => [
      `${corredor.codigo} — ${corredor.nombre}`,
      totales.ica_prom,
      totales.ick_prom,
      totales.icd_prom,
      totales.ic_prom,
      totales.ip_prom,
      totales.ie_prom,
      totales.ics_prom,
      totales.kms_programados,
      totales.kms_ejecutados,
      totales.kms_efectivos,
      totales.total_pasajeros,
    ]),
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Comparativo');
  XLSX.writeFile(wb, `SIGO_Comparativo_P${periodo}_S${semanaDesde}-${semanaHasta}.xlsx`);
}

export function exportTendenciaExcel(
  corredor: import('../types').Corredor,
  registros: import('../types').RegistroDiario[]
): void {
  const wb = XLSX.utils.book_new();

  const rows: unknown[][] = [
    [`Tendencia de Indicadores — ${corredor.codigo} ${corredor.nombre}`],
    [],
    ['Fecha', 'IcA', 'IcK', 'IcD', 'IC', 'IP', 'IE', 'ICS'],
    ...registros.map(r => [
      r.fecha,
      r.ica ?? '',
      r.ick ?? '',
      r.icd ?? '',
      r.ic ?? '',
      r.ip ?? '',
      r.ie ?? '',
      r.ics ?? '',
    ]),
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Tendencia');
  XLSX.writeFile(wb, `SIGO_Tendencia_${corredor.codigo}.xlsx`);
}
