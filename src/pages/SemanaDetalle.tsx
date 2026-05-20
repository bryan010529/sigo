import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EstadoBadge from '../components/semanas/EstadoBadge';
import type { Semana, RegistroDiario, Corredor } from '../types';
import { calcTotalesCorredor } from '../lib/formulas';
import { generarDiasSemana, formatFecha } from '../lib/dateUtils';

interface SemanaDetalle extends Semana {
  registros: RegistroDiario[];
  corredores: Corredor[];
}

export default function SemanaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SemanaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('semanas').select('*').eq('id', id).single(),
      supabase.from('registros_diarios').select('*').eq('semana_id', id).order('fecha'),
      supabase.from('corredores').select('*').eq('activo', true).order('orden'),
    ]).then(([semRes, regRes, corrRes]) => {
      setLoading(false);
      if (semRes.error) { setError(semRes.error.message); return; }
      setData({
        ...(semRes.data as Semana),
        registros: (regRes.data || []) as RegistroDiario[],
        corredores: (corrRes.data || []) as Corredor[],
      });
    });
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (error || !data) return (
    <p className="text-sm text-center py-8" style={{ color: 'var(--red)' }}>
      {error || 'Semana no encontrada'}
    </p>
  );

  const dias = generarDiasSemana(data.fecha_inicio);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/semanas')}
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={15} /> Volver
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>
            Semana {data.numero_semana} — Período {data.periodo}
          </h2>
          <EstadoBadge estado={data.estado} />
        </div>
      </div>

      {/* Tablas por corredor */}
      {data.corredores.map(corredor => {
        const regs = data.registros.filter(r => r.corredor_id === corredor.id);
        const totales = calcTotalesCorredor(regs);

        const regPorDia = dias.reduce<Record<string, RegistroDiario | undefined>>((acc, dia) => {
          acc[dia] = regs.find(r => r.fecha === dia);
          return acc;
        }, {});

        return (
          <div key={corredor.id} className="bg-white rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--navy)' }}>
              <h3 className="text-sm font-semibold text-white">
                Corredor {corredor.codigo} — {corredor.nombre}
              </h3>
            </div>

            {/* Sección I */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: 'var(--light)' }}>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--muted)' }}>Fecha</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>Kms Prog.</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>Kms Ejec.</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>Kms Efect.</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>Pasajeros</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>IC</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--muted)' }}>ICS</th>
                  </tr>
                </thead>
                <tbody>
                  {dias.map(dia => {
                    const reg = regPorDia[dia];
                    const empty = !reg?.tiene_datos;
                    return (
                      <tr key={dia} style={{ backgroundColor: empty ? '#f8f9fa' : 'white', borderTop: '1px solid var(--border)' }}>
                        <td className="px-3 py-2" style={{ color: empty ? 'var(--muted)' : 'var(--text)' }}>
                          {formatFecha(dia)}
                        </td>
                        <td className="px-3 py-2 text-right">{reg?.kms_programados ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.kms_ejecutados ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.kms_efectivos ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.total_pasajeros?.toLocaleString('es-DO') ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.ic ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{reg?.ics ?? '—'}</td>
                      </tr>
                    );
                  })}
                  {/* Fila de totales */}
                  <tr style={{ backgroundColor: 'var(--navy)', color: 'white', fontWeight: 600 }}>
                    <td className="px-3 py-2">TOTAL SEMANA</td>
                    <td className="px-3 py-2 text-right">{totales.kms_programados.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{totales.kms_ejecutados.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{totales.kms_efectivos.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{totales.total_pasajeros.toLocaleString('es-DO')}</td>
                    <td className="px-3 py-2 text-right">{totales.ic_prom.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{totales.ics_prom.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
