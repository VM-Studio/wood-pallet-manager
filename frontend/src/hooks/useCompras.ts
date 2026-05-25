import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Compra } from '../types';

export interface VentaParaCompraDirecta {
  id: number;
  fechaVenta: string;
  estadoPedido: string;
  totalConIva: number | null;
  cliente: { id: number; razonSocial: string; nombreContacto: string | null };
  detalles: {
    id: number;
    cantidadPedida: number;
    producto: { id: number; nombre: string; condicion: string };
  }[];
}

export const useCompra = (id: number) => {
  return useQuery<Compra>({
    queryKey: ['compra', id],
    queryFn: async () => {
      const { data } = await api.get(`/compras/${id}`);
      return data;
    },
    enabled: !!id
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
      queryClient.invalidateQueries({ queryKey: ['inventario-consolidado'] });
    }
  });
};

export const useCompras = () => {
  return useQuery<Compra[]>({
    queryKey: ['compras'],
    queryFn: async () => {
      const { data } = await api.get('/compras');
      return data;
    },
    staleTime: 0
  });
};

export const useDeudaProveedores = () => {
  return useQuery({
    queryKey: ['deuda-proveedores'],
    queryFn: async () => {
      const { data } = await api.get('/compras/deuda-proveedores');
      return data;
    },
    staleTime: 0
  });
};

export const useCrearCompra = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: any) => {
      const { data } = await api.post('/compras', datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-consolidado'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['deuda-proveedores'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['ventas-para-compra-directa'] });
    }
  });
};

export const useRegistrarPagoCompra = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, datos }: { id: number; datos: any }) => {
      const { data } = await api.put(`/compras/${id}/pagar`, datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-consolidado'] });
      queryClient.invalidateQueries({ queryKey: ['deuda-proveedores'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useCancelarCompra = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.put(`/compras/${id}/cancelar`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-consolidado'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['deuda-proveedores'] });
    }
  });
};

export const useRegistrarPagoProveedor = useRegistrarPagoCompra;

export const useVentasParaCompraDirecta = () => {
  return useQuery<VentaParaCompraDirecta[]>({
    queryKey: ['ventas-para-compra-directa'],
    queryFn: async () => {
      const { data } = await api.get('/compras/ventas-para-compra-directa');
      return data;
    },
    staleTime: 0,
  });
};
