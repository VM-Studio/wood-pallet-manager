import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────

export interface DetalleVentaRemito {
  id: number;
  cantidadPedida: number;
  precioUnitario: string | number;
  subtotal: string | number;
  producto: { id: number; nombre: string; tipo: string };
}

export interface RemitoCliente {
  id: number;
  razonSocial: string;
  emailContacto: string | null;
  nombreContacto: string | null;
  cuit: string | null;
  direccionEntrega: string | null;
  localidad: string | null;
}

export interface Remito {
  id: number;
  numeroRemito: string | null;
  ventaId: number;
  clienteId: number;
  usuarioId: number;
  fechaEmision: string;
  fechaEntrega: string | null;
  estado: 'pendiente_firma_propietario' | 'enviado_a_cliente' | 'firmado_por_cliente' | 'completado' | 'cancelado';
  firmaPropietario: string | null;
  fechaFirmaPropietario: string | null;
  firmaCliente: string | null;
  fechaFirmaCliente: string | null;
  tokenFirma: string;
  emailEnviado: boolean;
  fechaEmailEnviado: string | null;
  observaciones: string | null;
  cliente: RemitoCliente;
  usuario: { id: number; nombre: string; apellido: string; rol: string };
  venta: {
    id: number;
    totalConIva: string | number | null;
    totalSinIva: string | number | null;
    costoFlete: string | number | null;
    estadoPedido: string;
    metodoPago: string | null;
    detalles: DetalleVentaRemito[];
    facturas: { id: number; nroFactura: string | null; estadoCobro: string }[];
  };
}

export interface CrearRemitoPayload {
  ventaId: number;
  firmaPropietario?: string;
  fechaEntrega?: string;
  observaciones?: string;
}

// ─── Hooks ────────────────────────────────────────────────

export const useRemitos = () =>
  useQuery<Remito[]>({
    queryKey: ['remitos'],
    queryFn: () => api.get('/remitos').then(r => r.data),
  });

export const useRemito = (id: number) =>
  useQuery<Remito>({
    queryKey: ['remitos', id],
    queryFn: () => api.get(`/remitos/${id}`).then(r => r.data),
    enabled: !!id,
  });

export const useRemitoPublico = (token: string) =>
  useQuery<Remito>({
    queryKey: ['remito-publico', token],
    queryFn: () => api.get(`/remitos/publico/${token}`).then(r => r.data),
    enabled: !!token,
  });

export const useCrearRemito = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: CrearRemitoPayload) => api.post('/remitos', datos).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remitos'] }); },
  });
};

export const useFirmarPropietario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, firma }: { id: number; firma: string }) =>
      api.put(`/remitos/${id}/firmar-propietario`, { firma }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remitos'] }); },
  });
};

export const useEnviarRemito = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/remitos/${id}/enviar`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remitos'] }); },
  });
};

export const useActualizarNumeroRemito = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, numeroRemito }: { id: number; numeroRemito: string }) =>
      api.put(`/remitos/${id}/numero`, { numeroRemito }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remitos'] }); },
  });
};

export const useCancelarRemito = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/remitos/${id}/cancelar`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remitos'] }); },
  });
};

export const useFirmarClientePublico = () =>
  useMutation({
    mutationFn: ({ token, firmaCliente }: { token: string; firmaCliente: string }) =>
      api.post(`/remitos/publico/${token}/firmar`, { firmaCliente }).then(r => r.data),
  });
