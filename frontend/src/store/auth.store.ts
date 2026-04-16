import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Usuario } from '../types';

interface AuthStore {
  token: string | null;
  usuario: Usuario | null;
  isAuthenticated: boolean;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
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
      }
    }),
    { name: 'wp_auth' }
  )
);
