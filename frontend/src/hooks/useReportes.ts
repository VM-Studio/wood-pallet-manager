import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface ReporteVentas {
  resumen: {
    totalVentas: number;
    totalPallets: number;
    totalFacturado: number;
    pendienteCobro: number;
  };
  porPropietario: Record<string, { pallets: number; facturacion: number }>;
  porTipoPallet: Record<string, number>;
  ventas: unknown[];
}

interface ReporteCobranzas {
  resumen: {
    totalEmitido: number;
    totalCobrado: number;
    pendienteCobro: number;
    tasaCobranza: number;
  };
  porEstado: Record<string, number>;
}

interface TopCliente {
  id: number;
  razonSocial: string;
  localidad?: string;
  totalPallets: number;
  totalFacturado: number;
  totalVentas: number;
}

interface EstacionalidadMes {
  mes: string;
  ventas: number;
  pallets: number;
  facturacion: number;
}

export const useReporteVentas = (desde: string, hasta: string, usuarioId?: number) => {
  return useQuery<ReporteVentas>({
    queryKey: ['reporte-ventas', desde, hasta, usuarioId],
    queryFn: async () => {
      const params = new URLSearchParams({ desde, hasta });
      if (usuarioId) params.append('usuarioId', String(usuarioId));
      const { data } = await api.get(`/reportes/ventas?${params}`);
      return data;
    },
    enabled: !!desde && !!hasta
  });
};

export const useReporteCobranzas = (desde: string, hasta: string) => {
  return useQuery<ReporteCobranzas>({
    queryKey: ['reporte-cobranzas', desde, hasta],
    queryFn: async () => {
      const { data } = await api.get(`/reportes/cobranzas?desde=${desde}&hasta=${hasta}`);
      return data;
    },
    enabled: !!desde && !!hasta
  });
};

export const useTopClientes = (limite: number = 10) => {
  return useQuery<TopCliente[]>({
    queryKey: ['top-clientes', limite],
    queryFn: async () => {
      const { data } = await api.get(`/reportes/top-clientes?limite=${limite}`);
      return data;
    }
  });
};

export const useEstacionalidad = () => {
  return useQuery<EstacionalidadMes[]>({
    queryKey: ['estacionalidad'],
    queryFn: async () => {
      const { data } = await api.get('/reportes/estacionalidad');
      return data;
    }
  });
};
