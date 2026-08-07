// Usuario
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'propietario_carlos' | 'propietario_juancruz' | 'admin';
  telefono?: string;
  cuit?: string;
  fotoPerfil?: string;  // base64 data URL
  firma?: string;       // base64 data URL
  activo?: boolean;
  fechaCreacion?: string;
  estadoCuenta?: 'pendiente' | 'aprobado' | 'rechazado';
  tieneModulosLimitados?: boolean;
  modulosPermitidos?: string[];
  motivoRechazo?: string;
  fechaAprobacion?: string;
}

export interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  isAuthenticated: boolean;
}

// Cliente
export interface Cliente {
  id: number;
  razonSocial: string;
  cuit?: string;
  nombreContacto?: string;
  telefonoContacto?: string;
  emailContacto?: string;
  canalEntrada?: string;
  usuarioAsignadoId: number;
  usuarioAsignado?: { nombre: string; apellido: string; rol: string };
  direccionEntrega?: string;
  localidad?: string;
  esExportador: boolean;
  observaciones?: string;
  fechaAlta: string;
  activo: boolean;
}

// Producto
export interface Producto {
  id: number;
  nombre: string;
  tipo: string;
  condicion: string;
  dimensionLargo?: number;
  dimensionAncho?: number;
  cargaMaximaKg?: number;
  requiereSenasa: boolean;
  descripcion?: string;
  activo: boolean;
  stockDisponible?: number;
  stocks?: Stock[];
  listaPrecios?: ListaPrecio[];
}

// Precio
export interface ListaPrecio {
  id: number;
  productoId: number;
  precioUnitario: number;
  cantMinima: number;
  cantMaxima?: number;
  bonificaFlete: boolean;
  vigentDesde: string;
  vigentHasta?: string;
}

export interface CalculoPrecio {
  precioUnitario: number;
  cantMinima: number;
  cantMaxima?: number;
  bonificaFlete: boolean;
  subtotal: number;
  subtotalConIva: number;
  escalon: string;
}

// Stock
export interface Stock {
  id: number;
  productoId: number;
  proveedorId: number;
  cantidadDisponible: number;
  cantidadDeudora: number;
  cantidadMinima?: number;
  producto?: { nombre: string; tipo: string };
  proveedor?: { nombreEmpresa: string };
  bajoMinimo?: boolean;
}

// Cotización
export interface Cotizacion {
  id: number;
  clienteId?: number;
  usuarioId: number;
  esRapida?: boolean;
  nombreProspecto?: string;
  telefonoProspecto?: string;
  emailProspecto?: string;
  fechaCotizacion: string;
  fechaVencimiento?: string;
  estado: 'enviada' | 'en_seguimiento' | 'aceptada' | 'rechazada' | 'perdida' | 'vencida';
  incluyeFlete: boolean;
  costoFlete?: number;
  fleteIncluido: boolean;
  requiereSenasa: boolean;
  costoSenasa?: number;
  totalSinIva?: number;
  totalConIva?: number;
  canalEnvio?: string;
  observaciones?: string;
  cliente?: { razonSocial: string; telefonoContacto?: string; cuit?: string };
  usuario?: { nombre: string; apellido: string; rol: string };
  detalles?: DetalleCotizacion[];
}

export interface DetalleCotizacion {
  id: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  esAMedida: boolean;
  producto?: { nombre: string; tipo: string; condicion: string };
  especificacion?: {
    medidas?: { label: string; tablas?: number; largo?: number; ancho?: number; espesor?: number; pies: number }[];
  };
}

// Venta
export interface Venta {
  id: number;
  clienteId: number;
  usuarioId: number;
  fechaVenta: string;
  estadoPedido: 'confirmado' | 'en_preparacion' | 'listo_para_envio' | 'en_transito' | 'entregado' | 'entregado_parcial' | 'cancelado';
  tipoEntrega: 'retira_cliente' | 'envio_woodpallet';
  incluyeFlete?: boolean;
  requiereSenasa: boolean;
  fechaEstimEntrega?: string;
  fechaEntregaReal?: string;
  totalSinIva?: number;
  totalConIva?: number;
  costoFlete?: number;
  metodoPago?: string;
  modalidadPago?: string;
  observaciones?: string;
  nroOrden?: string;
  cliente?: { id?: number; razonSocial: string; cuit?: string; nombreContacto?: string; telefonoContacto?: string };
  usuario?: { nombre: string; apellido: string; rol: string };
  detalles?: DetalleVenta[];
  facturas?: Factura[];
  logistica?: Logistica;
  solicitudesLogistica?: SolicitudLogistica[];
  lugarEntrega?: string;
  costoSenasa?: number;
  origenStock?: string;
  esHistorica?: boolean;
}

