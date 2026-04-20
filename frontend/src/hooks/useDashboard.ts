import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { DashboardData, AlertasResponse } from '../types';
import { useVistaStore } from '../store/vista.store';
import { useVistaParams } from './useVista';

export const useDashboard = () => {
  const { vista } = useVistaStore();
  const { vistaParam } = useVistaParams();

  return useQuery<DashboardData>({
    queryKey: ['dashboard', vista],
    queryFn: async () => {
      const { data } = await api.get(`/reportes/dashboard?vista=${vistaParam}`);
      return data;
    },
    staleTime: 0,
    refetchInterval: 1000 * 60 * 5,
    gcTime: 0,
  });
};

export const useAlertas = () => {
  return useQuery<AlertasResponse>({
    queryKey: ['alertas'],
    queryFn: async () => {
      const { data } = await api.get('/alertas');
      return data;
    },
    staleTime: 0,
    refetchInterval: 1000 * 60 * 2,
  });
};

export const useEstacionalidad = () => {
  const { vista } = useVistaStore();
  const { vistaParam } = useVistaParams();

  return useQuery({
    queryKey: ['estacionalidad', vista],
    queryFn: async () => {
      const { data } = await api.get(`/reportes/estacionalidad?vista=${vistaParam}`);
      return data as Array<{ mes: string; ventas: number; pallets: number; facturacion: number }>;
    },
    staleTime: 0,
    gcTime: 0,
  });
};

export const useGanancias = () => {
  const { vista } = useVistaStore();
  const { vistaParam } = useVistaParams();
  const hoy = new Date();
  const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['ganancias', vista, desde, hasta],
    queryFn: async () => {
      const [ventasRes, comprasRes] = await Promise.all([
        api.get(`/reportes/ventas?desde=${desde}&hasta=${hasta}&vista=${vistaParam}`),
        api.get(`/compras?vista=${vistaParam}`),
      ]);

      const facturacion: number = ventasRes.data?.resumen?.totalFacturado || 0;

      const comprasDelMes = (comprasRes.data || []).filter((c: any) => {
        const fecha = new Date(c.fechaCompra);
        return fecha >= new Date(desde) && fecha <= new Date(hasta);
      });

      const costoCompras = comprasDelMes.reduce(
        (acc: number, c: any) => acc + Number(c.total || 0), 0
      );

      return {
        facturacion,
        costoCompras,
        ganancias: facturacion - costoCompras,
      };
    },
    staleTime: 0,
    gcTime: 0,
  });
};
