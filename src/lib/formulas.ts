import type { RegistroDiario, TotalesCorredor } from '../types';

export function calcIC(ica: number, ick: number, icd: number): number {
  return parseFloat(((ica + ick + icd) / 3).toFixed(2));
}

export function calcICS(ic: number, ip: number, ie: number): number {
  return parseFloat((ic * 0.5 + ip * 0.25 + ie * 0.25).toFixed(2));
}

export function getICSColor(ics: number): string {
  if (ics >= 80) return '#27ae60';
  if (ics >= 70) return '#f39c12';
  return '#e74c3c';
}

export function calcTotalesCorredor(registros: RegistroDiario[]): TotalesCorredor {
  const conDatos = registros.filter(r => r.tiene_datos);

  const suma = (campo: keyof RegistroDiario): number =>
    conDatos.reduce((acc, r) => acc + (Number(r[campo]) || 0), 0);

  const prom = (campo: keyof RegistroDiario): number => {
    const vals = conDatos.filter(r => r[campo] != null);
    if (!vals.length) return 0;
    return parseFloat(
      (vals.reduce((a, r) => a + Number(r[campo]), 0) / vals.length).toFixed(2)
    );
  };

  return {
    kms_programados: suma('kms_programados'),
    kms_ejecutados: suma('kms_ejecutados'),
    kms_efectivos: suma('kms_efectivos'),
    total_pasajeros: suma('total_pasajeros'),
    servicios_programados: suma('servicios_programados'),
    servicios_ejecutados: suma('servicios_ejecutados'),
    servicios_puntuales: suma('servicios_puntuales'),
    ica_prom: prom('ica'),
    ick_prom: prom('ick'),
    icd_prom: prom('icd'),
    ic_prom: prom('ic'),
    ip_prom: prom('ip'),
    ie_prom: prom('ie'),
    ics_prom: prom('ics'),
  };
}
