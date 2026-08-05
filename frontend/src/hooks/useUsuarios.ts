import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Usuario } from '../types';

export const useUsuarios = () => {
  return useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data } = await api.get('/usuarios');
      return data;
    },
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
