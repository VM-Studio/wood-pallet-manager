import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Cliente } from '../types';

export const useClientes = () => {
  return useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await api.get('/clientes');
      return data;
    }
  });
};

export const useCliente = (id: number) => {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const { data } = await api.get(`/clientes/${id}`);
      return data;
    },
    enabled: !!id
  });
};

export const useHistorialCliente = (id: number) => {
  return useQuery({
    queryKey: ['cliente-historial', id],
    queryFn: async () => {
      const { data } = await api.get(`/clientes/${id}/historial`);
      return data;
    },
    enabled: !!id
  });
};

export const useBuscarClientes = (query: string) => {
  return useQuery<Cliente[]>({
    queryKey: ['clientes-buscar', query],
    queryFn: async () => {
      const { data } = await api.get(`/clientes/buscar?q=${query}`);
      return data;
    },
    enabled: query.length >= 2
  });
};

export const useCrearCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: Partial<Cliente>) => {
      const { data } = await api.post('/clientes', datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });
};

export const useActualizarCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, datos }: { id: number; datos: Partial<Cliente> }) => {
      const { data } = await api.put(`/clientes/${id}`, datos);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
    }
  });
};
