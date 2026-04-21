import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Compra } from '../types';

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
