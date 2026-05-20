import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Semanas from './pages/Semanas';
import SemanaDetalle from './pages/SemanaDetalle';
import Registro from './pages/Registro';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/semanas" element={<Semanas />} />
        <Route path="/semanas/:id" element={<SemanaDetalle />} />
        <Route path="/registro/nuevo" element={<Registro />} />
        <Route path="/registro/:semanaId/editar" element={<Registro />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Routes>
    </BrowserRouter>
  );
}
