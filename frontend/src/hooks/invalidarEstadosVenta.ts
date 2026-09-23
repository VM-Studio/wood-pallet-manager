import type { QueryClient } from '@tanstack/react-query';

// El estado de una venta (venta.estadoPedido) se muestra en Ventas, Logística y
// Retiros. Cualquier mutación que lo cambie refresca las tres pantallas.
export const invalidarEstadosVenta = (qc: QueryClient) => {
  [
    ['ventas'], ['venta'], ['ventas-activas'],
    ['retiros'], ['retiro'], ['retiros-stats'],
    ['logisticas'], ['logistica-por-rol'], ['logistica-venta'], ['entregas-hoy'], ['logisticas-aceptadas'],
    ['dashboard'],
  ].forEach((queryKey) => qc.invalidateQueries({ queryKey }));
};
