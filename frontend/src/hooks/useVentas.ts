import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Venta } from '../types';

export const useVentas = () => {
  return useQuery<Venta[]>({
    queryKey: ['ventas'],
    queryFn: async () => {
      const { data } = await api.get('/ventas');
      return data;
    }
  });
};

export const useVenta = (id: number) => {
  return useQuery({
    queryKey: ['venta', id],
    queryFn: async () => {
      const { data } = await api.get(`/ventas/${id}`);
      return data;
    },
    enabled: !!id
  });
};

export const useVentasActivas = () => {
  return useQuery<Venta[]>({
    queryKey: ['ventas-activas'],
    queryFn: async () => {
      const { data } = await api.get('/ventas/activas');
      return data;
    },
    refetchInterval: 1000 * 60 * 2
  });
};

export const useResumenRetiros = (ventaId: number) => {
  return useQuery({
    queryKey: ['retiros', ventaId],
    queryFn: async () => {
      const { data } = await api.get(`/ventas/${ventaId}/retiros`);
      return data;
    },
    enabled: !!ventaId
  });
};

export const useActualizarEstadoVenta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: string }) => {
      const { data } = await api.put(`/ventas/${id}/estado`, { estado });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['ventas-activas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useRegistrarRetiro = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ventaId, detalleVentaId, cantidadRetirada }: {
      ventaId: number;
      detalleVentaId: number;
      cantidadRetirada: number;
    }) => {
      const { data } = await api.post(`/ventas/${ventaId}/retiro`, {
        detalleVentaId,
        cantidadRetirada
      });
      return data;
    },
    onSuccess: (_, { ventaId }) => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['venta', ventaId] });
      queryClient.invalidateQueries({ queryKey: ['retiros', ventaId] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
    }
  });
};

export const useEliminarVenta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/ventas/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};
