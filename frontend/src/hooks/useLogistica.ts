import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Logistica } from '../types';

interface NuevaLogisticaInput {
  ventaId: number;
  nombreTransportista?: string;
  telefonoTransp?: string;
  fechaRetiroGalpon?: string;
  horaRetiro?: string;
  horaEstimadaEntrega?: string;
  costoFlete?: number;
  observaciones?: string;
}

export const useLogisticas = () => {
  return useQuery({
    queryKey: ['logisticas'],
    queryFn: async () => {
      const { data } = await api.get('/logistica');
      return data as Logistica[];
    },
    refetchInterval: 1000 * 60 * 2
  });
};

export const useEntregasHoy = () => {
  return useQuery({
    queryKey: ['entregas-hoy'],
    queryFn: async () => {
      const { data } = await api.get('/logistica/entregas-hoy');
      return data as Logistica[];
    },
    refetchInterval: 1000 * 60 * 2
  });
};

export const useLogisticaByVenta = (ventaId: number) => {
  return useQuery({
    queryKey: ['logistica-venta', ventaId],
    queryFn: async () => {
      const { data } = await api.get(`/logistica/venta/${ventaId}`);
      return data as Logistica;
    },
    enabled: !!ventaId
  });
};

export const useCrearLogistica = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: NuevaLogisticaInput) => {
      const { data } = await api.post('/logistica', datos);
      return data as Logistica;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logisticas'] });
      queryClient.invalidateQueries({ queryKey: ['entregas-hoy'] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useActualizarEstadoEntrega = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ventaId, estado }: { ventaId: number; estado: string }) => {
      const { data } = await api.put(`/logistica/venta/${ventaId}/estado`, { estado });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logisticas'] });
      queryClient.invalidateQueries({ queryKey: ['entregas-hoy'] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useConfirmarEntregaCliente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ventaId: number) => {
      const { data } = await api.put(`/logistica/venta/${ventaId}/confirmar-cliente`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logisticas'] });
      queryClient.invalidateQueries({ queryKey: ['entregas-hoy'] });
    }
  });
};

export const useLogisticasPorRol = () => {
  return useQuery({
    queryKey: ['logistica-por-rol'],
    queryFn: async () => {
      const { data } = await api.get('/logistica/por-rol');
      return data as Logistica[];
    },
    refetchInterval: 1000 * 60 * 2
  });
};

export const useConsultarLogistica = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ventaId: number) => {
      const { data } = await api.put(`/logistica/venta/${ventaId}/consultar`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistica-por-rol'] });
      queryClient.invalidateQueries({ queryKey: ['logisticas'] });
    }
  });
};

export const useResponderConsultaLogistica = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ventaId, respuesta, datos }: {
      ventaId: number;
      respuesta: 'aceptada' | 'rechazada';
      datos?: Record<string, unknown>;
    }) => {
      const { data } = await api.put(`/logistica/venta/${ventaId}/responder-consulta`, { respuesta, ...datos });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistica-por-rol'] });
      queryClient.invalidateQueries({ queryKey: ['logisticas'] });
    }
  });
};

export const useConfirmarLogisticaCarlos = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ventaId, datos }: { ventaId: number; datos?: Record<string, unknown> }) => {
      const { data } = await api.put(`/logistica/venta/${ventaId}/confirmar-carlos`, datos ?? {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistica-por-rol'] });
      queryClient.invalidateQueries({ queryKey: ['logisticas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};
