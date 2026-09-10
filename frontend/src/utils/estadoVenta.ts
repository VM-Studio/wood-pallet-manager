// ── Fuente única de verdad para las etiquetas de estado de una VENTA ──────────
// (venta.estadoPedido). La usan Ventas (columna "Estado"), Logística y Retiros,
// para que las tres pantallas muestren siempre exactamente la misma etiqueta y
// el mismo color, sin importar desde qué módulo se esté mirando la venta.
export const estadoVentaConfig: Record<string, { label: string; clase: string }> = {
  confirmado:        { label: 'Confirmado',       clase: 'badge-blue' },
  en_preparacion:    { label: 'En preparación',   clase: 'badge-yellow' },
  listo_para_envio:  { label: 'Listo para envío', clase: 'badge-blue' },
  en_transito:       { label: 'En tránsito',      clase: 'badge-yellow' },
  entregado:         { label: 'Entregado',        clase: 'badge-green' },
  entregado_parcial: { label: 'Parcial',          clase: 'badge-yellow' },
  cancelado:         { label: 'Cancelado',        clase: 'badge-red' },
};

// Equivalente en hex de cada clase `.badge-*` (definidas en index.css), para los
// componentes que arman el badge con estilos inline en vez de className
// (ej. tarjetas de Logística/Retiros). Así el color es idéntico en todos lados.
const claseAEstilo: Record<string, { bg: string; color: string }> = {
  'badge-blue':   { bg: '#EFF6FF', color: '#1D4ED8' },
  'badge-yellow': { bg: '#FFFBEB', color: '#B45309' },
  'badge-green':  { bg: '#F0FDF4', color: '#15803D' },
  'badge-red':    { bg: '#FEF2F2', color: '#B91C1C' },
  'badge-gray':   { bg: '#F3F4F6', color: '#4B5563' },
};

/** Devuelve label + colores (hex) para el estado de una venta (venta.estadoPedido). */
export const getEstadoVentaStyle = (estado?: string | null): { label: string; bg: string; color: string } => {
  const config = estadoVentaConfig[estado ?? ''] ?? { label: estado ?? '—', clase: 'badge-gray' };
  const estilo = claseAEstilo[config.clase] ?? claseAEstilo['badge-gray'];
  return { label: config.label, bg: estilo.bg, color: estilo.color };
};
