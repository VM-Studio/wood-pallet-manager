-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('propietario_carlos', 'propietario_juancruz', 'admin');

-- CreateEnum
CREATE TYPE "CanalEntrada" AS ENUM ('whatsapp', 'formulario_web', 'llamada', 'recomendacion', 'otro');

-- CreateEnum
CREATE TYPE "TipoPallet" AS ENUM ('estandar', 'reforzado', 'liviano', 'exportacion', 'carton', 'a_medida');

-- CreateEnum
CREATE TYPE "CondicionPallet" AS ENUM ('nuevo', 'seminuevo', 'usado');

-- CreateEnum
CREATE TYPE "TipoProductoProveedor" AS ENUM ('seminuevo', 'nuevo_medida', 'ambos');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('entrada', 'salida', 'ajuste');

-- CreateEnum
CREATE TYPE "MotivoMovimiento" AS ENUM ('venta', 'compra', 'devolucion', 'ajuste_manual');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('enviada', 'en_seguimiento', 'aceptada', 'rechazada', 'perdida', 'vencida');

-- CreateEnum
CREATE TYPE "CanalEnvioCotizacion" AS ENUM ('whatsapp', 'email');

-- CreateEnum
CREATE TYPE "TipoContacto" AS ENUM ('whatsapp', 'llamada', 'email', 'presencial');

-- CreateEnum
CREATE TYPE "ResultadoSeguimiento" AS ENUM ('sin_respuesta', 'interesado', 'no_interesado', 'cerrado', 'reprogramado');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('confirmado', 'en_preparacion', 'listo_para_envio', 'en_transito', 'entregado', 'entregado_parcial', 'cancelado');

-- CreateEnum
CREATE TYPE "TipoEntrega" AS ENUM ('retira_cliente', 'envio_woodpallet');

-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('solicitada', 'confirmada', 'recibida', 'pagada');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('pendiente', 'en_camino', 'entregado', 'con_problema');

-- CreateEnum
CREATE TYPE "TipoFactura" AS ENUM ('A');

