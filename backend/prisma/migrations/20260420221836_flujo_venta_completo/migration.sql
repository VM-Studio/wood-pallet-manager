-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('transferencia', 'e_check', 'efectivo');

-- CreateEnum
CREATE TYPE "ModalidadPago" AS ENUM ('adelantado', 'contra_entrega', 'por_partes');

-- CreateEnum
CREATE TYPE "EstadoConsulta" AS ENUM ('no_aplica', 'pendiente_consulta', 'consultada', 'aceptada', 'rechazada');

-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "cuentaDestino" TEXT,
ADD COLUMN     "metodoPago" "MetodoPago";

-- AlterTable
ALTER TABLE "logistica" ADD COLUMN     "consultadaPorId" INTEGER,
ADD COLUMN     "estadoConsulta" "EstadoConsulta" NOT NULL DEFAULT 'no_aplica',
ADD COLUMN     "fechaConsulta" TIMESTAMP(3),
ADD COLUMN     "lugarEntrega" TEXT;

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "cuentaDestino" TEXT,
ADD COLUMN     "fechaRetiro" TIMESTAMP(3),
ADD COLUMN     "lugarEntrega" TEXT,
ADD COLUMN     "metodoPago" "MetodoPago",
ADD COLUMN     "modalidadPago" "ModalidadPago";

-- AddForeignKey
ALTER TABLE "logistica" ADD CONSTRAINT "logistica_consultadaPorId_fkey" FOREIGN KEY ("consultadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
