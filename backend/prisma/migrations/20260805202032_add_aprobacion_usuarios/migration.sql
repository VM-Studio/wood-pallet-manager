-- CreateEnum
CREATE TYPE "EstadoCuentaUsuario" AS ENUM ('pendiente', 'aprobado', 'rechazado');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "estadoCuenta" "EstadoCuentaUsuario" NOT NULL DEFAULT 'aprobado',
ADD COLUMN     "fechaAprobacion" TIMESTAMP(3),
ADD COLUMN     "modulosPermitidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "motivoRechazo" TEXT,
ADD COLUMN     "tieneModulosLimitados" BOOLEAN NOT NULL DEFAULT false;
