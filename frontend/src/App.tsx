import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import MainLayout from './components/layout/MainLayout';

const LoginPage       = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage   = lazy(() => import('./pages/dashboard/DashboardPage'));
const ClientesPage    = lazy(() => import('./pages/clientes/ClientesPage'));
const ProductosPage   = lazy(() => import('./pages/productos/ProductosPage'));
const CotizacionesPage = lazy(() => import('./pages/cotizaciones/CotizacionesPage'));
const VentasPage      = lazy(() => import('./pages/ventas/VentasPage'));
const ComprasPage     = lazy(() => import('./pages/compras/ComprasPage'));
const InventarioPage  = lazy(() => import('./pages/inventario/InventarioPage'));
const LogisticaPage   = lazy(() => import('./pages/logistica/LogisticaPage'));
const FacturacionPage = lazy(() => import('./pages/facturacion/FacturacionPage'));
const ReportesPage    = lazy(() => import('./pages/reportes/ReportesPage'));
const AlertasPage     = lazy(() => import('./pages/alertas/AlertasPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Inter,sans-serif',color:'#6B7280'}}>Cargando...</div>}>
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
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
