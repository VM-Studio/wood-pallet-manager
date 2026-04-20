import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { DashboardData, AlertasResponse } from '../types';
import { useVistaStore } from '../store/vista.store';
import { useVistaParams } from './useVista';

export const useDashboard = () => {
  const { vista } = useVistaStore();
  const { vistaParam } = useVistaParams();

  return useQuery<DashboardData>({
    queryKey: ['dashboard', vista],
    queryFn: async () => {
      const { data } = await api.get(`/reportes/dashboard?vista=${vistaParam}`);
      return data;
    },
    staleTime: 0,
    refetchInterval: 1000 * 60 * 5,
    gcTime: 0,
  });
};

export const useAlertas = () => {
  return useQuery<AlertasResponse>({
    queryKey: ['alertas'],
    queryFn: async () => {
      const { data } = await api.get('/alertas');
      return data;
    },
    staleTime: 0,
    refetchInterval: 1000 * 60 * 2,
  });
};
