-- AlterEnum
ALTER TYPE "EstadoRetiro" ADD VALUE 'parcial';

-- AlterTable
ALTER TABLE "retiros_galpon" ADD COLUMN     "cantidadRetiradaParcial" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fechaUltimoRetiroParcial" TIMESTAMP(3);
