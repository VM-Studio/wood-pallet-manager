import api from './api';

export interface CotizacionWeb {
  id: number;
  nombre: string;
  empresa?: string;
  email: string;
  telefono?: string;
  tipoPallet?: string;
  cantidad?: number;
  fechaNecesidad?: string;
  tipoEntrega?: string;       // 'retira' | 'envio'
  localidadEntrega?: string;
  requiereSenasa: boolean;
  observaciones?: string;
  estado: 'pendiente' | 'vista' | 'convertida' | 'descartada';
  motivoDescarte?: string;
  ipOrigen?: string;
  creadoEn: string;
  actualizadoEn: string;
  propietarioAsignado?: { id: number; nombre: string; apellido: string; rol: string } | null;
  cotizacion?: { id: number; estado: string; totalConIva: number; fechaCotizacion?: string } | null;
}

export interface ContadorWeb {
  pendientes: number;
  vistas: number;
  total: number;
}

export const getCotizacionesWeb = async (estado?: string): Promise<CotizacionWeb[]> => {
  const params = estado && estado !== 'todas' ? `?estado=${estado}` : '';
  const { data } = await api.get(`/cotizaciones-web${params}`);
  return data;
};

export const getCotizacionWebById = async (id: number): Promise<CotizacionWeb> => {
  const { data } = await api.get(`/cotizaciones-web/${id}`);
  return data;
};

export const getContadorCotizacionesWeb = async (): Promise<ContadorWeb> => {
  const { data } = await api.get('/cotizaciones-web/contador');
  return data;
};

export const cambiarEstadoCotizacionWeb = async (
  id: number,
  estado: 'pendiente' | 'vista' | 'convertida' | 'descartada',
  extra?: { motivoDescarte?: string }
): Promise<CotizacionWeb> => {
  const { data } = await api.patch(`/cotizaciones-web/${id}/estado`, { estado, ...extra });
  return data;
};

export const convertirCotizacionWeb = async (
  id: number,
  payload: {
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
  }
) => {
  const { data } = await api.post(`/cotizaciones-web/${id}/convertir`, payload);
  return data;
};
