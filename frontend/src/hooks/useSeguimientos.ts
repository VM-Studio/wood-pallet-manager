import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type SegmentoTipo =
  | 'todos'
  | 'con_cotizacion_pendiente'
  | 'sin_compras_recientes'
  | 'clientes_frecuentes'
  | 'deudores'
  | 'manual';

export interface BloqueEmail {
  tipo: 'header' | 'texto' | 'imagen' | 'boton' | 'footer';
  contenido?: string;
  url?: string;
  textoBoton?: string;
  colorFondo?: string;
}

export interface PlantillaEmail {
  id: number;
  nombre: string;
  asunto: string;
  bloques: BloqueEmail[];
  activa: boolean;
  creadaEn: string;
}

export interface CampanaSeguimiento {
  id: number;
  nombre: string;
  asunto: string;
  segmento: string;
  estado: string;
  totalDestinatarios: number;
  enviadaEn: string;
  enviadoPor: { nombre: string; apellido: string };
  destinatarios?: DestinatarioCampana[];
}

export interface DestinatarioCampana {
  id: number;
  email: string;
  enviado: boolean;
  error: string | null;
  enviadoEn: string | null;
  cliente: { id: number; razonSocial: string };
}

export interface ReglaAutomatizacion {
  id: number;
  nombre: string;
  activa: boolean;
  evento: string;
  diasCondicion: number | null;
  asunto: string;
  plantilla: { id: number; nombre: string } | null;
  creadaEn: string;
}

export interface PreviewSegmento {
  total: number;
  preview: { id: number; razonSocial: string; email: string | null }[];
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function usePlantillas() {
  return useQuery<PlantillaEmail[]>({
    queryKey: ['plantillas-email'],
    queryFn: async () => {
      const { data } = await api.get('/seguimientos/plantillas');
      return data;
    },
  });
}

export function useHistorialCampanas() {
  return useQuery<CampanaSeguimiento[]>({
    queryKey: ['campanas-seguimiento'],
    queryFn: async () => {
      const { data } = await api.get('/seguimientos/campanas');
      return data;
    },
  });
}

export function useDetalleCampana(id: number | null) {
  return useQuery<CampanaSeguimiento>({
    queryKey: ['campana-detalle', id],
    queryFn: async () => {
      const { data } = await api.get(`/seguimientos/campanas/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useReglas() {
  return useQuery<ReglaAutomatizacion[]>({
    queryKey: ['reglas-automatizacion'],
    queryFn: async () => {
      const { data } = await api.get('/seguimientos/reglas');
      return data;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function usePreviewSegmento() {
  return useMutation<PreviewSegmento, Error, { segmento: SegmentoTipo; diasCondicion?: number; clienteIds?: number[] }>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/seguimientos/segmento/preview', payload);
      return data;
    },
  });
}

export function useEnviarCampana() {
  const qc = useQueryClient();
  return useMutation<void, Error, {
    nombre: string;
    asunto: string;
    segmento: SegmentoTipo;
    diasCondicion?: number;
    clienteIds?: number[];
    bloques: BloqueEmail[];
    plantillaId?: number;
  }>({
    mutationFn: async (payload) => {
      await api.post('/seguimientos/campanas', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campanas-seguimiento'] });
    },
  });
}

export function useCrearPlantilla() {
  const qc = useQueryClient();
  return useMutation<PlantillaEmail, Error, { nombre: string; asunto: string; bloques: BloqueEmail[] }>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/seguimientos/plantillas', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plantillas-email'] }),
  });
}

export function useActualizarPlantilla() {
  const qc = useQueryClient();
  return useMutation<PlantillaEmail, Error, { id: number; nombre: string; asunto: string; bloques: BloqueEmail[] }>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/seguimientos/plantillas/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plantillas-email'] }),
  });
}

export function useEliminarPlantilla() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/seguimientos/plantillas/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plantillas-email'] }),
  });
}

export function useCrearRegla() {
  const qc = useQueryClient();
  return useMutation<ReglaAutomatizacion, Error, {
    nombre: string;
    evento: string;
    diasCondicion?: number;
    plantillaId?: number;
    asunto: string;
  }>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/seguimientos/reglas', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reglas-automatizacion'] }),
  });
}

export function useToggleRegla() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.put(`/seguimientos/reglas/${id}/toggle`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reglas-automatizacion'] }),
  });
}

export function useEliminarRegla() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/seguimientos/reglas/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reglas-automatizacion'] }),
  });
}
