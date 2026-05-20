import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Semanas from './pages/Semanas';
import SemanaDetalle from './pages/SemanaDetalle';
import Registro from './pages/Registro';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

function AppRoutes() {
  useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="semanas" element={<Semanas />} />
        <Route path="semanas/:id" element={<SemanaDetalle />} />
        <Route
          path="registro/nuevo"
          element={
            <ProtectedRoute roles={['admin', 'digitador']}>
              <Registro />
            </ProtectedRoute>
          }
        />
        <Route
          path="registro/:semanaId/editar"
          element={
            <ProtectedRoute roles={['admin', 'digitador']}>
              <Registro />
            </ProtectedRoute>
          }
        />
        <Route path="reportes" element={<Reportes />} />
        <Route
          path="configuracion"
          element={
            <ProtectedRoute roles={['admin']}>
              <Configuracion />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
