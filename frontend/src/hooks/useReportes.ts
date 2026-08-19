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
      const params = new URLSearchParams({ desde, hasta, vista: 'todos' });
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

interface GananciasDetalle {
  cantidadVentas: number;
  facturadoMes: number;
  cobradoMes: number;
  comprasStockPropio: number;
  comprasReventa: number;
  totalCompras: number;
  gananciaNeta: number;
}

export const useGananciasDetalle = (desde: string, hasta: string, vista: string = 'todos') => {
  return useQuery<GananciasDetalle>({
    queryKey: ['ganancias-detalle', desde, hasta, vista],
    queryFn: async () => {
      const params = new URLSearchParams({ vista });
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      const { data } = await api.get(`/reportes/ganancias-detalle?${params}`);
      return data;
    },
    enabled: !!desde && !!hasta
  });
};

export const useEstacionalidad = () => {
  return useQuery<EstacionalidadMes[]>({
    queryKey: ['estacionalidad'],
    queryFn: async () => {
      const { data } = await api.get('/reportes/estacionalidad?vista=todos');
      return data;
    }
  });
};

// Meses (YYYY-MM) que tienen al menos una venta registrada, del más
// reciente al más antiguo. Alimenta el selector de "mes" del reporte PDF
// para que solo se puedan elegir períodos con datos reales.
export const useMesesConDatos = () => {
  return useQuery<string[]>({
    queryKey: ['meses-con-datos'],
    queryFn: async () => {
      const { data } = await api.get('/reportes/meses-con-datos');
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Descarga el PDF del reporte de ventas para el rango dado. El archivo se
 * genera on-demand en el backend (nunca se persiste) y se descarga directo
 * al navegador vía blob, sin abrir ninguna pestaña extra.
 */
export const descargarReportePdf = async (desde: string, hasta: string) => {
  let response;
  try {
    response = await api.get(`/reportes/pdf?desde=${desde}&hasta=${hasta}`, {
      responseType: 'blob',
    });
  } catch (err) {
    // Errores 400/500: axios los rechaza igual pidiendo responseType 'blob',
    // así que el body de error llega como Blob en vez de JSON parseado —
    // lo leemos manualmente para mostrar el mensaje real del backend.
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    if (data instanceof Blob) {
      try {
        const texto = await data.text();
        const parsed = JSON.parse(texto);
        throw new Error(parsed.error || 'No se pudo generar el reporte PDF.');
      } catch {
        throw new Error('No se pudo generar el reporte PDF.');
      }
    }
    throw err;
  }

  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `reporte_${desde}_${hasta}.pdf`;

  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};
