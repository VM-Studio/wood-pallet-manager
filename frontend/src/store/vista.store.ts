import { create } from 'zustand';

export type TipoVista = 'mis_datos' | 'otro' | 'total';

interface VistaStore {
  vista: TipoVista;
  setVista: (vista: TipoVista) => void;
  // Usuario elegido dinámicamente cuando vista === 'otro' (reemplaza el
  // viejo hardcodeo a "el otro propietario": ahora puede ser cualquier
  // usuario aprobado con el módulo habilitado).
  otroUsuarioId: number | null;
  otroUsuarioNombre: string | null;
  setOtroUsuario: (id: number | null, nombre: string | null) => void;
}

export const useVistaStore = create<VistaStore>((set) => ({
  vista: 'mis_datos',
  setVista: (vista) => set({ vista }),
  otroUsuarioId: null,
  otroUsuarioNombre: null,
  setOtroUsuario: (otroUsuarioId, otroUsuarioNombre) => set({ otroUsuarioId, otroUsuarioNombre }),
}));
