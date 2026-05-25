-- CreateEnum
CREATE TYPE "TipoVerificacion" AS ENUM ('cambio_password', 'cambio_email', 'cambio_telefono', 'recuperacion_password');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "firma" TEXT,
ADD COLUMN     "fotoPerfil" TEXT;

-- CreateTable
CREATE TABLE "verificaciones_codigo" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "email" TEXT,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoVerificacion" NOT NULL,
    "dato" TEXT,
    "canal" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verificaciones_codigo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "verificaciones_codigo" ADD CONSTRAINT "verificaciones_codigo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
