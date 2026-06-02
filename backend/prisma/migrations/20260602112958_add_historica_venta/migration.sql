-- AlterTable
ALTER TABLE "detalle_venta" ADD COLUMN     "costoUnitarioHistorico" DECIMAL(12,2),
ADD COLUMN     "proveedorHistoricoId" INTEGER,
ADD COLUMN     "tipoCompraHistorico" TEXT;

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "esHistorica" BOOLEAN NOT NULL DEFAULT false;
