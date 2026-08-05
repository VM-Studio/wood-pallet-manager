// Lista canónica de módulos del sistema, usada para:
// - el panel de aprobación/permisos de Carlos (UsuariosPage)
// - el filtrado del Sidebar
// - el guard de rutas (ModuleGuard)
export interface ModuloInfo {
  key: string;   // debe coincidir con el segmento de ruta (sin barra inicial)
  label: string;
}

export const MODULOS_SISTEMA: ModuloInfo[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'alertas', label: 'Alertas' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'cotizaciones', label: 'Cotizaciones' },
  { key: 'solicitudes-web', label: 'Solicitudes web' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'logistica', label: 'Logística' },
  { key: 'retiros', label: 'Retiros' },
  { key: 'remitos', label: 'Remitos' },
  { key: 'facturacion', label: 'Facturación' },
  { key: 'seguimientos', label: 'Seguimientos' },
  { key: 'compras', label: 'Compras' },
  { key: 'proveedores', label: 'Proveedores' },
  { key: 'productos', label: 'Productos' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'devoluciones', label: 'Devoluciones' },
  { key: 'reportes', label: 'Reportes' },
];

// Rutas que siempre están permitidas, sin importar los permisos asignados
export const MODULOS_SIEMPRE_PERMITIDOS = ['dashboard', 'mi-cuenta', 'configuracion'];

// true si el usuario logueado tiene restricciones de módulos activas
export function esUsuarioRestringido(usuario: { rol: string; tieneModulosLimitados?: boolean } | null | undefined) {
  if (!usuario) return false;
  if (usuario.rol === 'propietario_carlos' || usuario.rol === 'propietario_juancruz') return false;
  return !!usuario.tieneModulosLimitados;
}

export function tieneAccesoAModulo(
  usuario: { rol: string; tieneModulosLimitados?: boolean; modulosPermitidos?: string[] } | null | undefined,
  moduloKey: string
) {
  if (MODULOS_SIEMPRE_PERMITIDOS.includes(moduloKey)) return true;
  if (!esUsuarioRestringido(usuario)) return true;
  return !!usuario?.modulosPermitidos?.includes(moduloKey);
}
