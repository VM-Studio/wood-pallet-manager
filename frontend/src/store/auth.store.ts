import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Usuario } from '../types';

interface AuthStore {
  token: string | null;
  usuario: Usuario | null;
  isAuthenticated: boolean;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
  setUsuario: (usuario: Usuario) => void;
  patchUsuario: (patch: Partial<Usuario>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      isAuthenticated: false,
      login: (token, usuario) => {
        localStorage.setItem('wp_token', token);
        set({ token, usuario, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('wp_token');
        localStorage.removeItem('wp_usuario');
        set({ token: null, usuario: null, isAuthenticated: false });
      },
      setUsuario: (usuario) => set({ usuario }),
      // Actualiza solo los campos recibidos sin pisar los demás (ej: foto sin pisar firma)
      patchUsuario: (patch) => {
        const current = get().usuario;
        if (!current) return;
        set({ usuario: { ...current, ...patch } });
      },
    }),
    { name: 'wp_auth' }
  )
);
