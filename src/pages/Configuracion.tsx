import { useState } from 'react';
import { UsuariosTab } from '../components/configuracion/UsuariosTab';
import { CorredoresTab } from '../components/configuracion/CorredoresTab';
import { AuditoriaTab } from '../components/configuracion/AuditoriaTab';

type Tab = 'usuarios' | 'corredores' | 'auditoria';

const TABS: { id: Tab; label: string }[] = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'corredores', label: 'Corredores' },
  { id: 'auditoria', label: 'Auditoría' },
];

export default function Configuracion() {
  const [tab, setTab] = useState<Tab>('usuarios');

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-navy">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión del sistema — solo administradores</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-500 hover:text-navy hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido del tab activo */}
      <div>
        {tab === 'usuarios' && <UsuariosTab />}
        {tab === 'corredores' && <CorredoresTab />}
        {tab === 'auditoria' && <AuditoriaTab />}
      </div>
    </div>
  );
}
