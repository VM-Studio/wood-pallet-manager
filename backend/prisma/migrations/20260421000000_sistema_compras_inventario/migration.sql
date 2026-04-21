-- Agregar campo cantidadDeudora a Stock
ALTER TABLE "stock" ADD COLUMN "cantidadDeudora" INTEGER NOT NULL DEFAULT 0;

-- Crear enum TipoCompra
CREATE TYPE "TipoCompra" AS ENUM ('reventa_inmediata', 'stock_propio');

-- Modificar tabla compras: eliminar esAnticipado, agregar nuevos campos
ALTER TABLE "compras" DROP COLUMN IF EXISTS "esAnticipado";
ALTER TABLE "compras" ADD COLUMN "tipoCompra" "TipoCompra" NOT NULL DEFAULT 'reventa_inmediata';
ALTER TABLE "compras" ADD COLUMN "saldoDeudor" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "compras" ADD COLUMN "fechaPago" TIMESTAMP(3);
ALTER TABLE "compras" ADD COLUMN "cuentaDestino" TEXT;
ALTER TABLE "compras" ADD COLUMN "nroComprobante" TEXT;
ALTER TABLE "compras" ADD COLUMN "metodoPago" "MetodoPago";

-- Actualizar el enum EstadoCompra: agregar nuevos valores
ALTER TYPE "EstadoCompra" ADD VALUE IF NOT EXISTS 'pendiente_pago';

-- Cambiar el default del estado en compras
ALTER TABLE "compras" ALTER COLUMN "estado" SET DEFAULT 'pendiente_pago';
