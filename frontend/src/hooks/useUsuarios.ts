import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Usuario, UsuarioParaVista } from '../types';

export const useUsuarios = () => {
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data } = await api.get('/usuarios');
      return data;
    },
    // Refresco frecuente para que Carlos vea "En línea" / última conexión siempre actualizados
    refetchInterval: 15_000,
  });
};

// Usuarios aprobados/activos disponibles para el selector "Otro" del
// dashboard, filtrados por si tienen habilitado el módulo indicado.
export const useUsuariosParaVista = (modulo: string = 'dashboard') => {
  return useQuery<UsuarioParaVista[]>({
    queryKey: ['usuarios-para-vista', modulo],
    queryFn: async () => {
      const { data } = await api.get(`/usuarios/para-vista?modulo=${modulo}`);
      return data;
    },
    staleTime: 1000 * 60,
  });
};

export const useAprobarUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rol, modulosPermitidos }: {
      id: number;
      rol: 'propietario_carlos' | 'propietario_juancruz' | 'admin';
      modulosPermitidos: string[];
    }) => {
      const { data } = await api.put(`/usuarios/${id}/aprobar`, { rol, modulosPermitidos });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
};

export const useRechazarUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo?: string }) => {
      const { data } = await api.put(`/usuarios/${id}/rechazar`, { motivo });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
};

export const useActualizarAccesoUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, modulosPermitidos }: { id: number; modulosPermitidos: string[] }) => {
      const { data } = await api.put(`/usuarios/${id}/acceso`, { modulosPermitidos });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
};

export const useCambiarEstadoActivoUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      const { data } = await api.put(`/usuarios/${id}/estado`, { activo });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
};