-- CreateEnum
CREATE TYPE "EstadoCobro" AS ENUM ('pendiente', 'cobrada_parcial', 'cobrada_total', 'vencida', 'incobrable');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('transferencia', 'e_check', 'efectivo');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT,
    "nombreContacto" TEXT,
    "telefonoContacto" TEXT,
    "emailContacto" TEXT,
    "canalEntrada" "CanalEntrada",
    "usuarioAsignadoId" INTEGER NOT NULL,
    "direccionEntrega" TEXT,
    "localidad" TEXT,
    "esExportador" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoPallet" NOT NULL,
    "condicion" "CondicionPallet" NOT NULL,
    "dimensionLargo" INTEGER,
    "dimensionAncho" INTEGER,
    "cargaMaximaKg" INTEGER,
    "requiereSenasa" BOOLEAN NOT NULL DEFAULT false,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" SERIAL NOT NULL,
    "nombreEmpresa" TEXT NOT NULL,
    "nombreContacto" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "tipoProducto" "TipoProductoProveedor" NOT NULL,
    "contactoExclusivoId" INTEGER,
    "distanciaKm" INTEGER,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_proveedor" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "precioCosto" DECIMAL(12,2) NOT NULL,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "producto_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_precios" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "margenPct" DECIMAL(5,2),
    "cantMinima" INTEGER NOT NULL,
    "cantMaxima" INTEGER,
    "bonificaFlete" BOOLEAN NOT NULL DEFAULT false,
    "vigentDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigentHasta" TIMESTAMP(3),
    "creadoPorId" INTEGER NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "lista_precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_precios" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "precioAnterior" DECIMAL(12,2) NOT NULL,
    "precioNuevo" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT,
    "fechaCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" INTEGER NOT NULL,

    CONSTRAINT "historial_precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "cantidadDisponible" INTEGER NOT NULL DEFAULT 0,
    "cantidadMinima" INTEGER,
    "ultimaActualizacion" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "tipoMovimiento" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" "MotivoMovimiento" NOT NULL,
    "idReferencia" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" INTEGER NOT NULL,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaCotizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'enviada',
    "incluyeFlete" BOOLEAN NOT NULL DEFAULT false,
    "costoFlete" DECIMAL(12,2),
    "fleteIncluido" BOOLEAN NOT NULL DEFAULT true,
    "requiereSenasa" BOOLEAN NOT NULL DEFAULT false,
    "costoSenasa" DECIMAL(12,2),
    "totalSinIva" DECIMAL(12,2),
    "totalConIva" DECIMAL(12,2),
    "canalEnvio" "CanalEnvioCotizacion",
    "observaciones" TEXT,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_cotizacion" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "esAMedida" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "detalle_cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "especificaciones_medida" (
    "id" SERIAL NOT NULL,
    "detalleCotizacionId" INTEGER,
    "detalleVentaId" INTEGER,
    "largoMm" INTEGER,
    "anchoMm" INTEGER,
    "altoMm" INTEGER,
    "cargaMaximaKg" INTEGER,
    "tipoMadera" TEXT,
    "observacionesCliente" TEXT,

    CONSTRAINT "especificaciones_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguimiento_cotizacion" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaContacto" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoContacto" "TipoContacto" NOT NULL,
    "resultado" "ResultadoSeguimiento" NOT NULL,
    "observaciones" TEXT,
    "proximoContacto" TIMESTAMP(3),

    CONSTRAINT "seguimiento_cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaVenta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estadoPedido" "EstadoPedido" NOT NULL DEFAULT 'confirmado',
    "tipoEntrega" "TipoEntrega" NOT NULL,
    "requiereSenasa" BOOLEAN NOT NULL DEFAULT false,
    "fechaEstimEntrega" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "totalSinIva" DECIMAL(12,2),
    "totalConIva" DECIMAL(12,2),
    "costoFlete" DECIMAL(12,2),
    "observaciones" TEXT,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_venta" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadPedida" INTEGER NOT NULL,
    "cantidadEntregada" INTEGER NOT NULL DEFAULT 0,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "detalle_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retiros_parciales" (
    "id" SERIAL NOT NULL,
    "detalleVentaId" INTEGER NOT NULL,
    "fechaRetiro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidadRetirada" INTEGER NOT NULL,
    "registradoPorId" INTEGER NOT NULL,

    CONSTRAINT "retiros_parciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "ventaId" INTEGER,
    "fechaCompra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'solicitada',
    "esAnticipado" BOOLEAN NOT NULL DEFAULT false,
    "total" DECIMAL(12,2),
    "nroRemito" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_compra" (
    "id" SERIAL NOT NULL,
    "compraId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioCostoUnit" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "detalle_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistica" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "nombreTransportista" TEXT NOT NULL,
    "telefonoTransp" TEXT,
    "fechaRetiroGalpon" TIMESTAMP(3),
    "horaRetiro" TIMESTAMP(3),
    "horaEstimadaEntrega" TIMESTAMP(3),
    "horaEntregaReal" TIMESTAMP(3),
    "estadoEntrega" "EstadoEntrega" NOT NULL DEFAULT 'pendiente',
    "confTransportista" BOOLEAN NOT NULL DEFAULT false,
    "confCliente" BOOLEAN NOT NULL DEFAULT false,
    "costoFlete" DECIMAL(12,2),
    "registradoPorId" INTEGER NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "logistica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipoFactura" "TipoFactura" NOT NULL DEFAULT 'A',
    "nroFactura" TEXT,
    "esSinFactura" BOOLEAN NOT NULL DEFAULT false,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "totalNeto" DECIMAL(12,2) NOT NULL,
    "iva" DECIMAL(12,2) NOT NULL,
    "totalConIva" DECIMAL(12,2) NOT NULL,
    "estadoCobro" "EstadoCobro" NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_cobros" (
    "id" SERIAL NOT NULL,
    "facturaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(12,2) NOT NULL,
    "medioPago" "MedioPago" NOT NULL,
    "nroComprobante" TEXT,
    "esAdelanto" BOOLEAN NOT NULL DEFAULT false,
    "registradoPorId" INTEGER NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "pagos_cobros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_credito" (
    "id" SERIAL NOT NULL,
    "facturaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nroNota" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT NOT NULL,

    CONSTRAINT "notas_credito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_proveedores" (
    "id" SERIAL NOT NULL,
    "compraId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(12,2) NOT NULL,
    "medioPago" "MedioPago" NOT NULL,
    "nroComprobante" TEXT,
    "registradoPorId" INTEGER NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "pagos_proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stock_productoId_proveedorId_key" ON "stock"("productoId", "proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "especificaciones_medida_detalleCotizacionId_key" ON "especificaciones_medida"("detalleCotizacionId");

-- CreateIndex
CREATE UNIQUE INDEX "especificaciones_medida_detalleVentaId_key" ON "especificaciones_medida"("detalleVentaId");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_cotizacionId_key" ON "ventas"("cotizacionId");

-- CreateIndex
CREATE UNIQUE INDEX "logistica_ventaId_key" ON "logistica"("ventaId");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuarioAsignadoId_fkey" FOREIGN KEY ("usuarioAsignadoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_proveedor" ADD CONSTRAINT "producto_proveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_proveedor" ADD CONSTRAINT "producto_proveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_precios" ADD CONSTRAINT "lista_precios_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_precios" ADD CONSTRAINT "lista_precios_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_precios" ADD CONSTRAINT "historial_precios_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_precios" ADD CONSTRAINT "historial_precios_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_cotizacion" ADD CONSTRAINT "detalle_cotizacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_cotizacion" ADD CONSTRAINT "detalle_cotizacion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "especificaciones_medida" ADD CONSTRAINT "especificaciones_medida_detalleCotizacionId_fkey" FOREIGN KEY ("detalleCotizacionId") REFERENCES "detalle_cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "especificaciones_medida" ADD CONSTRAINT "especificaciones_medida_detalleVentaId_fkey" FOREIGN KEY ("detalleVentaId") REFERENCES "detalle_venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_cotizacion" ADD CONSTRAINT "seguimiento_cotizacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_cotizacion" ADD CONSTRAINT "seguimiento_cotizacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros_parciales" ADD CONSTRAINT "retiros_parciales_detalleVentaId_fkey" FOREIGN KEY ("detalleVentaId") REFERENCES "detalle_venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros_parciales" ADD CONSTRAINT "retiros_parciales_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistica" ADD CONSTRAINT "logistica_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistica" ADD CONSTRAINT "logistica_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_cobros" ADD CONSTRAINT "pagos_cobros_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_cobros" ADD CONSTRAINT "pagos_cobros_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_cobros" ADD CONSTRAINT "pagos_cobros_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_credito" ADD CONSTRAINT "notas_credito_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_credito" ADD CONSTRAINT "notas_credito_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_credito" ADD CONSTRAINT "notas_credito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
