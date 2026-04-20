import { create } from 'zustand';

export type TipoVista = 'mis_datos' | 'otro' | 'total';

interface VistaStore {
  vista: TipoVista;
  setVista: (vista: TipoVista) => void;
}

export const useVistaStore = create<VistaStore>((set) => ({
  vista: 'mis_datos',
  setVista: (vista) => set({ vista }),
}));
