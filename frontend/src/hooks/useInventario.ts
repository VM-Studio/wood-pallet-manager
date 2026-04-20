import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useStock = () => {
  return useQuery({
    queryKey: ['inventario'],
    queryFn: async () => {
      const { data } = await api.get('/inventario');
      return data;
    },
    refetchInterval: 1000 * 60 * 3
  });
};

export const useStockConsolidado = () => {
  return useQuery({
    queryKey: ['inventario-consolidado'],
    queryFn: async () => {
      const { data } = await api.get('/inventario/consolidado');
      return data;
    }
  });
};

export const useAlertasStock = () => {
  return useQuery({
    queryKey: ['alertas-stock'],
    queryFn: async () => {
      const { data } = await api.get('/inventario/alertas');
      return data;
    },
    refetchInterval: 1000 * 60 * 5
  });
};

export const useMovimientosStock = (productoId?: number, proveedorId?: number) => {
  return useQuery({
    queryKey: ['movimientos-stock', productoId, proveedorId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productoId) params.append('productoId', String(productoId));
      if (proveedorId) params.append('proveedorId', String(proveedorId));
      const { data } = await api.get(`/inventario/movimientos?${params}`);
      return data;
    }
  });
};

export const useSetStockProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productoId, cantidad }: { productoId: number; cantidad: number }) => {
      const { data } = await api.patch(`/inventario/producto/${productoId}`, { cantidad });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-consolidado'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useAjustarStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: { stockId: number; nuevaCantidad: number; motivo: string }) => {
      const { data } = await api.post('/inventario/ajuste', datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-consolidado'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-stock'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    }
  });
};
