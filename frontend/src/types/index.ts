// Usuario
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'propietario_carlos' | 'propietario_juancruz' | 'admin';
  telefono?: string;
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
  cantidadMinima?: number;
  producto?: { nombre: string; tipo: string };
  proveedor?: { nombreEmpresa: string };
  bajoMinimo?: boolean;
}

// Cotización
export interface Cotizacion {
  id: number;
  clienteId: number;
  usuarioId: number;
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
  cliente?: { razonSocial: string; telefonoContacto?: string };
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
}

// Venta
export interface Venta {
  id: number;
  clienteId: number;
  usuarioId: number;
  fechaVenta: string;
  estadoPedido: 'confirmado' | 'en_preparacion' | 'listo_para_envio' | 'en_transito' | 'entregado' | 'entregado_parcial' | 'cancelado';
  tipoEntrega: 'retira_cliente' | 'envio_woodpallet';
  requiereSenasa: boolean;
  fechaEstimEntrega?: string;
  fechaEntregaReal?: string;
  totalSinIva?: number;
  totalConIva?: number;
  costoFlete?: number;
  observaciones?: string;
  cliente?: { razonSocial: string };
  usuario?: { nombre: string; apellido: string; rol: string };
  detalles?: DetalleVenta[];
  facturas?: Factura[];
  logistica?: Logistica;
}

export interface DetalleVenta {
  id: number;
  ventaId: number;
  productoId: number;
  cantidadPedida: number;
  cantidadEntregada: number;
  precioUnitario: number;
  subtotal: number;
  producto?: { nombre: string; tipo: string };
  retiros?: RetiroParcial[];
}

export interface RetiroParcial {
  id: number;
  detalleVentaId: number;
  fechaRetiro: string;
  cantidadRetirada: number;
}

// Compra
export interface Compra {
  id: number;
  proveedorId: number;
  usuarioId: number;
  ventaId?: number;
  fechaCompra: string;
  estado: 'solicitada' | 'confirmada' | 'recibida' | 'pagada';
  esAnticipado: boolean;
  total?: number;
  nroRemito?: string;
  observaciones?: string;
  proveedor?: { nombreEmpresa: string; nombreContacto: string };
  detalles?: DetalleCompra[];
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
  horaEstimadaEntrega?: string;
  horaEntregaReal?: string;
  estadoEntrega: 'pendiente' | 'en_camino' | 'entregado' | 'con_problema';
  confTransportista: boolean;
  confCliente: boolean;
  costoFlete?: number;
  observaciones?: string;
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
  observaciones?: string;
  cliente?: { razonSocial: string; cuit?: string };
  pagos?: PagoCobro[];
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
  };
  porPropietario: {
    carlos: { ventas: number; pallets: number; facturacion: number };
    juanCruz: { ventas: number; pallets: number; facturacion: number };
  };
  graficos: {
    ventasUltimos12Meses: {
      mes: string;
      ventas: number;
      pallets: number;
      facturacion: number;
    }[];
  };
}
