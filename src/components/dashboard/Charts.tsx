import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartPoint } from '../../hooks/useDashboard';

const CORREDOR_COLORS = ['#1a3a5c', '#e8541a', '#27ae60', '#f39c12'];

interface Props {
  icsChart: ChartPoint[];
  pasajerosChart: ChartPoint[];
  corredores: string[];
}

export default function Charts({ icsChart, pasajerosChart, corredores }: Props) {
  if (!icsChart.length) {
    return (
      <div
        className="bg-white rounded-xl p-8 text-center"
        style={{ border: '1px solid var(--border)' }}
      >
        <p style={{ color: 'var(--muted)' }}>No hay semanas validadas para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ICS por semana */}
      <div
        className="bg-white rounded-xl p-5"
        style={{ border: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          ICS por Semana
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={icsChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              formatter={(v?: number | string | readonly (string | number)[]) => {
                if (!v) return ['0%', ''];
                const value = Array.isArray(v) ? v[0] : v;
                return [`${Number(value)}%`, ''];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {corredores.map((corredor, i) => (
              <Line
                key={corredor}
                type="monotone"
                dataKey={corredor}
                stroke={CORREDOR_COLORS[i % CORREDOR_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pasajeros por semana */}
      <div
        className="bg-white rounded-xl p-5"
        style={{ border: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Pasajeros por Semana
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={pasajerosChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v?: number | string | readonly (string | number)[]) => {
                if (!v) return ['0', ''];
                const value = Array.isArray(v) ? v[0] : v;
                return [Number(value).toLocaleString('es-DO'), ''];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {corredores.map((corredor, i) => (
              <Bar
                key={corredor}
                dataKey={corredor}
                fill={CORREDOR_COLORS[i % CORREDOR_COLORS.length]}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
