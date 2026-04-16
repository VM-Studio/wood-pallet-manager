import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClientesPage from './pages/clientes/ClientesPage';
import ProductosPage from './pages/productos/ProductosPage';
import CotizacionesPage from './pages/cotizaciones/CotizacionesPage';
import VentasPage from './pages/ventas/VentasPage';
import ComprasPage from './pages/compras/ComprasPage';
import InventarioPage from './pages/inventario/InventarioPage';
import LogisticaPage from './pages/logistica/LogisticaPage';
import FacturacionPage from './pages/facturacion/FacturacionPage';
import ReportesPage from './pages/reportes/ReportesPage';
import AlertasPage from './pages/alertas/AlertasPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"     element={<DashboardPage />} />
            <Route path="clientes"      element={<ClientesPage />} />
            <Route path="productos"     element={<ProductosPage />} />
            <Route path="cotizaciones"  element={<CotizacionesPage />} />
            <Route path="ventas"        element={<VentasPage />} />
            <Route path="compras"       element={<ComprasPage />} />
            <Route path="inventario"    element={<InventarioPage />} />
            <Route path="logistica"     element={<LogisticaPage />} />
            <Route path="facturacion"   element={<FacturacionPage />} />
            <Route path="reportes"      element={<ReportesPage />} />
            <Route path="alertas"       element={<AlertasPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
