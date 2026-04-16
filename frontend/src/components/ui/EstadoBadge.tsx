const estadoConfig: Record<string, { label: string; clase: string }> = {
  // Cotizaciones
  enviada:           { label: 'Enviada',          clase: 'badge-blue' },
  en_seguimiento:    { label: 'En seguimiento',   clase: 'badge-yellow' },
  aceptada:          { label: 'Aceptada',         clase: 'badge-green' },
  rechazada:         { label: 'Rechazada',        clase: 'badge-red' },
  perdida:           { label: 'Perdida',          clase: 'badge-gray' },
  vencida:           { label: 'Vencida',          clase: 'badge-red' },
  // Ventas
  confirmado:        { label: 'Confirmado',       clase: 'badge-blue' },
  en_preparacion:    { label: 'En preparación',   clase: 'badge-yellow' },
  listo_para_envio:  { label: 'Listo para envío', clase: 'badge-blue' },
  en_transito:       { label: 'En tránsito',      clase: 'badge-yellow' },
  entregado:         { label: 'Entregado',        clase: 'badge-green' },
  entregado_parcial: { label: 'Parcial',          clase: 'badge-yellow' },
  cancelado:         { label: 'Cancelado',        clase: 'badge-red' },
  // Compras
  solicitada:        { label: 'Solicitada',       clase: 'badge-blue' },
  confirmada:        { label: 'Confirmada',       clase: 'badge-yellow' },
  recibida:          { label: 'Recibida',         clase: 'badge-green' },
  pagada:            { label: 'Pagada',           clase: 'badge-green' },
  // Cobros
  pendiente:         { label: 'Pendiente',        clase: 'badge-yellow' },
  cobrada_parcial:   { label: 'Cobro parcial',    clase: 'badge-yellow' },
  cobrada_total:     { label: 'Cobrada',          clase: 'badge-green' },
  incobrable:        { label: 'Incobrable',       clase: 'badge-red' },
  // Logística
  en_camino:         { label: 'En camino',        clase: 'badge-blue' },
  con_problema:      { label: 'Con problema',     clase: 'badge-red' },
};

interface EstadoBadgeProps {
  estado: string;
}

export default function EstadoBadge({ estado }: EstadoBadgeProps) {
  const config = estadoConfig[estado] || { label: estado, clase: 'badge-gray' };
  return <span className={config.clase}>{config.label}</span>;
}
