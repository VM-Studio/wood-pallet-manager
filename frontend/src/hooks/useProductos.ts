import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Producto } from '../types';

export const useProductos = () => {
  return useQuery<Producto[]>({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data } = await api.get('/productos');
      return data;
    }
  });
};

export const useProductosOtro = () => {
  return useQuery<Producto[]>({
    queryKey: ['productos-otro'],
    queryFn: async () => {
      const { data } = await api.get('/productos/otro');
      return data;
    }
  });
};

export const useProducto = (id: number) => {
  return useQuery({
    queryKey: ['producto', id],
    queryFn: async () => {
      const { data } = await api.get(`/productos/${id}`);
      return data;
    },
    enabled: !!id
  });
};

export const useEscalonesProducto = (id: number) => {
  return useQuery({
    queryKey: ['escalones', id],
    queryFn: async () => {
      const { data } = await api.get(`/productos/${id}/escalones`);
      return data;
    },
    enabled: !!id
  });
};

export const useHistorialPrecios = (id: number) => {
  return useQuery({
    queryKey: ['historial-precios', id],
    queryFn: async () => {
      const { data } = await api.get(`/productos/${id}/historial-precios`);
      return data;
    },
    enabled: !!id
  });
};

export const useListaPrecios = () => {
  return useQuery({
    queryKey: ['lista-precios'],
    queryFn: async () => {
      const { data } = await api.get('/productos/precios/lista');
      return data;
    }
  });
};

export const useCrearProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: Partial<Producto>) => {
      const { data } = await api.post('/productos', datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    }
  });
};

export const useActualizarProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, datos }: { id: number; datos: Partial<Producto> }) => {
      const { data } = await api.put(`/productos/${id}`, datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    }
  });
};

export const useCrearPrecio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: {
      productoId: number;
      cantMinima: number;
      cantMaxima?: number;
      precioUnitario: number;
      bonificaFlete: boolean;
      observaciones?: string;
    }) => {
      const { data } = await api.post('/productos/precios', datos);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lista-precios'] });
      queryClient.invalidateQueries({ queryKey: ['escalones', variables.productoId] });
      queryClient.invalidateQueries({ queryKey: ['historial-precios', variables.productoId] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['productos-otro'] });
    }
  });
};

export const useActualizarPrecioProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: { productoId: number; proveedorId: number; nuevoPrecioCosto: number }) => {
      const { data } = await api.put('/productos/precios/proveedor', datos);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['lista-precios'] });
    }
  });
};

export const useEliminarProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/productos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    }
  });
};
