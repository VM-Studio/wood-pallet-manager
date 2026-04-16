import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { DashboardData, AlertasResponse } from '../types';

export const useDashboard = () => {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/reportes/dashboard');
      return data;
    },
    refetchInterval: 1000 * 60 * 5
  });
};

export const useAlertas = () => {
  return useQuery<AlertasResponse>({
    queryKey: ['alertas'],
    queryFn: async () => {
      const { data } = await api.get('/alertas');
      return data;
    },
    refetchInterval: 1000 * 60 * 2
  });
};
