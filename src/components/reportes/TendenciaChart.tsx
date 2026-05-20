// src/components/reportes/TendenciaChart.tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatFecha } from '../../lib/dateUtils';
import type { RegistroDiario } from '../../types';

interface Props {
  registros: RegistroDiario[];
}

const INDICADORES: { key: keyof RegistroDiario; label: string; color: string }[] = [
  { key: 'ica', label: 'IcA', color: '#1a3a5c' },
  { key: 'ick', label: 'IcK', color: '#e8541a' },
  { key: 'icd', label: 'IcD', color: '#f39c12' },
  { key: 'ic',  label: 'IC',  color: '#9b59b6' },
  { key: 'ip',  label: 'IP',  color: '#3498db' },
  { key: 'ie',  label: 'IE',  color: '#1abc9c' },
  { key: 'ics', label: 'ICS', color: '#27ae60' },
];

export function TendenciaChart({ registros }: Props) {
  const data = registros.map(r => ({
    fecha: formatFecha(r.fecha),
    ica: r.ica ?? null,
    ick: r.ick ?? null,
    icd: r.icd ?? null,
    ic: r.ic ?? null,
    ip: r.ip ?? null,
    ie: r.ie ?? null,
    ics: r.ics ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v) => v != null ? [`${Number(v).toFixed(2)}%`, ''] : ['-', '']} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {INDICADORES.map(ind => (
          <Line
            key={ind.key as string}
            type="monotone"
            dataKey={ind.key as string}
            name={ind.label}
            stroke={ind.color}
            strokeWidth={1.5}
            dot={{ r: 2 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