export interface DetalleVenta {
  id: number;
  ventaId: number;
  productoId: number;
  cantidadPedida: number;
  cantidadEntregada: number;
  precioUnitario: number;
  subtotal: number;
  producto?: { nombre: string; tipo: string; condicion?: string };
  retiros?: RetiroParcial[];
  costoUnitarioHistorico?: number;
  proveedorHistoricoId?: number;
  tipoCompraHistorico?: string;
}

export interface RetiroParcial {
  id: number;
  detalleVentaId: number;
  fechaRetiro: string;
  cantidadRetirada: number;
}

export interface VentaHistoricaPayload {
  fechaVenta: string;
  fechaEntregaReal?: string;
  productos: {
    productoId: number;
    cantidad: number;
    precioUnitario: number;
    costoUnitario?: number;
    proveedorId?: number;
    tipoCompra?: string;
  }[];
  incluyeIva?: boolean;
  tipoEntrega?: string;
  estadoCobro?: 'pendiente' | 'cobrada_parcial' | 'cobrada_total';
  montoCobrado?: number;
  medioPago?: string;
  fechaPago?: string;
  observaciones?: string;
}

// Compra
export interface CompraVentaResumen {
  id: number;
  fechaVenta: string;
  estadoPedido: string;
  totalConIva: number | null;
  lugarEntrega: string | null;
  fechaEstimEntrega: string | null;
  metodoPago: string | null;
  modalidadPago: string | null;
  cliente: { id: number; razonSocial: string; nombreContacto: string | null };
  detalles: { id: number; cantidadPedida: number; producto: { nombre: string; condicion: string } }[];
}

export interface Compra {
  id: number;
  proveedorId: number;
  usuarioId: number;
  ventaId?: number;
  fechaCompra: string;
  estado: 'pendiente_pago' | 'pagada' | 'cancelada';
  tipoCompra: 'reventa_inmediata' | 'stock_propio';
  saldoDeudor: boolean;
  total?: number;
  nroRemito?: string;
  observaciones?: string;
  fechaPago?: string;
  metodoPago?: string;
  cuentaDestino?: string;
  nroComprobante?: string;
  proveedor?: { nombreEmpresa: string; nombreContacto: string };
  detalles?: DetalleCompra[];
  venta?: CompraVentaResumen;
}

export interface DetalleCompra {
  id: number;
  productoId: number;
  cantidad: number;
  precioCostoUnit: number;
  subtotal: number;
  producto?: { nombre: string };
}

// Logística
export interface Logistica {
  id: number;
  ventaId: number;
  nombreTransportista: string;
  telefonoTransp?: string;
  fechaRetiroGalpon?: string;
  horaRetiro?: string;
  horaEstimadaEntrega?: string;
  horaEntregaReal?: string;
  estadoEntrega: 'pendiente' | 'en_camino' | 'entregado' | 'con_problema';
  confTransportista: boolean;
  confCliente: boolean;
  costoFlete?: number;
  observaciones?: string;
  lugarEntrega?: string;
  estadoConsulta?: string;
  fechaConsulta?: string;
  registradoPor?: { id: number; nombre: string; apellido: string };
  consultadaPor?: { id: number; nombre: string; apellido: string };
}

export interface SolicitudLogistica {
  id: number;
  ventaId?: number;
  solicitanteId: number;
  destinatarioId: number;
  fechaSolicitud: string;
  fechaEntrega?: string;
  cantidadUnidades?: number;
  ubicacionEntrega?: string;
  notas?: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  fechaRespuesta?: string;
  notasRespuesta?: string;
  solicitante: { id: number; nombre: string; apellido: string; rol: string };
  destinatario: { id: number; nombre: string; apellido: string; rol: string };
}

// Factura
export interface Factura {
  id: number;
  ventaId: number;
  clienteId: number;
  usuarioId: number;
  nroFactura?: string;
  esSinFactura: boolean;
  fechaEmision: string;
  fechaVencimiento?: string;
  totalNeto: number;
  iva: number;
  totalConIva: number;
  estadoCobro: 'pendiente' | 'cobrada_parcial' | 'cobrada_total' | 'vencida' | 'incobrable';
  modalidadPago?: string;
  medioPago?: string;
  observaciones?: string;
  cliente?: { razonSocial: string; cuit?: string };
  pagos?: PagoCobro[];
  venta?: {
    id: number;
    estadoPedido: string;
    tipoEntrega: string;
    nroOrden?: string;
    detalles?: {
      id: number;
      cantidadPedida: number;
      precioUnitario: number;
      subtotal: number;
      producto?: { nombre: string; tipo: string };
    }[];
  };
  diasVencida?: number;
  urgencia?: 'alta' | 'media' | 'baja';
}

