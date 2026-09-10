import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { DashboardData, AlertasResponse, Alerta, AlertaResuelta } from '../types';
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

export const useAlertasResueltas = () => {
  return useQuery<AlertaResuelta[]>({
    queryKey: ['alertas-resueltas'],
    queryFn: async () => {
      const { data } = await api.get('/alertas/resueltas');
      return data;
    },
    staleTime: 0,
  });
};

export const useMarcarAlertaResuelta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alerta: Alerta) => {
      const { data } = await api.post('/alertas/resolver', {
        tipo: alerta.tipo,
        titulo: alerta.titulo,
        detalle: alerta.detalle,
        urgencia: alerta.urgencia,
        propietario: alerta.propietario,
        referenciaTipo: alerta.referencia.tipo,
        referenciaId: alerta.referencia.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-resueltas'] });
    },
  });
};

export const useReabrirAlerta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/alertas/resueltas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-resueltas'] });
    },
  });
};

export const useEstacionalidad = () => {
  const { vista } = useVistaStore();
  const { vistaParam } = useVistaParams();

  return useQuery({
    queryKey: ['estacionalidad', vistaParam],
    queryFn: async () => {
      const { data } = await api.get(`/reportes/estacionalidad?vista=${vistaParam}`);
      return data as Array<{ mes: string; ventas: number; pallets: number; facturacion: number }>;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 5,
  });
};

export const useGanancias = () => {
  const { vistaParam } = useVistaParams();

  return useQuery({
    queryKey: ['ganancias', vistaParam],
    queryFn: async () => {
      const { data } = await api.get(`/reportes/ganancias-detalle?vista=${vistaParam}`);
      return data as {
        cantidadVentas: number;
        facturadoMes: number;
        cobradoMes: number;
        comprasStockPropio: number;
        comprasReventa: number;
        totalCompras: number;
        gananciaNeta: number;
      };
    },
    staleTime: 0,
    gcTime: 0,
  });
};
