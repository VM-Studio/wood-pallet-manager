import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export type EstadoRetiro = 'pendiente' | 'confirmado' | 'completado' | 'cancelado';

export interface RetiroDetalleVenta {
  id: number;
  cantidadPedida: number;
  producto: { id: number; nombre: string; tipo: string; condicion: string };
}

export interface RetiroRemito {
  id: number;
  numeroRemito?: string;
  fechaEmision: string;
  estado: string;
  fechaFirmaCliente?: string;
}

export interface HistorialReenvio {
  id: number;
  emailEnviado?: string;
  telefonoEnviado?: string;
  creadoEn: string;
  enviadoPor: { id: number; nombre: string; apellido: string };
}

export interface RetiroRow {
  id: number;
  codigoRetiro: string;
  estadoRetiro: EstadoRetiro;
  galpon?: string;
  horaEstimadaRetiro?: string;
  confirmadoPorId?: number;
  fechaConfirmacion?: string;
  observacionesConf?: string;
  motivoCancelacion?: string;
  creadoEn: string;
  venta: {
    id: number;
    clienteId: number;
    fechaRetiro?: string;
    tipoEntrega: string;
    origenStock?: string;
    metodoPago?: string;
    modalidadPago?: string;
    observaciones?: string;
    totalConIva?: number;
    totalSinIva?: number;
    cliente: {
      id: number;
      razonSocial: string;
      nombreContacto?: string;
      telefonoContacto?: string;
      emailContacto?: string;
    };
    usuario: { id: number; nombre: string; apellido: string; rol: string };
    detalles: RetiroDetalleVenta[];
    remito?: RetiroRemito;
  };
  confirmadoPor?: { id: number; nombre: string; apellido: string };
  historialReenvios: HistorialReenvio[];
}

export interface StatsRetiros {
  pendientesHoy: number;
  pendientesSemana: number;
  completadosMes: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export const useRetiros = () =>
  useQuery<RetiroRow[]>({
    queryKey: ['retiros'],
    queryFn: () => api.get('/retiros').then(r => r.data),
    staleTime: 0,
  });

export const useRetiroById = (id: number | null) =>
  useQuery<RetiroRow>({
    queryKey: ['retiro', id],
    queryFn: () => api.get(`/retiros/${id}`).then(r => r.data),
    enabled: !!id,
  });

export const useStatsRetiros = () =>
  useQuery<StatsRetiros>({
    queryKey: ['retiros-stats'],
    queryFn: () => api.get('/retiros/stats').then(r => r.data),
    staleTime: 0,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────
export const useCambiarEstadoRetiro = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: number;
      estado: EstadoRetiro;
      observaciones?: string;
      motivoCancelacion?: string;
    }) => api.put(`/retiros/${params.id}/estado`, {
      estado: params.estado,
      observaciones: params.observaciones,
      motivoCancelacion: params.motivoCancelacion,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retiros'] });
      qc.invalidateQueries({ queryKey: ['retiros-stats'] });
      qc.invalidateQueries({ queryKey: ['ventas'] });
    },
  });
};

export const useReenviarCodigoRetiro = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; email?: string; telefono?: string }) =>
      api.post(`/retiros/${params.id}/reenviar-codigo`, {
        email: params.email,
        telefono: params.telefono,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retiros'] });
    },
  });
};
