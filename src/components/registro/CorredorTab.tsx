import type { Corredor, RegistroDiario } from '../../types';
import { calcTotalesCorredor, getICSColor } from '../../lib/formulas';
import { formatFecha } from '../../lib/dateUtils';
import type { RegistroRow } from '../../hooks/useRegistros';

const inputCls =
  'w-full text-right text-sm px-1 py-0.5 border-0 focus:outline-none focus:ring-1 focus:ring-navy bg-transparent';
const thCls = 'px-2 py-1 text-xs font-semibold text-white bg-navy whitespace-nowrap';
const tdCls = 'px-1 py-0.5 text-xs text-center border-b border-gray-100';

function NumInput({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <input
      type="number"
      step="0.01"
      className={inputCls}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
    />
  );
}

function rowsToPartialRD(rows: RegistroRow[]): Partial<RegistroDiario>[] {
  return rows.map((row) => ({
    tiene_datos: [
      row.kms_programados,
      row.kms_ejecutados,
      row.kms_efectivos,
      row.ica,
      row.ick,
      row.icd,
    ].some((v) => v !== ''),
    kms_programados: row.kms_programados !== '' ? parseFloat(row.kms_programados) : undefined,
    kms_ejecutados: row.kms_ejecutados !== '' ? parseFloat(row.kms_ejecutados) : undefined,
    kms_efectivos: row.kms_efectivos !== '' ? parseFloat(row.kms_efectivos) : undefined,
    total_pasajeros: row.total_pasajeros !== '' ? parseInt(row.total_pasajeros, 10) : undefined,
    servicios_programados:
      row.servicios_programados !== '' ? parseInt(row.servicios_programados, 10) : undefined,
    servicios_ejecutados:
      row.servicios_ejecutados !== '' ? parseInt(row.servicios_ejecutados, 10) : undefined,
    servicios_puntuales:
      row.servicios_puntuales !== '' ? parseInt(row.servicios_puntuales, 10) : undefined,
    ica: row.ica !== '' ? parseFloat(row.ica) : undefined,
    ick: row.ick !== '' ? parseFloat(row.ick) : undefined,
    icd: row.icd !== '' ? parseFloat(row.icd) : undefined,
    ic: row.ic ?? undefined,
    ip: row.ip !== '' ? parseFloat(row.ip) : undefined,
    ie: row.ie !== '' ? parseFloat(row.ie) : undefined,
    ics: row.ics ?? undefined,
  }));
}

interface CorredorTabProps {
  corredor: Corredor;
  rows: RegistroRow[];
  onChange: (rowIndex: number, campo: keyof RegistroRow, valor: string) => void;
  readOnly?: boolean;
}

export function CorredorTab({ corredor, rows, onChange, readOnly }: CorredorTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-navy mb-2">
          {`Sección I — Kilómetros y Servicios · ${corredor.codigo} ${corredor.nombre}`}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 text-xs">
            <thead>
              <tr>
                {[
                  'Fecha',
                  'Kms Prog.',
                  'Kms Ejec.',
                  'Kms Efect.',
                  'Pasajeros',
                  'Serv. Prog.',
                  'Serv. Ejec.',
                  'Serv. Punt.',
                ].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const vacio = [
                  row.kms_programados,
                  row.kms_ejecutados,
                  row.kms_efectivos,
                ].every((v) => v === '');
                return (
                  <tr key={row.fecha} className={vacio ? 'bg-gray-50' : 'bg-white'}>
                    <td className={`${tdCls} font-medium text-left px-2`}>{formatFecha(row.fecha)}</td>
                    {(
                      [
                        'kms_programados',
                        'kms_ejecutados',
                        'kms_efectivos',
                        'total_pasajeros',
                        'servicios_programados',
                        'servicios_ejecutados',
                        'servicios_puntuales',
                      ] as const
                    ).map((campo) => (
                      <td key={campo} className={tdCls}>
                        <NumInput
                          value={row[campo] as string}
                          onChange={(v) => onChange(i, campo, v)}
                          readOnly={readOnly}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
              {(() => {
                const t = calcTotalesCorredor(rowsToPartialRD(rows) as RegistroDiario[]);
                return (
                  <tr className="bg-navy/10 font-bold">
                    <td className={`${tdCls} text-left px-2 font-bold`}>TOTAL</td>
                    {[
                      t.kms_programados,
                      t.kms_ejecutados,
                      t.kms_efectivos,
                      t.total_pasajeros,
                      t.servicios_programados,
                      t.servicios_ejecutados,
                      t.servicios_puntuales,
                    ].map((v, idx) => (
                      <td key={idx} className={tdCls}>
                        {v || '—'}
                      </td>
                    ))}
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-navy mb-2">Sección II — Indicadores de Calidad</h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 text-xs">
            <thead>
              <tr>
                {['Fecha', 'IcA', 'IcK', 'IcD', 'IC (auto)', 'IP', 'IE', 'ICS (auto)'].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const icColor = row.ic != null ? getICSColor(row.ic) : undefined;
                const icsColor = row.ics != null ? getICSColor(row.ics) : undefined;
                return (
                  <tr key={row.fecha} className="bg-white hover:bg-gray-50">
                    <td className={`${tdCls} font-medium text-left px-2`}>{formatFecha(row.fecha)}</td>
                    {(['ica', 'ick', 'icd'] as const).map((campo) => (
                      <td key={campo} className={tdCls}>
                        <NumInput
                          value={row[campo]}
                          onChange={(v) => onChange(i, campo, v)}
                          readOnly={readOnly}
                        />
                      </td>
                    ))}
                    <td className={tdCls}>
                      <span className="font-semibold" style={{ color: icColor }}>
                        {row.ic != null ? row.ic.toFixed(2) : '—'}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <NumInput
                        value={row.ip}
                        onChange={(v) => onChange(i, 'ip', v)}
                        readOnly={readOnly}
                      />
                    </td>
                    <td className={tdCls}>
                      <NumInput
                        value={row.ie}
                        onChange={(v) => onChange(i, 'ie', v)}
                        readOnly={readOnly}
                      />
                    </td>
                    <td className={tdCls}>
                      <span className="font-bold" style={{ color: icsColor }}>
                        {row.ics != null ? row.ics.toFixed(2) : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(() => {
                const t = calcTotalesCorredor(rowsToPartialRD(rows) as RegistroDiario[]);
                const icsColor = t.ics_prom ? getICSColor(t.ics_prom) : undefined;
                return (
                  <tr className="bg-navy/10 font-bold">
                    <td className={`${tdCls} text-left px-2 font-bold`}>PROM</td>
                    {[t.ica_prom, t.ick_prom, t.icd_prom].map((v, idx) => (
                      <td key={idx} className={tdCls}>
                        {v ? v.toFixed(2) : '—'}
                      </td>
                    ))}
                    <td className={tdCls}>{t.ic_prom ? t.ic_prom.toFixed(2) : '—'}</td>
                    <td className={tdCls}>{t.ip_prom ? t.ip_prom.toFixed(2) : '—'}</td>
                    <td className={tdCls}>{t.ie_prom ? t.ie_prom.toFixed(2) : '—'}</td>
                    <td className={tdCls}>
                      <span className="font-bold" style={{ color: icsColor }}>
                        {t.ics_prom ? t.ics_prom.toFixed(2) : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
