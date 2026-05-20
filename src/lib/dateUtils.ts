export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calcFechaFin(fechaInicio: string): string {
  const inicio = new Date(fechaInicio + 'T00:00:00');
  return toISODate(addDays(inicio, 6));
}

export function formatFecha(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-DO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

export function generarDiasSemana(fechaInicio: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const inicio = new Date(fechaInicio + 'T00:00:00');
    return toISODate(addDays(inicio, i));
  });
}
