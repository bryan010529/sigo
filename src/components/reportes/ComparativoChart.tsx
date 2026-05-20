// src/components/reportes/ComparativoChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getICSColor } from '../../lib/formulas';
import type { FilaComparativo } from '../../hooks/useComparativoCorredores';

interface Props {
  filas: FilaComparativo[];
}

export function ComparativoChart({ filas }: Props) {
  const data = filas.map(({ corredor, totales }) => ({
    nombre: corredor.codigo,
    ICS: totales.ics_prom,
    color: getICSColor(totales.ics_prom),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, 'ICS']} />
        <Bar dataKey="ICS" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
