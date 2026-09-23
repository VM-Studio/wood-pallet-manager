import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { invalidarEstadosVenta } from './invalidarEstadosVenta';

// ─── Types ────────────────────────────────────────────────────────────────────
export type EstadoRetiro = 'pendiente' | 'confirmado' | 'parcial' | 'completado' | 'cancelado';

export interface RetiroDetalleVenta {
  id: number;
  cantidadPedida: number;
  retiros?: { id: number; cantidadRetirada: number; fechaRetiro: string }[];
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
  tipoMensaje?: 'codigo' | 'retiro_parcial' | 'cancelacion' | null;
  proveedor?: { id: number; nombreEmpresa: string } | null;
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
  cantidadRetiradaParcial: number;
  fechaUltimoRetiroParcial?: string;
  proveedorId?: number | null;
  proveedor?: { id: number; nombreEmpresa: string; telefono?: string | null; ubicacion?: string | null } | null;
  creadoEn: string;
  venta: {
    id: number;
    clienteId: number;
    estadoPedido?: string;
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

export interface ResultadoRetiroParcial {
  completo: boolean;
  totalPedido: number;
  totalRetirado: number;
  pendiente: number;
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
    onSuccess: () => invalidarEstadosVenta(qc),
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

export const useRegistrarRetiroParcial = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; items: { detalleVentaId: number; cantidad: number }[] }) =>
      api.post<ResultadoRetiroParcial>(`/retiros/${params.id}/retiro-parcial`, { items: params.items }),
    onSuccess: () => {
      invalidarEstadosVenta(qc);
      ['inventario', 'inventario-consolidado', 'alertas-stock', 'movimientos-stock', 'productos']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
};

// ─── Galpones (proveedores) y envío del código por WhatsApp ───────────────────
export interface Galpon {
  id: number;
  nombreEmpresa: string;
  telefono?: string | null;
  ubicacion?: string | null;
}

export const useGalpones = () =>
  useQuery<Galpon[]>({
    queryKey: ['proveedores'],
    queryFn: async () => (await api.get('/proveedores')).data,
  });

export const useEnviarAGalpon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; proveedorId: number; tipoMensaje: 'codigo' | 'retiro_parcial' | 'cancelacion' }) =>
      api.post(`/retiros/${params.id}/enviar-galpon`, {
        proveedorId: params.proveedorId,
        tipoMensaje: params.tipoMensaje,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retiros'] }),
  });
};
