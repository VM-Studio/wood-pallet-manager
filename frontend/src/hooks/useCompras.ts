import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Compra } from '../types';

export const useCompras = () => {
  return useQuery<Compra[]>({
    queryKey: ['compras'],
    queryFn: async () => {
      const { data } = await api.get('/compras');
      return data;
    }
  });
};

export const useCompra = (id: number) => {
  return useQuery({
    queryKey: ['compra', id],
    queryFn: async () => {
      const { data } = await api.get(`/compras/${id}`);
      return data;
    },
    enabled: !!id
  });
};

export const useDeudaProveedores = () => {
  return useQuery({
    queryKey: ['deuda-proveedores'],
    queryFn: async () => {
      const { data } = await api.get('/compras/deuda-proveedores');
      return data;
    }
  });
};

interface NuevaCompraInput {
  proveedorId: number;
  esAnticipado: boolean;
  nroRemito?: string;
  observaciones?: string;
  detalles: { productoId: number; cantidad: number; precioCostoUnit: number }[];
}

export const useCrearCompra = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: NuevaCompraInput) => {
      const { data } = await api.post('/compras', datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['deuda-proveedores'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
    }
  });
};

export const useActualizarEstadoCompra = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: string }) => {
      const { data } = await api.put(`/compras/${id}/estado`, { estado });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

interface PagoProveedorInput {
  monto: number;
  medioPago: string;
  nroComprobante?: string;
}

export const useRegistrarPagoProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, datos }: { id: number; datos: PagoProveedorInput }) => {
      const { data } = await api.post(`/compras/${id}/pago`, datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['deuda-proveedores'] });
    }
  });
};
