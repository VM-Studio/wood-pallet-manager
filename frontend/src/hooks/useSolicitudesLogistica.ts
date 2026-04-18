import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { SolicitudLogistica } from '../types';

export function useSolicitudesLogistica() {
  return useQuery<SolicitudLogistica[]>({
    queryKey: ['solicitudes-logistica'],
    queryFn: async () => {
      const { data } = await api.get('/solicitudes-logistica');
      return data;
    },
  });
}

export function useCrearSolicitudLogistica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: {
      ventaId?: number;
      fechaEntrega?: string;
      cantidadUnidades?: number;
      ubicacionEntrega?: string;
      notas?: string;
    }) => {
      const { data } = await api.post('/solicitudes-logistica', datos);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-logistica'] });
    },
  });
}

export function useResponderSolicitudLogistica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      estado,
      notasRespuesta,
    }: {
      id: number;
      estado: 'aceptada' | 'rechazada';
      notasRespuesta?: string;
    }) => {
      const { data } = await api.put(`/solicitudes-logistica/${id}/responder`, {
        estado,
        notasRespuesta,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-logistica'] });
    },
  });
}
