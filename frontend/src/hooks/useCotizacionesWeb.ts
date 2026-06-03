import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { CotizacionWeb, ContadorCotizacionesWeb } from '../types';

// ─── Contador para el badge (polling cada 30 s) ───────────────────────────────

export const useContadorCotizacionesWeb = () =>
  useQuery<ContadorCotizacionesWeb>({
    queryKey: ['cotizaciones-web-contador'],
    queryFn: () => api.get('/cotizaciones-web/contador').then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

// ─── Lista completa ───────────────────────────────────────────────────────────

export const useCotizacionesWeb = (estado?: string) =>
  useQuery<CotizacionWeb[]>({
    queryKey: ['cotizaciones-web', estado ?? 'todas'],
    queryFn: () =>
      api.get('/cotizaciones-web', { params: estado && estado !== 'todas' ? { estado } : {} })
        .then(r => r.data),
    staleTime: 10_000,
  });

// ─── Detalle individual ───────────────────────────────────────────────────────

export const useCotizacionWebDetalle = (id: number | null) =>
  useQuery<CotizacionWeb>({
    queryKey: ['cotizacion-web', id],
    queryFn: () => api.get(`/cotizaciones-web/${id}`).then(r => r.data),
    enabled: id !== null,
    staleTime: 5_000,
  });

// ─── Cambiar estado ───────────────────────────────────────────────────────────

export const useCambiarEstadoCotizacionWeb = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: number;
      estado: 'pendiente' | 'vista' | 'convertida' | 'descartada';
      motivoDescarte?: string;
    }) => api.patch(`/cotizaciones-web/${params.id}/estado`, {
      estado: params.estado,
      motivoDescarte: params.motivoDescarte,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cotizaciones-web'] });
      qc.invalidateQueries({ queryKey: ['cotizaciones-web-contador'] });
    },
  });
};

// ─── Convertir a cotización formal ────────────────────────────────────────────

export const useConvertirCotizacionWeb = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: number;
      clienteId?: number;
      nuevoCliente?: {
        razonSocial: string;
        nombreContacto: string;
        emailContacto: string;
        telefonoContacto: string;
        localidad?: string;
      };
      precioUnitario: number;
      costoFlete?: number;
      incluyeFlete: boolean;
    }) => {
      const { id, ...body } = params;
      return api.post(`/cotizaciones-web/${id}/convertir`, body).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cotizaciones-web'] });
      qc.invalidateQueries({ queryKey: ['cotizaciones-web-contador'] });
      qc.invalidateQueries({ queryKey: ['cotizaciones'] });
      qc.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
};
