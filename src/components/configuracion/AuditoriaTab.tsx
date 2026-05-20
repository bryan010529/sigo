import { useAuditoria } from '../../hooks/useAuditoria';

const ACCIONES = ['', 'INSERT', 'UPDATE', 'DELETE', 'ESTADO_CAMBIO'];

const ACCION_COLOR: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  ESTADO_CAMBIO: 'bg-yellow-100 text-yellow-700',
};

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function AuditoriaTab() {
  const { entradas, loading, error, filtros, setFiltros } = useAuditoria();

  const inputCls = 'border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-navy';

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Acción</label>
          <select className={inputCls} value={filtros.accion} onChange={e => setFiltros({ accion: e.target.value })}>
            {ACCIONES.map(a => (
              <option key={a} value={a}>
                {a || 'Todas'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            className={inputCls}
            value={filtros.desde}
            onChange={e => setFiltros({ desde: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            className={inputCls}
            value={filtros.hasta}
            onChange={e => setFiltros({ hasta: e.target.value })}
          />
        </div>
        <button
          className="text-xs text-gray-500 hover:text-navy underline pb-1.5"
          onClick={() => setFiltros({ accion: '', desde: '', hasta: '', usuarioId: '' })}
        >
          Limpiar filtros
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando log...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-navy text-white">
              <tr>
                {['Fecha/Hora', 'Tabla', 'Acción', 'Usuario', 'Detalle'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    No hay registros de auditoría
                  </td>
                </tr>
              ) : (
                entradas.map(e => (
                  <tr key={e.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {formatFechaHora(e.created_at)}
                    </td>
                    <td className="px-3 py-2 font-mono">{e.tabla}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          ACCION_COLOR[e.accion] ?? 'bg-gray-100'
                        }`}
                      >
                        {e.accion}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span title={e.usuario_email ?? ''}>{e.usuario_nombre ?? e.usuario_id?.slice(0, 8) ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate text-gray-500">
                      {e.datos_nuevo ? JSON.stringify(e.datos_nuevo).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">Mostrando últimas 200 entradas. Solo lectura.</p>
    </div>
  );
}
