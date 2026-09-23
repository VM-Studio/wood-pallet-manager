-- AlterEnum
ALTER TYPE "EstadoCobro" ADD VALUE 'anulada';

-- AlterEnum
ALTER TYPE "EstadoEntrega" ADD VALUE 'cancelado';

-- AlterEnum
ALTER TYPE "EstadoSolicitudLogistica" ADD VALUE 'cancelada';

-- AlterEnum
ALTER TYPE "MotivoMovimiento" ADD VALUE 'cancelacion_venta';

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "canceladaPorId" INTEGER,
ADD COLUMN     "fechaCancelacion" TIMESTAMP(3),
ADD COLUMN     "motivoCancelacion" TEXT;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_canceladaPorId_fkey" FOREIGN KEY ("canceladaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

