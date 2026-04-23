/*
  Warnings:

  - The values [solicitada,confirmada,recibida] on the enum `EstadoCompra` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipoCasoDevolucion" AS ENUM ('pallet_danado', 'cliente_no_quiere', 'devolucion_parcial', 'cancelacion_anticipada');

-- CreateEnum
CREATE TYPE "EstadoDevolucion" AS ENUM ('pendiente', 'esperando_confirmacion_deposito', 'confirmada', 'procesada', 'cancelada');

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoCompra_new" AS ENUM ('pendiente_pago', 'pagada', 'cancelada');
ALTER TABLE "public"."compras" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "compras" ALTER COLUMN "estado" TYPE "EstadoCompra_new" USING ("estado"::text::"EstadoCompra_new");
ALTER TYPE "EstadoCompra" RENAME TO "EstadoCompra_old";
ALTER TYPE "EstadoCompra_new" RENAME TO "EstadoCompra";
DROP TYPE "public"."EstadoCompra_old";
ALTER TABLE "compras" ALTER COLUMN "estado" SET DEFAULT 'pendiente_pago';
COMMIT;

-- CreateTable
CREATE TABLE "devoluciones" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoCaso" "TipoCasoDevolucion" NOT NULL,
    "estado" "EstadoDevolucion" NOT NULL DEFAULT 'pendiente',
    "devuelveFlete" BOOLEAN NOT NULL DEFAULT false,
    "devuelveSenasa" BOOLEAN NOT NULL DEFAULT false,
    "montoPallets" DECIMAL(12,2) NOT NULL,
    "montoFlete" DECIMAL(12,2),
    "montoSenasa" DECIMAL(12,2),
    "montoTotal" DECIMAL(12,2) NOT NULL,
    "requiereConfirmacionDeposito" BOOLEAN NOT NULL DEFAULT false,
    "depositoConfirmo" BOOLEAN NOT NULL DEFAULT false,
    "fechaConfirmacionDeposito" TIMESTAMP(3),
    "stockRestaurado" BOOLEAN NOT NULL DEFAULT false,
    "compensaEnSiguientePedido" BOOLEAN NOT NULL DEFAULT false,
    "metodoPago" "MetodoPago",
    "cuentaDestino" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_devolucion" (
    "id" SERIAL NOT NULL,
    "devolucionId" INTEGER NOT NULL,
    "detalleVentaId" INTEGER,
    "productoId" INTEGER NOT NULL,
    "cantidadDevuelta" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "detalle_devolucion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_devolucion" ADD CONSTRAINT "detalle_devolucion_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "devoluciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_devolucion" ADD CONSTRAINT "detalle_devolucion_detalleVentaId_fkey" FOREIGN KEY ("detalleVentaId") REFERENCES "detalle_venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_devolucion" ADD CONSTRAINT "detalle_devolucion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