export interface PagoCobro {
  id: number;
  facturaId: number;
  fechaPago: string;
  monto: number;
  medioPago: 'transferencia' | 'e_check' | 'efectivo';
  nroComprobante?: string;
  esAdelanto: boolean;
  observaciones?: string;
  registradoPor?: { nombre: string; apellido: string };
}

// Alerta
export interface Alerta {
  tipo: string;
  urgencia: 'alta' | 'media' | 'baja';
  titulo: string;
  detalle: string;
  referencia: { tipo: string; id: number };
  propietario: string;
}

export interface AlertasResponse {
  total: number;
  alta: number;
  media: number;
  baja: number;
  alertas: Alerta[];
}

// Dashboard
export interface DashboardData {
  kpis: {
    palletsMesActual: number;
    palletsMesAnterior: number;
    variacionPallets: number;
    facturacionMesActual: number;
    facturacionMesAnterior: number;
    variacionFacturacion: number;
    totalCobrosPendientes: number;
    facturasVencidas: number;
    cotizacionesPendientes: number;
    pedidosActivos: number;
    entregasHoy: number;
    gananciasMes: number;
    costoComprasMes: number;
  };
  porPropietario: {
    carlos: {
      ventas: number;
      pallets: number;
      facturacion: number;
      palletsMesAnterior: number;
      facturacionMesAnterior: number;
      cotizacionesPendientes: number;
      pedidosActivos: number;
      cobrosPendientes: number;
      facturasVencidas: number;
      grafico12Meses: { mes: string; ventas: number; pallets: number; facturacion: number }[];
    };
    juanCruz: {
      ventas: number;
      pallets: number;
      facturacion: number;
      palletsMesAnterior: number;
      facturacionMesAnterior: number;
      cotizacionesPendientes: number;
      pedidosActivos: number;
      cobrosPendientes: number;
      facturasVencidas: number;
      grafico12Meses: { mes: string; ventas: number; pallets: number; facturacion: number }[];
    };
    // Datos del usuario realmente logueado (válido para cualquier rol/cuenta)
    propio: {
      ventas: number;
      pallets: number;
      facturacion: number;
      palletsMesAnterior: number;
      facturacionMesAnterior: number;
      cotizacionesPendientes: number;
      pedidosActivos: number;
      cobrosPendientes: number;
      facturasVencidas: number;
      grafico12Meses: { mes: string; ventas: number; pallets: number; facturacion: number }[];
    };
  };
  graficos: {
    ventasUltimos12Meses: {
      mes: string;
      ventas: number;
      pallets: number;
      facturacion: number;
    }[];
  };
  ventasMesDetalle?: { razonSocial: string; pallets: number; facturacion: number }[];
  cotizacionesActivas?: { id: number; razonSocial: string; estado: string; totalConIva: number; fechaCotizacion: string }[];
}

// Solicitud Logística
export interface SolicitudLogistica {
  id: number;
  ventaId?: number;
  solicitanteId: number;
  destinatarioId: number;
  fechaSolicitud: string;
  fechaEntrega?: string;
  cantidadUnidades?: number;
  ubicacionEntrega?: string;
  notas?: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  fechaRespuesta?: string;
  notasRespuesta?: string;
  venta?: { cliente?: { razonSocial: string } };
  solicitante: { id: number; nombre: string; apellido: string; rol: string };
  destinatario: { id: number; nombre: string; apellido: string; rol: string };
}

// ─── Cotizaciones Web ─────────────────────────────────────────────────────────

export type EstadoCotizacionWeb = 'pendiente' | 'vista' | 'convertida' | 'descartada';

export interface CotizacionWeb {
  id: number;
  nombre: string;
  empresa?: string;
  email: string;
  telefono: string;
  tipoPallet: string;
  cantidad: number;
  fechaNecesidad?: string;
  tipoEntrega: string;
  localidadEntrega?: string;
  requiereSenasa: boolean;
  observaciones?: string;
  estado: EstadoCotizacionWeb;
  propietarioAsignadoId?: number;
  cotizacionId?: number;
  motivoDescarte?: string;
  ipOrigen?: string;
  creadoEn: string;
  actualizadoEn: string;
  propietarioAsignado?: { id: number; nombre: string; apellido: string; rol: string };
  cotizacion?: { id: number; estado: string; totalConIva?: number };
}

export interface ContadorCotizacionesWeb {
  total: number;
  pendiente: number;
  vista: number;
}
