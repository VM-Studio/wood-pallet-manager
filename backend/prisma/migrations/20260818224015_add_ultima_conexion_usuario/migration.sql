-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "enLinea" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ultimaConexion" TIMESTAMP(3);
