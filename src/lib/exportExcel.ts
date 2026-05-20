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
      [`Costo por km: RD$ ${corredor.costo_por_km?.toFixed(4) ?? '0.0000'}`],
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
