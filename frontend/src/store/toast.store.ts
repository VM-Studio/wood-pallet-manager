import { create } from 'zustand';

interface ToastState {
  message: string | null;
  submessage?: string;
  show: (message: string, submessage?: string) => void;
  hide: () => void;
}

// Store global y minimalista para mostrar un mensaje de éxito ("toast") de
// forma confiable en toda la app. Reemplaza el uso de `alert()`, que en
// PWA instaladas en el celular (standalone / iOS) puede no mostrarse o
// comportarse de forma inconsistente.
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  submessage: undefined,
  show: (message, submessage) => set({ message, submessage }),
  hide: () => set({ message: null, submessage: undefined }),
}));
