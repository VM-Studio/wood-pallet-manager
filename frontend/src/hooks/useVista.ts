import { useVistaStore } from '../store/vista.store';
import { useAuthStore } from '../store/auth.store';

export const useVistaParams = () => {
  const { vista } = useVistaStore();
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';

  const getVistaParam = (): string => {
    switch (vista) {
      case 'mis_datos': return 'mis_datos';
      case 'otro':      return esCarlos ? 'juancruz' : 'carlos';
      case 'total':     return 'todos';
    }
  };

  const getVistaLabel = (): string => {
    switch (vista) {
      case 'mis_datos': return 'Mis datos';
      case 'otro':      return esCarlos ? 'Juan Cruz' : 'Carlos';
      case 'total':     return 'Total';
    }
  };

  return {
    vista,
    vistaParam: getVistaParam(),
    vistaLabel: getVistaLabel(),
  };
};
