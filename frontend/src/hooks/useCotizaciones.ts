import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Cotizacion } from '../types';

export const useCotizaciones = () => {
  return useQuery<Cotizacion[]>({
    queryKey: ['cotizaciones'],
    queryFn: async () => {
      const { data } = await api.get('/cotizaciones');
      return data;
    }
  });
};

export const useCotizacion = (id: number) => {
  return useQuery({
    queryKey: ['cotizacion', id],
    queryFn: async () => {
      const { data } = await api.get(`/cotizaciones/${id}`);
      return data;
    },
    enabled: !!id
  });
};

export const useCotizacionesPendientes = () => {
  return useQuery({
    queryKey: ['cotizaciones-pendientes'],
    queryFn: async () => {
      const { data } = await api.get('/cotizaciones/pendientes-seguimiento');
      return data;
    }
  });
};

export const useTextoWhatsApp = (id: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['cotizacion-whatsapp', id],
    queryFn: async () => {
      const { data } = await api.get(`/cotizaciones/${id}/whatsapp`);
      return data;
    },
    enabled: enabled && !!id
  });
};

export const useCrearCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: any) => {
      const { data } = await api.post('/cotizaciones', datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useActualizarEstadoCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: string }) => {
      const { data } = await api.put(`/cotizaciones/${id}/estado`, { estado });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
    }
  });
};

export const useRegistrarSeguimiento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, datos }: { id: number; datos: any }) => {
      const { data } = await api.post(`/cotizaciones/${id}/seguimiento`, datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
    }
  });
};

export const useConvertirAVenta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, datos }: { id: number; datos: any }) => {
      const { data } = await api.post(`/cotizaciones/${id}/convertir`, datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['facturas-vencidas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useEliminarCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/cotizaciones/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};
