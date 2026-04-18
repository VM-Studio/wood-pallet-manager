import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Factura } from '../types';

interface NuevaFacturaInput {
  ventaId: number;
  nroFactura?: string;
  esSinFactura: boolean;
  fechaVencimiento?: string;
  totalNeto: number;
  iva: number;
  totalConIva: number;
  observaciones?: string;
}

interface CobroInput {
  monto: number;
  medioPago: string;
  nroComprobante?: string;
  esAdelanto: boolean;
  observaciones?: string;
}

export const useFacturas = () => {
  return useQuery<Factura[]>({
    queryKey: ['facturas'],
    queryFn: async () => {
      const { data } = await api.get('/facturas');
      return data;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useFactura = (id: number) => {
  return useQuery<Factura>({
    queryKey: ['factura', id],
    queryFn: async () => {
      const { data } = await api.get(`/facturas/${id}`);
      return data;
    },
    enabled: !!id
  });
};

export const useFacturasVencidas = () => {
  return useQuery<Factura[]>({
    queryKey: ['facturas-vencidas'],
    queryFn: async () => {
      const { data } = await api.get('/facturas/vencidas');
      return data;
    },
    refetchInterval: 1000 * 60 * 5
  });
};

export const useCobrosPendientes = () => {
  return useQuery<Factura[]>({
    queryKey: ['cobros-pendientes'],
    queryFn: async () => {
      const { data } = await api.get('/facturas/cobros-pendientes');
      return data;
    }
  });
};

export const useCrearFactura = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: NuevaFacturaInput) => {
      const { data } = await api.post('/facturas', datos);
      return data as Factura;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useRegistrarCobro = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, datos }: { id: number; datos: CobroInput }) => {
      const { data } = await api.post(`/facturas/${id}/cobro`, datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      queryClient.invalidateQueries({ queryKey: ['facturas-vencidas'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useCrearNotaCredito = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: { facturaId: number; monto: number; motivo?: string }) => {
      const { data } = await api.post('/facturas/nota-credito', datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
    }
  });
};

export const useActualizarNroFactura = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nroFactura }: { id: number; nroFactura: string }) => {
      const { data } = await api.patch(`/facturas/${id}/nro-factura`, { nroFactura });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
    }
  });
};
