import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { invalidarEstadosVenta } from './invalidarEstadosVenta';
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
      invalidarEstadosVenta(queryClient);
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
    onSuccess: () => {
      invalidarEstadosVenta(queryClient);
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-consolidado'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-stock'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos-stock'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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

// ─── Cancelación de venta (en cascada) ────────────────────────────────────────
export interface CancelacionPreview {
  ventaId: number;
  cliente: string;
  estadoPedido: string;
  puedeCancelar: boolean;
  motivoNoCancelable: string | null;
  impactos: { modulo: string; detalle: string }[];
  advertencias: string[];
  comprasPendientes: { id: number; proveedor: string; total: number }[];
}

export const useCancelacionPreview = (ventaId: number | null) =>
  useQuery<CancelacionPreview>({
    queryKey: ['venta-cancelacion', ventaId],
    queryFn: async () => (await api.get(`/ventas/${ventaId}/cancelacion`)).data,
    enabled: !!ventaId,
    staleTime: 0,
  });

export const useCancelarVenta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { ventaId: number; motivo: string; cancelarCompras?: boolean }) =>
      (await api.post(`/ventas/${params.ventaId}/cancelar`, {
        motivo: params.motivo,
        cancelarCompras: params.cancelarCompras,
      })).data as { stockRestaurado: { producto: string; cantidad: number }[]; comprasCanceladas: number[] },
    // La cancelación toca ventas, facturación, logística, retiros, remitos,
    // compras, inventario, devoluciones, alertas y dashboard: se refresca todo.
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
